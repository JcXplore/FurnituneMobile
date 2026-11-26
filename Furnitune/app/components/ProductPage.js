import React, { useEffect, useState, useCallback } from "react"; 
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl, 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { Image } from "expo-image";
import FilterModal from "./FilterModal";

export default function ProductPage({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // New State for Error/Offline Status
  const [error, setError] = useState(null);

  // Sidebar filters
  const [filters, setFilters] = useState({
    type: [],
    covermaterial: [],
    framematerial: [],
    price: [],
  });

  const toggleFilter = (category, value) => {
    setFilters((prev) => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      if (category === "type") {
        if (updated.length === 1) {
          setSelectedCategory(updated[0]);
        } else {
          setSelectedCategory("All");
        }
      }
      return { ...prev, [category]: updated };
    });
  };

  const resetFilters = () => {
    setFilters({
      type: [],
      covermaterial: [],
      framematerial: [],
      price: [],
    });
  };

  // ---------------------------------------------------------
  // 🔹 MAIN LOGIC: Load Data
  // ---------------------------------------------------------
  
  const loadProducts = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    setError(null); 

    const storage = getStorage();
    let rawDataList = [];

    try {
      // ✅ 1. FETCH PRICE DELTAS FROM `sizePriceRules`
      const rulesRef = collection(db, "sizePriceRules");
      const rulesSnap = await getDocs(rulesRef);
      const typeDeltas = {};

      rulesSnap.forEach((doc) => {
        const data = doc.data();
        if (data.type && data.mode === "delta") {
          const val = Number(data.value) || 0;
          
          if (!typeDeltas[data.type]) {
            // Default assumes the base price is 0 delta
            typeDeltas[data.type] = { min: 0, max: 0 }; 
          }
          
          if (val > typeDeltas[data.type].max) typeDeltas[data.type].max = val;
          if (val < typeDeltas[data.type].min) typeDeltas[data.type].min = val;
        }
      });

      // 2. CHECK: Did MenuBar send specific SEARCH RESULTS?
      if (route.params && route.params.searchResults) {
        rawDataList = route.params.searchResults;
        if (!isRefreshing) setSelectedCategory("All"); 
      } 
      // 3. CHECK: Did Landing Page send a Category? (e.g. "Chairs")
      else if (route.params && route.params.product) {
          if (!isRefreshing) setSelectedCategory(route.params.product);
          
          const productsRef = collection(db, "products");
          const q = query(productsRef);
          const querySnapshot = await getDocs(q);
          rawDataList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      // 4. DEFAULT: Just load everything
      else {
        const productsRef = collection(db, "products");
        const q = query(productsRef);
        const querySnapshot = await getDocs(q);
        rawDataList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // 5. RESOLVE IMAGES & APPLY PRICE RANGES
      const processedList = await Promise.all(
        rawDataList.map(async (data) => {
          let imageUrl = null;
          try {
            if (data.image && data.image.startsWith("http")) {
                imageUrl = data.image;
            } else if (Array.isArray(data.images) && data.images.length > 0) {
              imageUrl = await getDownloadURL(ref(storage, data.images[0]));
            } else if (data.defaultImagePath) {
              imageUrl = await getDownloadURL(ref(storage, data.defaultImagePath));
            } else if (data.thumbnail) {
              imageUrl = await getDownloadURL(ref(storage, data.thumbnail));
            }
          } catch (err) {
            console.warn(`Image error:`, err);
          }

          // Calculate min and max price based on the rules found
          const baseType = data.baseType || "Uncategorized";
          const basePrice = Number(data.basePrice) || 0;
          const deltas = typeDeltas[baseType] || { min: 0, max: 0 };

          return {
            id: data.id,
            name: data.name,
            price: basePrice, // Kept as base for the sidebar filters
            minPrice: basePrice + deltas.min, // NEW
            maxPrice: basePrice + deltas.max, // NEW
            image: imageUrl,
            rating: data.ratingAvg ?? 0,
            reviews: data.reviewsCount ?? 0,
            category: baseType,
            tags: data.tags || [],
          };
        })
      );

      setProducts(processedList);
    } catch (err) {
      console.error("Error loading products:", err);
      setError("No Internet Connection");
    } finally {
      if (!isRefreshing) setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(false);
  }, [route.params]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts(true);
    setRefreshing(false);
  }, [route.params]); 

  // Filtering logic
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;

    const typeFilters = filters.type || [];
    if (typeFilters.length > 0 && !typeFilters.includes(p.category)) return false;

    const coverFilters = filters.covermaterial || [];
    if (coverFilters.length > 0) {
      const hasMatch = coverFilters.some(filter => {
         const searchFor = filter === "Fabrics" ? "fabric" : filter.toLowerCase();
         return p.tags.some(tag => tag.toLowerCase().includes(searchFor));
      });
      if (!hasMatch) return false;
    }

    const frameFilters = filters.framematerial || [];
    if (frameFilters.length > 0) {
      const hasMatch = frameFilters.some(filter => {
         return p.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()));
      });
      if (!hasMatch) return false;
    }

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

  const renderProduct = ({ item }) => {
    // Determine if we should show a range or a single price
    const displayPrice = 
      item.minPrice !== item.maxPrice 
        ? `₱${Number(item.minPrice).toLocaleString()} - ₱${Number(item.maxPrice).toLocaleString()}`
        : `₱${Number(item.minPrice).toLocaleString()}`;

    return (
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
        <Text style={styles.price}>{displayPrice}</Text>
        <Text style={styles.rating}>
          ⭐ {item.rating} ({item.reviews} Reviews)
        </Text>
      </TouchableOpacity>
    );
  };

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

  // RENDER ERROR SCREEN
  if (error && !loading && products.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Connection Error</Text>
        </View>
        <ScrollView 
          contentContainerStyle={styles.errorContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2c6e49"]}
            />
          }
        >
          <Ionicons name="cloud-offline-outline" size={60} color="#ccc" />
          <Text style={styles.errorTitle}>No Internet Connection</Text>
          <Text style={styles.errorText}>
            Please check your WiFi or data connection and try again.
          </Text>
          <TouchableOpacity 
            style={styles.retryBtn} 
            onPress={() => loadProducts(false)}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>
            {route.params?.searchResults ? "SEARCH RESULTS" : "ALL FURNITURES"}
        </Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterVisible(true)}
        >
          <Ionicons name="filter-outline" size={18} color="#333" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Product list */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={CategoryBar}
        stickyHeaderIndices={[0]}
        initialNumToRender={8}
        windowSize={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={false}
        
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c6e49",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterButtonText: {
    fontSize: 14,
    marginLeft: 6,
    color: "#333",
  },
  categoryContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    elevation: 3,
    zIndex: 50,
  },
  filterScroll: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f2f2f2",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    fontSize: 13,
    color: "#444",
  },
  activeFilter: {
    backgroundColor: "#2c6e49",
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "bold",
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  card: {
    flex: 1,
    marginVertical: 10,
    marginHorizontal: 6,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: "100%",
    height: 130,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
  },
  noImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 4,
    textAlign: "center",
    color: "#333",
  },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c6e49",
    marginBottom: 2,
  },
  rating: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -12,
    marginTop: -12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: "#2c6e49",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "bold",
  }
});