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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function MenuBar() {
  const [menuVisible, setMenuVisible] = useState(false);
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [menuVisible]);

  const handleNavigate = (screen) => {
    setMenuVisible(false);
    navigation.navigate(screen);
  };

  return (
    <View style={styles.header}>
      <Text style={styles.logo}>FURNITUNE</Text>
      <TouchableOpacity onPress={() => setMenuVisible(true)}>
        <Ionicons name="menu-outline" size={28} color="#2c6e49" />
      </TouchableOpacity>
      <Modal
        animationType="none"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.menuContainer,
                  { transform: [{ translateX: slideAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setMenuVisible(false)}
                >
                  <Ionicons name="close-outline" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.menuLogo}>FURNITUNE</Text>
                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={18} color="#555" />
                  <TextInput
                    placeholder="What are you looking for?"
                    placeholderTextColor="#888"
                    style={styles.searchInput}
                  />
                </View>
                <Text style={styles.sectionTitle}>CATEGORIES</Text>
                <TouchableOpacity
                  style={styles.itemBtn}
                  onPress={() => handleNavigate("ProductPage")}
                >
                  <Text style={styles.item}>All Furnitures</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.itemBtn}
                  onPress={() => handleNavigate("BestSellerPage")}
                >
                  <Text style={styles.item}>Best Sellers</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.itemBtn}
                  onPress={() => handleNavigate("NewDesignPage")}
                >
                  <Text style={styles.item}>New Designs</Text>
                </TouchableOpacity>


                <Text style={styles.sectionTitle}>ROOMS</Text>

                <TouchableOpacity
                  style={styles.itemBtn}
                  onPress={() => navigation.navigate("RoomsPage", { department: "living-room" })}
                >
                  <Text>Living Room</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.itemBtn}
                  onPress={() => navigation.navigate("RoomsPage", { department: "dining-room" })}
                >
                  <Text>Dining Room</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.itemBtn}
                  onPress={() => navigation.navigate("RoomsPage", { department: "bedroom" })}
                >
                  <Text>Bedroom</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.itemBtn}
                  onPress={() => navigation.navigate("RoomsPage", { department: "outdoor" })}
                >
                  <Text>Outdoor</Text>
                </TouchableOpacity>


                <Text style={styles.sectionTitle}>OTHER SERVICES</Text>
                <TouchableOpacity
                  style={styles.itemBtn}
                  onPress={() => handleNavigate("Customization")}
                >
                  <Text style={styles.item}>Customization</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.itemBtn}  onPress={() => navigation.navigate("Repair")} 
                >
                  <Text style={styles.item}>Repair Management</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff", // beige background
    marginTop: 30, // 👈 moves the whole bar a little lower
    marginBottom: 0,
    
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c6e49",
  },
  overlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.3)",
  flexDirection: "row",
  justifyContent: "flex-end", // menu slides in from right
},
menuContainer: {
  flex: 1, // 👈 ensures full height
  maxWidth: 300, // keep width limited
  backgroundColor: "#fdfbf7",
  padding: 20,
},
  closeBtn: {
    alignSelf: "flex-end",
  },
  menuLogo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c6e49",
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    backgroundColor: "#fff",
    elevation: 2,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  sectionTitle: {
    marginTop: 15,
    marginBottom: 5,
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  itemBtn: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  item: {
    fontSize: 14,
    color: "#444",
  },
});



                