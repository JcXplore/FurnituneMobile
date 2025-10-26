import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

export default function Repair({ navigation }) {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCover, setSelectedCover] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  const [totalCost, setTotalCost] = useState(0);

  const types = [
    { label: "Sofa", basePrice: 1500 },
    { label: "Chair", basePrice: 1000 },
    { label: "Bed", basePrice: 2000 },
    { label: "Table", basePrice: 1200 },
    { label: "Ottoman", basePrice: 900 },
  ];

  const covers = [
    { label: "Fabric", value: 0 },
    { label: "Leather", value: 500 },
  ];

  const frames = [
    { label: "Wooden", value: 0 },
    { label: "Metal", value: 400 },
  ];

  const calculateTotal = () => {
    if (!selectedType) return 0;
    let total =
      (selectedType?.basePrice || 0) +
      (selectedCover?.value || 0) +
      (selectedFrame?.value || 0);
    return total * qty;
  };

  const updateTotal = () => setTotalCost(calculateTotal());

  const handleSelect = (setter, value) => {
    setter(value);
    setTimeout(updateTotal, 100);
  };

  const handleQtyChange = (newQty) => {
    const safeQty = Math.max(1, newQty);
    setQty(safeQty);
    setTimeout(updateTotal, 100);
  };

  const handleUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setUploadedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Could not upload image.");
    }
  };

  const handlePlaceRepair = () => {
  if (!uploadedImage) {
    Alert.alert("Missing Image", "Please upload a photo of the damaged furniture first.");
    return;
  }

  if (!selectedType || !selectedCover || !selectedFrame) {
    Alert.alert("Missing Info", "Please complete all repair selections.");
    return;
  }

  // ✅ Create product-like object for checkout
  const repairOrder = {
    id: Date.now().toString(),
    name: `Repair - ${selectedType.label}`,
    type: "repair",
    category: "Repair Service",
    imageUrl: uploadedImage,
    uploadedImage, // keep for consistency with customization
    price: totalCost,
    qty,
    selectedColor: selectedCover.label, // reuse this field for cover
    selectedMaterial: selectedFrame.label,
    notes,
  };

  console.log("Navigating to Checkout with:", repairOrder);

  navigation.navigate("CheckoutPage", { product: repairOrder });
};


  return (
    <View style={styles.pageContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <Text style={styles.header}>REPAIR YOUR FURNITURE</Text>

        {/* IMAGE UPLOAD */}
        <View style={styles.imageBox}>
          <Image
            source={
              uploadedImage
                ? { uri: uploadedImage }
                : require("../assets/chairs.png") // 👈 placeholder image
            }
            style={styles.mainImage}
          />

          {uploadedImage ? (
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: "#B22222" }]}
              onPress={() => setUploadedImage(null)}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.uploadText}>Remove Photo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadImage}>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.uploadText}>Upload Damage Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* TYPE SELECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. CHOOSE TYPE</Text>
          <View style={styles.optionRow}>
            {types.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.optionBtn,
                  selectedType?.label === item.label && styles.optionSelected,
                ]}
                onPress={() => handleSelect(setSelectedType, item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedType?.label === item.label && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={styles.priceText}>
                  ₱{item.basePrice.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* COVER SELECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. CHOOSE COVER</Text>
          <View style={styles.optionRow}>
            {covers.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.optionBtn,
                  selectedCover?.label === item.label && styles.optionSelected,
                ]}
                onPress={() => handleSelect(setSelectedCover, item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedCover?.label === item.label && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={styles.priceText}>
                  +₱{item.value.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FRAME SELECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. CHOOSE FRAME</Text>
          <View style={styles.optionRow}>
            {frames.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.optionBtn,
                  selectedFrame?.label === item.label && styles.optionSelected,
                ]}
                onPress={() => handleSelect(setSelectedFrame, item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedFrame?.label === item.label && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={styles.priceText}>
                  +₱{item.value.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* NOTES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. ADD NOTES</Text>
          <TextInput
            style={styles.textBox}
            placeholder="Describe what needs repair..."
            placeholderTextColor="#999"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </ScrollView>

      {/* STICKY TOTAL BAR */}
      <View style={styles.stickyBar}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>ESTIMATED TOTAL</Text>
          <Text style={styles.totalValue}>₱{totalCost.toLocaleString()}</Text>
        </View>

        <View style={styles.bottomControls}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity
              onPress={() => handleQtyChange(qty - 1)}
              style={styles.qtyBtn}
            >
              <Ionicons name="remove" size={18} color="#333" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity
              onPress={() => handleQtyChange(qty + 1)}
              style={styles.qtyBtn}
            >
              <Ionicons name="add" size={18} color="#333" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.buyNowBtn} onPress={handlePlaceRepair}>
            <Text style={styles.buyNowText}>REQUEST REPAIR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: { flex: 1, backgroundColor: "#FAF6E9" },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 130 },
  header: { fontSize: 22, fontWeight: "bold", color: "#1B3D36", marginBottom: 16 },
  imageBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainImage: { width: "100%", height: 200, borderRadius: 10, marginBottom: 10 },
  uploadBtn: {
    flexDirection: "row",
    backgroundColor: "#47695B",
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    width: "100%",
  },
  uploadText: { color: "#fff", fontWeight: "600", marginLeft: 8, textAlign: "center" },
  section: { marginBottom: 10 },
  sectionTitle: { fontWeight: "700", fontSize: 15, color: "#1B3D36", marginBottom: 10 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1B3D36",
    marginBottom: 8,
  },
  optionSelected: { backgroundColor: "#1B3D36" },
  optionText: { color: "#1B3D36" },
  optionTextSelected: { color: "#fff", fontWeight: "600" },
  priceText: { fontSize: 12, color: "#2c6e49", marginTop: 3 },
  textBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    height: 100,
    textAlignVertical: "top",
  },
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 14,
    paddingHorizontal: 20,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 4,
  },
  totalRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  totalLabel: { fontSize: 15, fontWeight: "600", color: "#333" },
  totalValue: { fontSize: 22, fontWeight: "700", color: "#2c6e49" },
  bottomControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f7f7f7",
  },
  qtyBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  qtyText: { fontSize: 16, fontWeight: "600", marginHorizontal: 8 },
  buyNowBtn: {
    flex: 1,
    backgroundColor: "#2c6e49",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  buyNowText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
