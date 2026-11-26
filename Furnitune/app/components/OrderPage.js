import React, { useState, useEffect, useCallback } from "react"; // ✅ Added useCallback
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
  Alert,
  RefreshControl // ✅ Added RefreshControl
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { app } from "./firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot, collection, query, where, getDocs, updateDoc, addDoc, getDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";


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
  const [hasReturnRequest, setHasReturnRequest] = useState(false);
  const [returnStatus, setReturnStatus] = useState("");
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewImage, setReviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showAdditionalModal, setShowAdditionalModal] = useState(false);
  const [additionalImage, setAdditionalImage] = useState(null);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);
  
  // ✅ Refreshing State
  const [refreshing, setRefreshing] = useState(false);

  // 🟢 Separate Pending vs Verified
  const isPending = order?.paymentStatus === "pending";
  const verifiedDeposit = isPending ? 0 : (order?.deposit || 0);
  const pendingDeposit = isPending ? (order?.deposit || 0) : 0;

  const additional = (order?.additionalPaymentsCents || 0) / 100;
  const refunds = order?.refunds || 0;
  const lastPaymentVal = (order?.lastAdditionalPaymentCents || 0) / 100;
  const pendingAdditional = (!isPending && order?.paymentProofPendingReview) ? lastPaymentVal : 0;

  const totalPending = pendingDeposit + pendingAdditional;
  const netPaid = verifiedDeposit + additional - refunds;

  const basePrice =
    Number(order?.priceBreakdown?.totalPHP) ||
    Number(order?.total) || // Prioritizing total to include shipping
    Number(order?.unitPrice) ||
    0;

  const requestedAdditions = (order?.requestedAdditionalPaymentCents || 0) / 100;
  let assessed = basePrice;
  if (requestedAdditions > 0) {
    assessed = basePrice;
  } else if (netPaid > basePrice) {
    assessed = netPaid; 
  }
  
  const due = Math.max(0, assessed - netPaid) + requestedAdditions;
  const remainingToPay = Math.max(0, due - totalPending); // Prevents duplicate payment prompts
  const [hasEdited, setHasEdited] = useState(false);
  const [customOrder, setCustomOrder] = useState(null);

  // ---------------------------------------------------------
  // 🔹 REFACTORED: Central Data Fetching Function
  // ---------------------------------------------------------
  const fetchOrderData = useCallback(async (isRefreshing = false) => {
    if (!orderId) return;
    
    // Only show full loading spinner on initial load, not on refresh
    if (!isRefreshing) setLoading(true);

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
        setLoading(false);
        return;
    }

    // 1. Fetch Main Order Details
    const possibleCollections = ["orders", "custom_orders", "repairs"];
    let foundOrder = null;

    for (const coll of possibleCollections) {
      try {
        const refDoc = doc(db, coll, orderId);
        const snap = await getDoc(refDoc);
        if (snap.exists() && snap.data().userId === user.uid) {
          foundOrder = { id: snap.id, ...snap.data(), source: coll };
          setOrder(foundOrder);
          break; // Stop looking if found
        }
      } catch (err) {
        if (err.code !== "permission-denied") console.warn("⚠️", err.message);
      }
    }

    if (!foundOrder && !isRefreshing) {
       // Only show alert if it's the first load and failed
       // Alert.alert("Error", "Order not found or access denied.");
    }

    // 2. Fetch Customization Details (if applicable)
    if (source === "custom_orders" || foundOrder?.source === "custom_orders") {
        try {
          const ref = doc(db, "custom_orders", orderId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setCustomOrder(snap.data());
          }
        } catch (err) {
          console.log("❌ Error loading customization order:", err);
        }
    }

    // 3. Check Reviews/Ratings (Manual Refresh part)
    // Note: The onSnapshot listener handles real-time, but this ensures a hard fetch on pull
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
          setReviewImage(reviewData.imageurl || null);
          setHasEdited(!!reviewData.updatedAt);
        } else {
            // Only reset if we are strictly refreshing to see if it was deleted/changed elsewhere
             if(isRefreshing) {
                setRated(false);
                setExistingRating(0);
             }
        }
    } catch (error) {
        console.error("Error refreshing review data", error);
    }

    if (!isRefreshing) setLoading(false);

  }, [orderId, source]);

  // ✅ Initial Load
  useEffect(() => {
    fetchOrderData(false);
  }, [fetchOrderData]);

  // ✅ Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrderData(true);
    // Simulate a small delay for better UX if data loads too fast
    setTimeout(() => {
        setRefreshing(false);
    }, 1000);
  }, [fetchOrderData]);

  // ⏳ Auto-complete after 3 days of no rating
  useEffect(() => {
    if (!order) return;

    // ✅ ADDED: Prevent running if already completed or cancelled
    // This stops infinite loops and redundant database writes.
    if (order.status === "completed" || order.status === "cancelled") return;

    // Check if delivery dates exist
    if (!order.receivedConfirmedAt && !order.deliveredAt) return;

    const deliveredTime = order.receivedConfirmedAt?.toMillis?.() 
                          || (order.receivedConfirmedAt instanceof Date ? order.receivedConfirmedAt.getTime() : null)
                          || order.deliveredAt?.toMillis?.()
                          || null;

    if (!deliveredTime) return;

    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Check if 3 days have passed
    if (now - deliveredTime >= THREE_DAYS) {
      const completeOrder = async () => {
        try {
          const orderRef = doc(db, order.source, order.id);
          await updateDoc(orderRef, {
            status: "completed",
            autoCompletedAt: new Date(),
          });

          // update UI
          setOrder(prev => ({
            ...prev,
            status: "completed"
          }));
        } catch (err) {
          console.log("Auto-complete failed:", err);
        }
      };
      completeOrder();
    }
  }, [order]); 

  const pickAdditionalImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "You need to allow gallery access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAdditionalImage(result.assets[0].uri);
    }
  };

  const pickReviewImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "You need to allow access to your gallery.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setReviewImage(result.assets[0].uri);
    }
  };

  // 🟢 Listen for existing reviews (Keep this for real-time updates)
  useEffect(() => {
    if (!orderId) return;

    const q = query(collection(db, "reviews"), where("orderId", "==", orderId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReviews(data);
    });

    return () => unsubscribe();
  }, [orderId]);

  // 🟡 Listen for return/refund status changes
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
        const returnDoc = snapshot.docs[0].data();
        setHasReturnRequest(true);
        setReturnStatus(returnDoc.status || "requested");
      } else {
        setHasReturnRequest(false);
        setReturnStatus("");
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  // Detect custom order
  const isCustom =
    (order?.type || "").toLowerCase() === "customization" ||
    (order?.category || "").toLowerCase() === "custom" ||
    (route?.params?.source || "").toLowerCase() === "custom_orders";


  // Build a display list even when there is no items[]
  const itemsForDisplay = (() => {
    // ✅ FIX: Map items to ensure 'name' exists (checks title OR name)
    if (Array.isArray(order?.items) && order.items.length > 0) {
      return order.items.map((item) => ({
        ...item,
        name: item.title || item.name || order.productTitle || "Product",
      }));
    }

    if (isCustom) {
      return [{
        name: order?.productTitle || "Custom Order",
        image:
          order?.images?.[0] ||
          order?.thumbnail ||
          order?.thumbnailUrl ||
          order?.referenceImages?.[0] ||
          order?.paymentProofUrl || "",
        price:
          Number(order?.priceBreakdown?.totalPHP) ||
          Number(order?.unitPrice) ||
          Number(order?.total) || 0,
        qty: 1,
        type: "customization",
      }];
    }

    //block for repairs
    if (order?.source === "repairs") {
      return [{
        name: `Repair - ${order?.typeLabel || "Item"}`,
        image: order?.images?.[0] || "https://via.placeholder.com/150",
        price: Number(order?.total || 0),
        qty: 1,
        type: "repair",
      }];
    }

    return [];
  })();
  
  // Sync existing rating/comment when they change
  useEffect(() => {
    setRating(existingRating);
    setComment(existingComment);
  }, [existingRating, existingComment]);

  // 🟢 Real-time listener for existing review by this user
  useEffect(() => {
    if (!orderId) return;

    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

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



  // 🧭 Conditional back navigation handling
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      // If user came from PaymentPage, block back navigation to prevent re-entry
      if (route?.params?.fromPayment) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Landing" }], // ✅ reset stack so user can't go back to payment
        });
        return true;
      } else {
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
          onPress={() => navigation.navigate("Landing")}
        >
          <Text style={styles.homeButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // UI
  return (
    
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 170 }} // 👈 ensures content isn’t hidden 
        // ✅ Add Refresh Control here
        refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2c6e49"]}
              tintColor="#2c6e49"
            />
        }
      >
        {/* Order Details */}
          <Text style={styles.sectionTitle}>ORDER DETAILS</Text>

            {order.status && (
              <Text style={styles.statusText}>
                Status: {order.status.replace("_", " ").toUpperCase()}
              </Text>
            )}
            {hasReturnRequest && (
              <View style={styles.returnBanner}>
                <Ionicons name="refresh-circle-outline" size={18} color="#fff" />
                <Text style={styles.returnBannerText}>
                  {returnStatus === "requested" && "Return request submitted. Awaiting review."}
                  {returnStatus === "processing" && "Your return request is now being processed."}
                  {returnStatus === "approved" && "Return approved — awaiting refund."}
                  {returnStatus === "refund_issued" && "Refund issued successfully."}
                  {returnStatus === "denied" && "Return request denied."}
                </Text>
              </View>
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
                          status: "completed",
                          receivedConfirmedAt: new Date(),
                        });

                        // 🔄 Instantly update UI
                        setOrder((prev) => ({
                          ...prev,
                          status: "completed",
                          receivedConfirmedAt: new Date(),
                        }));

                        Alert.alert(
                          "✅ Thank You!",
                          "Your receipt has been confirmed. You can now rate your product."
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


        {["completed"].includes(order.status?.toLowerCase()) && (
          <TouchableOpacity
            style={[
              styles.rateButton,
              hasEdited ? { backgroundColor: "#888" } : {}
            ]}
            disabled={hasEdited}
            onPress={() => {
              if (!hasEdited) setShowModal(true);
            }}
          >
            <Ionicons
              name={hasEdited ? "lock-closed-outline" : (rated ? "create-outline" : "star-outline")}
              size={20}
              color="#fff"
            />
            <Text style={styles.rateButtonText}>
              {hasEdited ? "Review Locked" : (rated ? "Edit Review" : "Rate Product")}
            </Text>
          </TouchableOpacity>
        )}



        {/* 🔹 Return / Refund Button (Disabled if Request Already Exists) */}
        {["to_receive"].includes(order.status?.toLowerCase()) && (
          <TouchableOpacity
          style={[
            styles.rateButton,
            {
              backgroundColor:
                hasReturnRequest || refundProcessing ? "#bbb" : "#d9534f",
            },
          ]}
          disabled={hasReturnRequest || refundProcessing}
          onPress={async () => {
            if (hasReturnRequest) {
              Alert.alert(
                "ℹ️ Return Already Submitted",
                "You’ve already submitted a return or refund request for this order. Please wait for review."
              );
              return;
            }

            try {
              setRefundProcessing(true); // ✅ Disable button while processing
              navigation.navigate("ReturnRefundPage", {
                orderId: order.id,
                source: order.source,
              });
            } finally {
              // You can keep it true until ReturnRefundPage updates status
              // or reset it when navigation returns:
              setRefundProcessing(false);
            }
          }}
        >
          {refundProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={
                  hasReturnRequest
                    ? "checkmark-circle-outline"
                    : "refresh-outline"
                }
                size={20}
                color="#fff"
              />
              <Text style={styles.rateButtonText}>
                {hasReturnRequest
                  ? "Request Submitted"
                  : "Return / Refund"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        )}
      </View>

  {/* 🌿 CUSTOMIZATION CARD */}
  {/* {customOrder?.type === "customization" && (
    <View style={styles.customCard}>
      <Text style={styles.customHeader}>Customization Details</Text>

      {customOrder.size && (
        <View style={styles.customRow}>
          <Text style={styles.customLabel}>Size:</Text>
          <Text style={styles.customValue}>{customOrder.size}</Text>
        </View>
      )}

      {customOrder.cover?.color && (
        <View style={styles.customRow}>
          <Text style={styles.customLabel}>Color:</Text>
          <Text style={styles.customValue}>{customOrder.cover.color}</Text>
        </View>
      )}

      {customOrder.cover?.materialType && (
        <View style={styles.customRow}>
          <Text style={styles.customLabel}>Material:</Text>
          <Text style={styles.customValue}>{customOrder.cover.materialType}</Text>
        </View>
      )}

      
      {Array.isArray(customOrder.additionals) &&
        customOrder.additionals.length > 0 && (
          <View style={styles.customRow}>
            <Text style={styles.customLabel}>Add-on:</Text>
            <Text style={styles.customValue}>
              {customOrder.additionals.join(", ")}
            </Text>
          </View>
        )}
        </View>
  )} */}



      {/* Order Summary
      <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
      {order?.source === "repairs" && (
        <View style={styles.summaryCard}>
          <Text style={{ fontWeight: "700", color: "#2c6e49", marginBottom: 5 }}>
            Repair Information
          </Text>
          <Text style={{ color: "#444" }}>Type: {order?.typeLabel || "N/A"}</Text>
          <Text style={{ color: "#444" }}>Cover: {order?.coverMaterialLabel || "N/A"}</Text>
          <Text style={{ color: "#444" }}>Frame: {order?.frameMaterialLabel || "N/A"}</Text>
          <Text style={{ color: "#444" }}>Total: ₱{order?.total?.toLocaleString() || "0"}</Text>
          {order?.notes ? (
            <Text style={{ color: "#444" }}>Notes: {order?.notes}</Text>
          ) : null}
        </View>
      )} */}


      <View style={styles.summaryCard}>
        {itemsForDisplay.map((item, index) => (
          <View key={index} style={styles.productRow}>
            <Image
            source={{
              uri:
                // 🟢 Priority 1: use saved product images (same as PaymentPage)
                order?.type === "repair" || order?.source === "repairs"
                  ? order?.images?.[0] ||
                    order?.items?.[0]?.images?.[0] ||
                    order?.product?.uploadedImages?.[0] ||
                    "https://via.placeholder.com/150"

                  : order?.type === "customization" || order?.source === "custom_orders"
                  ? order?.images?.[0] ||
                    order?.uploadedImages?.[0] ||
                    order?.referenceImages?.[0] ||
                    order?.items?.[0]?.image ||
                    order?.items?.[0]?.imageUrls?.[0] ||
                    "https://via.placeholder.com/150"

                  : order?.type === "catalog" || order?.source === "orders"
                  ? order?.product?.imageUrl ||
                    order?.product?.thumbnail ||
                    order?.product?.imageUrls?.[0] ||
                    order?.items?.[0]?.image ||
                    "https://via.placeholder.com/150"

                  // 🟣 Final fallback
                  : order?.items?.[0]?.image ||
                    order?.images?.[0] ||
                    order?.imageUrls?.[0] ||
                    "https://via.placeholder.com/150",
            }}
            style={styles.productImage}
          />
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productQty}>Qty: {item.qty || 1}</Text>
              </View>
              <Text style={styles.productPrice}>₱{Number(item.price || 0).toLocaleString()}</Text>
            </View>
        ))}

        {order?.shippingAddress && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: "600", color: "#2c6e49" }}>Shipping To:</Text>
            <Text style={{ color: "#444" }}>
              {order.shippingAddress.fullName ||
              order.shippingAddress.name ||
              order.shippingAddress.full_name || ""}
            </Text>
            <Text style={{ color: "#444" }}>
              {[
                order.shippingAddress.line1 || order.shippingAddress.street || "",
                order.shippingAddress.line2 || "",
                order.shippingAddress.city || order.shippingAddress.municipality || "",
                order.shippingAddress.province || order.shippingAddress.region || "",
                order.shippingAddress.zip || order.shippingAddress.postalCode || "",
              ].filter(Boolean).join(", ")}
            </Text>
            {order.shippingAddress.phone ? (
              <Text style={{ color: "#444" }}>Phone: {order.shippingAddress.phone}</Text>
            ) : null}
          </View>
        )}


        {/* Order Summary */}
        <View style={styles.priceRow}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>
            ₱{(order?.priceBreakdown?.basePHP || order?.unitPrice || (order?.priceBreakdown?.totalPHP || order?.unitPrice || order?.total || 0) - 510).toLocaleString()}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.label}>Discount</Text>
          <Text style={styles.value}>
            -₱{(order?.discount || 0).toLocaleString()}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.label}>Shipping & Handling</Text>
          <Text style={styles.value}>
            ₱{(order?.shippingFee || 510).toLocaleString()}
          </Text>
        </View>

        <View style={[styles.priceRow, styles.totalRow, styles.highlightRow]}>
          <Text style={[styles.label, { fontWeight: "700" }]}>TOTAL</Text>
          <Text style={[styles.value, { fontWeight: "700" }]}>
            ₱{(
              order?.source === "repairs"
                ? order?.total || 0
                : order?.priceBreakdown?.totalPHP || order?.total || order?.unitPrice || 0
            ).toLocaleString()}
          </Text>
        </View>


        {/* Payment Summary */}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionSubTitle}>PAYMENT SUMMARY</Text>

          <View style={styles.priceRow}>
            <Text style={styles.label}>Assessed Total</Text>
            <Text style={styles.value}>
              ₱{assessed.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.label}>Verified Deposit</Text>
            <Text style={styles.value}>₱{verifiedDeposit.toLocaleString()}</Text>
          </View>

          {/* 🟢 Show Pending Amount in Red if waiting for Admin */}
          {totalPending > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.label, { color: '#d9534f' }]}>Pending Verification</Text>
              <Text style={[styles.value, { color: '#d9534f' }]}>₱{totalPending.toLocaleString()}</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.label}>Additional Payments</Text>
            <Text style={styles.value}>+₱{additional.toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.label}>Refunds</Text>
            <Text style={styles.value}>-₱{refunds.toLocaleString()}</Text>
          </View>

          <View style={[styles.priceRow, styles.totalRow, styles.highlightRow]}>
            <Text style={[styles.label, { fontWeight: "700" }]}>Net Paid</Text>
            <Text style={[styles.value, { fontWeight: "700" }]}>
              ₱{netPaid.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.priceRow, styles.totalRow, styles.highlightRow]}>
            <Text style={[styles.label, { fontWeight: "700" }]}>Balance Due</Text>
            <Text style={[styles.value, { fontWeight: "700" }]}>
                ₱{due.toLocaleString()}
            </Text>
          </View>
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

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#eaf5ec",
                borderRadius: 8,
                padding: 10,
                marginBottom: 10,
              }}
              onPress={pickReviewImage}
            >
              <Ionicons name="image-outline" size={20} color="#2c6e49" />
              <Text style={{ marginLeft: 8, color: "#2c6e49", fontWeight: "600" }}>
                {reviewImage ? "Change Image" : "Upload Review Image"}
              </Text>
            </TouchableOpacity>

            {reviewImage ? (
            <Image
              source={{ uri: reviewImage }}
              style={{
                width: 150,
                height: 150,
                borderRadius: 10,
                marginBottom: 10,
              }}
            />
          ) : null}


            {/* Buttons */}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={async () => {
                  try {
                    // 1. Validate Rating
                    if (rating === 0) {
                      Alert.alert("⚠️ Please select a rating before submitting.");
                      return;
                    }
                    const auth = getAuth();
                    const user = auth.currentUser;
                    if (!user) {
                      Alert.alert("⚠️ Please log in to submit a review.");
                      return;
                    }

                    setUploading(true);
                    const userId = user.uid;
                    const userName =
                      order?.shippingAddress?.fullName ||
                      order?.shippingAddress?.name ||
                      "Anonymous";

                    // 2. Upload Image (if applicable)
                    let uploadedImageUrl = null;
                    if (reviewImage && reviewImage !== order?.items?.[0]?.image) {
                      if (reviewImage.startsWith("file") || reviewImage.startsWith("content")) {
                          const storage = getStorage(app);
                          const imageRef = ref(storage, `reviews/${userId}/${orderId}/${Date.now()}.jpg`);
                          const response = await fetch(reviewImage);
                          const blob = await response.blob();
                          await uploadBytes(imageRef, blob);
                          uploadedImageUrl = await getDownloadURL(imageRef);
                      } else {
                          uploadedImageUrl = reviewImage;
                      }
                    }

                    // 3. Identify Products
                    const productIds = (order?.items || [])
                      .map((item) => item.productId || item.id)
                      .filter(Boolean);

                    // 4. Save the Review to 'reviews' Collection
                    const reviewQuery = query(
                      collection(db, "reviews"),
                      where("orderId", "==", orderId),
                      where("userId", "==", userId)
                    );
                    const snapshot = await getDocs(reviewQuery);

                    if (!snapshot.empty) {
                      // 📝 UPDATE Existing Review
                      const existingRef = doc(db, "reviews", snapshot.docs[0].id);
                      const existingData = snapshot.docs[0].data();
                      await updateDoc(existingRef, {
                        rating: rating,
                        message: comment,
                        imageUrl: uploadedImageUrl || existingData.imageUrl,
                        editedOnce: true,
                        updatedAt: new Date(),
                      });
                    } else {
                      // 🆕 CREATE New Review
                      await addDoc(collection(db, "reviews"), {
                        createdAt: new Date(),
                        editedOnce: false,
                        imageUrl: uploadedImageUrl || order?.items?.[0]?.image || "",
                        items: order?.items || [],
                        message: comment,
                        orderId: orderId,
                        productIds: productIds,
                        rating: rating,
                        userId: userId,
                        userName: userName,
                        version: 1,
                        repairId: order?.source === "repairs" ? order.id : null,
                      });
                    }

                    // ============================================================
                    // 🟢 UPDATE PRODUCT STATS (ratingAvg, reviewsCount, ratingSum)
                    // ============================================================
                    for (const pid of productIds) {
                      // A. Get ALL reviews for this product to recalculate accuracy
                      const qProductReviews = query(collection(db, "reviews"), where("productIds", "array-contains", pid));
                      const reviewSnaps = await getDocs(qProductReviews);
                      
                      // B. Calculate Statistics
                      const totalReviews = reviewSnaps.size;
                      const sumRatings = reviewSnaps.docs.reduce((acc, doc) => acc + (doc.data().rating || 0), 0);
                      const newAvg = totalReviews > 0 ? sumRatings / totalReviews : 0;

                      // C. Update the Product Document
                      // This updates the specific fields you requested
                      const productRef = doc(db, "products", pid);
                      await updateDoc(productRef, {
                        ratingAvg: parseFloat(newAvg.toFixed(1)), // e.g., 4.5
                        reviewsCount: totalReviews,               // e.g., 10
                        ratingSum: sumRatings                     // e.g., 45
                      });
                    }
                    // ============================================================

                    // 5. Update Order Status to Completed
                    try {
                      if (order?.source !== "repairs") {
                        const orderRef = doc(db, order.source, order.id);
                        await updateDoc(orderRef, {
                          status: "completed",
                          statusUpdatedAt: new Date(),
                        });

                        setOrder((prev) => ({
                          ...prev,
                          status: "completed",
                        }));
                      }
                    } catch (e) {
                      console.warn("Failed to update order status:", e);
                    }

                    // 6. Finish
                    setRated(true);
                    setReviewImage(null);
                    setShowModal(false);
                    Alert.alert("✅ Submitted", "Your review has been posted!");

                  } catch (error) {
                    console.error("Error submitting review:", error);
                    Alert.alert("❌ Failed", "Please try again later.");
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                {uploading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitText}>Submit</Text>
                )}
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>

      {/* 🟢 Additional Payment Modal */}
      <Modal
        visible={showAdditionalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdditionalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pay Additional Balance</Text>

            {/* Display Total */}
            <Text style={{ fontSize: 16, fontWeight: "600", marginVertical: 10 }}>
              Total Additional Payment: ₱{due.toLocaleString() || "0"}
            </Text>

            {/* QR Code */}
            <Image
              source={require("../assets/payment.jpg")}
              style={{ width: 150, height: 150, marginVertical: 10, borderRadius: 10 }}
            />
            <Text style={{ color: "#555", fontSize: 12 }}>
              Scan this QR to pay via GCash.
            </Text>

            {/* Upload Proof */}
            <TouchableOpacity
              onPress={pickAdditionalImage}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#eaf5ec",
                borderRadius: 8,
                padding: 10,
                marginVertical: 12,
              }}
            >
              <Ionicons name="image-outline" size={20} color="#2c6e49" />
              <Text style={{ marginLeft: 8, color: "#2c6e49", fontWeight: "600" }}>
                {additionalImage ? "Change Image" : "Upload Payment Proof"}
              </Text>
            </TouchableOpacity>

            {additionalImage && (
              <Image
                source={{ uri: additionalImage }}
                style={{ width: 150, height: 150, borderRadius: 10, marginBottom: 10 }}
              />
            )}

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAdditionalModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                disabled={uploadingAdditional}
                onPress={async () => {
                  try {
                    if (!additionalImage) {
                      Alert.alert("⚠️ Please upload your payment proof.");
                      return;
                    }
                    setUploadingAdditional(true);
                    const auth = getAuth();
                    const user = auth.currentUser;
                    if (!user) throw new Error("Not logged in.");

                    const storage = getStorage(app);
                    const filename = `additional_${Date.now()}.jpg`;
                    const imageRef = ref(storage, `userPayments/${user.uid}/${filename}`);  

                    const response = await fetch(additionalImage);
                    const blob = await response.blob();
                    await uploadBytes(imageRef, blob, {
                      contentType: "image/jpeg"
                    });

                    const imageUrl = await getDownloadURL(imageRef);

                    // Save to Firestore
                    const orderRef = doc(db, order.source, order.id);
                    await updateDoc(orderRef, {
                      lastAdditionalPaymentProofPath: `userPayments/${user.uid}/${filename}`,
                      lastAdditionalPaymentProofUrl: imageUrl,
                      paymentProofPendingReview: true,
                      paymentProofType: "additional",
                      paymentProofUpdatedAt: new Date(),
                    });



                    Alert.alert("✅ Submitted!", "Your additional payment has been uploaded.");
                    setShowAdditionalModal(false);
                    setAdditionalImage(null);
                  } catch (error) {
                    console.error("Error uploading additional payment:", error);
                    Alert.alert("❌ Upload Failed", "Please try again later.");
                  } finally {
                    setUploadingAdditional(false);
                  }
                }}
              >
                {uploadingAdditional ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Submit</Text>
                )}
              </TouchableOpacity>

              
            </View>
          </View>
        </View>
      </Modal>


    </ScrollView>
      <View style={styles.fixedBottomContainer}>
        <View style={styles.topButtonsRow}>
          {/* Cancel Order */}
          <TouchableOpacity
            activeOpacity={1}
            disabled={isOrderLocked(order?.status) || order?.status?.toLowerCase() === "cancelled"}
            style={[
              styles.fixedBtnHalf,
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

              Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
                { text: "No", style: "cancel" },
                {
                  text: "Yes, Cancel",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const auth = getAuth();
                      const user = auth.currentUser;
                      if (!user) {
                        Alert.alert("⚠️ Not Logged In", "Please log in to cancel this order.");
                        return;
                      }

                      let targetRef = doc(db, source, order.id);

                      // ✅ Only check ownership for standard orders
                      if (source === "orders") {
                        const snap = await getDoc(targetRef);
                        if (snap.exists()) {
                          const data = snap.data();
                          // 🧠 Patch missing userId (so rules won’t block)
                          if (!data.userId) {
                            await updateDoc(targetRef, { userId: user.uid });
                          } else if (data.userId !== user.uid) {
                            Alert.alert(
                              "Permission Denied",
                              "This order does not belong to your account."
                            );
                            return;
                          }
                        } else {
                          Alert.alert("Not Found", "This order no longer exists.");
                          return;
                        }
                      }

                      // ✅ Proceed to cancel (standard, custom, or repair)
                      await updateDoc(targetRef, { status: "cancelled" });

                      // 🔄 Instantly update the UI
                      setOrder((prev) => ({ ...prev, status: "cancelled" }));

                      // 🔁 Notify MyPurchases (if callback exists)
                      if (route?.params?.onStatusChange) {
                        route.params.onStatusChange("cancelled");
                      }

                      Alert.alert(
                        "✅ Order Cancelled",
                        "Your order has been successfully cancelled."
                      );

                    } catch (error) {
                      console.error("Error cancelling order:", error);
                      Alert.alert("❌ Failed", "Unable to cancel order. Please try again later.");
                    }
                  },


                },
              ]);
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
            <Text style={styles.fixedBtnText}>Cancel Order</Text>
          </TouchableOpacity>

          {/* Return Home */}
          <TouchableOpacity
            style={[styles.fixedBtnHalf, styles.homeBtn]}
            onPress={() => navigation.navigate("Landing")}
          >
            <Ionicons name="home-outline" size={18} color="#fff" />
            <Text style={styles.fixedBtnText}>Return Home</Text>
          </TouchableOpacity>
        </View>

        {/* Show Pay Additional ONLY if due balance > 0 */}
        {/* Show Pay Additional ONLY if remainingToPay balance > 0 */}
        {(() => {
          if (remainingToPay > 0) {  // 🟢 Changed from 'due > 0'
            return (
              <TouchableOpacity
                style={styles.payAdditionalsBtn}
                onPress={() => setShowAdditionalModal(true)}
              >
                <Ionicons name="cash-outline" size={18} color="#fff" />
                <Text style={styles.payAdditionalsText}>
                  Pay Additionals (₱{remainingToPay.toLocaleString()})
                </Text>
              </TouchableOpacity>
            );
          }

          return null;

        })()}

      
      </View>
    </View>
  );
}
  const isOrderLocked = (status) => {
    const lockedStatuses = [
      "preparing",
      "to_ship",
      "to_receive",
      "completed",
      "return/refund",
      "refund",
      "cancelled",
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
      "COMPLETED": "checkmark-circle-outline",
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
          size={26}
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
    fontSize: 9,
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
bottomSingleBtn: {
  position: "absolute",
  bottom: 65, // 👈 places it just below the fixedBottom bar
  left: 0,
  right: 0,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 16,
},

returnBtn: {
  backgroundColor: "#d9534f", // red
  borderRadius: 30,
  paddingVertical: 12,
  paddingHorizontal: 20,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
},
fixedBottomContainer: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  paddingHorizontal: 16,
  paddingTop: 8,
  paddingBottom: 14,
  borderTopWidth: 1,
  borderTopColor: "#ddd",
  elevation: 10,
},

topButtonsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 8,
},

