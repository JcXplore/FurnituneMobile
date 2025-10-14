import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Easing,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

export default function Customization({ route }) {
  const { product, imageUrl } = route.params || {};
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [notes, setNotes] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const slideAnim = useState(new Animated.Value(300))[0];
  const [uploadedImage, setUploadedImage] = useState(null); // ✅ small image only

  const categories = [
    "Living Room",
    "Bedroom",
    "Dining",
    "Office",
    "Outdoor",
    "Decor",
  ];

  const fabrics = [
    { id: 1, color: "#D9D9D9" },
    { id: 2, color: "#A0522D" },
    { id: 3, color: "#A9A9A9" },
    { id: 4, color: "#2F4F4F" },
  ];

  // Animate popup
  const toggleOptions = () => {
    if (showOptions) {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => setShowOptions(false));
    } else {
      setShowOptions(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  };

  // Choose from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaType
            ? [ImagePicker.MediaType.IMAGE]
            : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setUploadedImage(result.assets[0].uri); // ✅ small image only
        toggleOptions(); // close popup
      }
    } catch (err) {
      console.error("pickImage error:", err);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  // Take photo
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera access is required to take a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes:
          ImagePicker.MediaType
            ? [ImagePicker.MediaType.IMAGE]
            : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setUploadedImage(result.assets[0].uri); // ✅ small image only
        toggleOptions(); // close popup
      }
    } catch (err) {
      console.error("takePhoto error:", err);
      Alert.alert("Error", "Could not take photo.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>FURNITURE CUSTOMIZATION</Text>

        {/* ✅ Preview Section — Main image never changes */}
        <View style={styles.previewBox}>
          <Image
            source={
              imageUrl
                ? { uri: imageUrl }
                : product?.image
                ? { uri: product.image }
                : require("../assets/sofa.png")
            }
            style={styles.furnitureImg}
          />
          <Text style={styles.productName}>
            {product?.name || "Custom Furniture"}
          </Text>
          <Text style={{ textAlign: "center", color: "#666", marginBottom: 8 }}>
            ₱{product?.price || "—"}
          </Text>

        </View>

        {/* Step 1: Choose Customization Category */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Choose Customization Category</Text>
          <View style={styles.typeGrid}>
            {categories.map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.typeOption,
                  selectedCategory === cat && styles.selectedType,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.typeLabel,
                    selectedCategory === cat && styles.selectedTypeText,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Choose Fabric */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Choose Fabric</Text>
          <View style={styles.fabricGrid}>
            {fabrics.map((fabric) => (
              <TouchableOpacity
                key={fabric.id}
                style={[
                  styles.fabricOption,
                  { backgroundColor: fabric.color },
                  selectedFabric === fabric.id && styles.selectedFabric,
                ]}
                onPress={() => setSelectedFabric(fabric.id)}
              />
            ))}
          </View>
        </View>

        {/* Step 3: Add Notes or Preferences */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>3. Add Notes or Preferences</Text>

            {/* Small Uploaded Image Preview */}
            {uploadedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: uploadedImage }} style={styles.smallImage} />
                <TouchableOpacity
                  style={styles.removeImgBtn}
                  onPress={() => setUploadedImage(null)}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Notes Textbox */}
            <TextInput
              style={styles.notesBox}
              placeholder="Add your notes or special requests..."
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* Upload / Take Photo Button */}
            {!uploadedImage && (
              <TouchableOpacity style={styles.uploadBtn} onPress={toggleOptions}>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadText}>Upload Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        {/* Description Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DESCRIPTION</Text>
          <Text style={styles.paragraph}>
            Share your customization ideas or inspirations by uploading a clear photo
            and notes. We’ll review your submission and coordinate with you for
            approval and custom adjustments.
          </Text>

          <Text style={styles.sectionTitle}>STEPS</Text>
          <Text style={styles.paragraph}>1. Upload or take a photo of your customization piece.</Text>
          <Text style={styles.paragraph}>2. Select your preferred fabric and style.</Text>
          <Text style={styles.paragraph}>3. Add notes or special requests.</Text>
          <Text style={styles.paragraph}>4. Submit your customization request.</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.placeBtn}>
          <Text style={styles.placeText}>Place Order</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Upload Options Popup */}
      {showOptions && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.3)" },
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={toggleOptions}
          />

          <Animated.View
            style={[
              styles.popup,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.popupInner}>
              <Text style={styles.popupTitle}>Select Image Source</Text>

              <TouchableOpacity style={styles.popupBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={18} color="#1B3D36" />
                <Text style={styles.popupText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.popupBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={18} color="#1B3D36" />
                <Text style={styles.popupText}>Upload from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={toggleOptions}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF6E9",
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1B3D36",
    marginBottom: 16,
  },
  previewBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  furnitureImg: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadBtn: {
    flexDirection: "row",
    backgroundColor: "#47695B",
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 12,
  },
  uploadText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B3D36",
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  typeOption: {
    width: "48%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  selectedType: {
    backgroundColor: "#1B3D36",
    borderColor: "#1B3D36",
  },
  typeLabel: {
    color: "#333",
  },
  selectedTypeText: {
    color: "#fff",
    fontWeight: "600",
  },
  fabricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  fabricOption: {
    width: "48%",
    height: 60,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedFabric: {
    borderWidth: 3,
    borderColor: "#1B3D36",
  },
  notesBox: {
    height: 100,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  placeBtn: {
    backgroundColor: "#1B3D36",
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 40,
  },
  placeText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
  popup: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(250, 246, 233, 0.98)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    elevation: 10,
  },
  popupInner: {
    alignItems: "center",
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B3D36",
    marginBottom: 12,
  },
  popupBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E5E5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginVertical: 5,
    width: "100%",
  },
  popupText: {
    fontSize: 14,
    color: "#1B3D36",
    marginLeft: 10,
  },
  cancelBtn: {
    marginTop: 8,
  },
  cancelText: {
    color: "#47695B",
    fontWeight: "600",
  },
  paragraph: {
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
    lineHeight: 20,
  },
  
  productName: {
  fontSize: 18,
  fontWeight: "bold",
  color: "#1B3D36",
  marginTop: 8,
  textAlign: "center",
},
textboxContainer: {
    position: "relative",
    width: "100%",
  },

  textbox: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingLeft: 50, // space for small image
    height: 45,
  },

  smallImage: {
    width: 35,
    height: 35,
    borderRadius: 8,
    position: "absolute",
    left: 10,
    top: 5,
  },
imagePreviewContainer: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
  position: "relative",
},
smallImage: {
  width: 60,
  height: 60,
  borderRadius: 10,
  marginRight: 10,
  borderWidth: 1,
  borderColor: "#ccc",
},
removeImgBtn: {
  position: "absolute",
  right: 0,
  top: 0,
  backgroundColor: "#B22222",
  padding: 4,
  borderRadius: 8,
},
});
