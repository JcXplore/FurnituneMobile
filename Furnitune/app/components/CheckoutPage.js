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


export default function CheckoutPage({ route, navigation }) {
  const { product } = route.params || {};
  console.log("Product passed:", product);

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

    if (!user) {
      Alert.alert("Login Required", "Please log in before placing an order.");
      navigation.navigate("LoginPage");
      return;
    }

    if (!streetAddress || !city || !state || !phone) {
      Alert.alert("Missing Information", "Please complete your shipping details.");
      return;
    }

    try {
      const shippingFee = 510;
      const subtotal = Number(product?.price || 0);
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
            image: product?.imageUrl,
            price: product?.price,
            qty: product?.qty || 1,
            selectedColor: product?.selectedColor || "",
            selectedSize: product?.selectedSize || "",
            selectedMaterial: product?.selectedMaterial || "",
            additionals: product?.additionals || [],
            notes: product?.notes || "",
            type: product?.type || "standard",
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
      navigation.navigate("PaymentPage", {
        order: { ...orderData },
      });

    } catch (error) {
      console.error("🔥 Checkout error:", error);
      Alert.alert("Error", "Could not proceed to payment. Please try again.");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* 🪑 Header */}
      <Text style={styles.brand}>FURNITUNE</Text>

      {/* 🧾 Order Summary */}
      <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
      <View style={styles.orderCard}>
        <View style={styles.orderRow}>
          <Image
            source={{
              uri: product?.uploadedImage || product?.imageUrl,
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

            {/* Standard or Custom Fields */}
            {product?.type === "customization" ? (
              <>
                {product?.selectedSize && (
                  <Text style={styles.productOption}>Size: {product.selectedSize}</Text>
                )}
                {product?.selectedColor && (
                  <Text style={styles.productOption}>Color: {product.selectedColor}</Text>
                )}
                {product?.selectedMaterial && (
                  <Text style={styles.productOption}>
                    Material: {product.selectedMaterial}
                  </Text>
                )}
                {product?.additionals?.length > 0 && (
                  <Text style={styles.productOption}>
                    Add-ons: {product.additionals.join(", ")}
                  </Text>
                )}
                {product?.notes && (
                  <Text style={styles.productOption}>Notes: {product.notes}</Text>
                )}
              </>
            ) : (
              <>
                {/* For Standard Products */}
                {product?.selectedSize && (
                  <Text style={styles.productOption}>Size: {product.selectedSize}</Text>
                )}
                {product?.selectedColor && (
                  <Text style={styles.productOption}>Color: {product.selectedColor}</Text>
                )}
              </>
            )}
          </View>
          <Text style={styles.productPrice}>
            ₱{Number(product?.price || 0).toLocaleString()}
          </Text>
        </View>


        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>₱{Number(product?.price || 0).toFixed(2)}</Text>
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
            ₱{(Number(product?.price || 0) + 510).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* ✉️ Email */}
      <Text style={styles.sectionTitle}>EMAIL</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email address"
        placeholderTextColor="#999"
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
          value={userName?.split(" ")[0] || ""}
          onChangeText={(text) =>
            setUserName((prev) => text + " " + (prev.split(" ")[1] || ""))
          }
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="*Last Name"
          value={userName?.split(" ")[1] || ""}
          onChangeText={(text) =>
            setUserName((prev) => (prev.split(" ")[0] || "") + " " + text)
          }
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="*Street Address"
        value={streetAddress}
        onChangeText={setStreetAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Apt/Suite"
        value={apt}
        onChangeText={setApt}
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.thirdInput]}
          placeholder="*City"
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          style={[styles.input, styles.thirdInput]}
          placeholder="*State"
          value={state}
          onChangeText={setState}
        />
        <TextInput
          style={[styles.input, styles.thirdInput]}
          placeholder="Zip/Postal Code"
          value={zip}
          onChangeText={setZip}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="*Phone Number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
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
    color: "#333",
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
