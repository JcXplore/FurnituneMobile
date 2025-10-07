import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { Image } from "expo-image";

export default function ProductPage({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [loading, setLoading] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);

  // ✅ Check if a department was passed from MenuBar
  useEffect(() => {
    if (route?.params?.department) {
      setSelectedDepartment(route.params.department);
    }
  }, [route?.params]);

  // Load products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      const storage = getStorage();
      try {
        const q = query(collection(db, "products"));
        const querySnapshot = await getDocs(q);

        const list = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const data = doc.data();

            // Try to load thumbnail, fallback to first image
            let imageUrl = null;
            if (data.thumbnail) {
              try {
                imageUrl = await getDownloadURL(ref(storage, data.thumbnail));
              } catch (err) {
                console.log("Thumbnail fetch error:", err);
              }
            } else if (data.images?.length > 0) {
              try {
                imageUrl = await getDownloadURL(ref(storage, data.images[0]));
              } catch (err) {
                console.log("Image fetch error:", err);
              }
            }

            return {
              id: doc.id,
              name: data.name,
              price: data.basePrice ?? 0,
              image: imageUrl,
              rating: data.ratingAvg ?? 0,
              reviews: data.reviewsCount ?? 0,
              departmentSlug: data.departmentSlug || "uncategorized",
              category: data.baseType || "Uncategorized",
            };
          })
        );
        setProducts(list);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Apply department filter
  const filteredProducts = products.filter((p) => {
    if (selectedDepartment === "All") return true;
    return p.departmentSlug === selectedDepartment;
  });

  // Product card
  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ProductDetails", { product: item })}
    >
      {item.image ? (
        <Image
          source={item.image}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={300}
        />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Text>No Image</Text>
        </View>
      )}
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>₱{Number(item.price).toFixed(2)}</Text>
      <Text style={styles.rating}>
        ⭐ {item.rating} ({item.reviews} Reviews)
      </Text>
    </TouchableOpacity>
  );

  // Department filter bar
  const DepartmentBar = (
    <View style={styles.categoryContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {["All", "living-room", "bedroom", "dining-room", "outdoor"].map(
          (dep) => (
            <TouchableOpacity
              key={dep}
              style={[
                styles.filterBtn,
                selectedDepartment === dep && styles.activeFilter,
              ]}
              onPress={() => setSelectedDepartment(dep)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedDepartment === dep && styles.activeFilterText,
                ]}
              >
                {dep === "All"
                  ? "All"
                  : dep.replace("-", " ").replace(/\b\w/g, (l) =>
                      l.toUpperCase()
                    )}
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Product list */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header row */}
            <View style={styles.headerRow}>
              <Text style={styles.header}>PRODUCTS</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setFilterVisible(true)}
              >
                <Ionicons name="filter-outline" size={18} color="#333" />
                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            </View>
            {DepartmentBar}
          </View>
        }
        stickyHeaderIndices={[0]}
      />

      {/* Loading */}
      {loading && (
        <ActivityIndicator
          style={styles.loading}
          size="small"
          color="#2c6e49"
        />
      )}

      {/* Filter Modal */}
      <Modal visible={filterVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.filterHeaderRow}>
            <Text style={styles.header}>Filters</Text>
            <TouchableOpacity onPress={() => setFilterVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {/* Example content */}
          <ScrollView style={styles.filterContainer}>
            <Text style={styles.filterHeader}>Department</Text>
            {["Living Room", "Bedroom", "Dining Room", "Outdoor"].map((dep) => (
              <TouchableOpacity
                key={dep}
                style={styles.checkboxRow}
                onPress={() =>
                  setSelectedDepartment(dep.toLowerCase().replace(" ", "-"))
                }
              >
                <Text style={styles.checkboxLabel}>{dep}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // 🔹 Header Row
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  header: { fontSize: 18, fontWeight: "bold", color: "#222" },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },

  // 🔹 Category Bar
  categoryContainer: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterScroll: { paddingHorizontal: 4 },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f3f3f3",
    marginRight: 10,
  },
  activeFilter: { backgroundColor: "#2c6e49" },
  filterText: { fontSize: 14, color: "#555" },
  activeFilterText: { color: "#fff", fontWeight: "600" },

  // 🔹 Product Grid
  row: { justifyContent: "space-between", paddingHorizontal: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginVertical: 10,
    flex: 1,
    marginHorizontal: 4,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#f2f2f2",
  },
  noImage: { justifyContent: "center", alignItems: "center" },
  name: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  price: { fontSize: 14, fontWeight: "bold", color: "#2c6e49", marginBottom: 4 },
  rating: { fontSize: 12, color: "#777" },

  // 🔹 Filter Modal
  filterContainer: { padding: 16, backgroundColor: "#fff" },
  filterHeader: { fontSize: 16, fontWeight: "700", marginBottom: 12, color: "#222" },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  checkboxLabel: { marginLeft: 8, fontSize: 14, color: "#444" },
  applyBtn: {
    marginTop: 20,
    backgroundColor: "#2c6e49",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  applyText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  filterHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  // 🔹 Loading
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -12,
    marginTop: -12,
  },
});
