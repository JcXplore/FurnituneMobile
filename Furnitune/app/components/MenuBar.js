import React, { useState, useRef } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig"; // Import your Firebase config

const { width } = Dimensions.get("window");

export default function MenuBar() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const navigation = useNavigation();

  const menuWidth = Math.min(360, Math.round(width * 0.82));
  const slideAnim = useRef(new Animated.Value(menuWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: menuWidth, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setMenuVisible(false));
  };

  const handleNavigate = (screen, params = {}) => {
    closeMenu();
    setTimeout(() => navigation.navigate(screen, params), 280);
  };

  // 🔹 Search function querying Firebase
  const handleSearchSubmit = async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();

    try {
      const productsRef = collection(db, "products");
      const q = query(
        productsRef,
        where("active", "==", true),
        where("nameLowerCase", ">=", searchText.toLowerCase()),
        where("nameLowerCase", "<=", searchText.toLowerCase() + "\uf8ff")
      );

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      closeMenu();
      setTimeout(() => {
        navigation.navigate("ProductPage", { searchResults: results });
        setSearchText("");
      }, 300);
    } catch (err) {
      console.error("Search error:", err);
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

              {/* 🔹 Search Bar */}
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#555" />
                <TextInput
                  placeholder="Search products..."
                  placeholderTextColor="#888"
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={setSearchText}
                  returnKeyType="search"
                  onSubmitEditing={handleSearchSubmit}
                />
              </View>

              {/* 🔹 Menu Items */}
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
                  <Text>{label}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.sectionTitle}>OTHER SERVICES</Text>
              <TouchableOpacity style={styles.itemBtn} onPress={() => handleNavigate("CustomizationPage")}>
                <Text style={styles.item}>Customization</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.itemBtn} onPress={() => handleNavigate("Repair")}>
                <Text style={styles.item}>Repair Management</Text>
              </TouchableOpacity>
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
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 18, backgroundColor: "#fff" },
  searchInput: { marginLeft: 8, flex: 1, fontSize: 14, color: "#333" },
  sectionTitle: { marginTop: 12, marginBottom: 6, fontSize: 14, fontWeight: "bold", color: "#333" },
  itemBtn: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  item: { fontSize: 14, color: "#444" },
});
