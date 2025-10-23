import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import { app } from "./firebaseConfig";

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export default function PaymentPage({ route, navigation }) {
  const { order } = route.params || {};
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Allow access to photos to upload proof.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUploadAndSave = async () => {
    if (!image) {
      Alert.alert("Missing Proof", "Please upload a screenshot of your payment.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      await auth.signInAnonymously();
      throw new Error("User not logged in");
    }

    try {
      setUploading(true);

      const filename = `userPayments/${user.uid}/${Date.now()}_proof.jpg`;
      const storageRef = ref(storage, filename);

      const img = await fetch(image);
      const bytes = await img.blob();
      await uploadBytes(storageRef, bytes, { contentType: "image/jpeg" });
      const downloadURL = await getDownloadURL(storageRef);

      const orderType =
        order?.items?.[0]?.type ||
        order?.type ||
        order?.product?.type ||
        "standard";

      const collectionName =
        orderType === "customization" ? "custom_orders" : "orders";

      await addDoc(collection(db, collectionName), {
        ...order,
        userId: user.uid,
        contactEmail: order.contactEmail || user.email,
        paymentStatus: "pending",
        paymentProofUrl: downloadURL,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Payment Submitted",
        `Your order has been submitted to ${collectionName.replace("_", " ")}.`,
        [{ text: "OK", onPress: () => navigation.navigate("MyPurchases") }]
      );
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Brand Header */}
      <Text style={styles.brand}>FURNITUNE</Text>

      {/* Order Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Summary</Text>
        <View style={styles.orderRow}>
          <Image
            source={{
              uri: order?.items?.[0]?.imageUrl || order?.product?.imageUrl,
            }}
            style={styles.productImage}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>
              {order?.items?.[0]?.name || order?.product?.name || "Product"}
            </Text>
            <Text style={styles.productQty}>
              Qty: {order?.items?.[0]?.qty || 1}
            </Text>
          </View>
          <Text style={styles.productPrice}>
            ₱
            {Number(
              order?.items?.[0]?.price || order?.product?.price || 0
            ).toFixed(2)}
          </Text>
        </View>

        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>
            ₱{Number(order?.subtotal || order?.product?.price || 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Shipping Fee</Text>
          <Text style={styles.value}>
            ₱{Number(order?.shippingFee || 510).toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            ₱
            {Number(
              order?.total || (order?.product?.price || 0) + 510
            ).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Payment Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Method</Text>
        <Text style={styles.description}>
          Scan the QR code below to complete your payment. Then, upload your
          screenshot as proof.
        </Text>

        <View style={styles.qrContainer}>
          <Text style={styles.qrLabel}>SCAN TO PAY</Text>
          <Image
            source={require("../assets/payment.jpg")}
            style={styles.qrImage}
          />
        </View>

        {/* Upload Section */}
        {image ? (
          <Image source={{ uri: image }} style={styles.proofImage} />
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
            <Ionicons name="cloud-upload-outline" size={22} color="#2c6e49" />
            <Text style={styles.uploadText}>Upload Payment Screenshot</Text>
          </TouchableOpacity>
        )}

        {uploading && (
          <ActivityIndicator
            size="small"
            color="#2c6e49"
            style={{ marginTop: 10 }}
          />
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>GO BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handleUploadAndSave}
          disabled={uploading}
        >
          <Text style={styles.payText}>
            {uploading ? "UPLOADING..." : "SUBMIT PAYMENT"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Help Section */}
      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>Need Assistance?</Text>
        <View style={styles.helpRow}>
          <Ionicons name="chatbubbles-outline" size={16} color="#2c6e49" />
          <Text style={styles.helpText}> Live Chat: Offline</Text>
        </View>
        <View style={styles.helpRow}>
          <Ionicons name="call-outline" size={16} color="#2c6e49" />
          <Text style={styles.helpText}> Call: (02) 8123-4567</Text>
        </View>
        <View style={styles.helpRow}>
          <Ionicons name="mail-outline" size={16} color="#2c6e49" />
          <Text style={styles.helpText}> Email: support@furnitune.com</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f6f1",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    color: "#2c6e49",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: "700",
    color: "#1B3D36",
    fontSize: 15,
    marginBottom: 10,
  },
  orderRow: { flexDirection: "row", alignItems: "center" },
  productImage: { width: 80, height: 60, borderRadius: 8, marginRight: 10 },
  productName: { fontWeight: "600", fontSize: 14, color: "#333" },
  productQty: { fontSize: 12, color: "#777", marginTop: 2 },
  productPrice: { fontWeight: "700", color: "#2c6e49", fontSize: 15 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: { fontSize: 13, color: "#555" },
  value: { fontSize: 13, color: "#333" },
  totalLabel: { fontWeight: "700", fontSize: 15, color: "#000" },
  totalValue: { fontWeight: "700", fontSize: 15, color: "#2c6e49" },
  description: {
    fontSize: 13,
    color: "#555",
    marginBottom: 10,
    lineHeight: 18,
  },
  qrContainer: {
    backgroundColor: "#f3f7f4",
    borderRadius: 12,
    alignItems: "center",
    padding: 10,
  },
  qrLabel: {
    fontSize: 12,
    color: "#2c6e49",
    fontWeight: "700",
    marginBottom: 8,
  },
  qrImage: {
    width: 220,
    height: 220,
    resizeMode: "contain",
    borderRadius: 8,
  },
  proofImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    marginTop: 12,
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: "#2c6e49",
    backgroundColor: "#eef6f1",
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  uploadText: {
    color: "#2c6e49",
    fontWeight: "600",
    marginLeft: 6,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#ddd",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginRight: 10,
  },
  cancelText: { color: "#333", fontWeight: "600" },
  payBtn: {
    flex: 1,
    backgroundColor: "#2c6e49",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginLeft: 10,
  },
  payText: { color: "#fff", fontWeight: "700" },
  helpCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginTop: 25,
    marginBottom: 40,
  },
  helpTitle: { fontWeight: "700", color: "#2c6e49", marginBottom: 8 },
  helpRow: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
  helpText: { fontSize: 13, color: "#333", marginLeft: 5 },
});
