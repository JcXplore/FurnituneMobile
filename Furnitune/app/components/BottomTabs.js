import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Alert,
  Text,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { collection, onSnapshot, doc } from "firebase/firestore";

export default function BottomTabs() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const [activeTab, setActiveTab] = useState("home");
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0); // 🔹 Notification count

  // ✅ Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribeAuth;
  }, []);

  // ✅ Real-time listener for user notifications
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const notificationsRef = collection(userDocRef, "notifications");

    // 🔁 Listen in real-time for unread notifications
    const unsubscribe = onSnapshot(notificationsRef, (snapshot) => {
      const unread = snapshot.docs.filter((doc) => !doc.data().read).length;
      setUnreadCount(unread);
    });

    return unsubscribe;
  }, [user]);

  // ✅ Track active route
  useFocusEffect(
    useCallback(() => {
      if (route.name === "Landing") setActiveTab("home");
      else if (route.name === "CartPage") setActiveTab("cart");
      else if (route.name === "NotificationPage") setActiveTab("notifications");
      else if (["LoginPage", "Settings"].includes(route.name))
        setActiveTab("user");
      else if (
        ["CustomizationPage", "Repair", "RecommenderPage", "ChatbotPage"].includes(
          route.name
        )
      )
        setActiveTab("robot");
    }, [route.name])
  );

  // ✅ Smart navigation handler
  const handlePress = (tab, routeName) => {
    setActiveTab(tab);
    setShowSubMenu(false);

    // 🚫 Restrict access if user is not logged in
    const restricted = ["CartPage", "NotificationPage", "Settings"];
    if (!user && restricted.includes(routeName)) {
      Alert.alert("Login Required", "Please log in to access this feature.");
      navigation.navigate("LoginPage");
      return;
    }

    if (tab === "robot") {
      setShowSubMenu((prev) => !prev);
      return;
    }

    if (routeName) navigation.navigate(routeName);
  };

  const handleDismiss = () => setShowSubMenu(false);

  return (
    <>
      {/* 🪟 Dismiss overlay */}
      {showSubMenu && (
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "transparent",
            }}
          />
        </TouchableWithoutFeedback>
      )}

      {/* 🧭 Bottom Navigation */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-evenly",
          alignItems: "center",
          paddingVertical: 10,
          paddingBottom: insets.bottom,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderColor: "#ccc",
        }}
      >
        {/* 🏠 Home */}
        <TouchableOpacity onPress={() => handlePress("home", "Landing")}>
          <Ionicons
            name="home-outline"
            size={26}
            color={activeTab === "home" ? "#2c6e49" : "black"}
          />
        </TouchableOpacity>

        <Divider />

        {/* 🛒 Cart */}
        <TouchableOpacity onPress={() => handlePress("cart", "CartPage")}>
          <Ionicons
            name="cart-outline"
            size={26}
            color={activeTab === "cart" ? "#2c6e49" : "black"}
          />
        </TouchableOpacity>

        <Divider />

        {/* 🤖 AI Submenu */}
        <View style={{ alignItems: "center" }}>
          {showSubMenu && (
            <View
              style={{
                position: "absolute",
                bottom: 55,
                flexDirection: "row",
                backgroundColor: "#fff",
                borderRadius: 20,
                paddingVertical: 8,
                paddingHorizontal: 12,
                elevation: 5,
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 5,
                justifyContent: "space-between",
                width: 240, // ✅ wider for 4 icons
              }}
            >
              {/* ⚙️ Customization */}
              <TouchableOpacity
                onPress={() => {
                  setShowSubMenu(false);
                  navigation.navigate("CustomizationPage");
                }}
              >
                <Ionicons name="settings" size={24} color="#2c6e49" />
              </TouchableOpacity>

              {/* 🤖 Chatbot */}
              <TouchableOpacity
                onPress={() => {
                  setShowSubMenu(false);
                  navigation.navigate("ChatbotPage");
                }}
              >
                <MaterialCommunityIcons
                  name="robot"
                  size={28}
                  color="#2c6e49"
                />
              </TouchableOpacity>

              {/* ⭐ Recommender System (NEW) */}
              <TouchableOpacity
                onPress={() => {
                  setShowSubMenu(false);
                  navigation.navigate("RecommenderPage");
                }}
              >
                <Ionicons name="sparkles" size={26} color="#2c6e49" />
              </TouchableOpacity>

              {/* 🛠️ Repair */}
              <TouchableOpacity
                onPress={() => {
                  setShowSubMenu(false);
                  navigation.navigate("Repair");
                }}
              >
                <FontAwesome5 name="tools" size={22} color="#2c6e49" />
              </TouchableOpacity>

              
            </View>
          )}

          {/* 🤖 Main Robot Icon */}
          <TouchableOpacity onPress={() => handlePress("robot")}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={30}
              color={activeTab === "robot" ? "#2c6e49" : "black"}
            />
          </TouchableOpacity>
        </View>

        <Divider />

        {/* 🔔 Notifications (with badge) */}
        <TouchableOpacity
          style={{ position: "relative" }}
          onPress={() => handlePress("notifications", "NotificationPage")}
        >
          <Ionicons
            name="notifications-outline"
            size={26}
            color={activeTab === "notifications" ? "#2c6e49" : "black"}
          />
          {unreadCount > 0 && (
            <View
              style={{
                position: "absolute",
                right: -6,
                top: -4,
                backgroundColor: "#d9534f",
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 4,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 10,
                  fontWeight: "bold",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Divider />

        {/* 👤 Profile / Login */}
        <TouchableOpacity
          onPress={() =>
            handlePress("user", user ? "Settings" : "LoginPage")
          }
        >
          {user && user.photoURL ? (
            <Image
              source={{ uri: user.photoURL }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 16,
                borderWidth: activeTab === "user" ? 2 : 0,
                borderColor: "#2c6e49",
              }}
            />
          ) : (
            <Ionicons
              name="person-circle-outline"
              size={28}
              color={activeTab === "user" ? "#2c6e49" : "black"}
            />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

// 🔹 Divider Component
const Divider = () => (
  <View
    style={{
      height: 25,
      width: 1,
      backgroundColor: "#ccc",
      marginHorizontal: 8,
    }}
  />
);
