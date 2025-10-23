import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "./firebaseConfig";

const db = getFirestore(app);
const auth = getAuth(app);

export default function MyPurchases() {
  const [selected, setSelected] = useState("ALL");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const filters = [
    "ALL",
    "PROCESSING ORDER",
    "PREPARING",
    "TO SHIP",
    "TO RECEIVE",
    "COMPLETED",
    "RETURN/REFUND",
  ];

  // ✅ Load current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });
    return unsubscribe;
  }, []);

  // ✅ Fetch orders from Firestore
  // ✅ Fetch orders from both "orders" and "custom_orders"
useEffect(() => {
  const fetchOrders = async () => {
    if (!userId) return;
    try {
      setLoading(true);

      const collectionsToFetch = ["orders", "custom_orders"];
      let allOrders = [];

      for (const col of collectionsToFetch) {
        let q;

        if (selected === "ALL") {
          q = query(collection(db, col), where("userId", "==", userId));
        } else {
          q = query(
            collection(db, col),
            where("userId", "==", userId),
            where("status", "==", selected.toLowerCase().replace(/ /g, "_"))
          );
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          source: col, // ✅ marks which collection it came from
        }));

        allOrders = [...allOrders, ...data];
      }

      // Sort by creation date (newest first)
      allOrders.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      setOrders(allOrders);
    } catch (error) {
      console.error("🔥 Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchOrders();
}, [userId, selected]);


  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterBtn,
              selected === filter && styles.activeFilter,
            ]}
            onPress={() => setSelected(filter)}
          >
            <Text
              style={[
                styles.filterText,
                selected === filter && styles.activeFilterText,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      {loading ? (
        <ActivityIndicator size="large" color="#1B3D36" style={{ marginTop: 30 }} />
      ) : orders.length === 0 ? (
        <Text style={styles.noOrders}>No orders found for this filter.</Text>
      ) : (
        <ScrollView style={styles.ordersList}>
          {orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <Text style={styles.sectionTitle}>FURNITUNE</Text>

              {/* Product Row */}
              {order.items?.map((item, index) => (
                <View key={index} style={styles.productRow}>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.productImg}
                  />
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{item.name}</Text>
                    {item.selectedColor ? (
                      <Text style={styles.variation}>
                        Color: {item.selectedColor}
                      </Text>
                    ) : null}
                    {item.selectedSize ? (
                      <Text style={styles.variation}>
                        Size: {item.selectedSize}
                      </Text>
                    ) : null}
                    <Text>x{item.qty}</Text>
                  </View>
                  <Text style={styles.price}>₱{item.price?.toLocaleString()}</Text>
                </View>
              ))}

              {/* Order Total */}
              <Text style={styles.totalText}>
                Order Total: ₱{order.total?.toLocaleString() || "0"}
              </Text>

              {/* Order Status */}
              <Text style={styles.statusText}>
                STATUS: {order.status?.toUpperCase() || "PENDING"}
              </Text>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionText}>CONTACT SELLER</Text>
                </TouchableOpacity>
                {order.status !== "completed" && (
                  <TouchableOpacity style={styles.actionBtn}>
                    <Text style={styles.actionText}>CANCEL ORDER</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7ef" },

  // Filters
  filterRow: {
    flexDirection: "row",
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f2ede3",
    marginRight: 8,
    height: 40,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  activeFilter: {
    backgroundColor: "#1B3D36",
  },
  activeFilterText: {
    color: "#fff",
  },

  // Orders
  ordersList: { paddingHorizontal: 8 },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 6,
    fontSize: 13,
    color: "#000",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  productImg: { width: 60, height: 60, borderRadius: 6, marginRight: 10 },
  productDetails: { flex: 1 },
  productName: { fontWeight: "bold", fontSize: 14, marginBottom: 2 },
  variation: { color: "#555", fontSize: 12, marginBottom: 2 },
  price: { fontWeight: "bold", color: "#000" },
  totalText: {
    textAlign: "right",
    fontWeight: "600",
    marginTop: 4,
  },
  statusText: {
    fontWeight: "700",
    color: "#2c6e49",
    textAlign: "right",
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#1B3D36",
    alignItems: "center",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  noOrders: {
    textAlign: "center",
    marginTop: 50,
    fontWeight: "600",
    color: "#777",
  },
});
