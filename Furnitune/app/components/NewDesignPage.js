import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { Image } from "expo-image";
import FilterModal from "./FilterModal";

export default function NewArrivalsPage({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Updated Filter State (Matches FilterModal)
  const [filters, setFilters] = useState({
    type: [],
    covermaterial: [],
    framematerial: [],
    price: [],
  });

  // ✅ Toggle Filters
  const toggleFilter = (key, value) => {
    setFilters((prev) => {
      const currentValues = prev[key] || [];
      let updatedValues;

      if (currentValues.includes(value)) {
        updatedValues = currentValues.filter((v) => v !== value);
      } else {
        updatedValues = [...currentValues, value];
      }

      // 🔹 Sync with CategoryBar if type filter changes
      if (key === "type") {
        if (updatedValues.length === 1) {
          setSelectedCategory(updatedValues[0]);
        } else {
          setSelectedCategory("All");
        }
      }

      return { ...prev, [key]: updatedValues };
    });
  };

  // ✅ Reset Filters (Used by Modal)
  const resetFilters = () => {
    setFilters({
      type: [],
      covermaterial: [],
      framematerial: [],
      price: [],
    });
    setSelectedCategory("All");
  };

  // Load selected category if passed from navigation
  useEffect(() => {
    if (route?.params?.product) {
      setSelectedCategory(route.params.product);
    }
  }, [route?.params]);

  // ---------------------------------------------------------
  // 🔹 Data Fetching Function
  // ---------------------------------------------------------
  const loadNewArrivals = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    
    const storage = getStorage();
    try {
      const q = query(
        collection(db, "products"),
        where("isNew", "==", true) // 🔹 Fetch only new arrivals
      );
      const querySnapshot = await getDocs(q);
      const list = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          let imageUrl = null;

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
            category: data.baseType || "Uncategorized", 
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
    loadNewArrivals(false);
  }, [loadNewArrivals]);

  // ✅ Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNewArrivals(true);
    setRefreshing(false);
  }, [loadNewArrivals]);


  // ✅ Advanced Filtering Logic
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;

    const typeFilters = filters.type || [];
    const typeMatch = typeFilters.length === 0 || typeFilters.includes(p.type);

    const coverFilters = filters.covermaterial || [];
    const coverMatch = coverFilters.length === 0 || coverFilters.some(filter => {
       const searchFor = filter === "Fabrics" ? "fabric" : filter.toLowerCase();
       return p.tags.some(tag => tag.toLowerCase().includes(searchFor));
    });

    const frameFilters = filters.framematerial || [];
    const frameMatch = frameFilters.length === 0 || frameFilters.some(filter => {
       return p.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()));
    });

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

    return typeMatch && coverMatch && frameMatch && priceMatch;
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
            // 🔴 FIX: Don't call resetFilters(), because it resets category to "All"
            onPress={() => {
              setFilters({ // Clear filters manually
                type: [],
                covermaterial: [],
                framematerial: [],
                price: [],
              });
              setSelectedCategory(cat); // Set category correctly
            }}
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
        // stickyHeaderIndices={[0]}  <-- Removed this (it makes the first product row sticky, not the header)

        refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2c6e49"]}
              tintColor="#2c6e49"
            />
        }
      />

      {loading && (
        <ActivityIndicator style={styles.loading} size="small" color="#2c6e49" />
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        toggleFilter={toggleFilter}
        resetFilters={resetFilters}
        mode="allTypes"                 
      />
    </View>
  );
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  header: { fontSize: 18, fontWeight: "bold", color: "#2c6e49" },
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