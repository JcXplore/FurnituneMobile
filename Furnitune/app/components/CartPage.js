import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
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
} from "firebase/firestore";
import { app } from "./firebaseConfig"; // ✅ your Firebase config file
import { useNavigation } from "@react-navigation/native";

export default function CartPage() {
  const [selected, setSelected] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const auth = getAuth(app);
  const db = getFirestore(app);

  // ✅ Watch for user login state
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

  // ✅ Fetch user’s cart from Firestore (subcollection: users/{uid}/cart)
  const fetchCartItems = async (uid) => {
    try {
      const cartRef = collection(db, "users", uid, "cart");
      const querySnapshot = await getDocs(cartRef);
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setCartItems(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  // ✅ Toggle selected items
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ✅ Delete item from Firestore (subcollection)
  const handleDelete = async (id) => {
    try {
      if (!user) return;
      const itemRef = doc(db, "users", user.uid, "cart", id);
      await deleteDoc(itemRef);
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4E6655" />
      </View>
    );
  }

  // ✅ When user is not logged in
  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.loginPrompt}>PLEASE LOGIN TO VIEW YOUR CART.</Text>
        <TouchableOpacity onPress={() => navigation.navigate("LoginPage")}>
          <Text style={styles.loginLink}>LOG IN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ When user is logged in
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MY CART</Text>

      {cartItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Your cart is empty.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <Checkbox
                value={selected.includes(item.id)}
                onValueChange={() => toggleSelect(item.id)}
                color={selected.includes(item.id) ? "#000" : undefined}
                style={styles.checkbox}
              />

              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
              ) : (
                <Image
                  source={require("../assets/sofa.png")}
                  style={styles.image}
                />
              )}

              <View style={styles.details}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.qty}>Qty: {item.qty}</Text>
              </View>

              <Text style={styles.price}>₱{item.price?.toFixed(2)}</Text>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {cartItems.length > 0 && (
        <TouchableOpacity style={styles.checkoutButton}>
          <Text style={styles.checkoutText}>CHECK OUT</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3E7",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3E3E3E",
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    elevation: 2,
  },
  checkbox: {
    marginRight: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: "contain",
  },
  details: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "500",
  },
  qty: {
    fontSize: 12,
    color: "#666",
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#EDEAE0",
    borderRadius: 8,
    padding: 6,
  },
  checkoutButton: {
    backgroundColor: "#4E6655",
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  checkoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loginPrompt: {
    fontSize: 16,
    color: "#333",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
  },
  loginLink: {
    color: "#4E6655",
    textDecorationLine: "underline",
    fontWeight: "500",
    fontSize: 18,
  },
});
