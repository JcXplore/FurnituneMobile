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
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { OPENROUTER_API_KEY, OPENROUTER_BASE_URL } from "@env";
import furnituneData from "../assets/furnituneInfo.json";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DEFAULT_FURNITUNE_INFO = `
Furnitune is an e-commerce platform for Santos Upholstery.
We sell ready-made furniture, support custom orders (dimensions, materials, and colors),
and offer repair services even for items not purchased from us.
`;

const FAQS = [
  "What are your business hours?",
  "Do you accept furniture repair requests?",
  "How can I customize my furniture order?",
  "What payment methods do you accept?",
  "Do you offer delivery tracking?",
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [furnituneInfo, setFurnituneInfo] = useState(DEFAULT_FURNITUNE_INFO);
  const scrollViewRef = useRef();
  const navigation = useNavigation();

  const [faqVisible, setFaqVisible] = useState(true);
  const faqAnim = useRef(new Animated.Value(1)).current;
  const recoAnim = useRef(new Animated.Value(1)).current; // control button width

  useEffect(() => {
    setFurnituneInfo(furnituneData.info || DEFAULT_FURNITUNE_INFO);
    setMessages([
      {
        sender: "bot",
        text: "👋 Hi there! I’m Furni, your personal furniture assistant. How can I help you today?",
      },
    ]);
  }, []);

  // 🚀 Send Message
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Animate FAQ fade and button shrink
    if (faqVisible) {
      Animated.parallel([
        Animated.timing(faqAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(recoAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start(() => setFaqVisible(false));
    }

    try {
      const response = await axios.post(
        OPENROUTER_BASE_URL,
        {
          model: "google/gemma-2-9b-it",
          messages: [
            {
              role: "system",
              content: `
You are Furni, the official chatbot for Furnitune — an e-commerce platform for Santos Upholstery.
Use ONLY the following business information to answer user questions:

${furnituneInfo}

If the user asks about something unrelated, reply:
"I'm sorry, I can only answer questions about Furnitune’s products, services, or policies."
              `,
            },
            { role: "user", content: input },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const botReply =
        response.data?.choices?.[0]?.message?.content?.trim?.() ||
        "Sorry, I didn’t catch that.";
      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Sorry, I’m having trouble reaching the server right now." },
      ]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 120);
    }
  };

  // Recommender button width transition
  const recoWidth = recoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH * 0.78, SCREEN_WIDTH - 40], // shrink when FAQ hides
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#faf7ef" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.messageBubble,
              msg.sender === "bot" ? styles.botBubble : styles.userBubble,
            ]}
          >
            <Text style={msg.sender === "bot" ? styles.botText : styles.userText}>
              {msg.text}
            </Text>
          </View>
        ))}
        {isTyping && (
          <View style={[styles.messageBubble, styles.botBubble]}>
            <ActivityIndicator size="small" color="#2c6e49" />
          </View>
        )}
      </ScrollView>

      {/* 🧠 FAQ Section */}
      <Animated.View
      style={[
        styles.faqContainer,
        {
          opacity: faqAnim,
          transform: [
            {
              translateY: faqAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      {faqVisible && (
        <>
          <Text style={styles.inlineFAQPrompt}>Quick Questions</Text>

          <View style={styles.faqCard}>
            {FAQS.map((faq, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.8}
                style={styles.faqItem}
                onPress={() => {
                  setInput(faq);
                  handleSend();
                }}
              >
                <Text style={styles.faqText}>{faq}</Text>
                <Ionicons name="chevron-forward" size={18} color="#2c6e49" />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </Animated.View>

      {/* 💬 Recommender + FAQ Buttons */}
      <View style={styles.recoContainer}>
        <Animated.View style={{ width: recoWidth }}>
          <TouchableOpacity
            style={styles.recoButton}
            onPress={() => navigation.navigate("RecommenderPage")}
          >
            <Ionicons name="sparkles-outline" size={20} color="#fff" />
            <Text style={styles.recoText}>Try our Recommender</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ❓ FAQ Button (only appears after FAQ hides) */}
        {!faqVisible && (
          <TouchableOpacity
            style={[styles.faqCircleButton]}
            onPress={() => {
              setFaqVisible(true);
              Animated.parallel([
                Animated.timing(faqAnim, {
                  toValue: 1,
                  duration: 350,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: true,
                }),
                Animated.timing(recoAnim, {
                  toValue: 1,
                  duration: 350,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: false,
                }),
              ]).start();
            }}
          >
            <Ionicons name="help-circle-outline" size={25} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask something about Furnitune..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  chatContainer: { flex: 1, paddingHorizontal: 12, marginTop: 10 },
  messageBubble: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    maxWidth: "85%",
  },
  botBubble: { backgroundColor: "#e5e5e5", alignSelf: "flex-start" },
  userBubble: { backgroundColor: "#2c6e49", alignSelf: "flex-end" },
  botText: { color: "#000" },
  userText: { color: "#fff" },

  faqContainer: {
  paddingHorizontal: 16,
  paddingTop: 10,
  paddingBottom: 5,
  backgroundColor: "#faf9f6",
  borderTopWidth: 1,
  borderColor: "#eeeeee",
},
inlineFAQPrompt: {
  textAlign: "center",
  fontWeight: "700",
  color: "#2c6e49",
  fontSize: 15,
  marginBottom: 10,
  letterSpacing: 0.5,
},
faqCard: {
  backgroundColor: "#fff",
  borderRadius: 14,
  paddingVertical: 4,
  paddingHorizontal: 8,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
},
faqItem: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#fff",
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#f2f2f2",
},
faqText: {
  fontSize: 14,
  color: "#333",
  flex: 1,
  marginRight: 8,
},


  recoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  recoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2c6e49",
    borderRadius: 30,
    paddingVertical: 12,
  },
  recoText: { color: "#fff", fontWeight: "600", marginLeft: 6, fontSize: 14 },
  faqCircleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#44624a",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#2c6e49",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
