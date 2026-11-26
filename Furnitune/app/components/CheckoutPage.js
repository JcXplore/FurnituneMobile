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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import CheckBox from "@react-native-community/checkbox";
import { Picker } from "@react-native-picker/picker";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { app } from "./firebaseConfig";

export default function CheckoutPage({ route, navigation }) {
  const { product } = route.params || {};

  const getSubtotal = () => {
    if (product?.type === "repair") return Number(product?.total || 0);
    if (product?.type === "customization") return Number(product?.price || 0);
    return Number(product?.price || 0);
  };

  const auth = getAuth(app);
  const storage = getStorage(app);

  const [checked, setChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const [streetAddress, setStreetAddress] = useState("");
  const [apt, setApt] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [regionCode, setRegionCode] = useState("");
  const [regionName, setRegionName] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [provinceName, setProvinceName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [cityName, setCityName] = useState("");
  const [brgyCode, setBrgyCode] = useState("");
  const [brgyName, setBrgyName] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  const getBlobFromUri = async (uri) => {
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () { resolve(xhr.response); };
      xhr.onerror = function (e) { reject(new TypeError("Network request failed")); };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserEmail(currentUser.email || "");
        setUserName(currentUser.displayName || "");
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetch("https://psgc.gitlab.io/api/regions/")
      .then((res) => res.json())
      .then((data) => setRegions(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => console.error("Error fetching regions:", err));
  }, []);

  useEffect(() => {
    if (!regionCode) return;
    fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) {
          setProvinces(data.sort((a, b) => a.name.localeCompare(b.name)));
          setCities([]);
        } else {
          setProvinces([{ code: "NCR", name: "Metro Manila" }]);
          fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/cities-municipalities/`)
            .then((res) => res.json())
            .then((cityData) => setCities(cityData.sort((a, b) => a.name.localeCompare(b.name))));
        }
      })
      .catch(console.error);
  }, [regionCode]);

  useEffect(() => {
    if (!provinceCode || provinceCode === "NCR") return;
    fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`)
      .then((res) => res.json())
      .then((data) => setCities(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(console.error);
  }, [provinceCode]);

  useEffect(() => {
    if (!cityCode) return;
    fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`)
      .then((res) => res.json())
      .then((data) => setBarangays(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(console.error);
  }, [cityCode]);

  const handleContinueToPay = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Login Required", "Please log in before placing an order.");
      navigation.navigate("LoginPage");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userEmail || !emailPattern.test(userEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!userName || userName.trim().length < 2) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }

    if (!streetAddress || !regionName || !cityName || !brgyName) {
      Alert.alert("Missing Address", "Please complete all required shipping address details.");
      return;
    }

    const phoneDigitsOnly = phone.replace(/\D/g, "");
    if (!phoneDigitsOnly.match(/^09\d{9}$/)) {
      Alert.alert("Invalid Phone", "Please enter a valid 11-digit Philippine number (e.g. 09XXXXXXXXX).");
      return;
    }

    try {
      setIsProcessing(true);
      const shippingFee = 510;
      const subtotal = getSubtotal();
      const discount = 0;
      const total = subtotal + shippingFee - discount;

      let safeImage = product?.imageUrls?.[0] || product?.uploadedImages?.[0] || product?.originalImage || product?.image || "";

      // 🚨 FIX 1: Better Base64 check that catches raw strings
      const isBase64 = typeof safeImage === 'string' && safeImage.length > 10000 && !safeImage.startsWith("http");

      if (isBase64) {
          try {
              let dataUri = safeImage;
              if (!dataUri.startsWith("data:")) {
                  dataUri = `data:image/jpeg;base64,${dataUri}`;
              }
              
              const blob = await getBlobFromUri(dataUri);
              const aiImgRef = ref(storage, `customOrders/${user.uid}/${Date.now()}_ai_main.jpg`);
              await uploadBytes(aiImgRef, blob, { contentType: 'image/jpeg' });
              
              safeImage = await getDownloadURL(aiImgRef);
          } catch (e) {
              console.warn("⚠️ Failed to upload AI Image:", e);
              safeImage = "https://via.placeholder.com/150?text=AI+Concept+Failed";
          }
      }

      const cleanProduct = { ...product };
      delete cleanProduct.imageUrls;
      // 🚨 FIX 2: DO NOT delete uploadedImages! PaymentPage.js needs them to upload to Storage.
      delete cleanProduct.images;
      delete cleanProduct.originalImage;
      cleanProduct.image = safeImage;

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
        orderNotes, 
        items: [
          {
            productId: product?.id,
            name: product?.name,
            title: product?.name,
            image: safeImage, 
            uploadedImages: product?.uploadedImages || [], // 🚨 FIX 3: Pass this forward
            price: product?.price,
            qty: product?.qty || 1,
            selectedColor: product?.selectedColor || "",
            selectedSize: product?.selectedSize || "",
            selectedMaterial: product?.selectedMaterial || "",
            selectedFoam: product?.selectedFoam || "",
            selectedCover: product?.selectedCover || "",
            customFeatures: product?.customFeatures || {},
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
          region: regionName,
          province: provinceName,
          city: cityName,
          barangay: brgyName,
          zip,
        },
      };

      setIsProcessing(false);
      navigation.navigate("PaymentPage", {
        order: { ...orderData, product: cleanProduct },
      });
    } catch (error) {
      setIsProcessing(false);
      console.error("🔥 Checkout error:", error);
      Alert.alert("Error", "Could not proceed to payment. Please try again.");
    }
  };

  const formatFeatureLabel = (key) => {
    const result = key.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
          <View style={styles.orderCard}>
            <View style={styles.orderRow}>
              <Image
                source={{
                  uri:
                    product?.type === "cart"
                      ? product?.items?.[0]?.imageUrl || product?.items?.[0]?.image || "https://via.placeholder.com/150"
                      : product?.type === "repair"
                      ? product?.uploadedImages?.[0] || product?.imageUrl || "https://via.placeholder.com/150"
                      : product?.type === "customization"
                      ? product?.imageUrls?.[0] || 
                        product?.image || // 🚨 FIX: Added this fallback
                        product?.originalImage || 
                        product?.cover || 
                        product?.imageUrl || 
                        product?.thumbnail || 
                        product?.thumbnailUrl || 
                        "https://via.placeholder.com/150"
                      : product?.imageUrl || product?.thumbnail || product?.thumbnailUrl || (product?.images && product.images.find((img) => img.toLowerCase().includes("thumb"))) || (product?.imageUrls && product.imageUrls.find((img) => img.toLowerCase().includes("thumb"))) || product?.imageUrls?.[0] || product?.image || "https://via.placeholder.com/150",
                }}
                style={styles.productImage}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{product?.name || "Unnamed Product"}</Text>
                
                <Text style={styles.productQty}>Qty: {product?.qty || 1}</Text>
                
                {product?.type === "repair" && (
                  <>
                    <Text style={styles.productOption}>Type: {product?.name}</Text>
                    <Text style={styles.productOption}>Cover: {product?.selectedColor}</Text>
                    <Text style={styles.productOption}>Frame: {product?.selectedMaterial}</Text>
                    {product?.notes ? <Text style={styles.productOption}>Notes: {product.notes}</Text> : null}
                  </>
                )}

                {product?.type === "customization" && (
                  <>
                    {product?.uploadedImage && (
                      <Text style={{ fontSize: 12, color: "#2c6e49", fontStyle: "italic", marginBottom: 2 }}>
                        Custom Design Uploaded
                      </Text>
                    )}
                    
                    {product?.selectedSize && <Text style={styles.productOption}>Size: {product.selectedSize}</Text>}
                    {product?.selectedColor && <Text style={styles.productOption}>Color: {product.selectedColor}</Text>}
                    {product?.selectedMaterial && <Text style={styles.productOption}>Material: {product.selectedMaterial}</Text>}
                    {product?.selectedFoam && <Text style={styles.productOption}>Foam: {product.selectedFoam}</Text>}
                    
                    {product?.customFeatures && Object.entries(product.customFeatures).map(([key, value]) => (
                      <Text key={key} style={styles.productOption}>
                        {formatFeatureLabel(key)}: {value}
                      </Text>
                    ))}

                    {product?.additionals && product.additionals.length > 0 && (
                      <Text style={styles.productOption}>Add-ons: {product.additionals.join(', ')}</Text>
                    )}

                    {product?.notes ? <Text style={styles.productOption}>Notes: {product.notes}</Text> : null}
                  </>
                )}

                {product?.type !== "customization" && product?.type !== "repair" && (
                  <>
                    {product?.selectedSize && <Text style={styles.productOption}>Size: {product.selectedSize}</Text>}
                    {product?.selectedColor && <Text style={styles.productOption}>Color: {product.selectedColor}</Text>}
                  </>
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
              <Text style={styles.totalValue}>₱{(getSubtotal() + 510).toFixed(2)}</Text>
            </View>
          </View>

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

          <Text style={styles.sectionTitle}>SHIPPING ADDRESS</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="*First Name"
              placeholderTextColor="#565656ff"
              value={userName?.split(" ")[0] || ""}
              onChangeText={(text) => setUserName((prev) => text + " " + (prev.split(" ")[1] || ""))}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="*Last Name"
              placeholderTextColor="#565656ff"
              value={userName?.split(" ")[1] || ""}
              onChangeText={(text) => setUserName((prev) => (prev.split(" ")[0] || "") + " " + text)}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="*Street / Building Name / House No."
            placeholderTextColor="#565656ff"
            value={streetAddress}
            onChangeText={setStreetAddress}
          />
          <TextInput
            style={styles.input}
            placeholder="Apt/Suite (Optional)"
            placeholderTextColor="#565656ff"
            value={apt}
            onChangeText={setApt}
          />

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={regionCode}
              style={{ color: "#000" }} // Add this line
              dropdownIconColor="#000" // Optional: ensures the arrow is visible
              onValueChange={(val) => {
                setRegionCode(val);
                setRegionName(regions.find((r) => r.code === val)?.name || "");
                setProvinceCode(""); setProvinceName(""); setCityCode(""); setCityName(""); setBrgyCode(""); setBrgyName(""); setBarangays([]);
              }}>
              <Picker.Item label="*Select Region" value="" color="#565656" />
              {regions.map((r) => <Picker.Item key={r.code} label={r.name} value={r.code} color="#000" />)}
            </Picker>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={provinceCode}
              enabled={provinces.length > 0}
              style={{ color: provinces.length > 0 ? "#000" : "#565656" }} // Add this line
              onValueChange={(val) => {
                setProvinceCode(val);
                setProvinceName(provinces.find((p) => p.code === val)?.name || "");
                setCityCode(""); setCityName(""); setBrgyCode(""); setBrgyName(""); setBarangays([]);
              }}>
              <Picker.Item label="*Select Province" value="" color="#565656" />
              {provinces.map((p) => <Picker.Item key={p.code} label={p.name} value={p.code} color="#000" />)}
            </Picker>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={cityCode}
              enabled={cities.length > 0}
              style={{ color: cities.length > 0 ? "#000" : "#565656" }} // Add this line
              onValueChange={(val) => {
                setCityCode(val);
                setCityName(cities.find((c) => c.code === val)?.name || "");
                setBrgyCode(""); setBrgyName("");
              }}>
              <Picker.Item label="*Select City / Municipality" value="" color="#565656" />
              {cities.map((c) => <Picker.Item key={c.code} label={c.name} value={c.code} color="#000" />)}
            </Picker>
          </View>

          <View style={styles.row}>
            <View style={[styles.pickerWrapper, styles.halfInput]}>
              <Picker
                selectedValue={brgyCode}
                enabled={barangays.length > 0}
                style={{ color: barangays.length > 0 ? "#000" : "#565656" }} // Add this line
                onValueChange={(val) => {
                  setBrgyCode(val);
                  setBrgyName(barangays.find((b) => b.code === val)?.name || "");
                }}>
                <Picker.Item label="*Select Barangay" value="" color="#565656" />
                {barangays.map((b) => <Picker.Item key={b.code} label={b.name} value={b.code} color="#000" />)}
              </Picker>
            </View>
            
            <TextInput
              style={[styles.input, styles.halfInput, { height: 50, marginBottom: 0 }]}
              placeholder="Zip Code"
              placeholderTextColor="#565656ff"
              keyboardType="number-pad"
              value={zip}
              onChangeText={setZip}
            />
          </View>

          <View style={{ marginTop: 10 }}>
            <TextInput
              style={styles.input}
              placeholder="*Phone Number (11 digits)"
              placeholderTextColor="#565656ff"
              keyboardType="number-pad"
              maxLength={11}
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
            />
          </View>

          <Text style={styles.sectionTitle}>ORDER NOTES</Text>
          <TextInput
            style={[styles.input, { textAlignVertical: "top", height: 100 }]}
            placeholder="Add any special delivery notes..."
            placeholderTextColor="#565656ff"
            multiline
            value={orderNotes} 
            onChangeText={setOrderNotes} 
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.payBtn} onPress={handleContinueToPay} disabled={isProcessing}>
              <Text style={styles.payText}>{isProcessing ? "PROCESSING..." : "CONTINUE TO PAY"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7ef", paddingHorizontal: 20, paddingTop: 50 },
  sectionTitle: { fontWeight: "700", fontSize: 14, color: "#000", marginTop: 16, marginBottom: 8 },
  orderCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 2 },
  orderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  productImage: { width: 70, height: 50, borderRadius: 8, marginRight: 10 },
  productName: { fontWeight: "600", fontSize: 14, color: "#333" },
  productQty: { fontSize: 12, color: "#777", marginTop: 2, marginBottom: 2 },
  productOption: { fontSize: 12, color: "#555", marginTop: 2 },
  productPrice: { fontWeight: "700", color: "#2c6e49", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 13, color: "#444" },
  value: { fontSize: 13, color: "#333" },
  totalLabel: { fontWeight: "700", fontSize: 15, color: "#000" },
  totalValue: { fontWeight: "700", fontSize: 15, color: "#2c6e49" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, color: "#000000ff", marginBottom: 10 },
  pickerWrapper: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 10, justifyContent: "center", height: 50 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  halfInput: { flex: 1 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  checkboxLabel: { marginLeft: 6, color: "#444", fontSize: 13 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: "#ddd", paddingVertical: 12, borderRadius: 25, alignItems: "center", marginRight: 10 },
  cancelText: { color: "#000", fontWeight: "600" },
  payBtn: { flex: 1, backgroundColor: "#2c6e49", paddingVertical: 12, borderRadius: 25, alignItems: "center", marginLeft: 10 },
  payText: { color: "#fff", fontWeight: "700" },
});