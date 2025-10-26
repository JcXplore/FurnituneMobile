import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  Modal, 
  TextInput,
  Alert 
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { app } from "./firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot, collection, query, where, getDocs, updateDoc, addDoc } from "firebase/firestore";


export default function OrderSummary({ navigation, route }) {
  const db = getFirestore(app);
  const { orderId, source = "orders" } = route?.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [rated, setRated] = useState(false);
  const [existingRating, setExistingRating] = useState(0);
  const [existingComment, setExistingComment] = useState("");
  
  useEffect(() => {
  setRating(existingRating);
  setComment(existingComment);
}, [existingRating, existingComment]);


useEffect(() => {
  const checkIfRated = async () => {
    if (!orderId) return;
    const user = getAuth().currentUser;
    if (!user) return;

    try {
      const reviewQuery = query(
        collection(db, "reviews"),
        where("orderId", "==", orderId),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(reviewQuery);

      if (!snapshot.empty) {
        const reviewData = snapshot.docs[0].data();
        setRated(true);
        setExistingRating(reviewData.rating || 0);
        setExistingComment(reviewData.message || "");
      } else {
        setRated(false);
        setExistingRating(0);
        setExistingComment("");
      }
    } catch (error) {
      console.error("Error checking existing review:", error);
    }
  };

  checkIfRated();
}, [orderId]);


useEffect(() => {
  if (!orderId) return;

  const auth = getAuth();
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (!user) return;

    console.log("👤 Logged in as:", user.uid);

    const q = query(
      collection(db, "reviews"),
      where("orderId", "==", orderId),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const hasReview = !querySnapshot.empty;
      setRated(hasReview);
    }, (error) => console.warn("❌ Review check failed:", error.message));

    return unsubscribe;
  });

  return () => unsubscribeAuth();
}, [orderId]);


useEffect(() => {
  const auth = getAuth();
  const user = auth.currentUser;

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user && orderId) {
      const ref = doc(db, source, orderId);
      const unsubscribeOrder = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) setOrder({ id: snap.id, ...snap.data() });
          setLoading(false);
        },
        (error) => {
          console.warn("❌ Firestore read blocked:", error.message);
          setLoading(false);
        }
      );
      return unsubscribeOrder;
    } else {
      console.warn("⚠️ No user authenticated or missing orderId");
      setLoading(false);
    }
  });

  return () => unsubscribeAuth();
}, [orderId, source]);

  // 🧭 Prevent back navigation to payment page
  // 🧭 Conditional back navigation handling
useEffect(() => {
  const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
    // If user came from PaymentPage, block back navigation to prevent re-entry
    if (route?.params?.fromPayment) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }], // ✅ reset stack so user can't go back to payment
      });
      return true;
    } else {
      // Normal back behavior for all other cases
      navigation.goBack();
      return true;
    }
  });

  return () => backHandler.remove();
}, [navigation, route?.params]);


  // Handle missing orderId early
  if (!orderId) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#555", textAlign: "center" }}>
          ⚠️ Missing order ID. Please go back and select an order again.
        </Text>
        {/* 🔹 Sticky Bottom Buttons */}
<View style={styles.fixedBottom}>
  <TouchableOpacity
    style={[styles.fixedBtn, styles.cancelBtn]}
    onPress={() => Alert.alert("❌ Cancel Order", "Your order has been cancelled.")}
  >
    <Ionicons name="close-circle-outline" size={18} color="#fff" />
    <Text style={styles.fixedBtnText}>Cancel Order</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.fixedBtn, styles.homeBtn]}
    onPress={() => navigation.navigate("Landing")}
  >
    <Ionicons name="home-outline" size={18} color="#fff" />
    <Text style={styles.fixedBtnText}>Return Home</Text>
  </TouchableOpacity>
