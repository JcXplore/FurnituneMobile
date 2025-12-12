import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  StatusBar,
  SafeAreaView
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { getFirestore, collection, query, where, getDocs, limit } from "firebase/firestore";
import { app } from "./firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==========================================
// 1. MAPPINGS & CONFIG
// ==========================================
const CATEGORY_SLUG_MAP = {
  "Sofa": "sofas", 
  "Chair": "living-chairs",
  "Bed": "beds",
  "Table": "tables",
  "Cabinet": "cabinets",
  "Ottoman": "ottomans",
  "Sectionals": "sectionals"
};

const API_BASE = "https://furnitune-reco.onrender.com";
const BRAND_COLOR = "#2c6e49";
const BG_COLOR = "#F5F7FA";

export default function RecommenderPage() {
  const navigation = useNavigation();
  const scrollViewRef = useRef();

  // ==========================================
  // STATE
  // ==========================================
  const [messages, setMessages] = useState([
    { id: 1, from: "bot", text: "👋 Hi! I’m FurniBot. I can help you find the perfect furniture." },
    { id: 2, from: "bot", text: "Start by uploading a photo of your room, or we can chat!" },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  
  // Results & Display Logic
  const [results, setResults] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(2); 

  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  
  // Dynamic Options
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  
  const [preferenceMode, setPreferenceMode] = useState(null);
  const [conversationMode, setConversationMode] = useState("setup");
  const [showCustomizationOption, setShowCustomizationOption] = useState(false); // NEW STATE
  
  const db = getFirestore(app);

  // ==========================================
  // HELPERS
  // ==========================================
  function convertGsToHttps(url) {
    if (!url) return "https://via.placeholder.com/150";
    if (url.startsWith("http")) return url;
    if (url.startsWith("gs://")) {
      const bucket = "furnitune-64458.firebasestorage.app";
      const path = url.replace(`gs://${bucket}/`, "");
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
    }
    return url;
  }

  const addMessage = (msg) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages((prev) => [...prev, { id: Date.now(), ...msg }]);
  };

  const botRespond = (text) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({ from: "bot", text });
    }, 800);
  };

  const userRespond = (text) => addMessage({ from: "user", text });

  const [questions, setQuestions] = useState([
    {
      key: "image",
      question: "Would you like to upload a photo of your room?",
      options: ["Upload Photo", "Skip for now"],
    },
    {
      key: "category",
      question: "What type of furniture are you looking for?",
      options: ["Sofa", "Chair", "Bed", "Table", "Cabinet", "Ottoman", "Sectionals"],
    },
  ]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true, 
      });
      
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64);
        
        addMessage({ from: "user", type: "image", uri: asset.uri });
        botRespond("Nice room! Do you have specific preferences in mind?");
        setPreferenceMode("ask");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handlePreferenceResponse = (response) => {
    userRespond(response);
    if (response === "Yes") {
      botRespond("Got it. Let's narrow it down.");
      setPreferenceMode("yes");
      setTimeout(() => {
        setStep(1);
        botRespond(questions[1].question);
      }, 1000);
    } else {
      botRespond("Okay! Analyzing your photo for the best match...");
      setPreferenceMode("no");
      setLoading(true);
      setTimeout(async () => {
        await uploadAndRecommend();
        setConversationMode("results");
        setStep(0);
      }, 1200);
    }
  };

  const handleStartOver = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages([
      { id: 1, from: "bot", text: "👋 Hi! I’m FurniBot." },
      { id: 2, from: "bot", text: "Let's start fresh. Photo or Skip?" },
    ]);
    setLoading(false);
    setStep(0);
    setAnswers({});
    setResults([]);
    setDisplayLimit(2);
    setImageUri(null);
    setImageBase64(null);
    setAvailableSizes([]);
    setAvailableColors([]); 
    setPreferenceMode(null);
    setConversationMode("setup");
    setShowCustomizationOption(false);
  };

  const handleOptionSelect = async (key, value) => {
    userRespond(value);
    setAnswers((prev) => ({ ...prev, [key]: value }));

    if (key === "image") {
      if (value === "Upload Photo") {
        await pickImage();
        return;
      } else {
        botRespond("No problem! Let's find what you need.");
        setTimeout(() => nextStep(), 600);
        return;
      }
    }

    if (key === "category") {
      await loadCategoryData(value);
      return; 
    }
    setTimeout(() => nextStep(), 600);
  };

  // ==========================
  // LOGIC: LOAD DATA
  // ==========================
  const loadCategoryData = async (categoryUI) => {
    try {
      setIsTyping(true);
      const dbSlug = CATEGORY_SLUG_MAP[categoryUI] || categoryUI.toLowerCase();
      
      const q = query(
        collection(db, "products"), 
        where("categorySlug", "==", dbSlug),
        where("active", "==", true),
        limit(30) 
      );

      const querySnapshot = await getDocs(q);
      const foundSizes = new Set();
      const foundColors = new Set();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        const sizes = data.options?.sizes || data.sizeOptions;
        if (Array.isArray(sizes)) {
          sizes.forEach(s => {
             if (s.label) foundSizes.add(s.label);
             else if (s.id) foundSizes.add(s.id);
             else if (typeof s === 'string') foundSizes.add(s);
          });
        }

        const colors = data.options?.colors || data.colorOptions;
        if (Array.isArray(colors)) {
          colors.forEach(c => {
            if (c.label) foundColors.add(c.label);
            else if (c.name) foundColors.add(c.name);
            else if (typeof c === 'string') foundColors.add(c);
          });
        }
      });

      const sizesSorted = Array.from(foundSizes).sort();
      const colorsSorted = Array.from(foundColors).sort();

      setAvailableSizes(sizesSorted);
      setAvailableColors(colorsSorted);

      setQuestions((prev) => {
        const base = prev.filter((q) => q.key !== "size" && q.key !== "color");
        const newDynamic = [];

        if (sizesSorted.length > 0) {
            newDynamic.push({ key: "size", question: "Preferred size?", options: sizesSorted });
        }
        if (colorsSorted.length > 0) {
            newDynamic.push({ key: "color", question: "Any preferred color?", options: colorsSorted });
        }
        
        return [...base, ...newDynamic];
      });

      setIsTyping(false);

      const hasSize = sizesSorted.length > 0;
      const hasColor = colorsSorted.length > 0;

      if (hasSize) {
         botRespond("Great choice. What size fits your space?");
         setTimeout(() => setStep(prev => prev + 1), 800);
      } else if (hasColor) {
         botRespond("Let's pick a color.");
         setTimeout(() => setStep(prev => prev + 1), 800);
      } else {
         setTimeout(() => nextStep(), 800);
      }

    } catch (err) {
      console.error("Error:", err);
      botRespond("⚠️ I'm having trouble connecting to the showroom.");
      setTimeout(() => nextStep(), 1000);
    }
  };

  const nextStep = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
      botRespond(questions[step + 1].question);
    } else {
      botRespond("Perfect. I'm finding your matches...");
      setTimeout(() => submitPreferences(), 1500);
    }
  };

  // ==========================
  // API CALLS & RESULTS
  // ==========================
  const submitPreferences = async () => {
    setLoading(true);
    try {
      const searchText = `${answers.category || ""} ${answers.size || ""} ${answers.color || ""}`;
      const payload = {
        text: searchText,
        type: answers.category || "",
        size: answers.size || "",
        color: answers.color || "",
        additionals: [], 
        image_b64: null,
        k: 10, 
        strict: true 
      };
      const res = await axios.post(`${API_BASE}/recommend`, payload);
      handleResults(res.data.items);
    } catch (err) {
      botRespond("⚠ Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadAndRecommend = async () => {
    if (!imageBase64) return Alert.alert("Error", "No image data found.");
    try {
      const payload = {
        image_b64: imageBase64,
        text: answers.category || "",
        type: answers.category || "",
        size: answers.size || "",
        color: answers.color || "",
        additionals: [],
        w_image: 0.8,
        w_text: 0.2,
        k: 10 
      };
      const res = await axios.post(`${API_BASE}/recommend`, payload);
      handleResults(res.data.items);
    } catch (err) {
      botRespond("❌ Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  const handleResults = (items) => {
    setResults(items || []);
    setDisplayLimit(2); 
    setConversationMode("results");
    
    if (items?.length > 0) {
      botRespond("✨ Here are your top recommendations!");
    } else {
      botRespond("😕 I couldn't find an exact match.");
    }

    // NEW: Follow up about customization after a short delay
    setTimeout(() => {
        botRespond("If these aren't quite right, would you like to customize your own furniture?");
        setShowCustomizationOption(true);
    }, 2500);
  };

  const handleCustomizationChoice = (choice) => {
    userRespond(choice);
    setShowCustomizationOption(false);

    if (choice === "Yes, Customize") {
        botRespond("Opening Customization Studio...");
        setTimeout(() => {
            navigation.navigate("CustomizationPage", { 
                
            });
        }, 1000);
    } else {
        botRespond("No problem! Hope you like the recommendations above.");
    }
  };

  const handleViewMore = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDisplayLimit((prev) => prev + 4); 
  };

  // ==========================================
  // UI COMPONENTS
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <Text style={styles.headerSubtitle}>Powered by FurniBot</Text>
      </View>
      <TouchableOpacity onPress={handleStartOver} style={styles.resetButton}>
         <Ionicons name="refresh" size={20} color={BRAND_COLOR} />
      </TouchableOpacity>
    </View>
  );

  const renderMessage = (msg, idx) => {
    const isBot = msg.from === "bot";
    return (
      <View key={msg.id || idx} style={[styles.msgRow, isBot ? styles.msgRowBot : styles.msgRowUser]}>
        {isBot && (
            <View style={styles.botAvatar}>
                <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
        )}
        {msg.type === "image" ? (
          <Image source={{ uri: msg.uri }} style={styles.msgImage} />
        ) : (
          <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
            <Text style={[styles.msgText, isBot ? styles.textBot : styles.textUser]}>
              {msg.text}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderProductCard = (item) => {
    const formattedProduct = {
        id: item.id,
        name: item.name,
        price: item.basePrice ?? item.price ?? 0,
        image: convertGsToHttps(item.imageUrl || item.image || item.thumbnail || item.defaultImagePath),
        rating: item.ratingAvg ?? 0,
        reviews: item.reviewsCount ?? 0,
        category: item.baseType || "Uncategorized",
        size: null, material: null, seats: null, shape: null,
    };

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ProductDetails", { product: formattedProduct })}
      >
        <Image
            source={{ uri: formattedProduct.image }}
            style={styles.cardImage}
            contentFit="cover"
        />
        <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardPrice}>₱{formattedProduct.price.toLocaleString()}</Text>
            <View style={styles.cardFooter}>
                <Text style={styles.viewDetails}>View Details</Text>
                <Ionicons name="arrow-forward-circle" size={24} color={BRAND_COLOR} />
            </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        
        {isTyping && (
          <View style={styles.typingContainer}>
             <ActivityIndicator size="small" color="#aaa" />
             <Text style={styles.typingText}>FurniBot is typing...</Text>
          </View>
        )}

        {/* RESULTS SECTION */}
        {results.length > 0 && (
            <View style={styles.resultsGrid}>
                {results.slice(0, displayLimit).map(renderProductCard)}
                
                {results.length > displayLimit && (
                    <TouchableOpacity style={styles.viewMoreBtn} onPress={handleViewMore}>
                        <Text style={styles.viewMoreText}>View More</Text>
                        <Ionicons name="chevron-down" size={16} color="#fff" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.restartBtn} onPress={handleStartOver}>
                    <Text style={styles.restartText}>Start New Search</Text>
                </TouchableOpacity>
            </View>
        )}

        <View style={{ height: 160 }} /> 
      </ScrollView>

      {/* FLOATING ACTION AREA */}
      <View style={styles.actionArea}>
        
        {/* 1. Customization Prompt (Post-Results) */}
        {showCustomizationOption && !loading && (
             <View style={styles.choiceRow}>
                <TouchableOpacity style={styles.chipBig} onPress={() => handleCustomizationChoice("Yes, Customize")}>
                    <Text style={styles.chipTextBig}>Yes, Customize</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chipBig} onPress={() => handleCustomizationChoice("No, thanks")}>
                    <Text style={styles.chipTextBig}>No, thanks</Text>
                </TouchableOpacity>
             </View>
        )}

        {/* 2. Binary Choice (Initial Preference) */}
        {preferenceMode === "ask" && !loading && !showCustomizationOption && (
          <View style={styles.choiceRow}>
            {["Yes", "No"].map((opt) => (
              <TouchableOpacity key={opt} style={styles.chipBig} onPress={() => handlePreferenceResponse(opt)}>
                <Text style={styles.chipTextBig}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 3. Dynamic Options (Setup Phase) */}
        {conversationMode === "setup" && questions[step] && !answers[questions[step].key] && preferenceMode !== "ask" && !loading && (
           <View style={styles.chipsContainer}>
              {questions[step].options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.chip}
                  onPress={() => handleOptionSelect(questions[step].key, opt)}
                >
                  <Text style={styles.chipText}>{opt}</Text>
                </TouchableOpacity>
              ))}
           </View>
        )}

        {/* 4. Loading */}
        {loading && (
             <View style={styles.loadingContainer}>
                 <ActivityIndicator size="large" color={BRAND_COLOR} />
                 <Text style={styles.loadingText}>Processing...</Text>
             </View>
        )}
      </View>

    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    elevation: 2,
  },
  backButton: { padding: 8 },
  resetButton: { padding: 8, backgroundColor: "#f0f9f4", borderRadius: 20 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  headerSubtitle: { fontSize: 11, color: BRAND_COLOR, fontWeight: "600" },

  chatContainer: { flex: 1, backgroundColor: BG_COLOR },
  chatContent: { padding: 16, paddingBottom: 20 },
  msgRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
  msgRowBot: { justifyContent: "flex-start" },
  msgRowUser: { justifyContent: "flex-end" },
  botAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_COLOR,
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  bubble: { maxWidth: "80%", padding: 14, borderRadius: 20, elevation: 1 },
  bubbleBot: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: BRAND_COLOR, borderBottomRightRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22 },
  textBot: { color: "#333" },
  textUser: { color: "#fff" },
  msgImage: { width: 200, height: 150, borderRadius: 12, borderWidth: 3, borderColor: BRAND_COLOR },
  typingContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 42, marginBottom: 10 },
  typingText: { fontSize: 12, color: '#888', marginLeft: 6 },

  actionArea: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(255,255,255,0.95)", borderTopWidth: 1, borderTopColor: "#eee",
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  chip: {
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", marginBottom: 8,
  },
  chipActive: { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR },
  chipText: { fontSize: 14, color: "#444", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  choiceRow: { flexDirection: "row", justifyContent: "space-evenly" },
  chipBig: {
    flex: 1, marginHorizontal: 10, paddingVertical: 14,
    backgroundColor: "#fff", borderWidth: 2, borderColor: BRAND_COLOR,
    borderRadius: 12, alignItems: "center",
  },
  chipTextBig: { fontSize: 16, fontWeight: "700", color: BRAND_COLOR },
  
  loadingContainer: { alignItems: 'center', paddingVertical: 10 },
  loadingText: { marginTop: 8, color: '#666', fontSize: 12 },

  resultsGrid: { marginTop: 10, width: '100%', alignItems: 'center' },
  card: {
      width: '95%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 20,
      elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1, shadowRadius: 5, overflow: 'hidden'
  },
  cardImage: { width: '100%', height: 220, backgroundColor: '#f0f0f0' },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardPrice: { fontSize: 16, color: BRAND_COLOR, fontWeight: '700', marginBottom: 12 },
  cardFooter: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 12
  },
  viewDetails: { fontSize: 14, color: '#666', fontWeight: '600' },
  
  viewMoreBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#555', paddingVertical: 10, paddingHorizontal: 20,
      borderRadius: 25, marginBottom: 15
  },
  viewMoreText: { color: '#fff', marginRight: 5, fontWeight: '600' },

  restartBtn: { marginTop: 0, paddingVertical: 10, paddingHorizontal: 20 },
  restartText: { color: '#888', textDecorationLine: 'underline' }
});