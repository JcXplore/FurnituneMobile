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

// 🔹 1. CUSTOMIZATION CONSTANTS ADDED HERE
const CATEGORY_OPTIONS = {
  "Beds": {
    hasFoam: true,
    hasCover: true,
    inclusions: "Main bed frame, structural wooden slats/base, and standard assembly hardware.",
    exclusions: "Mattress, foam toppers, pillows, and bed sheets are NOT included.",
    features: [
      { id: "woodMaterial", label: "ARCHITECTURAL BED FRAME", choices: ["Mahogany Wood", "Pine Wood", "Gmelina Wood", "Metal Frame", "Rubberwood", "Acacia Wood"] },
      { id: "headboardStyle", label: "HEADBOARD STYLE", choices: ["Wing Back", "Panel", "Sleigh", "Book Case", "Plain Upholstered", "Slatted Wood", "Deep Button Tufted", "Vertical Channel", "Quilted"] },
      { id: "legStyle", label: "LEG STYLE", choices: ["Tapered Wood Legs", "Metal Legs", "Hidden Glides", "Block Legs", "Bun Feet Legs"] },
      { id: "frameHeight", label: "FRAME HEIGHT", choices: ["Low Profile (Minimalist)", "Standard Height", "High Clearance (Storage)", "Custom Height"] }
    ]
  },
  "Sofas": {
    hasFoam: true,
    hasCover: true,
    inclusions: "Main sofa frame, primary seat cushions, and backrest cushions.",
    exclusions: "Throw pillows, decorative blankets, and center tables are NOT included.",
    features: [
      { id: "woodMaterial", label: "ARCHITECTURAL SOFA FRAME", choices: ["Mahogany Wood", "Pine Wood", "Gmelina Wood", "Rubberwood", "Acacia Wood"] },
      { id: "armrestStyle", label: "ARMREST STYLE", choices: ["Track Arms", "English Roll Arms", "Rolled Arms", "Flared Arms", "Pillow Top Arms"] },
      { id: "backCushion", label: "BACKREST STYLE", choices: ["Tight Back", "Loose Cushions", "Semi-Attached", "Tufted Back", "Quilted"] },
      { id: "seatDepth", label: "SEAT DEPTH", choices: ["Standard (21-22\")", "Deep Lounge (23-25\")", "Extra Deep (26\"+)", "Custom Depth"] },
      { id: "legStyle", label: "LEG STYLE", choices: ["Tapered Wood Legs", "Metal Legs", "Hidden Glides", "Block Legs", "Bun Feet Legs"] }
    ]
  },
  "Sectionals": {
    hasFoam: true,
    hasCover: true,
    inclusions: "Complete sectional frame (all modular pieces), seat cushions, and back cushions.",
    exclusions: "Throw pillows, ottomans (unless added as an upgrade), and rugs are NOT included.",
    features: [
      { id: "woodMaterial", label: "ARCHITECTURAL SECTIONAL FRAME", choices: ["Mahogany Wood", "Pine Wood", "Gmelina Wood", "Rubberwood", "Acacia Wood"] },
      { id: "configuration", label: "CHAISE / SHAPE CONFIGURATION", choices: ["Left-Facing Chaise", "Right-Facing Chaise", "U-Shape", "Symmetrical L-Shape", "Custom Shape"] },
      { id: "armrestStyle", label: "ARMREST STYLE", choices: ["Track Arms", "English Roll Arms", "Rolled Arms", "Flared Arms", "Pillow Top Arms"] },
      { id: "backCushion", label: "BACKREST STYLE", choices: ["Tight Back", "Loose Cushions", "Semi-Attached", "Tufted Back", "Quilted"] },
      { id: "seatDepth", label: "SEAT DEPTH", choices: ["Standard", "Deep Lounge", "Extra Deep", "Custom Depth"] },
      { id: "legStyle", label: "LEG STYLE", choices: ["Tapered Wood Legs", "Metal Legs", "Hidden Glides", "Block Legs", "Bun Feet Legs"] }
    ]
  },
  "Chairs": {
    hasFoam: true,
    hasCover: true,
    inclusions: "The main chair unit and built-in seat padding/cushioning.",
    exclusions: "Extra decorative back pillows and footrests are NOT included.",
    features: [
      { id: "woodMaterial", label: "ARCHITECTURAL CHAIR FRAME", choices: ["Mahogany Wood", "Pine Wood", "Gmelina Wood", "Metal Frame", "Rubberwood", "Acacia Wood"] },
      { id: "backrestStyle", label: "BACKREST STYLE", choices: ["High Back", "Mid Back", "Curved / Barrel", "Spindle Back", "Custom Height", "Quilted"] },
      { id: "armType", label: "ARMREST TYPE", choices: ["No Arms", "Sloped Wood Arms", "Upholstered Track Arms"] }
    ]
  },
  "Ottomans": {
    hasFoam: true,
    hasCover: true,
    inclusions: "The fully upholstered ottoman unit and base.",
    exclusions: "Decorative wooden trays and surrounding living room decor are NOT included.",
    features: [
      { id: "woodMaterial", label: "ARCHITECTURAL OTTOMAN FRAME", choices: ["Mahogany Wood", "Pine Wood", "Gmelina Wood", "Rubberwood", "Acacia Wood"] },
      { id: "topStyle", label: "TOP SURFACE STYLE", choices: ["Pillow Top", "Plain Top", "Tufted Top", "Channel Tufted Top", "Quilted Top"] },
      { id: "baseStyle", label: "LEG STYLE", choices: ["Tapered Wood Legs", "Metal Legs", "Hidden Glides", "Block Legs", "Bun Feet Legs"] }
    ]
  },
  "Dining Tables": {
    hasFoam: false,
    hasCover: false, 
    inclusions: "The main dining table top and the structural base/legs.",
    exclusions: "Dining chairs, table runners, and tableware/decorations are NOT included.",
    features: [
      { id: "woodMaterial", label: "ARCHITECTURAL TABLE FRAME", choices: ["Mahogany Wood", "Pine Wood", "Gmelina Wood", "Rubberwood", "Acacia Wood", "Metal Frame"] },
      { id: "shapeType", label: "TOP SHAPE", choices: ["Rectangular", "Perfect Square", "Round", "Oval", "Abstract / Asymmetrical", "Custom Shape"] },
      { id: "edgeStyle", label: "EDGE PROFILE", choices: ["Straight Edge", "Beveled Edge", "Bullnose Edge", "Round Over Edge"] },
      { id: "legProtection", label: "LEG PROTECTION", choices: ["Hidden Glides", "Rubber Pads", "Plastic Caps", "Anti Skid Pads"] }
    ]
  },
  "Tables": {
    hasFoam: false,
    hasCover: false, 
    inclusions: "The table top and the supporting legs/base.",
    exclusions: "Chairs, surrounding decor, and floor rugs are NOT included.",
    features: [
      { id: "woodMaterial", label: "ARCHITECTURAL TABLE FRAME", choices: ["Mahogany Wood", "Pine Wood", "Gmelina Wood", "Rubberwood", "Acacia Wood", "Metal Frame"] },
      { id: "shapeType", label: "TOP SHAPE", choices: ["Rectangular", "Perfect Square", "Round", "Oval", "Abstract / Asymmetrical", "Custom Shape"] },
      { id: "edgeStyle", label: "EDGE PROFILE", choices: ["Straight Edge", "Beveled Edge", "Bullnose Edge", "Round Over Edge"] },
      { id: "legProtection", label: "LEG PROTECTION", choices: ["Hidden Glides", "Rubber Pads", "Plastic Caps", "Anti Skid Pads"] }
    ]
  },
  "Others": {
    hasFoam: true,
    hasCover: true,
    inclusions: "The primary custom furniture item as ordered.",
    exclusions: "Any items not explicitly listed in the final custom specifications.",
    features: [
      { id: "woodMaterial", label: "PRIMARY MATERIAL", choices: ["Standard Wood", "Standard Metal", "Plastic / Acrylic", "Glass", "Mixed Materials"] },
      { id: "styleVibe", label: "STYLE / VIBE", choices: ["Modern Contemporary", "Industrial", "Classic Traditional", "Minimalist", "Rustic"] }
    ]
  }
};

