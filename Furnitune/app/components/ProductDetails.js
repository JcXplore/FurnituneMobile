// ProductDetailsScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  where, 
  query,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { db as exportedDb } from "./firebaseConfig";



export default function ProductDetailsScreen({ route, navigation }) {
  const incoming = route?.params?.product;
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(incoming || null);
  const [images, setImages] = useState([]);
  const [mainImage, setMainImage] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [sizePrices, setSizePrices] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [adding, setAdding] = useState(false);
  const db = exportedDb || getFirestore();
  const auth = getAuth();
  const storage = getStorage();
  const FALLBACK_IMAGE =
    "https://via.placeholder.com/600x400?text=No+Image+Available";
  const [sizeAdditions, setSizeAdditions] = useState({});
  const [measurementImage, setMeasurementImage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const normalizeSizeForPrice = (s) =>
  (s || "").toLowerCase().replace(/\s+/g, "-"); 
  
  useEffect(() => {
    async function update() {
      const url = await resolveOptionImage(selectedColor, selectedSize);
      if (url) setMainImage(url);
    }
    update();
  }, [selectedColor, selectedSize, product]);

  const resolveOptionImage = async (color, size) => {
    if (!product) return null;

    const colorKey = normalizeKey(color);
const sizeKey = normalizeKey(size);

    // Helper
    const first = (arr) =>
      Array.isArray(arr) ? arr.find((p) => p && !p.endsWith(".keep")) : null;

    // -------------------------------
    // 1️⃣ Check imagesByOption (COLOR + SIZE)
    // -------------------------------
    if (product.imagesByOption) {
      const colorMap = product.imagesByOption[colorKey];
      if (colorMap) {
        // exact
        if (colorMap[sizeKey]) return await convertUrl(first(colorMap[sizeKey]));

        if (sizeKey === "cal-king") {
          if (colorMap["king"]) {
            const fallbackKing = first(colorMap["king"]);
            if (fallbackKing) return await convertUrl(fallbackKing);
          }
        }

        // any size under this color
        const any = first(Object.values(colorMap).flat());
        if (any) return await convertUrl(any);
      }
    }

    // -------------------------------
    // 2️⃣ Check imagesBySize (SIZE ONLY)
    // -------------------------------
    if (product.imagesBySize) {
      // try exact size
      if (product.imagesBySize[size]) {
        return await convertUrl(first(product.imagesBySize[size]));
      }

      // try normalized variants
      const sizeVariants = [
        sizeKey,
        sizeKey.replace(/\s+/g, ""), // "2 people" -> "2people"
        sizeKey.replace("people", "p"), // "2 people" -> "2p"
        sizeKey.replace(/[^0-9]/g, "") + "p", // "2" -> "2p"
      ];

      for (let key of sizeVariants) {
        if (product.imagesBySize[key]) {
          return await convertUrl(first(product.imagesBySize[key]));
        }
      }
    }

    // -------------------------------
    // 3️⃣ Fallback: top-level images[]
    // -------------------------------
    if (images?.length) return images[0];

    return FALLBACK_IMAGE;
  };


  // 🔄 Convert gs:// → https://
  const convertUrl = async (p) => {
    if (p.startsWith("gs://")) return await getImageUrl(p);
    return normalizePath(p);
  };


  // 🔥 Auto-show measurement image based on selected size
  useEffect(() => {
    async function updateMeasurementImage() {
      if (!product?.measurementImages) return;
      if (!selectedSize) return;

      // Lookup exact measurement image by label
      const url = product.measurementImages[selectedSize];

      if (!url) {
        setMeasurementImage(null);
        return;
      }

      const resolved = url.startsWith("gs://")
        ? await getImageUrl(url)
        : url;

      setMeasurementImage(resolved);
    }

    updateMeasurementImage();
  }, [selectedSize, product]);

  
  useEffect(() => {
  if (!product?.id && !product?.productId) return;

  async function fetchReviews() {
    try {
      setReviewsLoading(true);
      const snapshot = await getDocs(collection(db, "reviews"));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Filter locally: look inside items[] for productId match
      const filtered = data.filter((r) => {
      const id = product.id || product.productId;
      return (
        (Array.isArray(r.productIds) && r.productIds.includes(id)) ||
        (Array.isArray(r.items) &&
          r.items.some(
            (item) =>
              item.productId === id ||
              item.title?.toLowerCase().includes(product.name?.toLowerCase() || "")
          ))
      );
    });


      console.log("✅ Found reviews for this product:", filtered.length);
      setReviews(filtered);
    } catch (error) {
      console.error("❌ Error loading reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  }

  fetchReviews();
}, [product?.id]);





// --- Utility: Normalize Firebase path ---
  const normalizePath = (path = "") => {
    let result = path.trim();
    result = result.replace(".firebasestorage.app", ".appspot.com");
    result = result.replace(/([^:]\/)\/+/g, "$1");
    return result;
  };

  // --- Utility: Convert gs:// to https:// ---
  const getImageUrl = async (path) => {
    try {
      if (!path) return null;
      const normalized = normalizePath(path);
      const cleanPath = normalized.replace(/^gs:\/\/[^/]+\//, "");

      if (cleanPath.endsWith(".keep") || cleanPath === "") {
        console.warn("⚠️ Skipping invalid file:", cleanPath);
        return "https://via.placeholder.com/600x400?text=Image+Unavailable";
      }

      const storageRef = ref(storage, cleanPath);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.warn("⚠️ Could not resolve storage URL:", path, error?.message);
      return "https://via.placeholder.com/600x400?text=Image+Unavailable";
    }
  };

  const normalizeKey = (str = "") =>
  str.toLowerCase()
     .replace(/\s+/g, "")        // "3 Seater" → "3seater"
     .replace(/-/g, "")        // "cal-king" or "cal king" → "calking"
     .replace(/californiaking|cal-king|calking/g, "king");

  
  // 🔹 Resolve all product images (deduplicated)
  // ✅ Resolve ALL product images (images + imagesByOption), skip .keep, dedupe
const resolveProductImages = async (prod) => {
  const FALLBACK = FALLBACK_IMAGE;
  const candidates = new Set();

  const pushIfValid = (p) => {
    if (!p || typeof p !== "string") return;
    if (p.endsWith(".keep")) return; // ignore placeholders
    candidates.add(p);
  };

  // 1) top-level images first (your beds work because of this field)
  if (Array.isArray(prod.images)) prod.images.forEach(pushIfValid);
  pushIfValid(prod.defaultImagePath);               // then default
  pushIfValid(prod.thumbnail);                      // last resort (still a real image path in your DB)

  // 2) imagesByOption (colors -> sizes -> [paths])
  if (prod.imagesByOption && typeof prod.imagesByOption === "object") {
    Object.values(prod.imagesByOption).forEach((sizeMap) => {
      if (!sizeMap || typeof sizeMap !== "object") return;
      Object.values(sizeMap).forEach((arr) => {
        if (Array.isArray(arr)) arr.forEach(pushIfValid);
      });
    });
  }

  // No real image? use placeholder
  if (candidates.size === 0) return [FALLBACK];

  // Convert gs:// → https:// (or normalize as-is)
  const resolved = await Promise.all(
    Array.from(candidates).map(async (url) => {
      if (url.startsWith("gs://")) return await getImageUrl(url);
      return normalizePath(url);
    })
  );

  const unique = [...new Set(resolved.filter(Boolean))];
  return unique.length ? unique : [FALLBACK];
};


  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      try {
        setLoading(true);
        let prod = incoming || null;

        // --- Load Firestore data if only ID passed ---
        if (prod && typeof prod === "string") {
          const snap = await getDoc(doc(db, "products", prod));
          if (snap.exists()) prod = { id: snap.id, ...snap.data() };
        } else if (prod?.id && (!prod.images || !prod.description)) {
          const snap = await getDoc(doc(db, "products", prod.id));
          if (snap.exists()) prod = { id: snap.id, ...snap.data() };
        }

        if (!prod) {
          Alert.alert("Product not found");
          navigation.goBack();
          return;
        }

        // --- Normalize options ---
        if (!prod.colors && prod.options?.colors) {
          prod.colors = prod.options.colors.map((c) => ({
            id: c.id ?? c.name ?? c.label,
            name: c.label ?? c.name ?? c.id,
            hex: c.hex ?? c.color ?? null,
          }));
        }
        if (!prod.sizes && prod.options?.sizes) {
          prod.sizes = prod.options.sizes.map((s) => ({
            id: s.id ?? s.label,
            label: s.label ?? s.id,
          }));
        }

        const resolvedImages = await resolveProductImages(prod);

        if (!mounted) return;
        setProduct(prod);
        setImages(resolvedImages);
        setMainImage(resolvedImages[0] || FALLBACK_IMAGE);
        // Restore selected options if passed from cart
        // ✅ Restore selected options from CartPage (if any)
        if (route?.params?.selectedColor) {
          setSelectedColor(route.params.selectedColor);
        }
        if (route?.params?.selectedSize) {
          setSelectedSize(route.params.selectedSize);
        }



      } catch (err) {
        console.error("Error loading product:", err);
        Alert.alert("Error", "Could not load product details.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProduct();
    return () => (mounted = false);
  }, [incoming]);

  useEffect(() => {
  async function loadSizePrices() {
    try {
      if (!product?.type && !product?.category) return;

      const typeLabel = (product.type || product.category || "").trim();
      if (!typeLabel) return;

      const qRules = query(collection(db, "sizePriceRules"), where("type", "==", typeLabel));
      const snapRules = await getDocs(qRules);

      const norm = (s) => (s || "").toLowerCase().trim();
      const slug = (s) => norm(s).replace(/\s+/g, "-");

      const priceMap = {};
      const additionMap = {};

      const base = Number(product.basePrice || product.price || 0);

      snapRules.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data?.size) return;

        const mode = (data.mode || "delta").toLowerCase();
        const value = Number(data.value || 0);

        let abs = base;
        if (mode === "multiplier" || mode === "x" || mode === "mult")
          abs = Math.round(base * (isNaN(value) ? 1 : value));
        else if (mode === "absolute")
          abs = isNaN(value) ? base : value;
        else
          abs = base + (isNaN(value) ? 0 : value);

        const add = abs - base;

        // store tolerant keys (exact, lowercase, slug)
        priceMap[data.size] = abs;
        priceMap[norm(data.size)] = abs;
        priceMap[slug(data.size)] = abs;

        additionMap[data.size] = add;
        additionMap[norm(data.size)] = add;
        additionMap[slug(data.size)] = add;
      });

      setSizePrices(priceMap);
      setSizeAdditions(additionMap);

      console.log("✅ Loaded size rules for", typeLabel, priceMap);
    } catch (e) {
      console.warn("⚠️ Error loading sizePriceRules:", e);
    }
  }

  loadSizePrices();
}, [product]);


    useEffect(() => {
      if (!product) return;

      const base = Number(product.basePrice || product.price || 0);
      const key = normalizeSizeForPrice(selectedSize);
      const sizePrice = selectedSize ? sizePrices[key] || base : base;
      const total = sizePrice * qty;

      setTotalPrice(total);
    }, [product, selectedSize, sizePrices, qty]);


  const increment = () => setQty((q) => Math.min(q + 1, 99));
  const decrement = () => setQty((q) => Math.max(q - 1, 1));

  const addToCart = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert("Login required", "Please log in to add items to cart.", [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate("LoginPage") },
        ]);
        return;
      }

      if (product.colors?.length && !selectedColor) {
        Alert.alert("Choose color", "Please select a color option.");
        return;
      }
      if (product.sizes?.length && !selectedSize) {
        Alert.alert("Choose size", "Please select a size option.");
        return;
      }

      setAdding(true);

      const userRef = doc(db, "users", auth.currentUser.uid);
      const cartRef = collection(userRef, "cart"); // ✅ correct user-scoped subcollection

      const price = product.price ?? product.basePrice ?? 0;
      const entry = {
        userId: auth.currentUser.uid,
        productId: product.id ?? product.slug ?? product.name,
        name: product.name,
        imageUrl: mainImage,
        price,
        qty,
        selectedColor,
        selectedSize,
        note: note || null,
        createdAt: serverTimestamp(),
      };

      await addDoc(cartRef, entry); // ✅ saves to /users/{uid}/cart
      navigation.navigate("CartPage");
      Alert.alert("Added", "Item added to cart.");
    } catch (err) {
      console.error("Add to cart error:", err);
      Alert.alert("Error", "Could not add to cart.");
    } finally {
      setAdding(false);
    }
  };


  if (loading)
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2c6e49" />
      </View>
    );

  if (!product)
    return (
      <View style={styles.centerWrap}>
        <Text>Product not found.</Text>
      </View>
    );

  const price = Number(product.price ?? product.basePrice ?? 0);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 210 }}
      >
        <Text style={styles.brand}>FURNITUNE</Text>

        {/* 🔸 Main Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: mainImage || FALLBACK_IMAGE }}
            style={styles.mainImage}
            contentFit="cover"
          />
        </View>


        {/* 🔸 Info */}
        <View style={styles.infoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.rating}>
              ⭐ {product.ratingAvg ?? "—"} • {product.reviewsCount ?? 0} Reviews
            </Text>
          </View>
          <Text style={styles.price}>₱{price.toFixed(2)}</Text>
        </View>
        {/* 🔸 Size Options */}
        {product.sizes?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. CHOOSE SIZE</Text>
            <View style={styles.optionRow}>
              {product.sizes.map((s, i) => {
                const label = s.label ?? s.id;
                const price = sizePrices[label] || product.price || product.basePrice ;

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.sizeBox,
                      selectedSize === label && styles.selectedBox,
                    ]}
                    onPress={() => setSelectedSize(label)}
                  >
                    <Text style={styles.sizeText}>{label}</Text>
                    {(() => {
                      const norm = (s) => (s || "").toLowerCase().trim();
                      const slug = (s) => norm(s).replace(/\s+/g, "-");

                      const add =
                        sizeAdditions[label] ??
                        sizeAdditions[norm(label)] ??
                        sizeAdditions[slug(label)] ??
                        0;

                      if (add === 0) return null; // hide "+₱0" for base

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

                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        {/* 🔸 Color Options */}
        {product.colors?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. CHOOSE COLOR</Text>
            <View style={styles.optionRow}>
              {product.colors.map((c, i) => {
                const name = c.name ?? c.label ?? c.id;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.fabricBox,
                      selectedColor === name && styles.selectedBox,
                    ]}
                    onPress={() => setSelectedColor(name)}
                  >
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c.hex ?? "#ddd" },
                      ]}
                    />
                    <Text style={styles.optionLabel}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 🔸 Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADD NOTES</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (custom instructions, etc.)"
            placeholderTextColor="#999"
            style={styles.input}
          />
        </View>
        
        {/* 🔸 Description */}
        {product.description && (
        <View style={styles.section}>
          <Text style={styles.subTitle}>DESCRIPTION</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* 📏 Show measurement image only when size is selected */}
          {measurementImage && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.subTitle, { marginBottom: 6 }]}>
                MEASUREMENT GUIDE ({selectedSize})
              </Text>
              <Image
                source={{ uri: measurementImage }}
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: 12,
                  backgroundColor: "#eee",
                }}
              />
            </View>
          )}
        </View>
      )}


