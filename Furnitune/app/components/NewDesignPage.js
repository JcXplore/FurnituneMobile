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
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { Image } from "expo-image";

export default function NewArrivalsPage({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);

  // Sidebar filters
  const [filters, setFilters] = useState({
    type: [],
    sizes: [],
    materials: [],
    seats: [],
    shapes: [],
  });

  const toggleFilter = (category, value) => {
    setFilters((prev) => {
      const current = prev[category] || [];
      return current.includes(value)
        ? { ...prev, [category]: current.filter((v) => v !== value) }
        : { ...prev, [category]: [...current, value] };
    });
  };

  // Load selected category if passed from navigation
  useEffect(() => {
    if (route?.params?.product) {
      setSelectedCategory(route.params.product);
    }
  }, [route?.params]);

  // Fetch ONLY new products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      const storage = getStorage();
      try {
        const q = query(
          collection(db, "products"),
          where("isNew", "==", true) // 🔹 fetch only new arrivals
        );
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
              category: data.baseType || "Uncategorized",
              size: data.size || null,
              material: data.material || null,
              seats: data.seats || null,
              shape: data.shape || null,
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

  // Filtering logic
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory)
      return false;
    if (filters.type.length > 0 && !filters.type.includes(p.category))
      return false;
    if (filters.sizes.length > 0 && !filters.sizes.includes(p.size))
      return false;
    if (filters.materials.length > 0 && !filters.materials.includes(p.material))
      return false;
    if (filters.seats.length > 0 && !filters.seats.includes(p.seats))
      return false;
    if (filters.shapes.length > 0 && !filters.shapes.includes(p.shape))
      return false;

    return true;
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

  // Category bar
  const CategoryBar = (
    <View style={styles.categoryContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {["All", ...new Set(products.map((p) => p.category))].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterBtn,
              selectedCategory === cat && styles.activeFilter,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === cat && styles.activeFilterText,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Sidebar filter component
  const FilterSidebar = () => (
    <ScrollView style={styles.filterContainer}>
      <Text style={styles.filterHeader}>NEW ARRIVALS</Text>
      {/* Filters (Type, Sizes, Materials, etc.) */}
      {/* Same as your original */}
      {/* ... */}
      <TouchableOpacity
        style={styles.applyBtn}
        onPress={() => setFilterVisible(false)}
      >
        <Text style={styles.applyText}>Apply Filters</Text>
      </TouchableOpacity>
    </ScrollView>
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
              <Text style={styles.header}>NEW DESIGNS</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setFilterVisible(true)}
              >
                <Ionicons name="filter-outline" size={18} color="#333" />
                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            </View>
            {CategoryBar}
          </View>
        }
        stickyHeaderIndices={[0]}
      />

      {/* Loading */}
      {loading && (
        <ActivityIndicator style={styles.loading} size="small" color="#2c6e49" />
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
          <FilterSidebar />
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

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
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
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
  filterScroll: {
    paddingHorizontal: 4,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f3f3f3",
    marginRight: 10,
  },
  activeFilter: {
    backgroundColor: "#2c6e49",
  },
  filterText: {
    fontSize: 14,
    color: "#555",
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "600",
  },

  // 🔹 Product Grid
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
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
  noImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c6e49",
    marginBottom: 4,
  },
  rating: {
    fontSize: 12,
    color: "#777",
  },

  // 🔹 Sidebar Filters
  filterContainer: {
    padding: 16,
    backgroundColor: "#fff",
  },
  filterHeader: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#222",
  },
  sectionTitle: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#444",
  },
  applyBtn: {
    marginTop: 20,
    backgroundColor: "#2c6e49",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  applyText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  // 🔹 Filter Modal Header
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

