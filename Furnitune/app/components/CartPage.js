import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { app } from "./firebaseConfig";
import { useNavigation } from "@react-navigation/native";

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const auth = getAuth(app);
  const db = getFirestore(app);

  // 🔹 Navigate to product details
  const handleProductPress = (item) => {
    if (!item.productId) {
      Alert.alert("Missing Product Link", "This product cannot be opened.");
      return;
    }

    navigation.navigate("ProductDetails", {
      product: item.productId, // send the product ID as "product"
      selectedColor: item.selectedColor || null,
      selectedSize: item.selectedSize || null,
    });
  };

  // 🔹 Auth & Cart Fetch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchCartItems(currentUser.uid);
      } else {
        setUser(null);
        setCartItems([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchCartItems = async (uid) => {
    try {
      const cartRef = collection(db, "users", uid, "cart");
      const querySnapshot = await getDocs(cartRef);
      const items = [];
      querySnapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setCartItems(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === cartItems.length) {
      setSelected([]);
    } else {
      setSelected(cartItems.map((item) => item.id));
    }
  };

  const handleDelete = async (id) => {
    try {
      if (!user) return;
      const itemRef = doc(db, "users", user.uid, "cart", id);
      await deleteDoc(itemRef);
      setCartItems((prev) => prev.filter((item) => item.id !== id));
      setSelected((prev) => prev.filter((itemId) => itemId !== id));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const subtotal = cartItems
    .filter((item) => selected.includes(item.id))
    .reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2c6e49" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
        <Text style={styles.loginPrompt}>Please login to view your cart</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate("LoginPage")}
        >
          <Text style={styles.loginButtonText}>LOGIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🛒 Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MY CART</Text>
      </View>

      {/* 📦 Select All */}
      {cartItems.length > 0 && (
        <View style={styles.selectAllContainer}>
          <Checkbox
            value={selected.length === cartItems.length && cartItems.length > 0}
            onValueChange={toggleSelectAll}
            color="#2c6e49"
          />
          <Text style={styles.selectAllText}>Select All</Text>
        </View>
      )}

      {/* 🪑 Cart List */}
      {cartItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={70} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <Checkbox
                value={selected.includes(item.id)}
                onValueChange={() => toggleSelect(item.id)}
                color={selected.includes(item.id) ? "#2c6e49" : undefined}
                style={styles.checkbox}
              />

              {/* 🔹 Product Clickable Area */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                onPress={() => handleProductPress(item)}
                activeOpacity={0.8}
              >
                <Image
                  source={{
                    uri:
                      item.imageUrl ||
                      "https://via.placeholder.com/80x80?text=No+Image",
                  }}
                  style={styles.image}
                />

                <View style={styles.details}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.qty}>
                    Qty: {item.qty}{" "}
                    {item.selectedSize ? `• ${item.selectedSize}` : ""}
                  </Text>
                  {item.selectedColor && (
                    <Text style={styles.color}>Color: {item.selectedColor}</Text>
                  )}
                  <Text style={styles.price}>₱{item.price?.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>

              {/* 🗑️ Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={22} color="#444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 💳 Bottom Checkout Bar */}
      <View style={styles.footer}>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text
            style={[
              styles.totalValue,
              subtotal === 0 && { color: "#999" },
            ]}
          >
            ₱{subtotal.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            subtotal === 0 && { backgroundColor: "#ccc" },
          ]}
          disabled={subtotal === 0}
          onPress={async () => {
            try {
              const selectedItemsData = cartItems.filter((item) =>
                selected.includes(item.id)
              );

              if (selectedItemsData.length === 0) {
                Alert.alert("No items selected", "Please select at least one item.");
                return;
              }

              const total = selectedItemsData.reduce(
                (sum, item) => sum + (item.price || 0) * (item.qty || 1),
                0
              );

              const ordersRef = collection(db, "orders");
              const newOrder = await addDoc(ordersRef, {
                userId: user.uid,
                items: selectedItemsData,
                subtotal: total,
                shippingFee: 510,
                total: total + 510,
                status: "processing_order",
                createdAt: new Date(),
              });

              navigation.navigate("OrderPage", { orderId: newOrder.id });
            } catch (error) {
              console.error("Error creating order:", error);
            }
          }}
        >
          <Text style={styles.checkoutText}>
            {subtotal === 0 ? "SELECT ITEMS" : "CHECK OUT"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f6f2", paddingHorizontal: 16 },
  header: {
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c6e49",
    letterSpacing: 1,
  },
  selectAllContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginLeft: 6,
  },
  selectAllText: { fontSize: 13, color: "#333", marginLeft: 8, fontWeight: "500" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  checkbox: { marginRight: 8 },
  image: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  details: { flex: 1, marginLeft: 10 },
  name: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 2 },
  qty: { fontSize: 12, color: "#555" },
  color: { fontSize: 12, color: "#555" },
  price: { fontSize: 14, color: "#2c6e49", fontWeight: "700", marginTop: 4 },
  deleteButton: {
    backgroundColor: "#f2f0eb",
    padding: 8,
    borderRadius: 8,
  },
  footer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  totalWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalLabel: { fontSize: 14, color: "#444" },
  totalValue: { fontSize: 16, fontWeight: "700", color: "#2c6e49" },
  checkoutButton: {
    backgroundColor: "#2c6e49",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  checkoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  emptyState: { flex: 1, alignItems: "center", marginTop: 120 },
  emptyText: { fontSize: 14, color: "#666", marginTop: 10 },
  loginPrompt: { fontSize: 16, color: "#333", marginBottom: 10 },
  loginButton: {
    backgroundColor: "#2c6e49",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