const FOAM_CHOICES = ["Standard High Density", "Soft / Cloud Plush", "Extra Firm (Orthopedic)", "Memory Foam Topper"];
const COVER_CHOICES = ["Fabric", "Leather", "Linen", "Microfiber", "Velvet", "Cotton"];

const COLOR_PALETTE = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#000000" },
  { name: "Beige", hex: "#D3C6B3" },
  { name: "Dark Gray", hex: "#5E5E5E" },
  { name: "Navy Blue", hex: "#1E3F66" },
  { name: "Forest Green", hex: "#2D4739" },
  { name: "Brown", hex: "#8B4513" },
  { name: "Burgundy", hex: "#800020" },
  { name: "Teal", hex: "#008080" },
  { name: "Mustard", hex: "#E1AD01" },
  { name: "Dusty Rose", hex: "#C08081" },
  { name: "Light Gray", hex: "#C0C0C0" },
];

export default function Customization({ route, navigation }) {
  const { product, ai_custom, ai_image, ai_specs } = route.params || {};
  const parsedAiSpecs = ai_specs ? JSON.parse(ai_specs) : null;

  const [activeProduct, setActiveProduct] = useState(
    ai_custom
      ? {
          id: "ai_custom_" + Date.now(),
          name: parsedAiSpecs?.title || "Custom AI Design",
          category: parsedAiSpecs?.category || "Others",
          image: ai_image,
          price: 0, 
          basePrice: 0,
        }
      : product
  );

  const db = getFirestore(app);

  const [availableSizes, setAvailableSizes] = useState([]);
  const [additionals, setAdditionals] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [customSizeText, setCustomSizeText] = useState(""); 
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState("Fabric"); 
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState({});
  const [selectedFoam, setSelectedFoam] = useState(null);
  const [selectedCover, setSelectedCover] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [notes, setNotes] = useState("");
  const [totalPrice, setTotalPrice] = useState(activeProduct?.price || 0);
  const [loading, setLoading] = useState(true);
  const [sizePrices, setSizePrices] = useState({});
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [qty, setQty] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [sizeAdditions, setSizeAdditions] = useState({});
  const [displayImage, setDisplayImage] = useState(null);
  const [fullProduct, setFullProduct] = useState(null);

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

  const activeCategoryName = normalizeCategory(activeProduct?.category || "Others");
  const categoryConfig = CATEGORY_OPTIONS[activeCategoryName] || CATEGORY_OPTIONS["Others"];

  useEffect(() => {
    if (ai_custom && parsedAiSpecs) {
      if (parsedAiSpecs.suggested_dimensions) {
        setSelectedSize("Custom");
        setCustomSizeText(parsedAiSpecs.suggested_dimensions);
      }
      if (parsedAiSpecs.suggested_color) {
        const matchedColor = COLOR_PALETTE.find(
          (c) => c.name.toLowerCase() === parsedAiSpecs.suggested_color.toLowerCase()
        );
        if (matchedColor) setSelectedColor(matchedColor.name);
      }
      setNotes(
        `AI Design Description:\n${parsedAiSpecs.description}\n\nSuggested Material:\n${parsedAiSpecs.suggested_material}`
      );
    }
  }, [ai_custom]);

  useEffect(() => {
    async function loadProduct() {
      if (ai_custom) {
        setDisplayImage(ai_image);
        setFullProduct(activeProduct);
        return;
      }
      if (!activeProduct?.id) return;
      try {
        const docRef = doc(db, "products", activeProduct.id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setFullProduct({ id: snap.id, ...snap.data() });
          const defaultImg = activeProduct.image || snap.data()?.images?.[0];
          setDisplayImage(defaultImg);
        }
      } catch (err) {
        console.log("❌ Error loading full product:", err);
      }
    }
    loadProduct();
  }, [activeProduct, ai_custom]);

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
    if (!fullProduct || ai_custom) return null; 
    const colorKey = normalizeKey(color);
    const sizeKey = normalizeKey(size);

    const colorMap = fullProduct.imagesByOption?.[colorKey];
    if (colorMap && colorMap[sizeKey]?.length > 0) {
      const first = colorMap[sizeKey][0];
      return first.startsWith("gs://") ? await getImageUrl(first) : first;
    }

    const sizeMap = fullProduct.imagesBySize?.[sizeKey];
    if (sizeMap && sizeMap[0]) {
      const first = sizeMap[0];
      return first.startsWith("gs://") ? await getImageUrl(first) : first;
    }

    const fallback = fullProduct.images?.[0] || activeProduct.image;
    return fallback.startsWith?.("gs://") ? await getImageUrl(fallback) : fallback;
  };

  useEffect(() => {
    if (!selectedColor || !selectedSize || !fullProduct || ai_custom) return;
    if (selectedSize === "Custom") return;
    
    async function update() {
      const url = await resolveOptionImage(selectedColor, selectedSize);
      if (url) {
        setDisplayImage(url);
      }
    }
    update();
  }, [selectedColor, selectedSize, fullProduct]);

  const normalize = (s = "") => s.toLowerCase().trim();
  useEffect(() => {
    if (!activeProduct) return;
    const base = Number(activeProduct.basePrice || activeProduct.price || 0);
    const sizePrice = selectedSize && selectedSize !== "Custom"
      ? sizePrices[selectedSize] 
        || sizePrices[normalize(selectedSize)] 
        || base
      : base;
    const extrasTotal = selectedAddOns.reduce((sum, a) => sum + (a.cents || 0), 0);
    setTotalPrice((sizePrice + extrasTotal) * qty);
  }, [selectedSize, sizePrices, selectedAddOns, qty, activeProduct]);

  useEffect(() => {
    async function loadSizePrices() {
      try {
        if (!activeProduct?.type && !activeProduct?.category) return;
        const typeLabelRaw = activeProduct.type || activeProduct.category || "";
        const typeLabel = normalizeCategory(typeLabelRaw)?.trim();
        if (!typeLabel) return;

        const basePrice = Number(activeProduct.basePrice || activeProduct.price || 0);
        const qRules = query(collection(db, "sizePriceRules"), where("type", "==", typeLabel));
        const snapRules = await getDocs(qRules);
        const rules = [];
        snapRules.forEach((d) => rules.push(d.data()));

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
            abs = basePrice + (isNaN(v) ? 0 : v);
          }
          byKey.set(norm(r.size), { label: r.size, price: abs });
        }

        if (byKey.size) {
          for (const [, rec] of byKey) {
            const diff = rec.price - basePrice; 
            priceMap[rec.label] = rec.price;       
            priceMap[norm(rec.label)] = rec.price; 
            priceMap[slug(rec.label)] = rec.price; 
            additionMap[rec.label] = diff;
            additionMap[norm(rec.label)] = diff;
            additionMap[slug(rec.label)] = diff; 
          }
        }
        setSizePrices(priceMap);
        setSizeAdditions(additionMap);
      } catch (e) {
        console.warn("⚠️ sizePriceRules(type) read error:", e?.code || e);
      }
    }
    loadSizePrices();
  }, [activeProduct]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const normalized = normalizeCategory(activeProduct?.category || "Bed");
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("baseType", "==", normalized));
        const querySnapshot = await getDocs(q);
        
        const sizeSet = new Set();

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();

          const formatSize = (str) => {
            if (!str) return "";
            const s = String(str).trim();
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
          };

          if (Array.isArray(data.sizeOptions)) {
            data.sizeOptions.forEach((s) => typeof s === "string" ? sizeSet.add(formatSize(s)) : sizeSet.add(formatSize(s.label)));
          }
          if (Array.isArray(data.availableSizes)) {
            data.availableSizes.forEach((s) => sizeSet.add(formatSize(s)));
          }
          if (data.options?.sizes) {
            data.options.sizes.forEach((s) => typeof s === "string" ? sizeSet.add(formatSize(s)) : sizeSet.add(formatSize(s.label)));
          }
        });

        let supportsFabric = false;
        let supportsLeather = false;

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (Array.isArray(data.materialOptions)) {
            if (data.materialOptions.some((m) => /fabric/i.test(m))) supportsFabric = true;
            if (data.materialOptions.some((m) => /leather/i.test(m))) supportsLeather = true;
          }
          if (data.hasFabric) supportsFabric = true;
          if (data.hasLeather) supportsLeather = true;
        });

        const category = normalized.toLowerCase();
        if (["sofas", "chairs", "sectionals"].includes(category)) {
          supportsFabric = true;
          supportsLeather = true;
        }

        setAvailableMaterials([...(supportsFabric ? ["Fabric"] : []), ...(supportsLeather ? ["Leather"] : [])]);
        setAvailableSizes([...sizeSet]);

        const addRef = doc(db, "additionals_pricing", normalized);
        const addSnap = await getDoc(addRef);

        let additionsList = [];
        if (addSnap.exists()) {
          additionsList = addSnap.data().items.map((item) => ({
            key: item.key, label: item.label, cents: item.cents || 0,
          }));
        }
        setAdditionals(additionsList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching customization options:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [activeProduct]);

  const toggleAddOn = (item) => {
    if (selectedAddOns[0]?.key === item.key) {
      setSelectedAddOns([]);
      return;
    }
    setSelectedAddOns([item]);
  };

  const handleFeatureSelect = (featureId, choice) => {
    setSelectedFeatures((prev) => ({ ...prev, [featureId]: choice }));
  };

  const handleImageUpload = async () => {
    try {
      setUploading(true);
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
      setUploading(false);
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

  let sectionCounter = 1;

  return (
    <View style={styles.pageContainer}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>CUSTOMIZE YOUR {activeProduct?.name?.toUpperCase()}</Text>

        <View style={styles.imageBox}>
          <Image source={{ uri: displayImage || activeProduct?.image }} style={styles.mainImage} />
          <Text style={styles.productName}>{activeProduct?.name}</Text>
          {ai_custom ? (
            <Text style={[styles.productPrice, {color: '#B22222', fontWeight: 'bold'}]}>Subject to Quotation</Text>
          ) : (
            <Text style={styles.productPrice}>₱{activeProduct?.price?.toLocaleString()}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sectionCounter++}. CHOOSE SIZE</Text>
          <View style={styles.optionRow}>
            {availableSizes.length > 0 ? (
              availableSizes.map((size) => {
                const normalizedSize = sizePrices[size] ? size : size.toLowerCase();
                return (
                  <TouchableOpacity
                    key={size}
                    style={[styles.optionBtn, selectedSize === size && styles.optionSelected]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text style={[styles.optionText, selectedSize === size && styles.optionTextSelected]}>{size}</Text>
                    {(() => {
                      const norm = (s) => (s || "").toLowerCase().trim();
                      const slug = (s) => norm(s).replace(/\s+/g, "-");
                      const add = sizeAdditions[size] ?? sizeAdditions[norm(size)] ?? sizeAdditions[slug(size)] ?? 0;
                      if (add === 0) return null;
                      const formatted = add > 0 ? `+₱${add.toLocaleString()}` : `-₱${Math.abs(add).toLocaleString()}`;
                      return <Text style={{ fontSize: 12, color: selectedSize === size ? "#fff" : "#2c6e49", marginTop: 3 }}>{formatted}</Text>;
                    })()}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={{ color: "#777" }}>No standard sizes available.</Text>
            )}
            
            <TouchableOpacity
              style={[styles.optionBtn, selectedSize === "Custom" && styles.optionSelected]}
              onPress={() => setSelectedSize("Custom")}
            >
              <Text style={[styles.optionText, selectedSize === "Custom" && styles.optionTextSelected]}>Custom</Text>
            </TouchableOpacity>
          </View>

          {selectedSize === "Custom" && (
            <TextInput
              style={[styles.textBox, { height: 50, marginTop: 10 }]}
              placeholder="Enter specific dimensions (e.g., 50x50 cm)"
              placeholderTextColor="#999"
              value={customSizeText}
              onChangeText={setCustomSizeText}
            />
          )}
        </View>
        <View style={styles.divider} />

        {categoryConfig.features.map((feature) => (
          <View key={feature.id}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{sectionCounter++}. {feature.label}</Text>
              <View style={styles.optionRow}>
                {feature.choices.map((choice) => (
                  <TouchableOpacity
                    key={choice}
                    style={[styles.optionBtn, selectedFeatures[feature.id] === choice && styles.optionSelected]}
                    onPress={() => handleFeatureSelect(feature.id, choice)}
                  >
                    <Text style={[styles.optionText, selectedFeatures[feature.id] === choice && styles.optionTextSelected]}>
                      {choice}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.divider} />
          </View>
        ))}

        {categoryConfig.hasFoam && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{sectionCounter++}. FOAM / PADDING TYPE</Text>
              <View style={styles.optionRow}>
                {FOAM_CHOICES.map((foam) => (
                  <TouchableOpacity
                    key={foam}
                    style={[styles.optionBtn, selectedFoam === foam && styles.optionSelected]}
                    onPress={() => setSelectedFoam(foam)}
                  >
                    <Text style={[styles.optionText, selectedFoam === foam && styles.optionTextSelected]}>{foam}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.divider} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {sectionCounter++}. {categoryConfig.hasCover ? "UPHOLSTERY & COLOR" : "COLOR"}
          </Text>

          {categoryConfig.hasCover && (
            <>
              <Text style={styles.subTitle}>LEATHER / FABRIC TYPE <Text style={{color: 'red'}}>*</Text></Text>
              <View style={[styles.optionRow, { marginBottom: 15 }]}>
                {COVER_CHOICES.map((cover) => (
                  <TouchableOpacity
                    key={cover}
                    style={[styles.optionBtn, selectedCover === cover && styles.optionSelected]}
                    onPress={() => setSelectedCover(cover)}
                  >
                    <Text style={[styles.optionText, selectedCover === cover && styles.optionTextSelected]}>{cover}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.subTitle}>COLORS <Text style={{color: 'red'}}>*</Text></Text>
          <View style={styles.colorRow}>
            {COLOR_PALETTE.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c.hex },
                  selectedColor === c.name && styles.colorSelected,
                ]}
                onPress={() => setSelectedColor(c.name)}
              />
            ))}
          </View>
        </View>
        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sectionCounter++}. ADDITIONAL FEATURES</Text>
          <View style={styles.optionRow}>
            {additionals.length > 0 ? (
              additionals.map((item) => {
                const selected = selectedAddOns.some((a) => a.key === item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.optionBtn, selected && styles.optionSelected]}
                    onPress={() => toggleAddOn(item)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sectionCounter++}. ADD NOTES / DESIGN PHOTO</Text>
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
            style={[styles.textBox, {height: 100}]}
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
              <Text style={styles.uploadText}>Upload Additional Photos</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.stickyBar}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          {ai_custom ? (
            <Text style={[styles.totalValue, { fontSize: 16, color: '#B22222' }]}>Request Quote</Text>
          ) : (
            <Text style={styles.totalValue}>₱{(totalPrice).toLocaleString()}</Text>
          )}
        </View>

        <View style={styles.bottomControls}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity onPress={() => setQty(Math.max(qty - 1, 1))} style={styles.qtyBtn}>
              <Ionicons name="remove" size={18} color="#333" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity onPress={() => setQty(qty + 1)} style={styles.qtyBtn}>
              <Ionicons name="add" size={18} color="#333" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.buyNowBtn}
            onPress={() => {
              if (!selectedSize) {
                Alert.alert("Missing Option", "Please select a size before continuing.");
                return;
              }

              if (!selectedColor) {
                Alert.alert("Missing Option", "Please select a color before continuing.");
                return;
              }

              let finalSize = selectedSize;
              if (selectedSize === "Custom") {
                if (!customSizeText.trim()) {
                  Alert.alert("Missing Input", "Please enter your custom size specification in the text box.");
                  return;
                }
                finalSize = `Custom: ${customSizeText}`;
              }

              if (uploading) {
                Alert.alert("Uploading in Progress", "Please wait until your images are finished uploading.");
                return;
              }

              // Safely extract a single string to prevent "nested array" errors
              const rawImg = activeProduct?.image || activeProduct?.thumbnail || activeProduct?.images?.[0];
              
              if (typeof rawImg === 'string') {
                  safeImage = rawImg;
              } else if (Array.isArray(rawImg) && typeof rawImg[0] === 'string') {
                  safeImage = rawImg[0]; 
              }

              // 🚨 FIX: Safely extract the fully resolved displayImage so gs:// links and base64 don't break
              let safeImage = displayImage || activeProduct?.image || "https://via.placeholder.com/150";

              const customizedProduct = JSON.parse(JSON.stringify({
                id: activeProduct?.id || "custom_" + Date.now(),
                name: activeProduct?.name || "Custom Product",
                category: activeProduct?.category || "Custom",
                image: safeImage, // 🚨 FIX: Added this explicitly
                imageUrls: [safeImage], 
                originalImage: safeImage,
                uploadedImages: uploadedImages.length > 0 ? uploadedImages : [],
                price: totalPrice || 0,
                qty: qty || 1,
                selectedColor: selectedColor, 
                selectedSize: finalSize, 
                selectedMaterial: selectedCover || selectedMaterial || "Standard", 
                customFeatures: selectedFeatures || {},
                selectedFoam: selectedFoam || "Standard",
                selectedCover: selectedCover || "Standard",
                additionals: selectedAddOns.map((item) => item.label),
                notes: notes || "",
                type: "customization", 
                basePrice: activeProduct?.basePrice || activeProduct?.price || 0,
                isAiConcept: !!ai_custom
              }));

              console.log("➡️ Customization → Checkout payload:", customizedProduct);
              navigation.navigate("CheckoutPage", { product: customizedProduct });
            }}
          >
            <Text style={styles.buyNowText}>{ai_custom ? "REQUEST QUOTE" : "BUY NOW"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

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
  productName: { fontWeight: "700", fontSize: 18, color: "#1B3D36", textAlign: 'center' },
  productPrice: { fontSize: 16, color: "#666", marginBottom: 10 },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: "#1B3D36",
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.5,
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
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 14,
    paddingHorizontal: 20,
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
    justifyContent: "space-between",
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 130,
  },
});