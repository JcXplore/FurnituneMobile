import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  addDoc, 
  collection, 
  serverTimestamp,
  query, 
  where, 
  onSnapshot 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app, db, storage } from "./firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


export default function ReturnRefundPage({ navigation, route }) {
  const { orderId, source } = route.params;
  const db = getFirestore(app);
  const [order, setOrder] = useState(null);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("gcash");
  const [hasReturnRequest, setHasReturnRequest] = useState(false);
  const [returnStatus, setReturnStatus] = useState("");
  const [gcashName, setGcashName] = useState("");
  const [gcashNumber, setGcashNumber] = useState("");

  function convertGsToHttps(gsUrl) {
    if (!gsUrl || !gsUrl.startsWith("gs://")) return gsUrl;

    const bucket = "furnitune-64458.firebasestorage.app";
    const path = gsUrl.replace(`gs://${bucket}/`, "");
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
  }

  useEffect(() => {
    if (!orderId) return;

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "returns"),
      where("orderId", "==", orderId),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setHasReturnRequest(true);
        setReturnStatus(docData.status || "requested");
      } else {
        setHasReturnRequest(false);
      }
    });
      return unsubscribe;
  }, [orderId]);
  

  // 🔹 Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // 🛡️ Prevent invalid Firestore calls
        if (!orderId) {
          Alert.alert("⚠️ Missing Order ID", "Unable to load order details.");
          return;
        }

        // 🧠 Step 1: Try using the provided source first
        if (source) {
          const ref = doc(db, source, orderId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setOrder({ id: snap.id, ...snap.data(), source });
            return;
          }
        }

        // 🧠 Step 2: Auto-detect from possible collections
        const possibleCollections = ["custom_orders", "orders", "repairs"];
        let found = null;

        for (const col of possibleCollections) {
          const ref = doc(db, col, orderId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            found = { id: snap.id, ...snap.data(), source: col };
            break;
          }
        }

        if (found) {
          console.log(`✅ Found order in ${found.source}`);
          setOrder(found);
        } else {
          Alert.alert("⚠️ Order not found in any collection.");
        }
      } catch (error) {
        console.error("🔥 Error loading order:", error);
        Alert.alert("❌ Failed to load order details. Please try again.");
      }
    };

    fetchOrder();
  }, [orderId, source]);



  // 🔹 Pick Image
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission denied", "Please allow access to photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // 🔹 Submit return request
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("⚠️ Error", "You must be logged in to submit a refund request.");
        setSubmitting(false);
        return;
      }

      if (!order) {
        Alert.alert("⚠️ Error", "Order details not found.");
        setSubmitting(false);
        return;
      }

    // ✅ REQUIRED FIELD VALIDATION
    if (!reason.trim()) {
      Alert.alert("Missing Information", "Please enter your reason for return.");
      setSubmitting(false);
      return;
    }

    if (!imageUri) {
      Alert.alert("Missing Proof", "Please upload a proof image before submitting.");
      setSubmitting(false);
      return;
    }

    if (!selectedMethod) {
      Alert.alert("Missing Refund Method", "Please select your refund method.");
      setSubmitting(false);
      return;
    }

    if (selectedMethod === "gcash") {
      if (!gcashName.trim()) {
        Alert.alert("Missing GCash Info", "Please enter your GCash account name.");
        setSubmitting(false);
        return;
      }

      if (!gcashNumber.trim()) {
        Alert.alert("Missing GCash Info", "Please enter your GCash account number.");
        setSubmitting(false);
        return;
      }

      if (gcashNumber.length !== 11) {
        Alert.alert("Invalid GCash Number", "GCash number must be 11 digits long.");
        setSubmitting(false);
        return;
      }
    }


    // 🖼️ Upload proof image
    let imageUrl = null;
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const fileName = `${Date.now()}_proof.jpg`;

    // ✅ Adjust upload path based on order source
    const storagePath = `returns/${user.uid}/${order.id}/${fileName}`;


    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob);
    imageUrl = await getDownloadURL(storageRef);

    // 🧾 Add return document to Firestore
    await addDoc(collection(db, "returns"), {
      id: order.id,  // optional, but matches your sample

      userId: user.uid,
      orderId: order.id,

      contactEmail: order.shippingAddress?.email || order.email || "",
      contactPhone: order.shippingAddress?.phone || "",

      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),

      deliveredAt: order.deliveredAt || null,

      gcash: {
        accountName: gcashName.trim(),
        accountNumber: gcashNumber.trim(),
        last4: gcashNumber.slice(-4),
        hasMessage: reason.trim().length > 0,
        hasPhotos: true,
      },

      items: order.items || [
        {
          image: order.images?.[0] || "",
          productId: order.productId || null,
          qty: 1,
          title: order.productTitle || "Custom Item",
          unitPrice: order.unitPrice || 0,
          maxQty: 1,
          variant: null,
        },
      ],

      images: [imageUrl],

      message: reason.trim(),
      reasonCode: "damaged", // or whatever you want to use
      refundChannel: "GCASH",
      refundMethod: "original",
      requestedAmount: order.unitPrice || 0,

      origin: "CATALOG",
      source: "user",

      status: "requested",

      totals: {
        itemCount: 1,
        lineCount: 1,
      },

      updatedAt: serverTimestamp(),
    });




    Alert.alert("✅ Success", "Your refund request has been submitted successfully.");
    navigation.goBack();
  } catch (error) {
    console.error("🔥 Error submitting refund:", error);
    Alert.alert("❌ Error", "Failed to submit refund. Please try again.");
  } finally {
    setSubmitting(false);
  }
};



  if (!order) {
    return (
      <View style={styles.centered}>
        <Text>Loading order details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.header}>Return / Refund Request</Text>
      {/* 🔹 Show Return Request Banner */}
{hasReturnRequest && (
  <View style={[
    styles.statusBanner,
    returnStatus === "requested"
      ? styles.statusPending
      : returnStatus === "approved"
      ? styles.statusApproved
      : returnStatus === "denied"
      ? styles.statusDenied
      : styles.statusCompleted
  ]}>
    <Ionicons
      name={
        returnStatus === "approved"
          ? "checkmark-circle-outline"
          : returnStatus === "denied"
          ? "close-circle-outline"
          : "time-outline"
      }
      size={20}
      color="#fff"
    />
    <Text style={styles.statusBannerText}>
      {returnStatus === "requested" && "Return request submitted — awaiting review."}
      {returnStatus === "approved" && "Return approved — awaiting refund."}
      {returnStatus === "denied" && "Return request denied."}
      {returnStatus === "refund_issued" && "Refund has been issued. Check your account."}
    </Text>
  </View>
)}


      {/* 🔹 Product Details */}
      {/* 🔹 Product Details */}
<View style={styles.card}>
  {/* 🧩 If order has items (normal orders) */}
  {Array.isArray(order.items) && order.items.length > 0 ? (
    order.items.map((item, index) => (
      <View key={index} style={styles.productRow}>
        <Image
          source={{
            uri:
              // 1️⃣ Standard orders
              item.image ||
              item.imageUrl ||
              order?.product?.imageUrl ||
              order?.product?.thumbnail ||
              order?.product?.imageUrls?.[0] ||

              // 2️⃣ Custom orders
              order?.images?.[0] ||
              order?.referenceImages?.[0] ||

              // 3️⃣ Repairs
              order?.repairImageUrl ||

              // 4️⃣ Last fallback
              "https://via.placeholder.com/150"
          }}
          style={styles.productImg}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productDetail}>Qty: {item.qty || 1}</Text>
          <Text style={styles.productDetail}>
            ₱{Number(item.price || 0).toLocaleString()}
          </Text>
        </View>
      </View>
    ))
  ) : order.type === "customization" || order.category === "Custom" ? (
    // 🧩 Custom Orders
    <View style={styles.productRow}>
      <Image
        source={{ uri: order.images?.[0] }}
        style={styles.productImg}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.productName}>
          {order.productTitle || "Custom Furniture"}
        </Text>
        <Text style={styles.productDetail}>
          Size: {order.size || "N/A"}
        </Text>
        <Text style={styles.productDetail}>
          Color: {order.cover?.color || "N/A"}
        </Text>
        <Text style={styles.productDetail}>
          Material: {order.cover?.materialType || "N/A"}
        </Text>
        {order.additionals?.length > 0 && (
          <Text style={styles.productDetail}>
            Additionals: {order.additionals.join(", ")}
          </Text>
        )}
        <Text style={styles.productDetail}>
          ₱{Number(order.priceBreakdown?.totalPHP || order.unitPrice || 0).toLocaleString()}
        </Text>
      </View>
    </View>
  // ✅ FIX: Check source OR type, and provide image fallbacks
  ) : (order.type === "repair" || order.source === "repairs") ? (
    // 🧩 Repairs
    <View style={styles.productRow}>
      <Image
        source={{ 
          uri: order.repairImageUrl || 
               order.images?.[0] || 
               order.imageUrl || 
               "https://via.placeholder.com/150" 
        }}
        style={styles.productImg}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.productName}>
          {order.repairTitle || order.title || "Repair Request"}
        </Text>
        <Text style={styles.productDetail}>
          {order.repairDescription || order.description || "Repair details not available"}
        </Text>
        <Text style={styles.productDetail}>
          Total: ₱{Number(order.total || 0).toLocaleString()}
        </Text>
      </View>
    </View>
  ) : (
    // 🧩 Fallback (no data)
    <Text style={{ color: "#666", textAlign: "center" }}>
      No product details available.
    </Text>
  )}
