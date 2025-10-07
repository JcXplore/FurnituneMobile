import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";

export default function Orders() {
  const [selected, setSelected] = useState("ALL");

  const filters = [
    "ALL",
    "PROCESSING ORDER",
    "PREPARING",
    "TO SHIP",
    "TO RECEIVE",
    "COMPLETED",
    "RETURN/REFUND",
  ];

  const orders = [
    {
      id: 1,
      title: "Sofa",
      variation: "Cement",
      price: "₱640",
      qty: 1,
      total: "₱640",
      image: "https://via.placeholder.com/80", // replace with real image
    },
    {
      id: 2,
      title: "Custom Order #1",
      variation: "Terracotta",
      price: "₱2,941",
      qty: 1,
      total: "₱2,941",
      image: "https://via.placeholder.com/80",
    },
    {
      id: 3,
      title: "Repair Request #1",
      variation: "Terracotta",
      price: "₱1,941.00",
      qty: 1,
      total: "₱1,941.00",
      image: "https://via.placeholder.com/80",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
      >
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
      <ScrollView style={styles.ordersList}>
        {orders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <Text style={styles.sectionTitle}>FURNITUNE</Text>

            {/* Product Row */}
            <View style={styles.productRow}>
              <Image source={{ uri: order.image }} style={styles.productImg} />
              <View style={styles.productDetails}>
                <Text style={styles.productName}>{order.title}</Text>
                <Text style={styles.variation}>Variation: {order.variation}</Text>
                <Text>x{order.qty}</Text>
              </View>
              <Text style={styles.price}>{order.price}</Text>
            </View>

            {/* Order Total */}
            <Text style={styles.totalText}>Order Total: {order.total}</Text>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionText}>CONTACT SELLER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionText}>CANCEL ORDER</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7ef" },

  // Filter row
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
    marginBottom: 25,
  },

  // Action buttons
 actionRow: {
  flexDirection: "row",
  justifyContent: "flex-end", 
  gap: 8, 
  marginTop: 0,
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
});