{/* 🔸 Product Reviews Section */}
{/* 🔸 Product Reviews Section */}
<View style={styles.section}>
  <Text style={styles.subTitle}>CUSTOMER REVIEWS</Text>

  {reviewsLoading ? (
    <ActivityIndicator size="small" color="#2c6e49" />
  ) : reviews.length === 0 ? (
    <Text style={{ color: "#666", fontStyle: "italic" }}>
      No reviews yet. Be the first to review this product!
    </Text>
  ) : (
    reviews.map((rev, idx) => (
      <View key={idx} style={styles.reviewCard}>
        {/* Header */}
        <View style={styles.reviewHeader}>
          <Ionicons name="person-circle-outline" size={28} color="#2c6e49" />
          <View>
            <Text style={styles.reviewUser}>
              {rev.userName || rev.username || "Anonymous"}
            </Text>
            <Text style={styles.reviewDate}>
              {rev.createdAt?.toDate
                ? rev.createdAt.toDate().toLocaleString()
                : "—"}
            </Text>
          </View>
        </View>

        {/* Rating */}
        <Text style={styles.reviewRating}>
          {"⭐".repeat(Math.round(rev.rating || 0)) || "No rating"}
        </Text>

        {/* Message */}
        {rev.message ? (
          <Text style={styles.reviewText}>{rev.message}</Text>
        ) : null}

        {/* Review Image */}
        {rev.imageUrl ? (
          <View style={{ marginTop: 8 }}>
            <Image
              source={{ uri: rev.imageUrl }}
              style={styles.reviewImage}
              contentFit="cover"
            />
          </View>
        ) : null}
      </View>
    ))
  )}
