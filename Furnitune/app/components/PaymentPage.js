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
  doc,         // ✅ add this
  setDoc,      // ✅ add this
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  updateDoc,
  arrayUnion,
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import { app } from "./firebaseConfig";
import * as Linking from "expo-linking"; // ← add this import at the top


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

    // 🔹 Upload payment proof
    const proofFilename = `userPayments/${user.uid}/${Date.now()}_proof.jpg`;
    const proofRef = ref(storage, proofFilename);
    const proofBlob = await (await fetch(image)).blob();
    await uploadBytes(proofRef, proofBlob, { contentType: "image/jpeg" });
    const paymentProofUrl = await getDownloadURL(proofRef);

    // 🔹 Detect order type
    const orderType =
      order?.items?.[0]?.type ||
      order?.type ||
      order?.product?.type ||
      "catalog";

    let orderData = {};
    let collectionName = "orders";

    // 🎨 Handle CUSTOMIZATION orders
    if (orderType === "customization") {
    collectionName = "custom_orders";
    const item = order?.items?.[0] || order?.product || {};


    const uploadedDesigns = [];

    const thumbnailUrl =
      order?.product?.thumbnail ||
      order?.product?.thumbnailUrl ||
      (Array.isArray(order?.product?.imageUrls)
        ? order.product.imageUrls.find((url) =>
            url.toLowerCase().includes("thumb")
          )
        : null) ||
      (Array.isArray(order?.product?.images)
        ? order.product.images.find((url) =>
            url.toLowerCase().includes("thumb")
          )
        : null) ||
      order?.product?.image ||
      order?.product?.images?.[0] ||
      order?.product?.imageUrls?.[0] ||
      "https://via.placeholder.com/150";

    // ✅ Only upload user reference images, not the thumbnail
    const imageList = [
      ...(item.uploadedImages || []),
      ...(order?.uploadedImages || []),
      ...(order?.product?.uploadedImages || []),
    ].filter((uri) => !!uri);

    console.log("🖼️ Using thumbnail only for product image:", thumbnailUrl);
    console.log("🖼️ Uploading only user images:", imageList);






    for (const [index, uri] of imageList.entries()) {
      try {
        if (uri && uri.startsWith("file://")) {
          const imgRef = ref(storage, `customOrders/${user.uid}/${Date.now()}_${index}_design.jpg`);
          const blob = await (await fetch(uri)).blob();
          await uploadBytes(imgRef, blob, { contentType: "image/jpeg" });
          const downloadURL = await getDownloadURL(imgRef);
          uploadedDesigns.push(downloadURL);
        } else if (uri && uri.startsWith("https://")) {
          uploadedDesigns.push(uri); // keep already uploaded URLs
        }
      } catch (err) {
        console.warn("⚠️ Error uploading reference image:", err.message);
      }
    }

    // 🩹 Fallback: if user uploaded no new images, keep any existing ones
    if (uploadedDesigns.length === 0) {
      if (item.referenceImages?.length > 0) uploadedDesigns.push(...item.referenceImages);
      else if (order?.product?.referenceImages?.length > 0)
        uploadedDesigns.push(...order.product.referenceImages);
    }

    console.log("✅ Uploaded reference images:", uploadedDesigns);


    orderData = {
      userId: user.uid,
      orderId: generatedId,
      category: item.category || "Custom",
      productId: item.id || "custom_" + Date.now(),
      productTitle: item.name || "Custom Product",
      descriptionFromProduct: item.description || "",

      images: [
        item.originalImage || item.image || order?.product?.image || product?.image
      ],
        referenceImages: uploadedDesigns,
            // ✅ Custom details
            notes: item.notes || "",
            additionals: item.additionals || [],
            cover: {
              color: item.selectedColor || "Default",
              materialType: item.selectedMaterial || "Fabric",
            },
            size: item.selectedSize || "Catalog",
            status: "processing",
            type: "customization",

            // ✅ Include pricing breakdown
            unitPrice: Number(item.price || order?.subtotal || 0),
            priceBreakdown: {
              basePHP: Number(item.price || order?.subtotal || 0),
              additionsPHP: 0,
              sizeAddPHP: 0,
              totalPHP: Number(order?.total || item.price || 0),
              currency: "PHP",
              materialMult: 1,
              sizeMult: 1,
            },

            // ✅ Include shipping address
            shippingAddress: order?.shippingAddress || {},

            // ✅ Payment status + proof
            paymentStatus: "pending",
            paymentProofUrl,
            paymentUpdatedAt: serverTimestamp(),

            // ✅ Timestamp
            createdAt: serverTimestamp(),
    };
  } else if (orderType === "repair") {
      collectionName = "repairs";
      const item = order?.product || order || {};
      const uploadedRepairImages = [];

      // 🧩 Collect all possible image sources
      const repairImageList = [
        ...(item?.uploadedImages || []),
        ...(item?.images || []),
        ...(order?.uploadedImages || []),
        ...(order?.items?.[0]?.uploadedImages || []),
      ].filter(Boolean);

      console.log("🧰 Found repair images before upload:", repairImageList);

      for (const [index, uri] of repairImageList.entries()) {
        try {
          if (uri && uri.startsWith("file://")) {
            console.log("⬆️ Uploading repair image:", uri);

            // ✅ Ensure permission before accessing local files
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Permission Required", "Please allow access to photos to upload repair images.");
              continue;
            }

            const response = await fetch(uri);
            const blob = await response.blob();

            if (!blob || blob.size === 0) {
              console.warn("⚠️ Empty blob for:", uri);
              continue;
            }

            const repairId = order?.id || order?.repairId || Date.now().toString();
              const imgRef = ref(
                storage,
                `repairs/${user.uid}/${repairId}/${Date.now()}_${index}_repair.jpg`
              );
            await uploadBytes(imgRef, blob, { contentType: "image/jpeg" });
            const downloadURL = await getDownloadURL(imgRef);
            uploadedRepairImages.push(downloadURL);
            console.log("✅ Uploaded to Firebase:", downloadURL);
          } else if (uri && uri.startsWith("https://")) {
            uploadedRepairImages.push(uri);
          }
        } catch (err) {
          console.warn("⚠️ Error uploading repair image:", err.message);
        }
      }


      if (uploadedRepairImages.length === 0) {
        console.warn("⚠️ No repair images uploaded, using placeholder.");
        uploadedRepairImages.push("https://via.placeholder.com/150");
      }

      // ✅ Firestore data
      orderData = {
        userId: user?.uid || "",
        orderId: generatedId,
        contactEmail: order?.contactEmail || user?.email || "",
        notes: item?.notes || "",
        status: "processing",
        shippingAddress: order?.shippingAddress || {},
        typeId: item?.typeId || "repair_service",
        typeLabel: item?.typeLabel || "Repair Service",
        typePrice: item?.typePrice || 0,
        coverMaterialLabel: item?.coverMaterialLabel || "Fabric",
        coverMaterialPrice: item?.coverMaterialPrice || 0,
        frameMaterialLabel: item?.frameMaterialLabel || "Metal",
        frameMaterialPrice: item?.frameMaterialPrice || 0,
        images: uploadedRepairImages,
        imagesCount: uploadedRepairImages.length,
        total:
          Number(order?.total || item?.total) ||
          (item?.typePrice || 0) +
            (item?.coverMaterialPrice || 0) +
            (item?.frameMaterialPrice || 0),
        paymentStatus: "pending",
        paymentProofUrl: paymentProofUrl || "",
        paymentUpdatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
    }else {
      orderData = {
        ...order,
        userId: user.uid,
        contactEmail: order.contactEmail || user.email,
        paymentStatus: "pending",
        paymentProofUrl,
        paymentUpdatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: "processing",
        type: "catalog",
      };
    }
    Object.keys(orderData).forEach(
      (key) => orderData[key] === undefined && delete orderData[key]
    );

    // 💾 Save to Firestore
    const newOrderRef = doc(collection(db, collectionName));
    const generatedId = newOrderRef.id;

    // ✅ Attach this as orderId
    orderData.orderId = generatedId;

    // ✅ Save order using the same doc ID
    await setDoc(newOrderRef, orderData);
    

      // ✅ Add referenceImages to Firestore document after saving
      if (orderType === "customization") {
        try {
          await updateDoc(newOrderRef, {
            referenceImages: arrayUnion(...uploadedDesigns)
          });
          console.log("✅ referenceImages field updated in Firestore");
        } catch (err) {
          console.warn("⚠️ Failed to update referenceImages:", err);
        }
      }

    const userNotifRef = collection(db, "users", user.uid, "notifications");
      await addDoc(userNotifRef, {
        userId: user.uid, // required ✅
        title: "Order Placed Successfully 🎉",
        body: "Please pay ₱" + Number(order?.total || 0).toLocaleString() + " for your order.",
        image: null, // optional, keep null if no image
        link: `/ordersummary?orderId=${newOrderRef.id}`,
        type: "order_status",
        createdAt: serverTimestamp(),
        read: false,
        readAt: null,
        orderId: newOrderRef.id,
        repairId: null,
        status: "awaiting_payment",
      });

    console.log(`✅ ${orderType.toUpperCase()} order saved:`, newOrderRef.id);

    Alert.alert(
      "Payment Submitted",
      "Your payment proof and design photos have been uploaded successfully.",
      [
        {
          text: "OK",
          onPress: () =>
            navigation.replace("OrderPage", {
              orderId: newOrderRef.id,
              source: collectionName,
              fromPayment: true,
            }),
        },
      ]
    );
  } catch (error) {
    console.error("🔥 Upload error:", error);
    Alert.alert("Error", "Upload failed. Please try again.");
  } finally {
    setUploading(false);
  }
};

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >

      {/* 🧾 ORDER SUMMARY */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <Image
            source={{
              uri:
                // 🛠 REPAIR ORDERS
                order?.type === "repair" || order?.items?.[0]?.type === "repair"
                  ? order?.product?.uploadedImages?.[0] ||
                    order?.product?.imageUrl ||
                    order?.items?.[0]?.uploadedImages?.[0] ||
                    order?.items?.[0]?.imageUrl ||
                    "https://via.placeholder.com/150"

                // 🎨 CUSTOMIZATION ORDERS
                    : order?.type === "customization" || order?.items?.[0]?.type === "customization"
                    ? order?.product?.imageUrls?.[0] ||
                      order?.product?.cover ||
                      order?.product?.imageUrl ||
                      order?.product?.thumbnail ||
                      order?.product?.thumbnailUrl ||
                      order?.items?.[0]?.uploadedImages?.[0] ||
                      order?.items?.[0]?.imageUrls?.[0] ||
                      "https://via.placeholder.com/150"

                  // 🛋 STANDARD PRODUCT ORDERS
                  : order?.product?.imageUrl || // ✅ added for standard orders
                    order?.product?.thumbnail ||
                    order?.product?.thumbnailUrl ||
                    order?.items?.[0]?.thumbnail ||
                    order?.items?.[0]?.thumbnailUrl ||
                    (Array.isArray(order?.product?.imageUrls)
                      ? order.product.imageUrls.find((url) =>
                          url.toLowerCase().includes("thumb")
                        )
                      : null) ||
                    (Array.isArray(order?.product?.images)
                      ? order.product.images.find((url) =>
                          url.toLowerCase().includes("thumb")
                        )
                      : null) ||
                    order?.items?.[0]?.imageUrl ||
                    order?.product?.image ||
                    order?.product?.images?.[0] ||
                    order?.product?.imageUrls?.[0] ||
                    "https://via.placeholder.com/150"

            }}
            style={styles.productImage}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>
              {order?.product?.name || order?.items?.[0]?.name || "Unnamed Product"}
            </Text>
            <Text style={styles.productQty}>Qty: {order?.items?.[0]?.qty || 1}</Text>
          </View>
          <Text style={styles.productPrice}>
            ₱{Number(order?.product?.price || order?.items?.[0]?.price || 0).toLocaleString()}
          </Text>
        </View>

        {/* Subtotal / Discount / Shipping */}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>₱{Number(order?.subtotal || order?.product?.price || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Discount</Text>
          <Text style={styles.value}>₱{Number(order?.discount || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Shipping & Handling</Text>
          <Text style={styles.value}>₱{Number(order?.shippingFee || 510).toLocaleString()}</Text>
        </View>

        {/* TOTAL */}
        <View style={[styles.summaryRow, { marginTop: 6 }]}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>
            ₱{Number(order?.total || (order?.product?.price || 0) + (order?.shippingFee || 510)).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 💳 PAYMENT SUMMARY */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>PAYMENT SUMMARY</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.label}>Assessed Total</Text>
          <Text style={styles.value}>₱{Number(order?.total || (order?.product?.price || 0) + (order?.shippingFee || 510)).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Deposit</Text>
          <Text style={styles.value}>+₱{Number(0).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Additional Payments</Text>
          <Text style={styles.value}>+₱0</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Refunds</Text>
          <Text style={styles.value}>-₱0</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Net Paid</Text>
          <Text style={styles.totalValue}>₱{Number(0).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.label, { fontWeight: "700" }]}>Balance Due</Text>
          <Text style={[styles.value, { fontWeight: "700" }]}>₱{Number(order?.total || (order?.product?.price || 0) + (order?.shippingFee || 510)).toLocaleString()}</Text>
        </View>
      </View>


      {/* Payment Section */}
      <View style={styles.paymentCard}>
        <Text style={styles.paymentTitle}>Payment Method</Text>
        <Text style={styles.paymentDescription}>
          Please scan the QR code below to complete your payment. Then, upload a clear
          screenshot as proof of payment.
        </Text>

        <View style={styles.qrWrapper}>
          <View style={styles.qrHeader}>
            <Ionicons name="qr-code-outline" size={18} color="#2c6e49" />
            <Text style={styles.qrHeading}>Scan to Pay</Text>
          </View>
          <View style={styles.qrBox}>
            <Image source={require("../assets/payment.jpg")} style={styles.qrImage} />
          </View>
          <Text style={styles.qrNote}>Use GCash or your preferred bank app</Text>
        </View>
        <View style={styles.dividerLine} />
        {image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.proofImage} />
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() =>
                Alert.alert(
                  "Remove Image",
                  "Are you sure you want to delete this image?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => setImage(null) },
                  ]
                )
              }
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                <Ionicons name="cloud-upload-outline" size={22} color="#2c6e49" />
                <Text style={styles.uploadText}>Tap to Upload Screenshot</Text>
              </TouchableOpacity>
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

        {/* 💬 Live Chat */}
        <TouchableOpacity
          style={styles.helpRow}
          onPress={() => navigation.navigate("ChatbotPage")} // replace with your chat screen name
        >
          <Ionicons name="chatbubbles-outline" size={16} color="#2c6e49" />
          <Text style={[styles.helpText, styles.helpLink]}> Live Chat: Online!</Text>
        </TouchableOpacity>

        {/* 📞 Call */}
        <TouchableOpacity
          style={styles.helpRow}
          onPress={() => Linking.openURL("tel:09650934957")}
        >
          <Ionicons name="call-outline" size={16} color="#2c6e49" />
          <Text style={[styles.helpText, styles.helpLink]}> Call: 0965-093-4957</Text>
        </TouchableOpacity>

        {/* ✉️ Email */}
        <TouchableOpacity
          style={styles.helpRow}
          onPress={() =>
            Linking.openURL("mailto:furnitunecp@gmail.com?subject=Furnitune%20Support")
          }
        >
          <Ionicons name="mail-outline" size={16} color="#2c6e49" />
          <Text style={[styles.helpText, styles.helpLink]}>
            {" "}
            Email: furnitunecp@gmail.com
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    {uploading && (
  <View style={styles.uploadOverlay}>
    <View style={styles.uploadModal}>
      <ActivityIndicator size="large" color="#2c6e49" />
      <Text style={styles.uploadModalText}>Uploading your proof...</Text>
    </View>
  </View>
)}
    </View>
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
  borderRadius: 12,
  padding: 16,
  marginTop: 20,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 2,
},
helpTitle: {
  fontWeight: "700",
  color: "#2c6e49",
  marginBottom: 8,
  fontSize: 14,
},
helpRow: {
  flexDirection: "row",
  alignItems: "center",
  marginVertical: 4,
},
helpText: {
  color: "#333",
  fontSize: 13,
  marginLeft: 6,
},
helpLink: {
  textDecorationLine: "underline",
  color: "#1b4332",
},


  paymentSection: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 2,
},
summaryHeader: {
  fontWeight: "700",
  fontSize: 15,
  color: "#2c6e49",
  marginBottom: 10,
},

paymentCard: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 18,
  marginBottom: 24,
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 1 },
  elevation: 3,
},
paymentTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1B3D36",
  marginBottom: 8,
},
paymentDescription: {
  fontSize: 13,
  color: "#555",
  lineHeight: 20,
  marginBottom: 18,
},
qrWrapper: {
  alignItems: "center",
  backgroundColor: "#f5f8f6",
  borderRadius: 12,
  paddingVertical: 16,
  borderWidth: 1,
  borderColor: "#e1ebe3",
  marginBottom: 18,
},
qrHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
},
qrHeading: {
  fontSize: 13,
  fontWeight: "700",
  color: "#2c6e49",
  marginLeft: 6,
  textTransform: "uppercase",
},
qrBox: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 10,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 3,
  elevation: 2,
},
qrImage: {
  width: 180,
  height: 180,
  resizeMode: "contain",
  borderRadius: 8,
},
qrNote: {
  fontSize: 12,
  color: "#777",
  marginTop: 8,
  fontStyle: "italic",
  textAlign: "center",
},
dividerLine: {
  height: 1,
  backgroundColor: "#eee",
  marginVertical: 14,
},
uploadLabel: {
  fontSize: 13,
  fontWeight: "600",
  color: "#333",
  marginBottom: 10,
},
uploadBox: {
  borderWidth: 1.5,
  borderColor: "#2c6e49",
  borderStyle: "dashed",
  backgroundColor: "#eef7f2",
  borderRadius: 12,
  paddingVertical: 18,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
},
uploadText: {
  color: "#2c6e49",
  fontWeight: "600",
  marginLeft: 8,
},
proofImage: {
  width: "100%",
  height: 230,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  marginTop: 8,
},
loadingArea: {
  marginTop: 10,
  alignItems: "center",
},
loadingText: {
  fontSize: 12,
  color: "#777",
  marginTop: 4,
},

imageContainer: {
  position: "relative",
  width: "100%",
  marginTop: 8,
},
deleteBtn: {
  position: "absolute",
  top: 10,
  right: 10,
  backgroundColor: "rgba(44, 110, 73, 0.9)",
  borderRadius: 20,
  padding: 6,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 3,
  elevation: 3,
},
uploadOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.3)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
  elevation: 999, // for Android layering
  // 👇 Prevent touches on anything behind the overlay
  pointerEvents: "auto",
},

uploadModal: {
  backgroundColor: "rgba(255,255,255,0.9)",
  padding: 25,
  borderRadius: 16,
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 8,
},

uploadModalText: {
  marginTop: 12,
  fontSize: 15,
  fontWeight: "600",
  color: "#2c6e49",
  textAlign: "center",
},



});
