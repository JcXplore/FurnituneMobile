import React, { useEffect, useState, useCallback } from "react"; // ✅ Added useCallback
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
import { useFocusEffect } from "@react-navigation/native";
import FilterModal from "./FilterModal";

export default function CollectionsPage({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("All");
  const [loading, setLoading] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // ✅ Refreshing state

  // ✅ New Filter State
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
      if (currentValues.includes(value)) {
        return { ...prev, [key]: currentValues.filter((v) => v !== value) };
      } else {
        return { ...prev, [key]: [...currentValues, value] };
      }
    });
  };

  // ✅ Reset Filters
  const resetFilters = () => {
    setFilters({
      type: [],
      covermaterial: [],
      framematerial: [],
      price: [],
    });
  };

  // ✅ Update collection from route params
  useFocusEffect(
    useCallback(() => {
      if (route.params?.collection) {
        setSelectedCollection(route.params.collection);
      }
    }, [route.params])
  );

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

          // Image loading logic
          let imageUrl = null;
          if (data.defaultImagePath) {
            try { imageUrl = await getDownloadURL(ref(storage, data.defaultImagePath)); } catch (e) {}
          }
          if (!imageUrl && data.imagesBySize) {
            const firstSizeKey = Object.keys(data.imagesBySize)[0];
            if (firstSizeKey && data.imagesBySize[firstSizeKey]?.length > 0) {
              try { imageUrl = await getDownloadURL(ref(storage, data.imagesBySize[firstSizeKey][0])); } catch (e) {}
            }
          }
          if (!imageUrl && data.images?.length > 0) {
            try { imageUrl = await getDownloadURL(ref(storage, data.images[0])); } catch (e) {}
          }
          if (!imageUrl) {
            imageUrl = "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";
          }

          return {
            id: doc.id,
            ...data,
            name: data.name,
            price: data.basePrice ?? 0,
            image: imageUrl,
            rating: data.ratingAvg ?? 0,
            reviews: data.reviewsCount ?? 0,
            collection: data.collection || "Uncategorized",
            category: data.baseType || data.type || null,
            type: data.baseType || data.type || null,
            
            // ✅ Capture tags for material filtering
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

  // 🔹 Get all unique collections (exclude Uncategorized)
  const collections = [
    "All",
    ...new Set(products.map((p) => p.collection).filter((c) => c !== "Uncategorized")),
  ];

  // ✅ Advanced Filtering Logic
  const filteredProducts = products.filter((p) => {
    
    // 1. Collection Filter (Primary)
    if (selectedCollection !== "All" && p.collection !== selectedCollection) return false;

    // 2. Type Filter
    const typeFilters = filters.type || [];
    if (typeFilters.length > 0 && !typeFilters.includes(p.type)) return false;

    // 3. Cover Material (Checks inside 'tags')
    const coverFilters = filters.covermaterial || [];
    if (coverFilters.length > 0) {
      const hasMatch = coverFilters.some(filter => {
         const searchFor = filter === "Fabrics" ? "fabric" : filter.toLowerCase();
         return p.tags.some(tag => tag.toLowerCase().includes(searchFor));
      });
      if (!hasMatch) return false;
    }

    // 4. Frame Material (Checks inside 'tags')
    const frameFilters = filters.framematerial || [];
    if (frameFilters.length > 0) {
      const hasMatch = frameFilters.some(filter => {
         return p.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()));
      });
      if (!hasMatch) return false;
    }

    // 5. Price Filter
    const priceFilters = filters.price || [];
    if (priceFilters.length > 0) {
      const priceMatch = priceFilters.some((range) => {
        const price = parseFloat(p.price);
        if (range === "Under ₱5,000") return price < 5000;
        if (range === "₱5,000–₱9,999") return price >= 5000 && price <= 9999;
        if (range === "₱10,000–₱14,999") return price >= 10000 && price <= 14999;
        if (range === "₱15,000+") return price >= 15000;
        return false;
      });
      if (!priceMatch) return false;
    }

    return true;
  });

  // 🔹 Product card
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

  // 🔹 Collection filter bar
  const CollectionBar = (
    <View style={styles.categoryContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {collections.map((col) => (
          <TouchableOpacity
            key={col}
            style={[
              styles.filterBtn,
              selectedCollection === col && styles.activeFilter,
            ]}
            onPress={() => {
              setSelectedCollection(col);
              resetFilters();
            }}
          >
            <Text
              style={[
                styles.filterText,
                selectedCollection === col && styles.activeFilterText,
              ]}
            >
              {col}
            </Text>
          </TouchableOpacity>
        ))}
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
              <Text style={styles.header}>
                {selectedCollection === "All"
                  ? "COLLECTIONS"
                  : selectedCollection.toUpperCase()}
              </Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setFilterVisible(true)}
              >
                <Ionicons name="filter-outline" size={18} color="#333" />
                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            </View>
            {CollectionBar}
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

      {/* Loading */}
      {loading && (
        <ActivityIndicator
          style={styles.loading}
          size="small"
          color="#2c6e49"
        />
      )}

      {/* ✅ New Filter Modal */}
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