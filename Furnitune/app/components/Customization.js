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
import { getStorage, ref, getDownloadURL } from "firebase/storage";

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
  const [uploadedImages, setUploadedImages] = useState([]);
  const [notes, setNotes] = useState("");
  const [totalPrice, setTotalPrice] = useState(product?.price || 0);
  const [loading, setLoading] = useState(true);
  const [sizePrices, setSizePrices] = useState({});
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [qty, setQty] = useState(1);
  const materials = ["Fabric", "Leather"];
  const [uploading, setUploading] = useState(false);
  const [sizeAdditions, setSizeAdditions] = useState({});
  const [displayImage, setDisplayImage] = useState(null);
  const [fullProduct, setFullProduct] = useState(null);

useEffect(() => {
  async function loadProduct() {
    if (!product?.id) return;
    try {
      const docRef = doc(db, "products", product.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setFullProduct({ id: snap.id, ...snap.data() });
        // initial image
        const defaultImg = product.image || snap.data()?.images?.[0];
        setDisplayImage(defaultImg);
      }
    } catch (err) {
      console.log("❌ Error loading full product:", err);
    }
  }
  loadProduct();
}, [product]);


  const normalizeKey = (str = "") =>
  str.toLowerCase()
     .replace(/\s+/g, "")
     .replace(/-/g, "")
     .replace(/californiaking|cal-king|calking/g, "king");

  
  const getImageUrl = async (path) => {
  try {
    if (!path) return null;
    const clean = path.replace(/^gs:\/\/[^/]+\//, "");
    const storageRef = ref(getStorage(), clean);
    return await getDownloadURL(storageRef);
  } catch {
    return null;
  }
};


const resolveOptionImage = async (color, size) => {
  if (!fullProduct) return null;

  const colorKey = normalizeKey(color);   // "red" → "red"
  const sizeKey = normalizeKey(size);     // "California King" → "king"

  // Try imagesByOption first
  const colorMap = fullProduct.imagesByOption?.[colorKey];
  if (colorMap && colorMap[sizeKey]?.length > 0) {
    const first = colorMap[sizeKey][0];
    return first.startsWith("gs://") ? await getImageUrl(first) : first;
  }

  // imagesBySize fallback
  const sizeMap = fullProduct.imagesBySize?.[sizeKey];
  if (sizeMap && sizeMap[0]) {
    const first = sizeMap[0];
    return first.startsWith("gs://") ? await getImageUrl(first) : first;
  }

  // default
  const fallback = fullProduct.images?.[0] || product.image;
  return fallback.startsWith?.("gs://") ? await getImageUrl(fallback) : fallback;
};



useEffect(() => {
  if (!selectedColor || !selectedSize || !fullProduct) return;

  async function update() {
    const url = await resolveOptionImage(selectedColor, selectedSize);
    if (url) {
      setDisplayImage(url);
      console.log("🔄 Updated image:", url);
    }
  }

  update();
}, [selectedColor, selectedSize, fullProduct]);



  const normalize = (s = "") => s.toLowerCase().trim();
  useEffect(() => {
    if (!product) return;

    const base = Number(product.basePrice || product.price || 0);
    const sizePrice = selectedSize 
  ? sizePrices[selectedSize] 
    || sizePrices[normalize(selectedSize)] 
    || base
  : base;
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

      const typeLabelRaw = product.type || product.category || "";
      const typeLabel = normalizeCategory(typeLabelRaw)?.trim();
      if (!typeLabel) return;

      const basePrice = Number(product.basePrice || product.price || 0);

      const qRules = query(
        collection(db, "sizePriceRules"),
        where("type", "==", typeLabel)
      );

      const snapRules = await getDocs(qRules);
      const rules = [];
      snapRules.forEach((d) => rules.push(d.data()));

      // helper functions (match your web code)
      const norm = (s) => (s || "").toLowerCase().trim();
      const slug = (s) => norm(s).replace(/\s+/g, "-");

      const byKey = new Map();
      const priceMap = {};
      const additionMap = {};

      for (const r of rules) {
        const mode = String(r.mode || "delta").toLowerCase();
        const v = Number(r.value || 0);
        let abs = basePrice;

        if (mode === "multiplier" || mode === "x" || mode === "mult") {
          abs = Math.round(basePrice * (isNaN(v) ? 1 : v));
        } else if (mode === "absolute") {
          abs = isNaN(v) ? basePrice : v;
        } else {
          // delta mode (like all your Firestore docs)
          abs = basePrice + (isNaN(v) ? 0 : v);
        }

        byKey.set(norm(r.size), { label: r.size, price: abs });
      }

      if (byKey.size) {
        for (const [, rec] of byKey) {
          const diff = rec.price - basePrice; 

          // 1. Fill Price Map (Used for the Total Price calculation)
          priceMap[rec.label] = rec.price;       
          priceMap[norm(rec.label)] = rec.price; 
          priceMap[slug(rec.label)] = rec.price; 

          // 2. Fill Addition Map (Used for the +₱ Text on buttons)
          // We must apply the same normalization here so the button can find the value!
          additionMap[rec.label] = diff;
          additionMap[norm(rec.label)] = diff;
          additionMap[slug(rec.label)] = diff; 
        }
      }

      setSizePrices(priceMap);
      setSizeAdditions(additionMap);

      console.log("✅ Loaded size rules for", typeLabel, priceMap);
    } catch (e) {
      console.warn("⚠️ sizePriceRules(type) read error:", e?.code || e);
    }
  }

  loadSizePrices();
}, [product]);



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
          // Helper to force "3-Seater" format (Capitalize first letter)
          const formatSize = (str) => {
            if (!str) return "";
            const s = String(str).trim();
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
          };

          // 🧩 --- Size Extraction ---
          if (Array.isArray(data.sizeOptions)) {
            data.sizeOptions.forEach((s) =>
              typeof s === "string" 
                ? sizeSet.add(formatSize(s)) 
                : sizeSet.add(formatSize(s.label))
            );
          }
          if (Array.isArray(data.availableSizes)) {
            data.availableSizes.forEach((s) => sizeSet.add(formatSize(s)));
          }
          if (data.options?.sizes) {
            data.options.sizes.forEach((s) =>
              typeof s === "string" 
                ? sizeSet.add(formatSize(s)) 
                : sizeSet.add(formatSize(s.label))
            );
          }
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
  // If user selects the same one → unselect it
  if (selectedAddOns[0]?.key === item.key) {
    setSelectedAddOns([]);
    return;
  }

  // Otherwise select only this one
  setSelectedAddOns([item]);
};