</View>


      </ScrollView>

      
      {/* 🔹 Sticky Bottom Bar */}
      <View style={styles.stickyBar}>
        {/* 🧮 TOTAL PRICE */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValueRight}>₱{totalPrice.toLocaleString()}</Text>
        </View>

        {/* 🧱 BUTTONS ROW */}
        <View style={styles.buttonsRow}>
          {/* Quantity Selector */}
          <View style={styles.qtyBox}>
            <TouchableOpacity onPress={decrement} style={styles.qtyBtn}>
              <Ionicons name="remove" size={20} color="#333" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity onPress={increment} style={styles.qtyBtn}>
              <Ionicons name="add" size={20} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Add to Cart */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={addToCart}
            disabled={adding}
          >
            <Ionicons name="cart-outline" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Customize
          <TouchableOpacity
            style={[styles.addBtn, { flex: 1, backgroundColor: "#1b4332" }]}
            onPress={() =>
              
              navigation.navigate("Customization", {
                
                product: {
                  id: product.id,
                  name: product.name,
                  imageUrl: mainImage,
                  price: product.price ?? product.basePrice ?? 0,
                selectedColor,
                selectedSize,
                },
                imageUrl: mainImage,
                
              })
              
            }
          >
            <Text style={styles.addBtnText}>CUSTOMIZE</Text>
          </TouchableOpacity> */}

          {/* Buy Now */}
          <TouchableOpacity
            style={[styles.addBtn, { flex: 1, backgroundColor: "#2c6e49" }]}
            onPress={() => {
              if (!auth.currentUser) {
                Alert.alert("Login required", "Please log in to continue.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Login", onPress: () => navigation.navigate("LoginPage") },
                ]);
                return;
              }

              if (product.colors?.length && !selectedColor) {
                Alert.alert("Choose color", "Please select a color option.");
                return;
              }
              if (product.sizes?.length && !selectedSize) {
                Alert.alert("Choose size", "Please select a size option.");
                return;
              }

              navigation.navigate("CheckoutPage", {
                product: {
                  id: product.id,
                  name: product.name,
                  imageUrl: mainImage,
                  price: totalPrice || 0,
                  selectedColor,
                  selectedSize,
                  qty,
                  note,
                  type: "catalog"
                },
              });
            }}
          >
            <Text style={styles.addBtnText}>BUY NOW</Text>
          </TouchableOpacity>
        </View>
      </View>


