import React, { useEffect, useState, useMemo, useCallback } from "react"; // ✅ Added useCallback
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl, // ✅ Added RefreshControl
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { Image } from "expo-image";
import FilterModal from "./FilterModal";

export default function RoomsPage({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [loading, setLoading] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // ✅ Refreshing state

  // ✅ Filter state
  const [filters, setFilters] = useState({
    type: [],
    covermaterial: [],
    framematerial: [],
    price: [],
  });

  // ✅ Reset all filters
  const resetFilters = () =>
    setFilters({
      type: [],
      covermaterial: [],
      framematerial: [],
      price: [],
    });

  // ✅ Toggle filters
  const toggleFilter = (key, value) => {
    setFilters((prev) => {
      const currentValues = prev[key] || [];
      if (currentValues.includes(value)) {
        return { ...prev, [key]: currentValues.filter((v) => v !== value) };
      } else {
        return { ...prev, [key]: [...currentValues, value] };
      }
    });
  };

  // ✅ Capture department
  useEffect(() => {
    if (route?.params?.department) {
      setSelectedDepartment(route.params.department);
    }
  }, [route?.params]);

  // ---------------------------------------------------------
  // 🔹 REFACTORED: Data Fetching Function
  // ---------------------------------------------------------
  const loadProducts = useCallback(async (isRefreshing = false) => {
    // Only show big spinner if not refreshing
    if (!isRefreshing) setLoading(true);

    const storage = getStorage();
    try {
      const q = query(collection(db, "products"));
      const querySnapshot = await getDocs(q);

      const list = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          let imageUrl = null;

          // Image logic
          if (data.images?.length > 0) {
            try { imageUrl = await getDownloadURL(ref(storage, data.images[0])); } catch (e) {}
          } else if (data.defaultImagePath) {
            try { imageUrl = await getDownloadURL(ref(storage, data.defaultImagePath)); } catch (e) {}
          } else if (data.thumbnail) {
            try { imageUrl = await getDownloadURL(ref(storage, data.thumbnail)); } catch (e) {}
          }

          return {
            id: doc.id,
            name: data.name,
            price: data.basePrice ?? 0,
            image: imageUrl,
            rating: data.ratingAvg ?? 0,
            reviews: data.reviewsCount ?? 0,
            departmentSlug: data.departmentSlug || "uncategorized",
            type: data.baseType || "Uncategorized",
            tags: data.tags || [], 
          };
        })
      );

      setProducts(list);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      if (!isRefreshing) setLoading(false);
    }
  }, []);

  // ✅ Initial Load
  useEffect(() => {
    loadProducts(false);
  }, [loadProducts]);

  // ✅ Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts(true);
    setRefreshing(false);
  }, [loadProducts]);

  // ✅ Filter Logic
  const filteredProducts = products.filter((p) => {
    
    // 1. Department
    let departmentMatch = false;
    if (selectedDepartment === "All") {
      departmentMatch = true;
    } else if (Array.isArray(p.departmentSlug)) {
      departmentMatch = p.departmentSlug.includes(selectedDepartment);
    } else {
      departmentMatch = p.departmentSlug === selectedDepartment;
    }

    // 2. Type
    const typeFilters = filters.type || [];
    const typeMatch = typeFilters.length === 0 || typeFilters.includes(p.type);

    // 3. Cover Material (Checks inside 'tags')
    const coverFilters = filters.covermaterial || [];
    const coverMatch = coverFilters.length === 0 || coverFilters.some(filter => {
       const searchFor = filter === "Fabrics" ? "fabric" : filter.toLowerCase();
       return p.tags.some(tag => tag.toLowerCase().includes(searchFor));
    });

    // 4. Frame Material (Checks inside 'tags')
    const frameFilters = filters.framematerial || [];
    const frameMatch = frameFilters.length === 0 || frameFilters.some(filter => {
       return p.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()));
    });

    // 5. Price
    const priceFilters = filters.price || [];
    let priceMatch = true;
    if (priceFilters.length > 0) {
      priceMatch = priceFilters.some((range) => {
        const price = parseFloat(p.price);
        if (range === "Under ₱5,000") return price < 5000;
        if (range === "₱5,000–₱9,999") return price >= 5000 && price <= 9999;
        if (range === "₱10,000–₱14,999") return price >= 10000 && price <= 14999;
        if (range === "₱15,000+") return price >= 15000;
        return false;
      });
    }

    return departmentMatch && typeMatch && coverMatch && frameMatch && priceMatch;
  });

  // ✅ Render Product
  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ProductDetails", { product: item })}
    >
      {item.image ? (
        <Image source={item.image} style={styles.image} contentFit="cover" transition={300} />
      ) : (
        <View style={[styles.image, styles.noImage]}><Text>No Image</Text></View>
      )}
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>₱{Number(item.price).toFixed(2)}</Text>
      <Text style={styles.rating}>⭐ {item.rating} ({item.reviews} Reviews)</Text>
    </TouchableOpacity>
  );

  // ✅ Department Bar
  const DepartmentBar = (
    <View style={styles.categoryContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {["All", "living-room", "bedroom", "dining-room", "outdoor"].map((dep) => (
          <TouchableOpacity
            key={dep}
            style={[styles.filterBtn, selectedDepartment === dep && styles.activeFilter]}
            onPress={() => { setSelectedDepartment(dep); resetFilters(); }}
          >
            <Text style={[styles.filterText, selectedDepartment === dep && styles.activeFilterText]}>
              {dep === "All" ? "All" : dep.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.header}>PRODUCTS</Text>
              <TouchableOpacity style={styles.filterButton} onPress={() => setFilterVisible(true)}>
                <Ionicons name="filter-outline" size={18} color="#333" />
                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            </View>
            {DepartmentBar}
          </View>
        }
        stickyHeaderIndices={[0]}

        // ✅ Attach Refresh Control
        refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2c6e49"]}
              tintColor="#2c6e49"
            />
        }
      />

      {loading && <ActivityIndicator style={styles.loading} size="small" color="#2c6e49" />}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        toggleFilter={toggleFilter}
        resetFilters={resetFilters}
        mode="department"               
        selectedDepartment={selectedDepartment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  header: { fontSize: 18, fontWeight: "bold", color: "#222" },
  filterButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterButtonText: { marginLeft: 6, fontSize: 14, fontWeight: "500", color: "#333" },
  categoryContainer: { backgroundColor: "#fff", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  filterScroll: { paddingHorizontal: 4 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#f3f3f3", marginRight: 10 },
  activeFilter: { backgroundColor: "#2c6e49" },
  filterText: { fontSize: 14, color: "#555" },
  activeFilterText: { color: "#fff", fontWeight: "600" },
  row: { justifyContent: "space-between", paddingHorizontal: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, marginVertical: 10, flex: 1, marginHorizontal: 4, padding: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  image: { width: "100%", height: 140, borderRadius: 10, marginBottom: 10, backgroundColor: "#f2f2f2" },
  noImage: { justifyContent: "center", alignItems: "center" },
  name: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  price: { fontSize: 14, fontWeight: "bold", color: "#2c6e49", marginBottom: 4 },
  rating: { fontSize: 12, color: "#777" },
  loading: { position: "absolute", top: "50%", left: "50%", marginLeft: -12, marginTop: -12 },
});