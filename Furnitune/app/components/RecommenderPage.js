import React, { useState, useRef, useEffect } from "react";
import * as FileSystem from 'expo-file-system/legacy';
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
import { getFirestore, collection, query, where, getDocs, limit, addDoc, orderBy, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL, uploadBytes } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  
  const [preferenceMode, setPreferenceMode] = useState(null);
  const [conversationMode, setConversationMode] = useState("setup");
  const [showCustomizationOption, setShowCustomizationOption] = useState(false); 
  
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

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

  // Removed Chat History Load
  useEffect(() => {
    startFresh();
  }, []);

  // Removed database saving completely
  const addMessage = (msg) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newMsg = { id: Date.now() + Math.random(), ...msg };
    setMessages((prev) => [...prev, newMsg]);
  };

  const botRespond = (text, extraData = {}) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({ from: "bot", text, ...extraData });
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Forces the user to crop it
        aspect: [4, 3],      // Standardizes the size
        quality: 0.2,        // 🚨 CRITICAL: Shrinks the file size by 80% so the backend doesn't crash
        base64: true, 
      });
      
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        
        botRespond("Uploading your photo...");
        
        // 🚨 REMOVED FIREBASE UPLOAD. Just using local device URI!
        setImageUri(asset.uri);
        setImageBase64(asset.base64);
        
        addMessage({ from: "user", type: "image", uri: asset.uri });
        botRespond("Nice! I'll use your photo to refine the recommendation.");
        setPreferenceMode("ask");
      }
    } catch (err) {
      console.error(err);
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
      setPreferenceMode("no");
      fetchRecommendations(false);
    }
  };

  const startFresh = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages([]);
    setLoading(false);
    setStep(0);
    setAnswers({});
    setImageUri(null);
    setImageBase64(null);
    setAvailableSizes([]);
    setAvailableColors([]); 
    setPreferenceMode(null);
    setConversationMode("setup");
    setShowCustomizationOption(false);

    addMessage({ from: "bot", text: "👋 Hi! I’m FurniBot." }, false);
    addMessage({ from: "bot", text: "Let's start fresh. Would you like to upload a photo of your room?" }, false);
  };

  const handleOptionSelect = async (key, value) => {
    userRespond(value);
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);

    if (key === "image") {
      if (value === "Upload Photo") {
        await pickImage();
        return;
      } else {
        botRespond("No problem! Let's find what you need.");
        setTimeout(() => nextStep(newAnswers), 600);
        return;
      }
    }

    if (key === "category") {
      await loadCategoryData(value, newAnswers);
      return; 
    }
    setTimeout(() => nextStep(newAnswers), 600);
  };

  const loadCategoryData = async (categoryUI, latestAnswers) => {
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
        if (sizesSorted.length > 0) newDynamic.push({ key: "size", question: "Preferred size?", options: sizesSorted });
        if (colorsSorted.length > 0) newDynamic.push({ key: "color", question: "Any preferred color?", options: colorsSorted });
        return [...base, ...newDynamic];
      });

      setIsTyping(false);

      if (sizesSorted.length > 0) {
         botRespond("Great choice. What size fits your space?");
         setTimeout(() => setStep(prev => prev + 1), 800);
      } else if (colorsSorted.length > 0) {
         botRespond("Let's pick a color.");
         setTimeout(() => setStep(prev => prev + 1), 800);
      } else {
         setTimeout(() => nextStep(latestAnswers), 800);
      }
    } catch (err) {
      console.error("Error:", err);
      botRespond("⚠️ I'm having trouble connecting to the showroom.");
      setTimeout(() => nextStep(latestAnswers), 1000);
    }
  };

  const nextStep = (latestAnswers = answers) => {
    if (step < questions.length - 1) {
      setStep(step + 1);
      botRespond(questions[step + 1].question);
    } else {
      fetchRecommendations(false, latestAnswers);
    }
  };
  
  const fetchRecommendations = async (forceAi = false, latestAnswers = answers) => {
    if (forceAi) {
      botRespond("Got it! I am designing a custom Flux concept just for you. This will take about 15 seconds...");
    } else {
      botRespond(imageBase64 ? "Analyzing your photo for the best match..." : "Perfect. I'm finding your matches...");
    }
    
    setLoading(true);
    try {
      const searchText = `${latestAnswers.category || ""} ${latestAnswers.size || ""} ${latestAnswers.color || ""}`;
      const payload = {
        text: searchText,
        type: latestAnswers.category || "",
        size: latestAnswers.size || "",
        color: latestAnswers.color === "None" ? "" : (latestAnswers.color || ""),
        additionals: [], 
        image_b64: imageBase64 || null,
        k: 10, 
        strict: true,
        force_ai: forceAi
      };
      if (imageBase64) {
          payload.w_image = 0.8;
          payload.w_text = 0.2;
      }

      const res = await axios.post(`${API_BASE}/recommend`, payload);
      const data = res.data;

      // 🚨 CRITICAL FIX: SECURE AI IMAGE TO CLOUD STORAGE BEFORE CHAT UPDATE
      if (data.ai_designer && data.ai_designer.custom_concepts) {
         const uid = auth.currentUser?.uid || "guest";

         for (let i = 0; i < data.ai_designer.custom_concepts.length; i++) {
            let concept = data.ai_designer.custom_concepts[i];
            
            // Catch any massive string that isn't already a secure URL
            const isBase64 = concept.image_url && concept.image_url.length > 10000 && !concept.image_url.startsWith("http");
            
            // 🚨 CRITICAL FIX: SECURE AI IMAGE TO CLOUD STORAGE BEFORE CHAT UPDATE
            // 🚨 CRITICAL FIX: Save to local device ONLY. Do not upload to Firebase!
            if (isBase64) {
                try {
                    let base64String = concept.image_url;
                    
                    if (base64String.includes("base64,")) {
                        base64String = base64String.split("base64,")[1];
                    }
                    
                    // Create a temporary local file path
                    const tempFileUri = FileSystem.cacheDirectory + `ai_concept_${Date.now()}_${i}.jpg`;
                    
                    // Write the base64 data to that physical file
                    // Write the base64 data to that physical file
                   // Write the base64 data to that physical file
                    await FileSystem.writeAsStringAsync(tempFileUri, base64String, {
                        encoding: 'base64', // 🚨 FIX: Pass the string directly!
                    });
                    
                    // Assign the LOCAL file path to the concept image. 
                    // This will be passed to Customization -> Checkout -> Payment
                    concept.image_url = tempFileUri;
                    
                } catch(e) {
                    console.error("Local file save error:", e);
                    concept.image_url = "https://via.placeholder.com/150?text=AI+Concept+Failed";
                }
            }
         }
      }

      handleResults(data, forceAi);
    } catch (err) {
      console.error(err);
      botRespond("⚠ Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResults = (data, wasForceAi) => {
    const fetchedItems = data.items || [];
    const aiData = data.ai_designer;

    setConversationMode("results");
    
    if (aiData && aiData.room_analysis) {
        botRespond(`🤖 ${aiData.room_analysis}`);
    }

    if (!wasForceAi && fetchedItems.length > 0) {
      setTimeout(() => {
        botRespond("✨ Here are the closest ready-to-ship matches from our catalog:");
        
        fetchedItems.slice(0, 2).forEach(p => {
          botRespond(null, { product: p });
        });

        setTimeout(() => {
            botRespond("Are you looking for something completely unique?");
            setShowCustomizationOption(true);
        }, 1500);
      }, 800);
    } else if (aiData?.custom_concepts?.length > 0) {
       setTimeout(() => {
         aiData.custom_concepts.forEach(concept => {
           botRespond(null, { customConcept: concept });
         });
         
         botRespond("What would you like to do next?");
         setShowCustomizationOption(true); 
       }, 1000);
    } else {
      botRespond("😕 I couldn't find an exact match.");
      setTimeout(() => {
        setShowCustomizationOption(true);
      }, 1000);
    }
  };

  const handleCustomizationChoice = (choice) => {
    userRespond(choice);
    setShowCustomizationOption(false);
    if (choice === "Design Custom AI Concept") {
        fetchRecommendations(true, answers); 
    } else if (choice === "Change type") {
        setAnswers(prev => ({ image: prev.image })); 
        setStep(1); 
        setConversationMode("setup");
        botRespond("Okay—what type would you like?");
    } else if (choice === "Start over") {
        startFresh();
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <Text style={styles.headerSubtitle}>Powered by FurniBot</Text>
      </View>
      <TouchableOpacity onPress={startFresh} style={styles.resetButton}>
         <Ionicons name="refresh" size={20} color={BRAND_COLOR} />
      </TouchableOpacity>
    </View>
  );

  const renderProductCard = (item) => {
    const formattedProduct = {
        id: item.id,
        name: item.name || item.title,
        price: item.basePrice ?? item.price ?? 0,
        image: convertGsToHttps(item.imageUrl || item.image || item.thumbnail || item.defaultImagePath),
        category: item.baseType || "Uncategorized",
    };

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ProductDetails", { product: formattedProduct })}
      >
        <Image source={{ uri: formattedProduct.image }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{formattedProduct.name}</Text>
            <Text style={styles.cardPrice}>₱{formattedProduct.price.toLocaleString()}</Text>
            <View style={styles.cardFooter}>
                <Text style={styles.viewDetails}>View Details</Text>
                <Ionicons name="arrow-forward-circle" size={24} color={BRAND_COLOR} />
            </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAiConceptCard = (concept) => {
    return (
        <View style={[styles.card, styles.aiConceptCard]}>
            <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI CONCEPT</Text>
            </View>
            <Image source={{ uri: concept.image_url }} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardContent}>
                <Text style={styles.conceptType}>CUSTOM {concept.category || answers.category || "FURNITURE"}</Text>
                <Text style={styles.cardTitle}>{concept.title}</Text>
                <Text style={styles.conceptDesc}>{concept.description}</Text>
                <View style={styles.conceptSpecs}>
                    <Text style={styles.conceptSpecText}><Text style={{fontWeight: 'bold'}}>Color:</Text> {concept.suggested_color}</Text>
                </View>
                <TouchableOpacity 
                    style={styles.buildCustomBtn}
                    onPress={() => {
                        navigation.navigate("Customization", { 
                            ai_custom: true,
                            ai_image: concept.image_url,
                            ai_specs: JSON.stringify(concept)
                        });
                    }}
                >
                    <Text style={styles.buildCustomBtnText}>Build This Custom</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
  };

  const renderMessage = (msg, idx) => {
    const isBot = msg.from === "bot";
    return (
      <View key={msg.id || idx} style={[styles.msgRow, isBot ? styles.msgRowBot : styles.msgRowUser]}>
        {isBot && (
            <View style={styles.botAvatar}>
                <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
        )}
        
        <View style={{ flexShrink: 1, alignItems: isBot ? 'flex-start' : 'flex-end', width: '100%' }}>
            {msg.text && (
                <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
                    <Text style={[styles.msgText, isBot ? styles.textBot : styles.textUser]}>
                    {msg.text}
                    </Text>
                </View>
            )}

            {(msg.type === "image" || msg.uri) && (
                <Image source={{ uri: msg.uri }} style={styles.msgImage} />
            )}

            {msg.product && (
                <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
                    {renderProductCard(msg.product)}
                </View>
            )}

            {msg.customConcept && (
                <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
                    {renderAiConceptCard(msg.customConcept)}
                </View>
            )}
        </View>
      </View>
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
        <View style={{ height: 160 }} /> 
      </ScrollView>

      <View style={styles.actionArea}>
        {showCustomizationOption && !loading && (
             <View style={styles.customizationContainer}>
                {messages.some(m => m.product) && (
                    <TouchableOpacity style={styles.actionChip} onPress={() => handleCustomizationChoice("Design Custom AI Concept")}>
                        <Text style={styles.actionChipText}>Design Custom AI Concept</Text>
                    </TouchableOpacity>
                )}
                <View style={styles.rowChips}>
                    <TouchableOpacity style={styles.actionChip} onPress={() => handleCustomizationChoice("Change type")}>
                        <Text style={styles.actionChipText}>Change type</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionChip} onPress={() => handleCustomizationChoice("Start over")}>
                        <Text style={styles.actionChipText}>Start over</Text>
                    </TouchableOpacity>
                </View>
             </View>
        )}

        {preferenceMode === "ask" && !loading && !showCustomizationOption && (
          <View style={styles.choiceRow}>
            {["Yes", "No"].map((opt) => (
              <TouchableOpacity key={opt} style={styles.chipBig} onPress={() => handlePreferenceResponse(opt)}>
                <Text style={styles.chipTextBig}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", elevation: 2 },
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
  botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_COLOR, alignItems: "center", justifyContent: "center", marginRight: 8 },
  bubbleWrapper: { flexShrink: 1, width: '100%' },
  bubble: { maxWidth: "80%", padding: 14, borderRadius: 20, elevation: 1 },
  bubbleBot: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: BRAND_COLOR, borderBottomRightRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22 },
  textBot: { color: "#333" },
  textUser: { color: "#fff" },
  msgImage: { width: 200, height: 150, borderRadius: 12, borderWidth: 3, borderColor: BRAND_COLOR },
  typingContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 42, marginBottom: 10 },
  typingText: { fontSize: 12, color: '#888', marginLeft: 6 },
  actionArea: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(255,255,255,0.95)", borderTopWidth: 1, borderTopColor: "#eee", padding: 16, paddingBottom: Platform.OS === 'ios' ? 20 : 16 },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", marginBottom: 8 },
  chipActive: { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR },
  chipText: { fontSize: 14, color: "#444", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  choiceRow: { flexDirection: "row", justifyContent: "space-evenly" },
  chipBig: { flex: 1, marginHorizontal: 10, paddingVertical: 14, backgroundColor: "#fff", borderWidth: 2, borderColor: BRAND_COLOR, borderRadius: 12, alignItems: "center" },
  chipTextBig: { fontSize: 16, fontWeight: "700", color: BRAND_COLOR },
  loadingContainer: { alignItems: 'center', paddingVertical: 10 },
  loadingText: { marginTop: 8, color: '#666', fontSize: 12 },
  card: { width: '90%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5, overflow: 'hidden' },
  aiConceptCard: { borderWidth: 2, borderColor: BRAND_COLOR },
  aiBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(45,71,57,0.9)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, zIndex: 10 },
  aiBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  cardImage: { width: '100%', height: 200, backgroundColor: '#f0f0f0' },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardPrice: { fontSize: 16, color: BRAND_COLOR, fontWeight: '700', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 12 },
  viewDetails: { fontSize: 14, color: '#666', fontWeight: '600' },
  conceptType: { fontSize: 12, color: '#4f5b57', letterSpacing: 1, marginBottom: 4 },
  conceptDesc: { fontSize: 13, color: '#555', marginTop: 4, lineHeight: 18 },
  conceptSpecs: { backgroundColor: '#f5f5f5', padding: 8, borderRadius: 8, marginTop: 12 },
  conceptSpecText: { fontSize: 12, color: '#333' },
  buildCustomBtn: { marginTop: 16, width: '100%', backgroundColor: BRAND_COLOR, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  buildCustomBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  customizationContainer: { width: '100%', alignItems: 'center', gap: 8 },
  rowChips: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 8 },
  actionChip: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#EAE6DA', borderRadius: 16, borderWidth: 1, borderColor: '#D4CFC3', alignItems: 'center', justifyContent: 'center' },
  actionChipText: { fontSize: 15, color: '#0A3B52', fontWeight: '700' },
});