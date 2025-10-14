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
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { Image } from "expo-image";
import FilterModal from "./FilterModal";


export default function ProductPage({ navigation, route }) {
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
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      // 🔹 Sync with CategoryBar if type filter changes
      if (category === "type") {
        if (updated.length === 1) {
          // One type selected → focus that category
          setSelectedCategory(updated[0]);
        } else {
          // Two or more types (or none) → reset to "All"
          setSelectedCategory("All");
        }
      }

      return { ...prev, [category]: updated };
    });
  };

  const resetFilters = () => {
  setFilters({
    type: [],
    sizes: [],
    materials: [],
    seats: [],
    shapes: [],
  });
};

  // Load selected category if passed from navigation
  useEffect(() => {
    if (route?.params?.product) {
      setSelectedCategory(route.params.product);
    }
  }, [route?.params]);

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      const storage = getStorage();
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const list = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const data = doc.data();

            // Try to load thumbnail, fallback to first image
            let imageUrl = null;
            if (data.images) {
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
    // Category filter
    if (selectedCategory !== "All" && p.category !== selectedCategory)
      return false;

    // Type filter
    if (filters.type.length > 0 && !filters.type.includes(p.category))
      return false;

    // Size filter
    if (filters.sizes.length > 0 && !filters.sizes.includes(p.size))
      return false;

    // Material filter
    if (filters.materials.length > 0 && !filters.materials.includes(p.material))
      return false;

    // Seats filter
    if (filters.seats.length > 0 && !filters.seats.includes(p.seats))
      return false;

    // Shape filter
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
  <ScrollView style={styles.filterContainer} showsVerticalScrollIndicator={false}>
    <Text style={styles.sidebarTitle}>ALL FURNITURES</Text>

    {/* Type */}
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Type</Text>
      {["Beds", "Sofas", "Chairs", "Tables", "Benches", "Sectionals", "Ottomans"].map((t) => (
        <TouchableOpacity
          key={t}
          style={styles.checkboxRow}
          onPress={() => toggleFilter("type", t)}
        >
          <Ionicons
            name={filters.type.includes(t) ? "checkbox-outline" : "square-outline"}
            size={18}
            color="#333"
          />
          <Text style={styles.checkboxLabel}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.divider} />

    {/* Sizes */}
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Sizes</Text>
      {["Smaller than 60", '60" - 69"', '70" - 79"', '80" - 89"', '90" - 99"'].map((s) => (
        <TouchableOpacity
          key={s}
          style={styles.checkboxRow}
          onPress={() => toggleFilter("sizes", s)}
        >
          <Ionicons
            name={filters.sizes.includes(s) ? "checkbox-outline" : "square-outline"}
            size={18}
            color="#333"
          />
          <Text style={styles.checkboxLabel}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.divider} />

    {/* Materials */}
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Materials</Text>
      {["Fabrics", "Leather", "Wood"].map((m) => (
        <TouchableOpacity
          key={m}
          style={styles.checkboxRow}
          onPress={() => toggleFilter("materials", m)}
        >
          <Ionicons
            name={filters.materials.includes(m) ? "checkbox-outline" : "square-outline"}
            size={18}
            color="#333"
          />
          <Text style={styles.checkboxLabel}>
            {m}
            {m === "Fabrics" && (
              <Text style={styles.subText}> (Marble, Terracota, etc.)</Text>
            )}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.divider} />

    {/* Number of Seats */}
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Number of Seats</Text>
      {["4 Seater", "6 Seater", "8 Seater", "Extendable"].map((n) => (
        <TouchableOpacity
          key={n}
          style={styles.checkboxRow}
          onPress={() => toggleFilter("seats", n)}
        >
          <Ionicons
            name={filters.seats.includes(n) ? "checkbox-outline" : "square-outline"}
            size={18}
            color="#333"
          />
          <Text style={styles.checkboxLabel}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.divider} />

    {/* Product Shape */}
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Product Shape</Text>
      {["Rectangle", "Round", "Square"].map((sh) => (
        <TouchableOpacity
          key={sh}
          style={styles.checkboxRow}
          onPress={() => toggleFilter("shapes", sh)}
        >
          <Ionicons
            name={filters.shapes.includes(sh) ? "checkbox-outline" : "square-outline"}
            size={18}
            color="#333"
          />
          <Text style={styles.checkboxLabel}>{sh}</Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.buttonRow}>
      <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
        <Text style={styles.resetText}>Reset</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.applyBtn}
        onPress={() => setFilterVisible(false)}
      >
        <Text style={styles.applyText}>Apply Filters</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>ALL FURNITURES</Text>
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
        mode="allTypes"                 // all types mode
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* 🔹 Header */
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
  filterHeaderRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
  backgroundColor: "#fff",
  elevation: 3,
},
filterHeaderTitle: {
  fontSize: 18,
  fontWeight: "bold",
  color: "#2C2C2C",
  textTransform: "uppercase",
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

  /* 🔹 Category bar */
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

  /* 🔹 Product grid */
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


sidebarTitle: {
  fontSize: 16,
  fontWeight: "bold",
  letterSpacing: 1,
  color: "#2C2C2C",
  textTransform: "uppercase",
  marginBottom: 10,
  textShadowColor: "rgba(0,0,0,0.2)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 1,
  borderBottomWidth: 0.5,
  borderBottomColor: "#B8B6AE",
  paddingBottom: 6,
},

section: {
  marginTop: 14,
  marginBottom: 6,
},

sectionHeader: {
  fontSize: 13,
  fontWeight: "600",
  color: "#3A3A3A",
  marginBottom: 8,
},

checkboxRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 6,
  paddingLeft: 6,
},

checkboxLabel: {
  marginLeft: 8,
  fontSize: 13,
  color: "#333",
},

subText: {
  fontStyle: "italic",
  color: "#777",
  fontSize: 12,
},

divider: {
  height: 1,
  backgroundColor: "#D8D6CC",
  marginVertical: 10,
},

applyContainer: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "#FAF8F2",
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 10,
  borderTopWidth: 1,
  borderTopColor: "#D8D6CC",
  elevation: 8,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowOffset: { width: 0, height: -2 },
  shadowRadius: 6,
},
buttonRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 20,
  marginBottom: 10,
  gap: 10,
},

resetBtn: {
  flex: 1,
  backgroundColor: "#e0e0e0",
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: "center",
},

resetText: {
  color: "#333",
  fontWeight: "600",
  fontSize: 15,
},

applyBtn: {
  flex: 1,
  backgroundColor: "#2c6e49",
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: "center",
},
applyText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
  letterSpacing: 0.5,
},
modalWrapper: {
  flex: 1,
  backgroundColor: "#fff",
  height: "100%",
  paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
},
  /* 🔹 Loading */
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -12,
    marginTop: -12,
  },
});