</View>

      </View>
    );
  }

  // Real-time Firestore listener
  useEffect(() => {
    const ref = doc(db, source, orderId);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

 useEffect(() => {
  const checkIfRated = async () => {
    const q = query(collection(db, "reviews"), where("orderId", "==", orderId));
    const querySnapshot = await getDocs(q);

    const hasReview = !querySnapshot.empty;
    setRated(hasReview);

    // ✅ If rated and status not yet completed, update order status
    if (
      hasReview &&
      order?.status?.toLowerCase() !== "completed" &&
      source !== "repairs" // ⛔ prevent updating repairs collection
    ) {
      const orderRef = doc(db, source, orderId);
    }

  };

  if (orderId) checkIfRated();
}, [orderId, order]);



  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2c6e49" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#555" }}>Order not found.</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.homeButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
  style={styles.container}
  contentContainerStyle={{ paddingBottom: 120 }} // 👈 ensures content isn’t hidden
>

      {/* Header */}
      <Text style={styles.brand}>FURNITUNE</Text>

      {/* Order Details */}
      <Text style={styles.sectionTitle}>ORDER DETAILS</Text>

      {order.status && (
        <Text style={styles.statusText}>
          Status: {order.status.replace("_", " ").toUpperCase()}
        </Text>
      )}

      <View style={styles.detailsCard}>
        {/* Progress Icons */}
        <View style={styles.progressRow}>
          {renderStep("PROCESSING", order.status, 1)}
          {renderStep("PREPARING", order.status, 2)}
          {renderStep("TO SHIP", order.status, 3)}
          {renderStep("TO RECEIVE", order.status, 4)}
          {renderStep("COMPLETED", order.status, 5)}
        </View>

        {/* Status Note */}
        <Text style={styles.detailsNote}>{getStatusMessage(order.status)}</Text>
        {/* 🟩 Order Received Button */}
{order.status?.toLowerCase() === "to_receive" && (
  <TouchableOpacity
    style={styles.receiveButton}
    onPress={() => {
      Alert.alert(
        "Confirm Received",
        "Are you sure you’ve received your order?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, I Received It",
            style: "default",
            onPress: async () => {
              try {
                const orderRef = doc(db, source, order.id);
                await updateDoc(orderRef, {
                  status: "to_rate",
                  receivedConfirmedAt: new Date(), // ✅ Save date
                });

                Alert.alert(
                  "✅ Thank You!",
                  "Your receipt has been confirmed. You can now rate or request a refund."
                );
              } catch (error) {
                console.error("Error confirming receipt:", error);
                Alert.alert("❌ Failed", "Please try again later.");
              }
            },
          },
        ]
      );
    }}
  >
    <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
    <Text style={styles.receiveButtonText}>Order Received</Text>
  </TouchableOpacity>
)}



        {order.status?.toLowerCase() === "completed" && (
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => setShowModal(true)}
          >
            <Ionicons
              name={rated ? "create-outline" : "star-outline"}
              size={20}
              color="#fff"
            />
            <Text style={styles.rateButtonText}>
              {rated ? "Edit Review" : "Rate Product"}
            </Text>
          </TouchableOpacity>
        )}




        {order.status?.toLowerCase() === "completed" && (
        <TouchableOpacity
          style={[styles.rateButton, { backgroundColor: "#d9534f" }]}
          onPress={() =>
            navigation.navigate("ReturnRefundPage", { orderId: order.id })
          }
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.rateButtonText}>Return / Refund</Text>
        </TouchableOpacity>
      )}



      </View>

      {/* Order Summary */}
      <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>

      <View style={styles.summaryCard}>
        {order?.items?.map((item, index) => (
          <View key={index} style={styles.productRow}>
            <Image
              source={{ uri: item.image || item.imageUrl }}
              style={styles.productImage}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productQty}>Qty: {item.qty || 1}</Text>
            </View>
            <Text style={styles.productPrice}>
              ₱{Number(item.price || 0).toLocaleString()}
            </Text>
          </View>
        ))}

        {order?.shippingAddress && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: "600", color: "#2c6e49" }}>
              Shipping To:
            </Text>
            <Text style={{ color: "#444" }}>{order.shippingAddress.fullName}</Text>
            <Text style={{ color: "#444" }}>
              {order.shippingAddress.street}, {order.shippingAddress.city}
            </Text>
            <Text style={{ color: "#444" }}>
              {order.shippingAddress.region}, {order.shippingAddress.zip}
            </Text>
          </View>
        )}

        {/* Price Summary */}
        <View style={styles.priceRow}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>
            ₱{Number(order?.subtotal || 0).toLocaleString()}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.label}>Shipping & Handling Fee</Text>
          <Text style={styles.value}>
            ₱{Number(order?.shippingFee || 510).toLocaleString()}
          </Text>
        </View>

        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={[styles.label, { fontWeight: "bold" }]}>TOTAL</Text>
          <Text style={[styles.value, { fontWeight: "bold" }]}>
            ₱{Number(order?.total || 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Payment Proof */}
      {order?.paymentProofUrl && (
        <View style={{ marginTop: 15, alignItems: "center" }}>
          <Text style={{ fontWeight: "600", color: "#2c6e49", marginBottom: 6 }}>
            Payment Proof
          </Text>
          <Image
            source={{ uri: order.paymentProofUrl }}
            style={{ width: 200, height: 200, borderRadius: 10 }}
          />
        </View>
      )}  

      

      {/* Assistance */}
      <View style={styles.assistanceCard}>
        <Text style={styles.assistTitle}>NEED ASSISTANCE?</Text>

        <View style={styles.assistItem}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#2c6e49" />
          <Text style={styles.assistText}>Live Chat: Online now</Text>
        </View>

        <View style={styles.assistItem}>
          <Ionicons name="call-outline" size={20} color="#2c6e49" />
          <Text style={styles.assistText}>Call: 123-123-312</Text>
        </View>

        <View style={styles.assistItem}>
          <MaterialIcons name="email" size={20} color="#2c6e49" />
          <Text style={styles.assistText}>Email Us: Furnitune@jemeyl.com</Text>
        </View>
      </View>

      


      {/* ⭐ Rating Modal */}
<Modal
  visible={showModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Rate Your Product</Text>

      {/* Product Image */}
      {order?.items?.[0]?.image && (
        <Image
          source={{ uri: order.items[0].image }}
          style={styles.modalImage}
        />
      )}

      {/* Star Rating */}
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity key={num} onPress={() => setRating(num)}>
            <Ionicons
              name={num <= rating ? "star" : "star-outline"}
              size={32}
              color="#FFD700"
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Comment Input */}
      <TextInput
        style={styles.commentInput}
        placeholder="Write your comment here..."
        placeholderTextColor="#888"
        value={comment}
        onChangeText={setComment}
        multiline
      />

      {/* Buttons */}
      <View style={styles.modalButtons}>
        <TouchableOpacity
  style={styles.submitButton}
  onPress={async () => {
  try {
    if (rating === 0) {
      Alert.alert("⚠️ Please select a rating before submitting.");
      return;
    }

    const userId = order?.userId || "unknown";
    const username = order?.shippingAddress?.fullName || "Anonymous";

    // 🔍 Check if the user already submitted a review for this order
    const reviewQuery = query(
      collection(db, "reviews"),
      where("orderId", "==", orderId),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(reviewQuery);

    if (!snapshot.empty) {
      // 📝 Update existing review
      const existingReview = snapshot.docs[0];
      Alert.alert("✅ Your review has been updated!");
    } else {
      // 🆕 Add a new review
      
      Alert.alert("✅ Thank you for your feedback!");
    }

    setRated(true);
    setShowModal(false);
  } catch (error) {
    console.error("Error submitting review:", error);
    Alert.alert("❌ Failed to submit review. Please try again later.");
  }
}}

>
  <Text style={styles.submitText}>Submit</Text>
</TouchableOpacity>


        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowModal(false)}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

    </ScrollView>
    {/* 🔹 Sticky Bottom Buttons */}
    <View style={styles.fixedBottom}>
      {/* Cancel Order Button */}
      <TouchableOpacity
  activeOpacity={1}
  disabled={isOrderLocked(order?.status) || order?.status?.toLowerCase() === "cancelled"} // ✅ disable if locked or already cancelled
  style={[
    styles.fixedBtn,
    (isOrderLocked(order?.status) || order?.status?.toLowerCase() === "cancelled")
      ? styles.disabledBtn
      : styles.cancelBtn,
  ]}
  onPress={() => {
    if (isOrderLocked(order?.status)) {
      Alert.alert(
        "⚠️ Not Allowed",
        "You can no longer cancel this order once it’s being prepared or shipped."
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
              const orderRef = doc(db, source, order.id);
              await updateDoc(orderRef, { status: "cancelled" });

              Alert.alert(
                "✅ Order Cancelled",
                "Your order has been successfully cancelled."
              );
            } catch (error) {
              console.error("Error cancelling order:", error);
              Alert.alert(
                "❌ Failed",
                "Unable to cancel order. Please try again."
              );
            }
          },
        },
      ]
    );
  }}
