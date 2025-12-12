import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Alert,
  Text,
  StyleSheet,
  Dimensions
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

const { width } = Dimensions.get("window");

export default function BottomTabs() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const [activeTab, setActiveTab] = useState("home");
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔹 Auth Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribeAuth;
  }, []);

  // 🔹 Notification Listener
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const userDocRef = doc(db, "users", user.uid);
    const notificationsRef = collection(userDocRef, "notifications");

    const unsubscribe = onSnapshot(notificationsRef, (snapshot) => {
      const unread = snapshot.docs.filter((doc) => !doc.data().read).length;
      setUnreadCount(unread);
    });
    return unsubscribe;
  }, [user]);

  // 🔹 Track Active Route
  useFocusEffect(
    useCallback(() => {
      const rName = route.name;
      if (rName === "Landing") setActiveTab("home");
      else if (rName === "CartPage") setActiveTab("cart");
      else if (rName === "NotificationPage") setActiveTab("notifications");
      else if (["LoginPage", "Settings", "Profile"].includes(rName)) setActiveTab("user");
      else if (
        ["CustomizationPage", "Repair", "RecommenderPage", "ChatbotPage"].includes(rName)
      )
        setActiveTab("robot");
    }, [route.name])
  );

  // 🔹 Navigation Handler
  const handlePress = (tab, routeName) => {
    if (tab !== "robot") setShowSubMenu(false);

    const restricted = ["CartPage", "NotificationPage", "Settings"];
    if (!user && restricted.includes(routeName)) {
      Alert.alert("Login Required", "Please log in to access this feature.");
      navigation.navigate("LoginPage");
      return;
    }

    if (tab === "robot") {
      setShowSubMenu((prev) => !prev);
      setActiveTab("robot");
      return;
    }

    setActiveTab(tab);
    if (routeName) navigation.navigate(routeName);
  };

  const handleDismiss = () => setShowSubMenu(false);

  return (
    <>
      {/* 🪟 Transparent Overlay to dismiss submenu */}
      {showSubMenu && (
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      {/* 🚀 AI Submenu Bubble (Stays the same) */}
      {showSubMenu && (
        <View style={[styles.subMenuContainer, { bottom: insets.bottom + 60 }]}>
          <SubMenuItem 
            icon={<Ionicons name="settings" size={20} color="#fff" />} 
            label="Custom"
            onPress={() => { handleDismiss(); navigation.navigate("CustomizationPage"); }} 
          />
          <SubMenuItem 
            icon={<MaterialCommunityIcons name="robot" size={22} color="#fff" />} 
            label="Chat"
            onPress={() => { handleDismiss(); navigation.navigate("ChatbotPage"); }} 
          />
          <SubMenuItem 
            icon={<Ionicons name="sparkles" size={20} color="#fff" />} 
            label="Suggest"
            onPress={() => { handleDismiss(); navigation.navigate("RecommenderPage"); }} 
          />
          <SubMenuItem 
            icon={<FontAwesome5 name="tools" size={16} color="#fff" />} 
            label="Repair"
            onPress={() => { handleDismiss(); navigation.navigate("Repair"); }} 
          />
          <View style={styles.menuArrow} />
        </View>
      )}

      {/* 🧭 Main Bottom Bar */}
      <View style={[styles.barContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 15 }]}>
        
        {/* 1. Home */}
        <TabItem 
          isActive={activeTab === "home"} 
          icon="home" 
          onPress={() => handlePress("home", "Landing")} 
        />

        {/* 2. Cart */}
        <TabItem 
          isActive={activeTab === "cart"} 
          icon="cart" 
          onPress={() => handlePress("cart", "CartPage")} 
        />

        {/* 3. CENTER ROBOT (STANDS OUT with Background Color) */}
        <TouchableOpacity 
          activeOpacity={0.9}
          style={styles.centerActionWrapper} // Just a wrapper for alignment
          onPress={() => handlePress("robot")}
        >
          <View style={[
            styles.standOutButton, 
            // Optional: Change color slightly if menu is open
            showSubMenu && { backgroundColor: "#1B3D36" } 
          ]}>
            <MaterialCommunityIcons 
              name="robot" 
              size={24} 
              color="#fff" // Icon is always white
            />
          </View>
        </TouchableOpacity>

        {/* 4. Notifications */}
        <TabItem 
          isActive={activeTab === "notifications"} 
          icon="notifications" 
          badgeCount={unreadCount}
          onPress={() => handlePress("notifications", "NotificationPage")} 
        />

        {/* 5. User Profile */}
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => handlePress("user", user ? "Settings" : "LoginPage")}
        >
          {user && user.photoURL ? (
            <Image
              source={{ uri: user.photoURL }}
              style={[styles.avatar, activeTab === "user" && styles.avatarActive]}
            />
          ) : (
            <Ionicons
              name={activeTab === "user" ? "person" : "person-outline"}
              size={26}
              color={activeTab === "user" ? "#2c6e49" : "#999"}
            />
          )}
        </TouchableOpacity>

      </View>
    </>
  );
}

// 📦 Helper Component: Standard Tab Item
const TabItem = ({ isActive, icon, onPress, badgeCount }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    <View>
      <Ionicons
        name={isActive ? icon : `${icon}-outline`}
        size={26}
        color={isActive ? "#2c6e49" : "#999"}
      />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 9 ? "9+" : badgeCount}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

// 📦 Helper Component: Submenu Item
const SubMenuItem = ({ icon, onPress, label }) => (
  <TouchableOpacity style={styles.subMenuItem} onPress={onPress}>
    <View style={styles.subMenuIconCircle}>{icon}</View>
    <Text style={styles.subMenuLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "transparent",
  },
  barContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    elevation: 0,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    width: 40,
  },
  
  // 🟢 NEW: Styles to make the bot stand out inline
  centerActionWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: 40, 
    width: 40,
  },
  standOutButton: {
    width: 42, // Same size as touch target essentially
    height: 42,
    borderRadius: 21, // Circle
    backgroundColor: "#2c6e49", // Brand Green Background
    alignItems: "center",
    justifyContent: "center",
    elevation: 4, // Subtle shadow
    shadowColor: "#2c6e49",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  /* 🔴 Notification Badge */
  badge: {
    position: "absolute",
    right: -6,
    top: -5,
    backgroundColor: "#FF5252",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },

  /* 🤖 Submenu Bubble */
  subMenuContainer: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#1B3D36", 
    borderRadius: 12,
    flexDirection: "row",
    padding: 12,
    gap: 20, 
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 1000,
  },
  subMenuItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  subMenuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  subMenuLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  menuArrow: {
    position: "absolute",
    bottom: -8,
    left: "50%",
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#1B3D36", 
  },

  /* 👤 Avatar */
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  avatarActive: {
    borderColor: "#2c6e49",
    borderWidth: 2,
  },
});