</View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f6f2" },
  container: { paddingHorizontal: 16, paddingTop: 12 },
  brand: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#2c6e49",
    marginBottom: 8,
  },
  imageContainer: { width: "100%", alignItems: "center", marginBottom: 8 },
  mainImage: {
    width: "100%",
    height: 260,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  thumbList: { marginVertical: 8, paddingHorizontal: 4 },
  thumbWrap: { marginRight: 8, borderRadius: 8, padding: 2 },
  thumbActive: { borderWidth: 2, borderColor: "#2c6e49", borderRadius: 10 },
  thumb: { width: 70, height: 50, borderRadius: 8 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  name: { fontSize: 18, fontWeight: "600", color: "#333" },
  rating: { fontSize: 12, color: "#666", marginTop: 4 },
  price: { fontSize: 18, fontWeight: "700", color: "#2c6e49" },
  section: { marginTop: 14 },
  sectionTitle: {
    fontWeight: "700",
    color: "#2c6e49",
    fontSize: 13,
    marginBottom: 8,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fabricBox: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 8,
    width: 84,
    marginRight: 8,
    marginBottom: 8,
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#aaa",
    marginBottom: 6,
  },
  optionLabel: { fontSize: 12, color: "#444", textAlign: "center" },
  sizeBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  sizeText: { color: "#333", fontWeight: "600" },
  selectedBox: { borderColor: "#2c6e49", backgroundColor: "#eaf5ee" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    color: "#333",
  },
  subTitle: { fontWeight: "700", color: "#2c6e49", marginBottom: 6 },
  description: { fontSize: 13, color: "#444", lineHeight: 20 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  stickyBar: {
  position: "absolute",
  bottom: 12,
  left: 12,
  right: 12,
  backgroundColor: "#fff",
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 12,
  elevation: 8,
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
},
totalContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between", // ✅ pushes label left, value right
  width: "100%",
  marginBottom: 8,
},

totalLabel: {
  fontSize: 14,
  fontWeight: "600",
  color: "#444",
},

totalValueRight: {
  fontSize: 20,
  fontWeight: "bold",
  color: "#2c6e49",
},

totalValue: {
  fontSize: 20,
  fontWeight: "bold",
  color: "#2c6e49",
},

buttonsRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
},
  qtyBox: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  qtyText: { fontSize: 16, fontWeight: "700", paddingHorizontal: 6 },
  addBtn: {
    flex: 1,
    backgroundColor: "#2c6e49",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  iconBtn: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: "#2c6e49",
  alignItems: "center",
  justifyContent: "center",
  elevation: 3,

},
reviewCard: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 14,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: "#e8e8e8",
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},
reviewHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 4,
},
reviewUser: { fontWeight: "700", color: "#1b4332", fontSize: 13 },
reviewDate: { color: "#888", fontSize: 11 },
reviewRating: { fontSize: 13, marginVertical: 4 },
reviewText: { fontSize: 13, color: "#333", lineHeight: 18 },
reviewDate: {
  color: "#777",
  fontSize: 11,
},
reviewRating: {
  fontSize: 14,
  marginVertical: 4,
},
reviewText: {
  fontSize: 13,
  color: "#333",
  lineHeight: 18,
},

reviewImage: {
  width: "100%",
  height: 180,
  borderRadius: 10,
  marginTop: 6,
  backgroundColor: "#eee",
},
});
