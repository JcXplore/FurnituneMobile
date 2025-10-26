import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert, // ✅ add this
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc  } from "firebase/firestore";
import { app } from "./firebaseConfig";

const db = getFirestore(app);
const auth = getAuth(app);

export default function MyPurchases({ navigation }) {
  // 🔹 Default = “all” lowercase (for Firestore match)
  const [selected, setSelected] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // 🔹 Filters with key-label pairs
  const filters = [
  { label: "ALL", key: "all" },
  { label: "PROCESSING ORDER", key: "processing" },
  { label: "PREPARING", key: "preparing" },
  { label: "TO SHIP", key: "to_ship" },
  { label: "TO RECEIVE", key: "to_receive" },
  { label: "TO RATE", key: "to_rate" },
  { label: "COMPLETED", key: "completed" },
  { label: "RETURN/REFUND", key: "return/refund" },
  { label: "CANCELLED", key: "cancelled" },
];


  // 🔹 Load current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });
    return unsubscribe;
  }, []);

  // 🔹 Fetch orders whenever user or filter changes
  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const collectionsToFetch = ["orders", "custom_orders", "repairs"];
        let allOrders = [];

        for (const col of collectionsToFetch) {
          let q;
          if (selected === "all") {
            q = query(collection(db, col), where("userId", "==", userId));
          } else {
            q = query(
              collection(db, col),
              where("userId", "==", userId),
              where("status", "==", selected.toLowerCase())
            );

          }

          const snapshot = await getDocs(q);
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            source: col,
          }));
          allOrders = [...allOrders, ...data];
        }

        // Sort by date (latest first)
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

  // 🔹 Status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "processing":
        return "#f4a261";
      case "preparing":
        return "#2a9d8f";
      case "to_ship":
        return "#457b9d";
      case "to_receive":
        return "#1d3557";
      case "to_rate":
        return "#2c6e49";
      case "completed":
        return "#4CAF50"; // green
      case "return/refund":
        return "#e63946";
      default:
        return "#888";
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Purchases</Text>
      </View>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterBtn,
              selected === filter.key && styles.activeFilter,
            ]}
            onPress={() => setSelected(filter.key)}
          >
            <Text
              style={[
                styles.filterText,
                selected === filter.key && styles.activeFilterText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders */}
      {loading ? (
        <ActivityIndicator size="large" color="#2c6e49" style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={70} color="#ccc" />
          <Text style={styles.noOrders}>No orders found under this category</Text>
        </View>
      ) : (
        <ScrollView
  style={styles.ordersList}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
  nestedScrollEnabled={true}
>

          {orders.map((order) => (
  <View key={order.id} style={styles.orderCard}>
    {/* 🔹 Main content tap area */}
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() =>
        navigation.navigate("OrderPage", {
          orderId: order.id,
          source: order.source,
          
        })
      }
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.storeName}>FURNITUNE</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {order.status?.toUpperCase().replace(/_/g, " ")}
          </Text>
        </View>
      </View>

      {/* Products */}
      {order.items?.map((item, i) => (
        <View key={i} style={styles.productRow}>
          <Image source={{ uri: item.imageUrl }} style={styles.productImg} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.selectedColor && (
              <Text style={styles.variation}>Color: {item.selectedColor}</Text>
            )}
            {item.selectedSize && (
              <Text style={styles.variation}>Size: {item.selectedSize}</Text>
            )}
            <Text style={styles.qty}>x{item.qty}</Text>
          </View>
          <Text style={styles.price}>₱{item.price?.toLocaleString()}</Text>
        </View>
      ))}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Order Total:</Text>
        <Text style={styles.totalPrice}>
          ₱{order.total?.toLocaleString() || "0"}
        </Text>
      </View>
    </TouchableOpacity>

    {/* 🔹 Action Buttons (outside touch area) */}
    <View style={styles.actionRow}>
      <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn]}>
        <Ionicons name="chatbubbles-outline" size={14} color="#2c6e49" />
        <Text style={styles.outlineText}>Contact Seller</Text>
      </TouchableOpacity>

      {/* ✅ Cancel Order Button */}
      {/* ✅ Cancel Order Button */}
{(() => {
  const currentStatus = (order.status || "").toLowerCase();
  const lockedStatuses = [
  "preparing",
  "to_ship",
  "to_receive",
  "to_rate",
  "completed",
  "return/refund",
  "cancelled", // ✅ added
];

  const isLocked = lockedStatuses.includes(currentStatus);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={isLocked} // ✅ prevents clicking when locked
      style={[
        styles.actionBtn,
        styles.cancelBtn,
        isLocked && styles.disabledBtn, // ✅ gray out button
      ]}
      onPress={async () => {
        if (isLocked) {
          Alert.alert(
            "⚠️ Not Allowed",
            "This order can no longer be cancelled."
          );
          return;
        }

        Alert.alert(
          "Cancel Order",
          "Are you sure you want to cancel this order?",
          [
            { text: "No", style: "cancel" },
            {
              text: "Yes, Cancel",
              style: "destructive",
              onPress: async () => {
                try {
                  const orderRef = doc(db, order.source, order.id);
                  await updateDoc(orderRef, { status: "cancelled" });

                  Alert.alert(
                    "✅ Order Cancelled",
                    "Your order has been successfully cancelled."
                  );

                  // Instantly update UI
                  setOrders((prev) =>
                    prev.map((o) =>
                      o.id === order.id ? { ...o, status: "cancelled" } : o
                    )
                  );
                } catch (error) {
                  console.error("Error cancelling order:", error);
                  Alert.alert(
                    "❌ Failed",
                    "Could not cancel order. Please try again later."
                  );
                }
              },
            },
          ]
        );
      }}
    >
      <Text
        style={[
          styles.actionText,
          isLocked && styles.disabledText, // ✅ dim text when disabled
        ]}
      >
        Cancel Order
      </Text>
    </TouchableOpacity>
  );
})()}
 </View>
  </View>
))}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f8f4" },
  header: {
    backgroundColor: "#2c6e49",
    paddingVertical: 14,
    alignItems: "center",
    elevation: 3,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  filterRow: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f9f8f4",
    marginBottom: 5,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#e7e4d9",
    marginRight: 8,
    alignSelf: "center",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
  },
  activeFilter: {
    backgroundColor: "#2c6e49",
    alignSelf: "center",
  },
  activeFilterText: { color: "#fff" },
  ordersList: { paddingHorizontal: 10 },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  storeName: { fontWeight: "700", fontSize: 13, color: "#333" },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: 11, color: "#fff", fontWeight: "700" },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  productImg: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#f2f2f2",
  },
  productInfo: { flex: 1 },
  productName: {
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 2,
    color: "#222",
  },
  variation: { color: "#666", fontSize: 11 },
  qty: { fontSize: 11, color: "#777", marginTop: 2 },
  price: { fontWeight: "700", color: "#222", fontSize: 13 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: "#444", fontWeight: "600", fontSize: 13 },
  totalPrice: { color: "#2c6e49", fontWeight: "800", fontSize: 14 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    backgroundColor: "#2c6e49",
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  outlineBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2c6e49",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  outlineText: { color: "#2c6e49", fontWeight: "600", fontSize: 12 },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  emptyState: { justifyContent: "center", alignItems: "center", marginTop: 80 },
  noOrders: { color: "#777", fontWeight: "600", marginTop: 10, fontSize: 13 },
  disabledBtn: {
  backgroundColor: "#ccc", // gray background
},
disabledText: {
  color: "#666", // muted gray text
},
disabledBtn: {
  backgroundColor: "#ccc", // gray background
},
disabledText: {
  color: "#666", // muted gray text
},
cancelBtn: {
  backgroundColor: "#2c6e49",
  borderRadius: 25,
  paddingVertical: 8,
  paddingHorizontal: 14,
  zIndex: 999, // 👈 ensures it's on top of other touchables
  elevation: 5, // 👈 fixes Android layering issue
},



});