fixedBtnHalf: {
  flex: 1,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 12,
  borderRadius: 30,
  marginHorizontal: 5,
},

fixedBtnFull: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 12,
  borderRadius: 30,
  marginHorizontal: 5,
  width: "100%",
},

returnBtn: {
  backgroundColor: "#d9534f",
},

cancelBtn: {
  backgroundColor: "#d9534f",
},

homeBtn: {
  backgroundColor: "#2c6e49",
},

fixedBtnText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
  marginLeft: 6,
},

disabledBtn: {
  backgroundColor: "#d3d3d3",
  opacity: 0.8,
},

sectionSubTitle: {
  fontWeight: "700",
  fontSize: 13,
  color: "#222",
  marginTop: 10,
  marginBottom: 5,
},
highlightRow: {
  backgroundColor: "#f8f7f3",
  borderRadius: 6,
  paddingVertical: 4,
  paddingHorizontal: 3,
},

payAdditionalsBtn: {
  backgroundColor: "#2c6e49",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 30,
  paddingVertical: 12,
  marginHorizontal: 5,
  marginBottom: 8,
},
payAdditionalsText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
  marginLeft: 8,
},
returnBanner: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#2c6e49",
  borderRadius: 8,
  paddingVertical: 8,
  paddingHorizontal: 12,
  marginBottom: 10,
},
returnBannerText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "600",
  marginLeft: 6,
},
customCard: {
  backgroundColor: "#ffffff",
  borderRadius: 12,
  padding: 16,
  marginTop: 20,
  elevation: 3,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  borderWidth: 1,
  borderColor: "#e8e8e8",
},

customHeader: {
  fontSize: 18,
  fontWeight: "700",
  color: "#2c6e49",
  marginBottom: 12,
  letterSpacing: 0.3,
},

customRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  marginBottom: 8,
  gap: 8,
},

customLabel: {
  fontSize: 14,
  fontWeight: "600",
  color: "#555",
},

customValue: {
  fontSize: 14,
  fontWeight: "500",
  color: "#333",
  maxWidth: "60%",
  textAlign: "right",
},

customNotes: {
  fontSize: 14,
  color: "#444",
  backgroundColor: "#f7f7f7",
  padding: 8,
  borderRadius: 8,
  marginTop: 4,
  width: "100%",
  lineHeight: 20,
},
});