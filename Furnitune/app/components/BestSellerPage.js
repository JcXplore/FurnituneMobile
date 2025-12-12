import React, { useEffect, useState, useCallback } from "react"; // ✅ Added useCallback
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
  Animated,
  Easing,
  useWindowDimensions,
  RefreshControl, // ✅ Added RefreshControl
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { Image } from "expo-image";
import FilterModal from "./FilterModal";

export default function BestSellerPage({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // ✅ Refreshing state
  
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // ✅ Updated Filter State
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

  // Load selected category if passed from navigation
  useEffect(() => {
    if (route?.params?.product) {
      setSelectedCategory(route.params.product);
    }
  }, [route?.params]);

  // ---------------------------------------------------------
  // 🔹 REFACTORED: Data Fetching Function
  // ---------------------------------------------------------
  const loadBestSellers = useCallback(async (isRefreshing = false) => {
    // Only show big spinner if not refreshing
    if (!isRefreshing) setLoading(true);

    const storage = getStorage();
    try {
      const q = query(collection(db, "products"), where("isBestSeller", "==", true));
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
    loadBestSellers(false);
  }, [loadBestSellers]);

  // ✅ Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBestSellers(true);
    setRefreshing(false);
  }, [loadBestSellers]);


  // ✅ Advanced Filtering Logic
  const filteredProducts = products.filter((p) => {
    // 1. Top Bar Category Filter
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;

    // 2. Type Filter (From Modal)
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

    // 5. Price Filter
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
      style={[styles.card, isTablet && styles.cardTablet]}
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
      <Text style={[styles.name, isTablet && styles.nameTablet]}>{item.name}</Text>
      <Text style={[styles.price, isTablet && styles.priceTablet]}>
        ₱{Number(item.price).toFixed(2)}
      </Text>
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
            style={[styles.filterBtn, selectedCategory === cat && styles.activeFilter]}
            onPress={() => { setSelectedCategory(cat); resetFilters(); }}
          >
            <Text
              style={[styles.filterText, selectedCategory === cat && styles.activeFilterText]}
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
      {/* Product list */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={isTablet ? 3 : 2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.header}>BEST SELLERS</Text>
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
        <ActivityIndicator style={styles.loading} size="small" color="#2c6e49" />
      )}

      {/* Filter Modal */}
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
  filterText: { fontSize: 14, color: "#555" },
  activeFilter: { backgroundColor: "#2c6e49" },
  activeFilterText: { color: "#fff", fontWeight: "600" },
  row: { justifyContent: "space-between", paddingHorizontal: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, marginVertical: 10, flex: 1, marginHorizontal: 4, padding: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  image: { width: "100%", height: 140, borderRadius: 10, marginBottom: 10, backgroundColor: "#f2f2f2" },
  noImage: { justifyContent: "center", alignItems: "center" },
  name: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  nameTablet: { fontSize: 18 },
  price: { fontSize: 14, fontWeight: "bold", color: "#2c6e49", marginBottom: 4 },
  priceTablet: { fontSize: 18 },
  rating: { fontSize: 12, color: "#777" },
  loading: { position: "absolute", top: "50%", left: "50%", marginLeft: -12, marginTop: -12 },
  cardTablet: { flex: 0.3, marginHorizontal: 10, padding: 16 },
});