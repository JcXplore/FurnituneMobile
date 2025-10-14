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
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { db as exportedDb } from "./firebaseConfig";

const db = exportedDb || getFirestore();
const auth = getAuth();
const storage = getStorage();

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

const FALLBACK_IMAGE =
  "https://via.placeholder.com/600x400?text=No+Image+Available";

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
  const [adding, setAdding] = useState(false);

  // 🔹 Resolve all product images (deduplicated)
  const resolveProductImages = async (prod) => {
    const candidateUris = [];

    const tryAdd = (uri) => {
      if (uri && typeof uri === "string" && !candidateUris.includes(uri)) {
        candidateUris.push(uri);
      }
    };

    tryAdd(prod.defaultImagePath);
    tryAdd(prod.thumbnail);
    if (Array.isArray(prod.images)) {
      prod.images.forEach((img) => tryAdd(img));
    }

    if (candidateUris.length === 0) candidateUris.push(FALLBACK_IMAGE);

    const resolved = await Promise.all(
      candidateUris.map(async (url) =>
        url.startsWith("gs://") ? await getImageUrl(url) : normalizePath(url)
      )
    );

    const unique = [...new Set(resolved.filter(Boolean))];
    return unique.length ? unique : [FALLBACK_IMAGE];
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

        // 🚫 No auto-select color/size — user must choose
        setSelectedColor(null);
        setSelectedSize(null);
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

  // 🔹 When color or size changes → update mainImage
  useEffect(() => {
    async function updateImageByOption() {
      if (!product?.imagesByOption) return;
      const color = selectedColor?.toLowerCase();
      const size = selectedSize?.toLowerCase();

      const colorMap = product.imagesByOption[color];
      if (colorMap && colorMap[size]?.length) {
        const firstPath = colorMap[size][0];
        const url = firstPath.startsWith("gs://")
          ? await getImageUrl(firstPath)
          : normalizePath(firstPath);
        setMainImage(url || FALLBACK_IMAGE);
      }
    }

    updateImageByOption();
  }, [selectedColor, selectedSize]);

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

      await addDoc(collection(db, "cart"), entry);
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
        contentContainerStyle={{ paddingBottom: 120 }}
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

        {/* 🔸 Thumbnails */}
        {images.length > 1 && (
          <FlatList
            horizontal
            data={images}
            keyExtractor={(i, idx) => i + idx}
            showsHorizontalScrollIndicator={false}
            style={styles.thumbList}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setMainImage(item)}
                style={[
                  styles.thumbWrap,
                  mainImage === item && styles.thumbActive,
                ]}
              >
                <Image source={{ uri: item }} style={styles.thumb} />
              </TouchableOpacity>
            )}
          />
        )}

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
          </View>
        )}
      </ScrollView>

      {/* 🔸 Sticky Bottom Bar */}
      
      <View style={styles.stickyBar}>
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

        {/* Add to Cart (icon only) */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={addToCart}
          disabled={adding}
        >
          <Ionicons name="cart-outline" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Customize Button */}
        <TouchableOpacity
          style={[styles.addBtn, { flex: 1, backgroundColor: "#1b4332" }]}
          onPress={() =>
            navigation.navigate("Customization", {
              product: {
                id: product.id,
                name: product.name,
                imageUrl: mainImage, // 👈 main image passed properly
                price: product.price ?? product.basePrice ?? 0,
                selectedColor,
                selectedSize,
              },
              imageUrl: mainImage, // 👈 also pass separately for consistency
            })
          }
        >
          <Text style={styles.addBtnText}>CUSTOMIZE</Text>
        </TouchableOpacity>

        {/* Buy Now Button */}
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

            navigation.navigate("OrderPage", {
              product: {
                id: product.id,
                name: product.name,
                imageUrl: mainImage,
                price: product.price ?? product.basePrice ?? 0,
                selectedColor,
                selectedSize,
                qty,
                note,
              },
            });
          }}
        >
          <Text style={styles.addBtnText}>BUY NOW</Text>
        </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  iconBtn: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: "#2c6e49",
  alignItems: "center",
  justifyContent: "center",
  elevation: 3,

},

});
