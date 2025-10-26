import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "./firebaseConfig";
import { useNavigation } from "@react-navigation/native";

const db = getFirestore(app);
const API_BASE = "http://192.168.1.16:8000"; // 🔧 update to your backend IP if needed

export default function RecommenderPage() {
  const navigation = useNavigation();

  const [messages, setMessages] = useState([
    { from: "bot", text: "👋 Hi there! I’m FurniBot — your smart furniture recommender." },
    { from: "bot", text: "Would you like to upload a photo or skip for now?" },
  ]);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [imageUri, setImageUri] = useState(null);
  const [additionals, setAdditionals] = useState([]);
  const [selectedAdditionals, setSelectedAdditionals] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [preferenceMode, setPreferenceMode] = useState(null);
  const [conversationMode, setConversationMode] = useState("setup");

const questions = [
  {
    key: "image",
    question: "Would you like to upload a photo of your room?",
    options: ["Upload Photo", "Skip for now"],
  },
  {
    key: "category",
    question: "What type of furniture are you looking for?",
    options: ["Sofa", "Chair", "Bed", "Table", "Cabinet"],
  },
  {
    key: "size",
    question: "What size do you prefer?",
    options: availableSizes,
  },
];

  const botRespond = (text) => setMessages((prev) => [...prev, { from: "bot", text }]);
  const userRespond = (text) => setMessages((prev) => [...prev, { from: "user", text }]);

  // ==========================
  // 🖼️ Handle photo upload
  // ==========================
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setMessages((prev) => [...prev, { from: "user", type: "image", uri }]);
        botRespond("Got it! Do you have any preferences in mind?");
        setPreferenceMode("ask");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  // ==========================
  // ✅ Yes/No after image upload
  // ==========================
  const handlePreferenceResponse = (response) => {
    userRespond(response);
    if (response === "Yes") {
      botRespond("Alright! Let’s go through a few quick questions.");
      setPreferenceMode("yes");
      setTimeout(() => {
        setStep(1);
        botRespond(questions[1].question);
      }, 800);
    } else {
      botRespond("Okay! I’ll analyze your image right away.");
      setPreferenceMode("no");
      setLoading(true);
      setTimeout(() => uploadAndRecommend(imageUri), 1000);
    }
  };

  const handleStartOver = () => {
    setMessages([
      { from: "bot", text: "👋 Hi there! I’m FurniBot — your smart furniture recommender." },
      { from: "bot", text: "Would you like to upload a photo or skip for now?" },
    ]);
    setLoading(false);
    setStep(0);
    setAnswers({});
    setResults([]);
    setImageUri(null);
    setAdditionals([]);
    setSelectedAdditionals([]);
    setAvailableSizes([]);
    setPreferenceMode(null);
    setConversationMode("setup");
  };
  // ==========================
  // 💬 Handle user selections
  // ==========================
  const handleOptionSelect = async (key, value) => {
    userRespond(value);
    setAnswers((prev) => ({ ...prev, [key]: value }));

    if (key === "image") {
      if (value === "Upload Photo") pickImage();
      else botRespond("Alright! Let’s answer a few quick questions.");
      setTimeout(() => nextStep(), 600);
      return;
    }

    if (key === "category") {
      await showCategoryInfo(value);
      await loadCategoryData(value);
    }

    setTimeout(() => nextStep(), 600);
  };

  // ==========================
  // 📦 Load available options
  // ==========================
  // RecommenderPage.js

const loadCategoryData = async (category) => {
  try {
    const [optRes, addRes] = await Promise.all([
      axios.get(`${API_BASE}/get-options/${category}`),
      axios.get(`${API_BASE}/get-additionals/${category}`),
    ]);

    const { sizes } = optRes.data;

    // Prefer server-provided mapping; fallback builds pairs
    const raw = addRes.data.additionals || [];
    const pretty = addRes.data.additionalsPretty || raw.map(k =>
      k.replace(/^has/, "With ").replace(/([A-Z])/g, " $1").trim()
    );
    const map = addRes.data.additionalsMap || raw.map((k, i) => ({ key: k, label: pretty[i] || k }));

    setAvailableSizes(sizes || []);
    setAdditionals(map);        // [{ key, label }]
    setSelectedAdditionals([]); // reset when category changes
  } catch (err) {
    console.error("Error fetching category data:", err);
    setAdditionals([]);
    setSelectedAdditionals([]);
  }
};


  // ==========================
  // 🪑 Show category items
  // ==========================
  const showCategoryInfo = async (category) => {
    try {
      const res = await axios.get(`${API_BASE}/get-products/${category}`);
      const products = res.data.products || [];

      if (products.length === 0) {
        botRespond(`I couldn’t find any ${category.toLowerCase()} products.`);
        return;
      }

    } catch (err) {
      console.error("Error loading category info:", err);
      botRespond("⚠️ I couldn’t load product details for this category.");
    }
  };

  // ==========================
  // ▶️ Move to next question
  // ==========================
 const nextStep = () => {
  if (step < questions.length - 1) {
    setStep(step + 1);
    botRespond(questions[step + 1].question);
  } else {
    // ✅ Always check additionals after size
    if (additionals.length > 0) {
      // 🔧 Support both array of strings and array of {key, label}
    const featuresList = additionals.map(a => a.label ?? a).join(", ");
    botRespond(`Would you like to include any of these additional features? (${featuresList})`);

    } else {
      botRespond("No additional features are available for this category.");
      setTimeout(() => submitPreferences(), 1500);
    }
  }
};


  // ==========================
  // ✨ Submit preferences
  // ==========================
  const submitPreferences = async () => {
    setLoading(true);
    botRespond("🔎 Finding furniture that matches your preferences...");

    try {
      const response = await axios.post(`${API_BASE}/recommend-preference`, {
  category: answers.category,
  size: answers.size,
  additionals: selectedAdditionals, // raw has* keys now
});


      const products = response.data.recommendations || [];
      setResults(products);
      setConversationMode("results");

      if (products.length > 0) {
        botRespond("✅ Here are some furniture pieces that match your taste:");
      } else {
        botRespond("😕 No perfect matches found. Try changing your preferences.");
      }
    } catch (err) {
      console.error("Error:", err);
      botRespond("⚠️ Something went wrong while finding recommendations.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // 🖼️ Upload + AI recommend
  // ==========================
  const uploadAndRecommend = async (uri) => {
    if (!uri) return;
    const formData = new FormData();
    formData.append("file", { uri, name: "room.jpg", type: "image/jpeg" });

    try {
  const response = await axios.post(`${API_BASE}/recommend-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  console.log("Upload response:", response.data);

  const productIds = response.data.recommendations || []; // ✅ avoid undefined
  const fetched = [];

  // Only fetch products if recommendations exist
  if (productIds.length > 0) {
    for (let id of productIds) {
      const ref = doc(db, "products", id);
      const snap = await getDoc(ref);
      if (snap.exists()) fetched.push({ id, ...snap.data() });
    }
  }

  setResults(fetched);
  setConversationMode("results");

  if (productIds.length > 0) {
    botRespond("✅ I found furniture that visually matches your image!");
  } else {
    botRespond("✅ Image uploaded successfully (no recommendations yet).");
  }
} catch (error) {
  console.error("Upload failed:", error);
  botRespond("😞 I couldn’t process the image. Please try again.");
} finally {
  setLoading(false);
}

  };

  // ==========================
  // 🧩 Toggle additional features
  // ==========================
  const toggleAdditional = (key) => {
  setSelectedAdditionals((prev) =>
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
  );
};


  // ==========================
  // 💬 UI
  // ==========================
  return (
    <View style={styles.container}>
      <ScrollView style={styles.chatBox}>
        {messages.map((msg, idx) =>
          msg.type === "image" ? (
            <View key={idx} style={[styles.message, styles.botMsg]}>
              <Image source={{ uri: msg.uri }} style={styles.chatImage} />
            </View>
          ) : (
            <View
              key={idx}
              style={[styles.message, msg.from === "bot" ? styles.botMsg : styles.userMsg]}
            >
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          )
        )}

        {/* Preference after image */}
        {preferenceMode === "ask" && (
          <View style={styles.optionsContainer}>
            {["Yes", "No"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.optionButton}
                onPress={() => handlePreferenceResponse(opt)}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Dynamic question flow */}
        {conversationMode === "setup" &&
          questions[step] &&
          !answers[questions[step].key] &&
          preferenceMode !== "ask" && (
            <View style={styles.optionsContainer}>
              {questions[step].options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.optionButton}
                  onPress={() => handleOptionSelect(questions[step].key, opt)}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

        {/* Additionals */}
        {additionals.length > 0 && conversationMode === "setup" && answers.size && (
  <>
    <Text style={styles.additionalText}>Choose extra features:</Text>
    <View style={styles.optionsContainer}>
      {additionals.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[
            styles.optionButton,
            selectedAdditionals.includes(opt.key) && { backgroundColor: "#14532d" },
          ]}
          onPress={() => toggleAdditional(opt.key)}
        >
          <Text style={styles.optionText}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
    <TouchableOpacity style={styles.optionButton} onPress={submitPreferences}>
      <Text style={styles.optionText}>Continue ➜</Text>
    </TouchableOpacity>
  </>
)}


        {loading && (
          <View style={{ alignItems: "center", marginVertical: 15 }}>
            <ActivityIndicator size="large" color="#2c6e49" />
            <Text style={{ color: "#555", marginTop: 8 }}>Finding the best match...</Text>
          </View>
        )}

        {/* Recommendations */}
        {results.length > 0 && (
        <>
          <Text style={styles.resultTitle}>Recommended Furniture ✨</Text>
          {results.slice(0, 2).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => navigation.navigate("ProductDetails", { product: item })}
            >
              <Image
                source={{
                  uri:
                    item.thumbnail ||
                    item.defaultImagePath ||
                    "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg",
                }}
                style={styles.image}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>₱{item.basePrice?.toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
      {results.length > 0 && (
        <TouchableOpacity style={styles.startOverButton} onPress={handleStartOver}>
          <Text style={styles.startOverText}>🔁 Start Over</Text>
        </TouchableOpacity>
      )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7ef", padding: 20, paddingTop: 40 },
  chatBox: { flex: 1 },
  message: { maxWidth: "80%", padding: 10, marginVertical: 5, borderRadius: 10 },
  botMsg: { backgroundColor: "#e0ede4", alignSelf: "flex-start" },
  userMsg: { backgroundColor: "#2c6e49", alignSelf: "flex-end" },
  messageText: { color: "#333", fontSize: 15 },
  chatImage: { width: 160, height: 120, borderRadius: 10, marginTop: 5 },
  optionsContainer: { flexWrap: "wrap", flexDirection: "row", marginVertical: 10 },
  optionButton: {
    backgroundColor: "#2c6e49",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    margin: 5,
  },
  optionText: { color: "#fff", fontWeight: "600" },
  additionalText: { marginVertical: 10, fontWeight: "600" },
  resultTitle: { fontWeight: "700", fontSize: 16, marginTop: 20, marginBottom: 10 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
  },
  image: { width: 70, height: 70, borderRadius: 8, marginRight: 10 },
  name: { fontWeight: "bold", color: "#333" },
  price: { color: "#2c6e49", fontWeight: "600" },
  startOverButton: {
  backgroundColor: "#2c6e49",
  borderRadius: 25,
  paddingVertical: 12,
  paddingHorizontal: 20,
  alignSelf: "center",
  marginTop: 15,
},
startOverText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
},

});
