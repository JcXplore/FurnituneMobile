import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

export default function ProductDetails({ route }) {
  const { product } = route.params; // comes from ProductPage

  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  return (
    <ScrollView style={styles.container}>
      {/* --- Image Carousel --- */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {product.images?.map((img, index) => (
          <Image
            key={index}
            source={img}
            style={styles.image}
            contentFit="cover"
          />
        ))}
      </ScrollView>

      {/* --- Info --- */}
      <View style={styles.infoBox}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>₱{Number(product.basePrice).toFixed(2)}</Text>
        <Text style={styles.rating}>
          ⭐ {product.ratingAvg} ({product.reviewsCount} Reviews)
        </Text>
        {product.isBestSeller && (
          <Text style={styles.badge}>🔥 Best Seller</Text>
        )}
        <Text style={styles.style}>Style: {product.style}</Text>
      </View>

      {/* --- Color Options --- */}
      {product.colorOptions?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Colors</Text>
          <View style={styles.colorRow}>
            {product.colorOptions.map((c, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c.hex },
                  selectedColor?.hex === c.hex && styles.selectedColor,
                ]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>
          {selectedColor && (
            <Text>Selected: {selectedColor.name}</Text>
          )}
        </View>
      )}

      {/* --- Material Options --- */}
      {product.materialOptions?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Materials</Text>
          {product.materialOptions.map((m, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.optionRow}
              onPress={() => setSelectedMaterial(m)}
            >
              <Ionicons
                name={
                  selectedMaterial?.name === m.name
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={18}
                color="#2c6e49"
              />
              <Text style={styles.optionText}>
                {m.group}: {m.name}{" "}
                {m.upcharge > 0 && `(+₱${m.upcharge})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* --- Dimensions --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dimensions</Text>
        <Text>
          {product.dimensionDefaults.width_cm}W ×{" "}
          {product.dimensionDefaults.depth_cm}D ×{" "}
          {product.dimensionDefaults.height_cm}H (cm)
        </Text>
      </View>

      {/* --- Other Info --- */}
      <View style={styles.section}>
        {product.customizable && <Text>🛠 Customizable Available</Text>}
        {product.madeToOrder && <Text>🕒 Made to Order</Text>}
        <Text>Lead Time: {product.leadTimeDays} days</Text>
      </View>

      {/* --- CTA --- */}
      <TouchableOpacity style={styles.addBtn}>
        <Text style={styles.addBtnText}>Add to Cart</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  image: { width: 400, height: 250 },
  infoBox: { padding: 15 },
  name: { fontSize: 20, fontWeight: "bold" },
  price: { fontSize: 18, color: "#2c6e49", marginVertical: 5 },
  rating: { color: "#666" },
  badge: { color: "red", fontWeight: "bold", marginTop: 5 },
  style: { fontSize: 14, color: "#555", marginTop: 5 },
  section: { padding: 15, borderTopWidth: 1, borderColor: "#eee" },
  sectionTitle: { fontWeight: "bold", marginBottom: 8 },
  colorRow: { flexDirection: "row", gap: 10 },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  selectedColor: { borderColor: "#2c6e49", borderWidth: 2 },
  optionRow: { flexDirection: "row", alignItems: "center", marginVertical: 5 },
  optionText: { marginLeft: 10 },
  addBtn: {
    backgroundColor: "#2c6e49",
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "bold" },
});
