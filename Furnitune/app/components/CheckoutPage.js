// CheckoutPage.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import CheckBox from "@react-native-community/checkbox";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { app } from "./firebaseConfig";
import { KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from "react-native";



export default function CheckoutPage({ route, navigation }) {
  const { product } = route.params || {};
  console.log("Product passed:", product);

  

const getSubtotal = () => {
  if (product?.type === "repair") return Number(product?.total || 0);
  if (product?.type === "customization") return Number(product?.price || 0);
  return Number(product?.price || 0);
};

  const auth = getAuth(app);

  const [checked, setChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  // Address states
  const [streetAddress, setStreetAddress] = useState("");
  const [apt, setApt] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");

  // Load user info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserEmail(currentUser.email || "");
        setUserName(currentUser.displayName || "");
      }
    });
    return unsubscribe;
  }, []);

  // Handle "Continue to Pay"
const handleContinueToPay = async () => {
  console.log("🟢 Continue to Pay clicked");
  const user = auth.currentUser;

  // 🔐 Authentication check
  if (!user) {
    Alert.alert("Login Required", "Please log in before placing an order.");
    navigation.navigate("LoginPage");
    return;
  }

  // 🧾 Email validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!userEmail || !emailPattern.test(userEmail)) {
    Alert.alert("Invalid Email", "Please enter a valid email address (e.g. name@example.com).");
    return;
  }

  // 🧍 Name validation
  if (!userName || userName.trim().length < 2) {
    Alert.alert("Missing Name", "Please enter your full name.");
    return;
  }

  // 🚚 Address validation
  if (!streetAddress || !city || !state) {
    Alert.alert("Missing Address", "Please complete your shipping address details.");
    return;
  }

  // ☎️ Phone number validation
  const phoneDigitsOnly = phone.replace(/\D/g, ""); // remove non-digits
  if (!phoneDigitsOnly.match(/^09\d{9}$/)) {
    Alert.alert("Invalid Phone", "Please enter a valid 11-digit Philippine number (e.g. 09XXXXXXXXX).");
    return;
  }


    try {
      const shippingFee = 510;
      const subtotal = getSubtotal();
      const discount = 0;
      const total = subtotal + shippingFee - discount;

      // Prepare order data (not saved yet)
      const orderData = {
        userId: user.uid,
        contactEmail: userEmail || user.email || "",
        createdAt: serverTimestamp(),
        subtotal,
        discount,
        total,
        shippingFee,
        status: "to_ship",
        paymentStatus: "pending",
        newsletterOptIn: checked,
        items: [
          {
            productId: product?.id,
            name: product?.name,
            title: product?.name,
            image: product?.imageUrls?.[0] || product?.uploadedImages?.[0] || product?.image || "",
            price: product?.price,
            qty: product?.qty || 1,
            selectedColor: product?.selectedColor || "",
            selectedSize: product?.selectedSize || "",
            selectedMaterial: product?.selectedMaterial || "",
            additionals: product?.additionals || [],
            notes: product?.notes || "",
            type: product?.type || "Catalog",
          },
        ],

        shippingAddress: {
          firstName: userName?.split(" ")[0] || "",
          lastName: userName?.split(" ")[1] || "",
          fullName: userName || "",
          email: userEmail || user.email || "",
          phone,
          line1: streetAddress,
          line2: apt,
          city,
          province: state,
          zip,
        },
      };

      // ✅ Navigate to PaymentPage with full order details
      console.log("➡️ Checkout → Payment orderData:", orderData);
      console.log("   Product passed along:", product?.type, product);
      navigation.navigate("PaymentPage", {
        order: { ...orderData, product },
      });

    } catch (error) {
      console.error("🔥 Checkout error:", error);
      Alert.alert("Error", "Could not proceed to payment. Please try again.");
    }
  };

  return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // adjust if needed
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* 🧾 Order Summary */}
        <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
        <View style={styles.orderCard}>
          <View style={styles.orderRow}>
            <Image
              source={{
                uri:

                product?.type === "cart"
                ? product?.items?.[0]?.imageUrl ||
                  product?.items?.[0]?.image ||
                  "https://via.placeholder.com/150"
                
               : product?.type === "repair"
                  ? product?.uploadedImages?.[0] ||
                    product?.imageUrl ||
                    "https://via.placeholder.com/150"

                  // 🎨 Customization orders
                : product?.type === "customization"
                  ? product?.imageUrls?.[0] ||
                    product?.cover ||
                    product?.imageUrl ||
                    product?.thumbnail ||
                    product?.thumbnailUrl ||
                    "https://via.placeholder.com/150"


                  // 🛋 Standard product orders
                  : product?.imageUrl ||               // ✅ add this first
                  product?.thumbnail ||
                  product?.thumbnailUrl ||
                  (product?.images && product.images.find((img) => img.toLowerCase().includes("thumb"))) ||
                  (product?.imageUrls && product.imageUrls.find((img) => img.toLowerCase().includes("thumb"))) ||
                  product?.imageUrls?.[0] ||
                  product?.image ||
                  "https://via.placeholder.com/150"

              }}
              style={styles.productImage}
            />


            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{product?.name || "Unnamed Product"}</Text>
              {product?.type === "repair" && (
                <>
                  <Text style={styles.productOption}>Type: {product?.name}</Text>
                  <Text style={styles.productOption}>Cover: {product?.selectedColor}</Text>
                  <Text style={styles.productOption}>Frame: {product?.selectedMaterial}</Text>
                  {product?.notes ? (
                    <Text style={styles.productOption}>Notes: {product.notes}</Text>
                  ) : null}
                </>
              )}
              {product?.type === "customization" && product?.uploadedImage && (
                <Text style={{ fontSize: 12, color: "#2c6e49", fontStyle: "italic" }}>
                  Custom Design Uploaded
                </Text>
              )}
              <Text style={styles.productQty}>Qty: {product?.qty || 1}</Text>

              {product?.selectedSize && (
                <Text style={styles.productOption}>Size: {product.selectedSize}</Text>
              )}
              {product?.selectedColor && (
                <Text style={styles.productOption}>Color: {product.selectedColor}</Text>
              )}
            </View>
            <Text style={styles.productPrice}>₱{getSubtotal().toLocaleString()}</Text>

          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>₱{getSubtotal().toFixed(2)}</Text>

          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Discount</Text>
            <Text style={styles.value}>₱0.00</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Shipping & Handling Fee</Text>
            <Text style={styles.value}>₱510.00</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>
              ₱{(getSubtotal() + 510).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* ✉️ Email */}
        <Text style={styles.sectionTitle}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email address"
           placeholderTextColor="#565656ff"
          value={userEmail}
          onChangeText={setUserEmail}
        />

        <View style={styles.checkboxRow}>
          <CheckBox value={checked} onValueChange={setChecked} />
          <Text style={styles.checkboxLabel}>Sign up for news & special offers?</Text>
        </View>

        {/* 🚚 Shipping Address */}
        <Text style={styles.sectionTitle}>SHIPPING ADDRESS</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="*First Name"
            placeholderTextColor="#565656ff"
            value={userName?.split(" ")[0] || ""}
            onChangeText={(text) =>
              setUserName((prev) => text + " " + (prev.split(" ")[1] || ""))
            }
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="*Last Name"
             placeholderTextColor="#565656ff"
            value={userName?.split(" ")[1] || ""}
            onChangeText={(text) =>
              setUserName((prev) => (prev.split(" ")[0] || "") + " " + text)
            }
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="*Street Address"
           placeholderTextColor="#565656ff"
          value={streetAddress}
          onChangeText={setStreetAddress}
        />
        <TextInput
          style={styles.input}
          placeholder="Apt/Suite"
           placeholderTextColor="#565656ff"
          value={apt}
          onChangeText={setApt}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.thirdInput]}
            placeholder="*City"
             placeholderTextColor="#565656ff"
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, styles.thirdInput]}
            placeholder="Province"
             placeholderTextColor="#565656ff"
            value={state}
            onChangeText={setState}
          />
          <TextInput
            style={[styles.input, styles.thirdInput]}
            placeholder="Zip Code"
             placeholderTextColor="#565656ff"
            value={zip}
            onChangeText={setZip}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="*Phone Number (11 digits)"
           placeholderTextColor="#565656ff"
          keyboardType="number-pad"
          maxLength={11}
          value={phone}
          onChangeText={(text) => {
            // only allow digits
            const numeric = text.replace(/[^0-9]/g, "");
            setPhone(numeric);
          }}
        />


        {/* 📦 Optional Notes */}
        <Text style={styles.sectionTitle}>ORDER NOTES</Text>
        <TextInput
          style={[styles.input, { textAlignVertical: "top", height: 100 }]}
          placeholder="Add any special delivery notes..."
           placeholderTextColor="#565656ff"
          multiline
        />

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.payBtn} onPress={handleContinueToPay}>
            <Text style={styles.payText}>CONTINUE TO PAY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7ef",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  brand: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#2c6e49",
    textAlign: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  productImage: {
    width: 70,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  productName: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
  },
  productQty: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  productPrice: {
    fontWeight: "700",
    color: "#2c6e49",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: "#444",
  },
  value: {
    fontSize: 13,
    color: "#333",
  },
  totalLabel: {
    fontWeight: "700",
    fontSize: 15,
    color: "#000",
  },
  totalValue: {
    fontWeight: "700",
    fontSize: 15,
    color: "#2c6e49",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#000000ff",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  checkboxLabel: {
    marginLeft: 6,
    color: "#444",
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#ddd",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginRight: 10,
  },
  cancelText: {
    color: "#000",
    fontWeight: "600",
  },
  payBtn: {
    flex: 1,
    backgroundColor: "#2c6e49",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginLeft: 10,
  },
  payText: {
    color: "#fff",
    fontWeight: "700",
  },
});
