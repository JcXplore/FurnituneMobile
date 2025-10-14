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

export default function Repair() {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const slideAnim = useState(new Animated.Value(300))[0];

  const types = [
    "Bed",
    "Chair",
    "Sofa",
    "Sectionals",
    "Ottoman",
    "Tables",
    "Benches",
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

  // Choose from camera or gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.IMAGE] : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImage(result.assets[0].uri);
        toggleOptions(); // ✅ close popup after selecting
      }
    } catch (err) {
      console.error("pickImage error:", err);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera access is required to take a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.IMAGE] : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImage(result.assets[0].uri);
        toggleOptions(); // ✅ close popup after taking photo
      }
    } catch (err) {
      console.error("takePhoto error:", err);
      Alert.alert("Error", "Could not take photo.");
    }
  };




  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>REPAIR MANAGEMENT</Text>

        {/* Preview Section */}
        <View style={styles.previewBox}>
          <Image
            source={image ? { uri: image } : require("../assets/table.png")}
            style={styles.furnitureImg}
          />

          {image ? (
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: "#B22222" }]} // red remove button
              onPress={() => setImage(null)}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.uploadText}>Remove Photo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.uploadBtn} onPress={toggleOptions}>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.uploadText}>Upload Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step 1: Choose Type */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Choose Type of Furniture</Text>
          <View style={styles.typeGrid}>
            {types.map((type, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.typeOption,
                  selectedType === type && styles.selectedType,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type && styles.selectedTypeText,
                  ]}
                >
                  {type}
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

        {/* Step 3: Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Additional Notes</Text>
          <TextInput
            style={styles.notesBox}
            placeholder="Add notes here..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DESCRIPTION</Text>
          <Text style={styles.paragraph}>
            Provide a clear photo and instructions for your custom furniture. We will
            review and confirm any adjustments with you.
          </Text>

          {/* Steps */}
          <Text style={styles.sectionTitle}>STEPS</Text>
          <Text style={styles.paragraph}>1. Upload or take a photo of the model.</Text>
          <Text style={styles.paragraph}>2. Choose fabric and size options.</Text>
          <Text style={styles.paragraph}>3. Add notes and place order.</Text>
        </View>

        <TouchableOpacity style={styles.placeBtn}>
          <Text style={styles.placeText}>Place Order</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Upload Options Popup */}
      {showOptions && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.3)" }, // ✅ dim background
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={toggleOptions} // ✅ tap outside to close
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
});