>
  <Ionicons
    name="close-circle-outline"
    size={18}
    color={
      isOrderLocked(order?.status) || order?.status?.toLowerCase() === "cancelled"
        ? "#666"
        : "#fff"
    }
  />
  <Text
    style={[
      styles.fixedBtnText,
      (isOrderLocked(order?.status) || order?.status?.toLowerCase() === "cancelled") && {
        color: "#666",
      },
    ]}
  >
    Cancel Order
  </Text>
</TouchableOpacity>



      {/* Return Home Button */}
      <TouchableOpacity
        style={[styles.fixedBtn, styles.homeBtn]}
        onPress={() => navigation.navigate("Landing")}
      >
        <Ionicons name="home-outline" size={18} color="#fff" />
        <Text style={styles.fixedBtnText}>Return Home</Text>
      </TouchableOpacity>
    </View>


    </View>

  );
}

const isOrderLocked = (status) => {
  const lockedStatuses = [
    "preparing",
    "to_ship",
    "to_receive",
    "to_rate",
    "completed",
    "return/refund",
    "cancelled", // ✅ added
  ];
  return lockedStatuses.includes(status?.toLowerCase());
};

/* 🔹 Dynamic Step Renderer */
function renderStep(label, currentStatus, stepNumber) {
  const statusOrder = {
    processing: 1,
    preparing: 2,
    to_ship: 3,
    to_receive: 4,
    completed: 5,
  };

  const currentStep = statusOrder[currentStatus?.toLowerCase()] || 0;
  const active = stepNumber <= currentStep;

  const iconMap = {
    PROCESSING: "time-outline",
    PREPARING: "construct-outline",
    "TO SHIP": "cube-outline",
    "TO RECEIVE": "car-outline",
    COMPLETED: "checkmark-circle-outline",
  };

  const keys = [
    "PROCESSING",
    "PREPARING",
    "TO SHIP",
    "TO RECEIVE",
    "COMPLETED",
  ];

  return (
    <View style={styles.iconWrapper}>
      <Ionicons
        name={iconMap[keys[stepNumber - 1]]}
        size={28}
        color={active ? "#2c6e49" : "#bbb"}
      />
      <Text
        style={[
          styles.stepLabel,
          { color: active ? "#2c6e49" : "#bbb" },
        ]}
      >
        {keys[stepNumber - 1]}
      </Text>
    </View>
  );
}


