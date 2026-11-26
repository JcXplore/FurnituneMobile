import React, { useState, useEffect } from "react"; 
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";

export default function Repair({ navigation }) {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null); 
  const [selectedCover, setSelectedCover] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const repairOptions = [
    {
      id: "bed",
      label: "Bed",
      price: 3200,
      sizes: [
        { id: "single", label: "Single", priceAdd: 0 },
        { id: "double", label: "Double", priceAdd: 500 },
        { id: "queen", label: "Queen", priceAdd: 1000 },
        { id: "king", label: "King", priceAdd: 1500 },
        { id: "custom", label: "Custom", priceAdd: 2000 },
      ],
    },
    {
      id: "chair",
      label: "Chair",
      price: 1200,
      sizes: [
        { id: "standard", label: "Standard", priceAdd: 0 },
        { id: "counter", label: "Counter", priceAdd: 300 },
        { id: "bar", label: "Bar", priceAdd: 500 },
        { id: "custom", label: "Custom", priceAdd: 800 },
      ],
    },
    {
      id: "dining_table",
      label: "Dining Table",
      price: 2800,
      sizes: [
        { id: "2_people", label: "2 people", priceAdd: 0 },
        { id: "4_people", label: "4 people", priceAdd: 600 },
        { id: "6_people", label: "6 people", priceAdd: 1200 },
        { id: "8_people", label: "8 people", priceAdd: 1800 },
        { id: "custom", label: "Custom", priceAdd: 2500 },
      ],
    },
    { 
      id: "ottoman", 
      label: "Ottoman", 
      price: 1400, 
      sizes: [
        { id: "std_cube", label: "Standard Cube", priceAdd: 200 },
        { id: "footstool", label: "Footstool", priceAdd: 100 },
        { id: "cocktail", label: "Cocktail", priceAdd: 500 },
        { id: "custom", label: "Custom", priceAdd: 600 },
      ] 
    },
    { 
      id: "sectionals", 
      label: "Sectionals", 
      price: 3600, 
      sizes: [
        { id: "3_seater", label: "3 Seater", priceAdd: 0 },
        { id: "5_seater", label: "5 Seater", priceAdd: 1500 },
        { id: "6_seater", label: "6 Seater", priceAdd: 2200 },
        { id: "7_seater", label: "7 Seater", priceAdd: 2900 },
        { id: "custom", label: "Custom", priceAdd: 3500 },
      ] 
    },
    { 
      id: "sofa", 
      label: "Sofa", 
      price: 3000, 
      sizes: [
        { id: "2_seater", label: "2 Seater", priceAdd: 0 },
        { id: "3_seater", label: "3 Seater", priceAdd: 800 },
        { id: "4_seater", label: "4 Seater", priceAdd: 1500 },
        { id: "custom", label: "Custom", priceAdd: 2000 },
      ] 
    },
  ];

  const covers = [
    { label: "Fabric", value: 800 },
    { label: "Leather", value: 1500 },
    { label: "None", value: 0 },
  ];

  const frames = [
    { label: "Wooden", value: 800 },
    { label: "Metal", value: 1000 },
    { label: "None", value: 0 },
  ];

  useEffect(() => {
    let basePrice = selectedType?.price || 0;
    
    let sizeAdd = 0;
    if (selectedType && selectedType.sizes && selectedSize) {
        const foundSize = selectedType.sizes.find(s => s.label === selectedSize.label);
        if (foundSize) {
            sizeAdd = foundSize.priceAdd;
        }
    }

    const total =
      basePrice +
      sizeAdd +
      (selectedCover?.value || 0) +
      (selectedFrame?.value || 0);

    setTotalCost(total * qty);
  }, [selectedType, selectedSize, selectedCover, selectedFrame, qty]);

  const handleSelectImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        selectionLimit: 3, 
      });

      if (!result.canceled) {
        const selected = result.assets.map((asset) => asset.uri);
        setUploadedImages(selected);
      }
    } catch (error) {
      console.error("Error selecting images:", error);
      Alert.alert("Error", "Failed to select images. Please try again.");
    }
  };

  const handlePlaceRepair = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "You must be logged in to request a repair.");
      return;
    }

    if (uploadedImages.length === 0) {
      Alert.alert("Missing Photos", "Please upload at least one photo of the damaged furniture.");
      return;
    }

    if (!selectedType || !selectedCover || !selectedFrame) {
      Alert.alert("Missing Info", "Please complete all repair selections.");
      return;
    }

    const repairProduct = {
      id: "repair_" + Date.now(),
      name: `Repair - ${selectedType.label}${selectedSize ? ` (${selectedSize.label})` : ''}`,
      type: "repair",
      category: "Repair",
      imageUrls: uploadedImages.length > 0 ? uploadedImages : [
        "https://via.placeholder.com/150",
      ],
      uploadedImages,
      price: totalCost,
      qty,
      notes,
      // 🔹 NEW DATA FIELDS ADDED FOR CHECKOUT
      selectedColor: selectedCover?.label || "None", 
      selectedMaterial: selectedFrame?.label || "None",
      typeLabel: selectedType?.label || "Unknown",
      sizeLabel: selectedSize?.label || "N/A", 
      coverMaterialLabel: selectedCover?.label || "None",
      frameMaterialLabel: selectedFrame?.label || "None",
      coverMaterialPrice: selectedCover?.value || 0,
      frameMaterialPrice: selectedFrame?.value || 0,
      total: totalCost,
      status: "processing",
      userId: user?.uid,
      contactEmail: user?.email,
      createdAt: new Date().toISOString(),
    };

    navigation.navigate("CheckoutPage", {
      product: { ...repairProduct, isRepair: true },
    });
  };

  const handleQtyChange = (newQty) => {
    if (newQty < 1) return;
    setQty(newQty);
  };

  return (
    <View style={styles.pageContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <Text style={styles.header}>REPAIR YOUR FURNITURE</Text>

        <View style={styles.imageBox}>
          <Text style={styles.imageSectionTitle}>UPLOAD DAMAGE PHOTOS</Text>

          <View style={styles.imageGrid}>
            {uploadedImages.length > 0 ? (
              uploadedImages.map((img, index) => (
                <View key={index} style={styles.imageCard}>
                  <Image source={{ uri: img }} style={styles.imageThumb} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() =>
                      setUploadedImages((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Ionicons name="close-circle" size={22} color="#B22222" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Image
                source={require("../assets/chairs.png")} 
                style={styles.placeholderImage}
              />
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.uploadBtn,
              uploadedImages.length >= 3 || uploading ? { backgroundColor: "#ccc" } : {},
            ]}
            onPress={handleSelectImages}
            disabled={uploadedImages.length >= 3 || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadText}>
                  {uploadedImages.length >= 3
                    ? "Image Limit Reached (3/3)"
                    : uploadedImages.length > 0
                      ? `Add More (${uploadedImages.length}/3)`
                      : "Upload Damage Photos"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. CHOOSE TYPE</Text>
          <View style={styles.optionRow}>
            {repairOptions.map((item) => (
              <TouchableOpacity
                key={item.id} 
                style={[
                  styles.optionBtn,
                  selectedType?.id === item.id && styles.optionSelected,
                ]}
                onPress={() => {
                    setSelectedType(item);
                    setSelectedSize(null); 
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedType?.id === item.id && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={styles.priceText}>
                  ₱{item.price.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedType && selectedType.sizes && selectedType.sizes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. CHOOSE SIZE</Text>
            <View style={styles.optionRow}>
              {selectedType.sizes.map((sizeItem) => (
                <TouchableOpacity
                  key={sizeItem.id}
                  style={[
                    styles.optionBtn,
                    selectedSize?.id === sizeItem.id && styles.optionSelected,
                  ]}
                  onPress={() => setSelectedSize(sizeItem)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedSize?.id === sizeItem.id && styles.optionTextSelected,
                    ]}
                  >
                    {sizeItem.label}
                  </Text>
                  <Text style={styles.priceText}>
                    +₱{sizeItem.priceAdd.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle]}>{selectedType && selectedType.sizes && selectedType.sizes.length > 0 ? "3." : "2."} CHOOSE COVER</Text>
          <View style={styles.optionRow}>
            {covers.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.optionBtn,
                  selectedCover?.label === item.label && styles.optionSelected,
                ]}
                onPress={() => setSelectedCover(item)}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{selectedType && selectedType.sizes && selectedType.sizes.length > 0 ? "4." : "3."} CHOOSE FRAME</Text>
          <View style={styles.optionRow}>
            {frames.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.optionBtn,
                  selectedFrame?.label === item.label && styles.optionSelected,
                ]}
                onPress={() => setSelectedFrame(item)}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{selectedType && selectedType.sizes && selectedType.sizes.length > 0 ? "5." : "4."} ADD NOTES</Text>
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
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: 2,
    elevation: 3,
  },
  imageSectionTitle: {
    fontWeight: "700",
    color: "#1B3D36",
    fontSize: 15,
    marginBottom: 10,
    alignSelf: "flex-start",
  },

  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 10,
    marginBottom: 12,
    width: "100%",
  },

  imageCard: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f4f4f4",
    position: "relative",
    elevation: 2,
  },

  imageThumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 10,
  },

  placeholderImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    resizeMode: "contain",
    marginBottom: 10,
  },
});