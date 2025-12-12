import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Keyboard,
  FlatList,
  Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig"; 

const { width } = Dimensions.get("window");

export default function MenuBar() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  // Store ALL products here so we can find "siblings" easily
  const [allProducts, setAllProducts] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  const navigation = useNavigation();

  const menuWidth = Math.min(360, Math.round(width * 0.82));
  const slideAnim = useRef(new Animated.Value(menuWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 1. Fetch all active products once
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), where("active", "==", true));
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllProducts(products);
      } catch (err) {
        console.log("Error fetching products for search:", err);
      }
    };
    fetchProducts();
  }, []);

  const openMenu = () => {
    setMenuVisible(true);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  const closeMenu = () => {
    Keyboard.dismiss(); 
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: menuWidth, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
      setSearchText(""); 
      setFilteredData([]); 
    });
  };

  const handleNavigate = (screen, params = {}) => {
    closeMenu();
    setTimeout(() => navigation.navigate(screen, params), 280);
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    if (text.length > 0) {
      const matches = allProducts.filter(item => {
        const itemData = item.name ? item.name.toUpperCase() : ''.toUpperCase();
        const textData = text.toUpperCase();
        return itemData.includes(textData);
      });
      setFilteredData(matches);
    } else {
      setFilteredData([]);
    }
  };

  // ---------------------------------------------------------
  // UPDATED FUNCTION: Selects item but brings its category friends along
  // ---------------------------------------------------------
  const handleSelectProduct = (selectedProduct) => {
    closeMenu();

    // 1. Start with the product the user clicked
    let organizedResults = [selectedProduct];

    // 2. If the product has a category, find all other items in that same category
    if (selectedProduct.categorySlug) {
      const siblings = allProducts.filter(item => 
        item.categorySlug === selectedProduct.categorySlug && // Same category (e.g. 'beds')
        item.id !== selectedProduct.id // Don't add the clicked one twice
      );
      // 3. Add the siblings AFTER the clicked item
      organizedResults = [...organizedResults, ...siblings];
    }

    // 4. Navigate with the sorted list
    setTimeout(() => {
      navigation.navigate("ProductPage", { searchResults: organizedResults });
      setSearchText(""); 
      setFilteredData([]);
    }, 300);
  };

  const handleSearchSubmit = () => {
    if (filteredData.length > 0) {
      closeMenu();
      setTimeout(() => {
        navigation.navigate("ProductPage", { searchResults: filteredData });
      }, 300);
    }
  };

  const topPadding = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 20;

  return (
    <View style={styles.header}>
      <Text style={styles.logo}>FURNITUNE</Text>
      <TouchableOpacity onPress={openMenu}>
        <Ionicons name="menu-outline" size={28} color="#2c6e49" />
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeMenu}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.drawer,
              { width: menuWidth, transform: [{ translateX: slideAnim }], paddingTop: topPadding + 8 },
            ]}
          >
            <SafeAreaView style={styles.drawerSafe}>
              <TouchableOpacity style={styles.closeBtn} onPress={closeMenu}>
                <Ionicons name="close-outline" size={28} color="#333" />
              </TouchableOpacity>

              <Text style={styles.menuLogo}>FURNITUNE</Text>

              <View style={styles.searchBarContainer}>
                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={18} color="#555" />
                  <TextInput
                    placeholder="Search (e.g. 'Bed', 'Sofa')"
                    placeholderTextColor="#888"
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={handleSearchChange}
                    returnKeyType="search"
                    onSubmitEditing={handleSearchSubmit}
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearchChange("")}>
                       <Ionicons name="close-circle" size={16} color="#ccc" />
                    </TouchableOpacity>
                  )}
                </View>

                {filteredData.length > 0 && (
                  <View style={styles.suggestionList}>
                    <FlatList
                      data={filteredData}
                      keyboardShouldPersistTaps="handled"
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={styles.suggestionItem} 
                          onPress={() => handleSelectProduct(item)}
                        >
                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                             <Text style={styles.suggestionText} numberOfLines={1}>{item.name}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#ccc" />
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
              </View>

              <View style={{flex: 1}}> 
                <Text style={styles.sectionTitle}>CATEGORIES</Text>
                <TouchableOpacity style={styles.itemBtn} onPress={() => handleNavigate("ProductPage")}>
                  <Text style={styles.item}>All Furnitures</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.itemBtn} onPress={() => handleNavigate("BestSellerPage")}>
                  <Text style={styles.item}>Best Sellers</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.itemBtn} onPress={() => handleNavigate("NewDesignPage")}>
                  <Text style={styles.item}>New Designs</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>ROOMS</Text>
                {[
                  ["Living Room", "living-room"],
                  ["Dining Room", "dining-room"],
                  ["Bedroom", "bedroom"],
                  ["Outdoor", "outdoor"],
                ].map(([label, department]) => (
                  <TouchableOpacity
                    key={label}
                    style={styles.itemBtn}
                    onPress={() => handleNavigate("RoomsPage", { department })}
                  >
                    <Text style={styles.item}>{label}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.sectionTitle}>OTHER SERVICES</Text>
                <TouchableOpacity style={styles.itemBtn} onPress={() => handleNavigate("CustomizationPage")}>
                  <Text style={styles.item}>Customization</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.itemBtn} onPress={() => handleNavigate("Repair")}>
                  <Text style={styles.item}>Repair Management</Text>
                </TouchableOpacity>
              </View>

            </SafeAreaView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, marginTop: 30 },
  logo: { fontSize: 20, fontWeight: "bold", color: "#2c6e49" },
  modalOverlay: { flex: 1, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.30)", justifyContent: "flex-end" },
  backdrop: { flex: 1 },
  drawer: { backgroundColor: "#fdfbf7", height: "100%", shadowColor: "#000", shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
  drawerSafe: { flex: 1, paddingHorizontal: 18 },
  closeBtn: { alignSelf: "flex-end", marginBottom: 6 },
  menuLogo: { fontSize: 22, fontWeight: "bold", color: "#2c6e49", marginBottom: 14, marginTop: 2 },
  
  searchBarContainer: { zIndex: 10 }, 
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 5, backgroundColor: "#fff" },
  searchInput: { marginLeft: 8, flex: 1, fontSize: 14, color: "#333" },
  
  suggestionList: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    maxHeight: 220,
    zIndex: 999,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    alignItems: 'center'
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },

  sectionTitle: { marginTop: 12, marginBottom: 6, fontSize: 14, fontWeight: "bold", color: "#333" },
  itemBtn: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  item: { fontSize: 14, color: "#444" },
});