import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  StatusBar,
  SafeAreaView,
  Dimensions
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
// Ensure you have these in your .env or remove if hardcoding
import { OPENROUTER_API_KEY, OPENROUTER_BASE_URL } from "@env";
import furnituneData from "../assets/furnituneInfo.json";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BRAND_COLOR = "#2c6e49";
const BG_COLOR = "#F5F7FA";

const DEFAULT_FURNITUNE_INFO = `
Furnitune is an e-commerce platform for Santos Upholstery.
We sell ready-made furniture, support custom orders (dimensions, materials, and colors),
and offer repair services even for items not purchased from us.
`;

const FAQS = [
  "Business hours?",
  "Do you do repairs?",
  "Customization options?",
  "Payment methods?",
  "Delivery tracking?",
];

export default function ChatbotPage() {
  const navigation = useNavigation();
  const scrollViewRef = useRef();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [furnituneInfo, setFurnituneInfo] = useState(DEFAULT_FURNITUNE_INFO);

  useEffect(() => {
    setFurnituneInfo(furnituneData.info || DEFAULT_FURNITUNE_INFO);
    setMessages([
      {
        id: 1,
        sender: "bot",
        text: "👋 Hi there! I’m Furni, your personal furniture assistant. How can I help you today?",
      },
    ]);
  }, []);

  const addMessage = (msg) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages((prev) => [...prev, { id: Date.now(), ...msg }]);
  };

  const handleSend = async (textOverride = null) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    addMessage({ sender: "user", text: textToSend });
    setInput("");
    setIsTyping(true);

    try {
      const response = await axios.post(
        OPENROUTER_BASE_URL,
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are Furni, the official chatbot for Furnitune. Use this info: ${furnituneInfo}`,
            },
            { role: "user", content: textToSend },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const botReply = response.data?.choices?.[0]?.message?.content?.trim?.() || "Sorry, I didn’t catch that.";
      addMessage({ sender: "bot", text: botReply });
    } catch {
      addMessage({ sender: "bot", text: "⚠️ Sorry, I’m having trouble reaching the server right now." });
    } finally {
      setIsTyping(false);
    }
  };

  // ==========================
  // RENDERERS
  // ==========================

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Furni Chat</Text>
        <Text style={styles.headerSubtitle}>Always here to help</Text>
      </View>
      <TouchableOpacity 
        onPress={() => navigation.navigate("RecommenderPage")} 
        style={styles.headerActionBtn}
      >
         <Ionicons name="sparkles" size={20} color={BRAND_COLOR} />
      </TouchableOpacity>
    </View>
  );

  const renderMessageItem = (msg, idx) => {
    const isBot = msg.sender === "bot";
    return (
      <View key={msg.id || idx} style={[styles.msgRow, isBot ? styles.msgRowBot : styles.msgRowUser]}>
        {isBot && (
            <View style={styles.botAvatar}>
                <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
            </View>
        )}
        <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
            <Text style={[styles.msgText, isBot ? styles.textBot : styles.textUser]}>
              {msg.text}
            </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      {/* ANDROID KEYBOARD FIX:
        1. behavior="height" resizes the view when keyboard opens (standard Android behavior).
        2. keyboardVerticalOffset={30} gives a tiny buffer, usually 0 is fine on Android but 30 helps sticky footers.
        3. flex: 1 is crucial to let it fill the space.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 90} 
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled" // Ensures taps on FAQs/Send work while keyboard is open
        >
          {messages.map(renderMessageItem)}
          
          {isTyping && (
             <View style={styles.typingContainer}>
                <ActivityIndicator size="small" color="#aaa" />
                <Text style={styles.typingText}>Furni is typing...</Text>
             </View>
          )}
        </ScrollView>

        {/* FIXED BOTTOM AREA: FAQ + INPUT */}
        <View style={styles.footerContainer}>
            
            {/* Permanent Quick Questions */}
            <View style={styles.faqContainer}>
                <Text style={styles.faqLabel}>Quick Ask:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.faqScroll}>
                    {FAQS.map((faq, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.faqChip}
                            onPress={() => handleSend(faq)}
                        >
                            <Text style={styles.faqText}>{faq}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Input Bar */}
            <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask about products, repairs..."
                        placeholderTextColor="#999"
                        value={input}
                        onChangeText={setInput}
                        onSubmitEditing={() => handleSend()}
                        returnKeyType="send"
                    />
                    <TouchableOpacity 
                        style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} 
                        onPress={() => handleSend()}
                        disabled={!input.trim()}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==========================
// STYLES
// ==========================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    // ANDROID FIX: Ensure Status Bar doesn't overlap Header
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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
    zIndex: 10,
  },
  backButton: { padding: 8 },
  headerActionBtn: { padding: 8, backgroundColor: "#f0f9f4", borderRadius: 20 },
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
  bubble: {
    maxWidth: "80%", padding: 14, borderRadius: 20, elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  bubbleBot: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: BRAND_COLOR, borderBottomRightRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22 },
  textBot: { color: "#333" },
  textUser: { color: "#fff" },
  
  typingContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 42, marginBottom: 10 },
  typingText: { fontSize: 12, color: '#888', marginLeft: 6 },

  footerContainer: {
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
  },
  faqContainer: {
      paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#fff', 
  },
  faqLabel: {
      fontSize: 12, fontWeight: '700', color: '#999', marginBottom: 8, textTransform: 'uppercase'
  },
  faqScroll: { flexGrow: 0 },
  faqChip: {
      backgroundColor: '#f5f7fa', paddingVertical: 8, paddingHorizontal: 14,
      borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#e1e4e8',
  },
  faqText: { color: '#555', fontSize: 13, fontWeight: '600' },

  inputWrapper: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 4 },
  inputContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#f8f8f8",
    borderRadius: 30, paddingHorizontal: 6, paddingVertical: 6,
    borderWidth: 1, borderColor: "#eee",
  },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, color: "#333", maxHeight: 100 },
  sendButton: {
    backgroundColor: BRAND_COLOR, width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginLeft: 6,
  },
  sendButtonDisabled: { backgroundColor: "#ccc" }
});