</View>


      {/* 🔹 Return Reason */}
      <Text style={styles.label}>Reason for Return</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Item damaged, Wrong color, Missing parts..."
          value={reason}
          onChangeText={setReason}
        />
      </View>

    

      {/* 🔹 Image Proof */}
      <Text style={styles.label}>Upload Proof Image</Text>
      <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.uploadedImg} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={24} color="#777" />
            <Text style={{ color: "#777", marginTop: 6 }}>Tap to Upload</Text>
          </>
        )}
      </TouchableOpacity>

{/* 🔹 Refund Method Selection */}
{/* 🔹 Refund Method Selection */}
<View style={styles.card}>
  <Text style={styles.sectionTitle}>Refund Method</Text>

  <View style={styles.methodContainer}>
    <TouchableOpacity
      style={[
        styles.methodBox,
        selectedMethod === "gcash" && styles.methodBoxSelected,
      ]}
      onPress={() => setSelectedMethod("gcash")}
      activeOpacity={0.8}
    >
      <Ionicons
        name="wallet-outline"
        size={20}
        color={selectedMethod === "gcash" ? "#fff" : "#2c6e49"}
      />
      <Text
        style={[
          styles.methodText,
          selectedMethod === "gcash" && styles.methodTextSelected,
        ]}
      >
        Gcash Refund
      </Text>
    </TouchableOpacity>
    {selectedMethod === "gcash" && (
  <View style={[styles.card, { marginTop: 10 }]}>
    <Text style={styles.sectionTitle}>GCash Details</Text>

    <Text style={styles.label}>Account Name</Text>
    <View style={styles.inputBox}>
      <TextInput
        style={styles.textInput}
        placeholder="Enter GCash account name"
        value={gcashName}
        onChangeText={setGcashName}
      />
    </View>

    <Text style={styles.label}>Account Number</Text>
    <View style={styles.inputBox}>
      <TextInput
        style={styles.textInput}
        placeholder="Enter GCash number (11 digits)"
        keyboardType="number-pad"
        value={gcashNumber}
        onChangeText={setGcashNumber}
        maxLength={11}
      />
    </View>
  </View>
)}


  </View>