const handleImageUpload = async () => {
  try {
    setUploading(true); // Start loading

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 3,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const newImages = result.assets.map((a) => a.uri);
      const total = [...uploadedImages, ...newImages].slice(0, 3);
      setUploadedImages(total);
    }
  } catch {
    Alert.alert("Error", "Could not upload images.");
  } finally {
    setUploading(false); // Stop loading
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
          source={{ uri: displayImage || product.image }}
          style={styles.mainImage}
        />
        <Text style={styles.productName}>{product?.name}</Text>
        <Text style={styles.productPrice}>₱{product?.price?.toLocaleString()}</Text>
      </View>

        {/* SIZE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. CHOOSE SIZE</Text>
          {availableSizes.length > 0 ? (
            <View style={styles.optionRow}>
              {availableSizes.map((size) => {
  const normalizedSize = sizePrices[size] ? size : size.toLowerCase();
  const displayPrice = sizePrices[normalizedSize] || product.price || product.basePrice || 0;
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
        {(() => {
  const norm = (s) => (s || "").toLowerCase().trim();
  const slug = (s) => norm(s).replace(/\s+/g, "-");

  const add =
    sizeAdditions[size] ??
    sizeAdditions[norm(size)] ??
    sizeAdditions[slug(size)] ??
    0;

  if (add === 0) return null; // hide "+₱0" if it's base size

  const formatted =
    add > 0
      ? `+₱${add.toLocaleString()}`
      : `-₱${Math.abs(add).toLocaleString()}`;

  return (
    <Text style={{ fontSize: 12, color: "#2c6e49", marginTop: 3 }}>
      {formatted}
    </Text>
  );
})()}
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
          {uploadedImages.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            {uploadedImages.map((uri, idx) => (
              <View key={idx} style={styles.imagePreviewContainer}>
                <Image source={{ uri }} style={styles.smallImage} />
                <TouchableOpacity
                  style={styles.removeImgBtn}
                  onPress={() => {
                    const updated = uploadedImages.filter((_, i) => i !== idx);
                    setUploadedImages(updated);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
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
          {uploading ? (
            <View style={{ marginTop: 10, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#1B3D36" />
              <Text style={{ color: "#555", marginTop: 4 }}>Uploading image...</Text>
            </View>
          ) : uploadedImages.length < 3 && (
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
        <Text style={styles.totalValue}>₱{(totalPrice).toLocaleString()}</Text>
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
                // 🛑 Validation Checks
                if (!selectedSize) {
                  Alert.alert("Missing Option", "Please select a size before continuing.");
                  return;
                }

                if (availableMaterials.length > 0 && !selectedMaterial) {
                  Alert.alert("Missing Option", "Please select a material before continuing.");
                  return;
                }

                if (uploading) {
                  Alert.alert("Uploading in Progress", "Please wait until your images are finished uploading.");
                  return;
                }

                // ✅ Proceed if all required fields are filled
                const customizedProduct = {
                  id: product?.id || "custom_" + Date.now(),
                  name: product?.name || "Custom Product",
                  category: product?.category || "Custom",
                  // ✅ Keep the furniture thumbnail constant
                  imageUrls: [
                    product?.thumbnail ||
                    product?.thumbnailUrl ||
                    product?.image ||
                    product?.images?.[0] ||
                    "https://via.placeholder.com/150"
                  ],

                  // ✅ Store user uploads separately
                  uploadedImages: uploadedImages.length > 0 ? uploadedImages : [],

                  price: totalPrice,
                  originalImage: product?.image || product?.images?.[0],
                  qty,
                  selectedColor,
                  selectedSize,
                  selectedMaterial,
                  additionals: selectedAddOns.map((item) => item.label),
                  notes,
                  type: "customization",
                  basePrice: product?.basePrice || product?.price,
                };

                console.log("➡️ Customization → Checkout payload:", customizedProduct);
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
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainImage: {
    width: "100%",
    height: 250,
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
