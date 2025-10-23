import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { app } from "./firebaseConfig";

export default function Customization({ route, navigation }) {
  const { product } = route.params || {};
  const db = getFirestore(app);

  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [additionals, setAdditionals] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState("Fabric");
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [notes, setNotes] = useState("");
  const [totalPrice, setTotalPrice] = useState(product?.price || 0);
  const [loading, setLoading] = useState(true);
  const [sizePrices, setSizePrices] = useState({});
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [qty, setQty] = useState(1);
  const materials = ["Fabric", "Leather"];


  useEffect(() => {
    if (!product) return;

    const base = Number(product.basePrice || product.price || 0);
    const sizePrice = selectedSize ? sizePrices[selectedSize] || base : base;
    const extrasTotal = selectedAddOns.reduce((sum, a) => sum + (a.cents || 0), 0);
    setTotalPrice((sizePrice + extrasTotal) * qty);
  }, [selectedSize, sizePrices, selectedAddOns, qty]);

  // 🎨 Map color names to valid hex values
const colorToHex = (name) => {
  if (!name) return "#ccc";
  const map = {
    black: "#000000",
    white: "#FFFFFF",
    beige: "#F5F5DC",
    walnut: "#8B5A2B",
    gray: "#808080",
    grey: "#808080",
    red: "#B71C1C",
    brown: "#795548",
    blue: "#1976D2",
    green: "#388E3C",
    oak: "#C4A484",
    natural: "#E3CAA5",
  };
  const key = name.toLowerCase().trim();
  return map[key] || "#D3D3D3"; // fallback neutral
};


  // 🧠 Normalize category
  const normalizeCategory = (category) => {
    const map = {
      bed: "Beds",
      sofa: "Sofas",
      chair: "Chairs",
      table: "Tables",
      cabinet: "Cabinets",
    };
    return map[category?.toLowerCase()] || category;
  };

  useEffect(() => {
  async function loadSizePrices() {
    try {
      if (!product?.type && !product?.category) return;
      const typeLabel = product.type || product.category;
      const qRules = query(collection(db, "sizePriceRules"), where("type", "==", typeLabel));
      const snapRules = await getDocs(qRules);

      const priceMap = {};
      snapRules.forEach((d) => {
        const data = d.data();
        const mode = (data.mode || "delta").toLowerCase();
        const value = Number(data.value || 0);
        const base = Number(product.basePrice || product.price || 0);
        let price = base;

        if (mode === "multiplier" || mode === "x" || mode === "mult") price = Math.round(base * value);
        else if (mode === "absolute") price = value;
        else price = base + value;

        priceMap[data.size] = price;
      });

      setSizePrices(priceMap);
    } catch (e) {
      console.warn("⚠️ Error loading sizePriceRules:", e);
    }
  }

  loadSizePrices();
}, [product]);


useEffect(() => {
  if (!product) return;

  const base = Number(product.basePrice || product.price || 0);
  const sizePrice = selectedSize ? sizePrices[selectedSize] || base : base;

  // include add-on costs
  const extrasTotal = selectedAddOns.reduce((sum, a) => sum + (a.cents || 0), 0);
  setTotalPrice(sizePrice + extrasTotal);
}, [selectedSize, sizePrices, selectedAddOns]);




  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const normalized = normalizeCategory(product?.category || "Bed");
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("baseType", "==", normalized));
        const querySnapshot = await getDocs(q);
        

        const colorSet = new Set();
        const sizeSet = new Set();
        const featureSet = new Set();

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();

          // 🧩 --- Color Extraction ---
          Object.keys(data).forEach((key) => {
            if (key.toLowerCase().includes("color")) {
              const value = data[key];
              if (Array.isArray(value)) {
                value.forEach((v) => {
                  if (typeof v === "string") colorSet.add(v);
                  else if (v?.name || v?.label || v?.id)
                    colorSet.add(v.name || v.label || v.id);
                });
              }
            }

            // Nested color fields (options.colorOptions, etc.)
            if (typeof data[key] === "object" && data[key] !== null) {
              Object.entries(data[key]).forEach(([subKey, subVal]) => {
                if (subKey.toLowerCase().includes("color") && Array.isArray(subVal)) {
                  subVal.forEach((v) => {
                    if (typeof v === "string") colorSet.add(v);
                    else if (v?.name || v?.label || v?.id)
                      colorSet.add(v.name || v.label || v.id);
                  });
                }
              });
            }
          });

          // 🧩 --- Size Extraction ---
          if (Array.isArray(data.sizeOptions))
            data.sizeOptions.forEach((s) =>
              typeof s === "string" ? sizeSet.add(s) : sizeSet.add(s.label)
            );
          if (Array.isArray(data.availableSizes))
            data.availableSizes.forEach((s) => sizeSet.add(s));
          if (data.options?.sizes)
            data.options.sizes.forEach((s) =>
              typeof s === "string" ? sizeSet.add(s) : sizeSet.add(s.label)
            );

          // 🧩 --- Additional Features Extraction ---
          Object.keys(data).forEach((key) => {
            if (key.startsWith("has") && data[key] === true) {
              // Convert "hasCover" → "With Cover"
              const label =
                "With " + key.replace("has", "").replace(/([A-Z])/g, " $1").trim();
              featureSet.add(label);
            }
          });
        });

        // 🪑 Detect supported materials
        let supportsFabric = false;
        let supportsLeather = false;

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();

          // 🔍 Check for materialOptions array
          if (Array.isArray(data.materialOptions)) {
            if (data.materialOptions.some((m) => /fabric/i.test(m))) supportsFabric = true;
            if (data.materialOptions.some((m) => /leather/i.test(m))) supportsLeather = true;
          }

          // 🔍 Check for fields like hasFabric / hasLeather
          if (data.hasFabric) supportsFabric = true;
          if (data.hasLeather) supportsLeather = true;
        });

        // 🧠 Fallback — assume upholstered items have both
        const category = normalized.toLowerCase();
        if (["sofas", "chairs", "sectionals"].includes(category)) {
          supportsFabric = true;
          supportsLeather = true;
        }

        // ✅ Save detected materials
        const detected = [
          ...(supportsFabric ? ["Fabric"] : []),
          ...(supportsLeather ? ["Leather"] : []),
        ];
        setAvailableMaterials(detected);



        setAvailableColors([...colorSet]);
        setAvailableSizes([...sizeSet]);

        // 🧩 --- Try to get pricing details for those features ---
        const addRef = doc(db, "additionals_pricing", normalized);
        const addSnap = await getDoc(addRef);

        let additionsList = [];
        if (addSnap.exists()) {
          additionsList = addSnap.data().items.map((item) => ({
            key: item.key,
            label: item.label,
            cents: item.cents || 0,
          }));
        } else {
          additionsList = [];
        }

        setAdditionals(additionsList);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching customization options:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [product]);


  const toggleAddOn = (item) => {
    let updated = [...selectedAddOns];
    const exists = selectedAddOns.find((a) => a.key === item.key);

    if (exists) updated = updated.filter((a) => a.key !== item.key);
    else updated.push(item);

    setSelectedAddOns(updated);
    const extrasTotal = updated.reduce((sum, a) => sum + (a.cents || 0), 0);
    setTotalPrice((product?.price || 0) + extrasTotal);
  };

  const handleImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setUploadedImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Could not upload image.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1B3D36" />
        <Text>Loading customization options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.pageContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <Text style={styles.header}>
          CUSTOMIZE YOUR {product?.name?.toUpperCase()}
        </Text>

        <View style={styles.imageBox}>
          <Image
            source={
              product?.image
                ? { uri: product.image }
                : require("../assets/sofa.png")
            }
            style={styles.mainImage}
          />
          <Text style={styles.productName}>{product?.name}</Text>
          <Text style={styles.productPrice}>
            ₱{product?.price?.toLocaleString()}
          </Text>
        </View>

        {/* SIZE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. CHOOSE SIZE</Text>
          {availableSizes.length > 0 ? (
            <View style={styles.optionRow}>
              {availableSizes.map((size) => {
              const price = sizePrices[size] || product.price || product.basePrice || 0;
              return (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.optionBtn,
                    selectedSize === size && styles.optionSelected,
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedSize === size && styles.optionTextSelected,
                    ]}
                  >
                    {size}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#2c6e49", marginTop: 3 }}>
                    ₱{price.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })}


            </View>
          ) : (
            <Text style={{ color: "#777" }}>No sizes available.</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* COLOR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. CHOOSE COLOR</Text>
          {availableColors.length > 0 ? (
            <View style={styles.colorRow}>
              {availableColors.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: colorToHex(c) },
                    selectedColor === c && styles.colorSelected,
                  ]}
                  onPress={() => setSelectedColor(c)}
                >
                  {/* optional color label preview */}
                  {/* <Text style={styles.colorLabel}>{c}</Text> */}
                </TouchableOpacity>
              ))}

            </View>
          ) : (
            <Text style={{ color: "#777" }}>No colors available.</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* MATERIAL */}
        {availableMaterials.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. CHOOSE MATERIAL</Text>
            <View style={styles.optionRow}>
              {availableMaterials.map((mat) => (
                <TouchableOpacity
                  key={mat}
                  style={[
                    styles.optionBtn,
                    selectedMaterial === mat && styles.optionSelected,
                  ]}
                  onPress={() => setSelectedMaterial(mat)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedMaterial === mat && styles.optionTextSelected,
                    ]}
                  >
                    {mat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}



        <View style={styles.divider} />

        {/* ADDITIONALS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. ADDITIONAL FEATURES</Text>
          <View style={styles.optionRow}>
            {additionals.length > 0 ? (
              additionals.map((item) => {
                const selected = selectedAddOns.some((a) => a.key === item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.optionBtn,
                      selected && styles.optionSelected,
                    ]}
                    onPress={() => toggleAddOn(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {item.label} — ₱{item.cents.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={{ color: "#777" }}>No additionals available.</Text>
            )}
          </View>

        </View>

        <View style={styles.divider} />

        {/* NOTES + UPLOAD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. ADD NOTES / DESIGN PHOTO</Text>
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
          <TextInput
            style={styles.textBox}
            placeholder="Write your notes or upload design..."
            placeholderTextColor="#999"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
          {!uploadedImage && (
            <TouchableOpacity style={styles.uploadBtn} onPress={handleImageUpload}>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.uploadText}>Upload Design Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
        {/* 🧮 Sticky Bottom Bar */}
      <View style={styles.stickyBar}>
        <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalValue}>₱{totalPrice.toLocaleString()}</Text>
      </View>

        <View style={styles.bottomControls}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity
              onPress={() => setQty(Math.max(qty - 1, 1))}
              style={styles.qtyBtn}
            >
              <Ionicons name="remove" size={18} color="#333" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity
              onPress={() => setQty(qty + 1)}
              style={styles.qtyBtn}
            >
              <Ionicons name="add" size={18} color="#333" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.buyNowBtn}
            onPress={() => {
              const customizedProduct = {
                id: product?.id || "custom_" + Date.now(),
                name: product?.name || "Custom Product",
                category: product?.category || "Custom",
                imageUrl: uploadedImage || product?.image || product?.images?.[0],
                uploadedImage: uploadedImage || null, // ✅ added field
                price: totalPrice,
                qty,
                selectedColor: selectedColor || "Default",
                selectedSize: selectedSize || "Standard",
                selectedMaterial: selectedMaterial || "Fabric",
                additionals: selectedAddOns.map((item) => item.label),
                notes,
                type: "customization",
                basePrice: product?.basePrice || product?.price,
              };


              navigation.navigate("CheckoutPage", { product: customizedProduct });
            }}
          >
            <Text style={styles.buyNowText}>BUY NOW</Text>
          </TouchableOpacity>



        </View>
      </View>
    </View>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF6E9", padding: 16 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1B3D36",
    marginBottom: 16,
  },
  imageBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  productName: { fontWeight: "700", fontSize: 18, color: "#1B3D36" },
  productPrice: { fontSize: 16, color: "#666", marginBottom: 10 },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: "#1B3D36",
    marginBottom: 10,
  },
  divider: { height: 1, backgroundColor: "#ccc", marginVertical: 8 },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1B3D36",
    marginBottom: 8,
  },
  optionSelected: { backgroundColor: "#1B3D36" },
  optionText: { color: "#1B3D36" },
  optionTextSelected: { color: "#fff", fontWeight: "600" },
  colorRow: { flexDirection: "row", gap: 10 },
  colorCircle: {
    width: 35,
    height: 35,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ccc",
  },
  colorSelected: { borderColor: "#1B3D36", borderWidth: 3 },
  textBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    height: 100,
    textAlignVertical: "top",
  },
  uploadBtn: {
    flexDirection: "row",
    backgroundColor: "#47695B",
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 10,
  },
  uploadText: { color: "#fff", fontWeight: "600", marginLeft: 8 },
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
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1B3D36",
    marginVertical: 12,
  },
  submitBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1B3D36",
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 30,
  },
  submitText: { color: "#fff", fontWeight: "600", marginLeft: 8 },
  stickyBar: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  borderTopWidth: 1,
  borderColor: "#ddd",
  paddingVertical: 14,
  paddingHorizontal: 20, // match content padding
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  elevation: 12,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowOffset: { width: 0, height: -3 },
  shadowRadius: 4,
},


totalRow: {
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-between", // 👈 ensures opposite corners
  alignItems: "center",
  paddingHorizontal: 4,
  marginBottom: 8,
},


totalLabel: {
  fontSize: 15,
  fontWeight: "600",
  color: "#333",
},

totalValue: {
  fontSize: 22,
  fontWeight: "700",
  color: "#2c6e49",
},


bottomControls: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
},

qtyContainer: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
  paddingHorizontal: 8,
  backgroundColor: "#f7f7f7",
},

qtyBtn: {
  paddingHorizontal: 8,
  paddingVertical: 4,
},

qtyText: {
  fontSize: 16,
  fontWeight: "600",
  marginHorizontal: 8,
},

buyNowBtn: {
  flex: 1,
  backgroundColor: "#2c6e49",
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 12,
},

buyNowText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
},
pageContainer: {
  flex: 1,
  backgroundColor: "#FAF6E9",
},

scrollContainer: {
  paddingHorizontal: 20, // Adds spacing on both sides
  paddingTop: 10,        // Adds top breathing room
  paddingBottom: 130,    // Prevents overlap with sticky bar
},

});