/* 🔹 Status Note */
function getStatusMessage(status) {
  const s = status?.toLowerCase();
  switch (s) {
    case "processing":
      return "*Your order is being processed. Please wait for confirmation.";
    case "preparing":
      return "*Your order is being prepared for shipment.";
    case "to_ship":
      return "*Your order is ready and will be shipped soon.";
    case "to_receive":
      return "*Your order is on its way to you.";
    case "to_rate":
      return "*Please rate your purchase experience.";
    default:
      return "";
  }
}


/* 🔹 Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7ef",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#faf7ef",
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2c6e49",
    marginBottom: 25,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    marginTop: 5,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  statusText: {
    backgroundColor: "#eaf5ec",
    color: "#2c6e49",
    fontWeight: "600",
    textAlign: "center",
    borderRadius: 6,
    paddingVertical: 6,
    marginBottom: 8,
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    borderColor: "#eee",
    borderWidth: 1,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrapper: {
    alignItems: "center",
    flex: 1,
  },
  stepLabel: {
    fontSize: 10,
    color: "#333",
    marginTop: 4,
  },
  detailsNote: {
    fontSize: 11,
    color: "#555",
    textAlign: "center",
    lineHeight: 16,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    elevation: 2,
    borderColor: "#eee",
    borderWidth: 1,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 10,
  },
  productName: {
    fontWeight: "600",
    fontSize: 14,
    color: "#222",
  },
  productQty: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },
  productPrice: {
    fontWeight: "600",
    color: "#555",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: "#555",
  },
  value: {
    fontSize: 13,
    color: "#222",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 6,
    paddingTop: 6,
  },
  assistanceCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    elevation: 2,
  },
  assistTitle: {
    fontWeight: "700",
    fontSize: 13,
    color: "#333",
    marginBottom: 8,
  },
  assistItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  assistText: {
    fontSize: 13,
    color: "#333",
    marginLeft: 8,
  },

  // 🏠 Home Button Styles
  homeButton: {
    backgroundColor: "#2c6e49",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 30,
    marginBottom: 40,
  },
  homeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  rateButton: {
  backgroundColor: "#2c6e49", // green
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
  paddingVertical: 12,
  borderRadius: 30,
  marginTop: 20,
},
returnButton: {
  backgroundColor: "#d9534f", // red
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
  paddingVertical: 12,
  borderRadius: 30,
  marginTop: 10,
},
rateButtonText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
  letterSpacing: 0.5,
},
receiveButton: {
  backgroundColor: "#4CAF50",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
  paddingVertical: 12,
  borderRadius: 30,
  marginTop: 20,
},
receiveButtonText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
  letterSpacing: 0.5,
},
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
},
modalContent: {
  width: "85%",
  backgroundColor: "#fff",
  borderRadius: 15,
  padding: 20,
  alignItems: "center",
  elevation: 10,
},
modalTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#2c6e49",
  marginBottom: 10,
},
modalImage: {
  width: 100,
  height: 100,
  borderRadius: 10,
  marginVertical: 10,
},
starContainer: {
  flexDirection: "row",
  justifyContent: "center",
  marginVertical: 10,
},
commentInput: {
  width: "100%",
  borderColor: "#ddd",
  borderWidth: 1,
  borderRadius: 10,
  padding: 10,
  textAlignVertical: "top",
  minHeight: 80,
  marginBottom: 15,
},
modalButtons: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
},
submitButton: {
  flex: 1,
  backgroundColor: "#2c6e49",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
  marginRight: 5,
},
cancelButton: {
  flex: 1,
  backgroundColor: "#ccc",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
  marginLeft: 5,
},
submitText: {
  color: "#fff",
  fontWeight: "700",
},
cancelText: {
  color: "#333",
  fontWeight: "700",
},

fixedBottom: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  flexDirection: "row",
  justifyContent: "space-between",
  backgroundColor: "#fff",
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderTopWidth: 1,
  borderTopColor: "#ddd",
  elevation: 10,
},

fixedBtn: {
  flex: 1,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 12,
  borderRadius: 30,
  marginHorizontal: 5,
},

cancelBtn: { backgroundColor: "#d9534f" },
homeBtn: { backgroundColor: "#2c6e49" },
fixedBtnText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
  marginLeft: 6,
},

disabledBtn: {
  backgroundColor: "#d3d3d3",
  borderColor: "#bbb",
  opacity: 0.8,
},

});
