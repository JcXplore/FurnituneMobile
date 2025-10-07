import React, { useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import styles from "../styles/bottomStyle";

export default function BottomTabs() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState("home");
  const [showSubMenu, setShowSubMenu] = useState(false);

  // ✅ Automatically set active tab based on current screen
  useFocusEffect(
    useCallback(() => {
      if (route.name === "Landing") setActiveTab("home");
      else if (route.name === "CartPage") setActiveTab("cart");
      else if (route.name === "HomePage") setActiveTab("robot");
      else if (route.name === "NotificationPage") setActiveTab("notifications");
      else if (route.name === "LoginPage") setActiveTab("user");
      else if (route.name === "Customization") setActiveTab("robot");
      else if (route.name === "Repair") setActiveTab("robot");
    }, [route.name])
  );

  const handlePress = (tab, routeName) => {
    setActiveTab(tab);

    if (tab === "robot") {
      // toggle submenu instead of navigating immediately
      setShowSubMenu((prev) => !prev);
      return;
    }

    setShowSubMenu(false);
    if (routeName) navigation.navigate(routeName);
  };

  // ✅ When submenu is dismissed, sync active tab to current route
  const handleDismiss = () => {
    setShowSubMenu(false);

    // ensure active tab matches current screen
    if (route.name === "Landing") setActiveTab("home");
    else if (route.name === "CartPage") setActiveTab("cart");
    else if (route.name === "HomePage") setActiveTab("robot");
    else if (route.name === "NotificationPage") setActiveTab("notifications");
    else if (route.name === "LoginPage") setActiveTab("user");
    else setActiveTab("home");
  };

  return (
    <>
      {/* ✅ Transparent overlay to dismiss submenu */}
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

      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* ❤️ Home */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => handlePress("home", "Landing")}
        >
          <Ionicons
            name="home-outline"
            size={24}
            color={activeTab === "home" ? "#2c6e49" : "black"}
          />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 🛒 Cart */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => handlePress("cart", "CartPage")}
        >
          <Ionicons
            name="cart-outline"
            size={24}
            color={activeTab === "cart" ? "#2c6e49" : "black"}
          />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 🤖 AI */}
        <View style={{ alignItems: "center" }}>
          {showSubMenu && (
            <View
              style={{
                position: "absolute",
                bottom: 60,
                flexDirection: "row",
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 10,
                elevation: 5,
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 5,
                justifyContent: "space-around",
                width: 180,
              }}
            >
              {/* Customization */}
              <TouchableOpacity
                onPress={() => {
                  setShowSubMenu(false);
                  navigation.navigate("Customization");
                }}
              >
                <Ionicons name="settings-outline" size={24} color="#2c6e49" />
              </TouchableOpacity>

              {/* Chatbot (center) */}
              <TouchableOpacity
                onPress={() => {
                  setShowSubMenu(false);
                  navigation.navigate("HomePage");
                }}
              >
                <MaterialCommunityIcons name="robot" size={28} color="#2c6e49" />
              </TouchableOpacity>

              {/* Repair */}
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

          <TouchableOpacity
            style={styles.item}
            onPress={() => handlePress("robot")}
          >
            <MaterialCommunityIcons
              name="robot-outline"
              size={28}
              color={activeTab === "robot" ? "#2c6e49" : "black"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* 🔔 Notifications */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => handlePress("notifications", "NotificationPage")}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={activeTab === "notifications" ? "#2c6e49" : "black"}
          />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 👤 User */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => handlePress("user", "LoginPage")}
        >
          <Ionicons
            name="person-circle-outline"
            size={26}
            color={activeTab === "user" ? "#2c6e49" : "black"}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}