</View>



      {/* 🔹 Submit Button */}
      <TouchableOpacity
  style={[
    styles.submitBtn,
    (submitting || hasReturnRequest) && { opacity: 0.6 },
  ]}
  disabled={submitting || hasReturnRequest}
  onPress={handleSubmit}
>
  <Ionicons
    name={hasReturnRequest ? "checkmark-circle-outline" : "send-outline"}
    size={18}
    color="#fff"
  />
  <Text style={styles.submitText}>
    {hasReturnRequest
      ? "Request Submitted"
      : submitting
      ? "Submitting..."
      : "Submit Request"}
  </Text>
</TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7ef", padding: 20 },
  header: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2c6e49",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    marginBottom: 20,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  productImg: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 10,
  },
  productName: {
    fontWeight: "700",
    color: "#222",
  },
  productDetail: {
    fontSize: 12,
    color: "#555",
  },
  label: {
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
    fontSize: 13,
  },
  inputBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 14,
  },
  textInput: {
    fontSize: 13,
    color: "#222",
  },
  uploadBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  uploadedImg: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  notesInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 25,
  },
  submitBtn: {
    backgroundColor: "#2c6e49",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 30,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 6,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtn: {
  backgroundColor: "#2c6e49",
  paddingVertical: 12,
  borderRadius: 30,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 20,
},


sectionTitle: {
  fontSize: 16,
  fontWeight: "600",
  color: "#2c6e49",
  marginBottom: 12,
},

methodContainer: {
  flexDirection: "column",
  gap: 10,
},

methodBox: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#2c6e49",
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 15,
  backgroundColor: "#fff",
  elevation: 1,
},

methodBoxSelected: {
  backgroundColor: "#2c6e49",
  borderColor: "#2c6e49",
  shadowColor: "#2c6e49",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
},

methodText: {
  marginLeft: 10,
  fontSize: 15,
  color: "#2c6e49",
  fontWeight: "500",
},

methodTextSelected: {
  color: "#fff",
  fontWeight: "600",
},
statusBanner: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 8,
  marginBottom: 15,
},
statusBannerText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "600",
  marginLeft: 8,
},
statusPending: { backgroundColor: "#f0ad4e" },  // amber
statusApproved: { backgroundColor: "#5cb85c" }, // green
statusDenied: { backgroundColor: "#d9534f" },   // red
statusCompleted: { backgroundColor: "#0275d8" }, // blue


});
