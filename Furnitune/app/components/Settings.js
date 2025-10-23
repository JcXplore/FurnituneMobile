import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

export default function Settings({ navigation }) {
  const handleLogout = async () => {
    try {
      // ✅ Firebase sign-out
      await signOut(auth);

      // ✅ Try to sign out from Google if available
      try {
        // Check if Google user info exists
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) {
          await GoogleSignin.signOut();
        }
      } catch (googleError) {
        console.log("Google sign-out skipped:", googleError.message);
      }

      Alert.alert("Logged out", "You have been successfully signed out.");

      // ✅ Reset navigation so user can't go back
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginPage" }],
      });
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>SETTINGS</Text>

      {/* Menu options */}
      <TouchableOpacity
        style={styles.option}
        onPress={() => navigation.navigate("Profile")}
      >
        <Ionicons name="person-circle-outline" size={30} color="#000" />
        <Text style={styles.optionText}>MY ACCOUNT</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => navigation.navigate("MyPurchases")}
      >
        <Ionicons name="cart-outline" size={30} color="#000" />
        <Text style={styles.optionText}>MY PURCHASES</Text>
      </TouchableOpacity>

      {/* ✅ LOGOUT button now works */}
      <TouchableOpacity style={styles.option} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={30} color="#000" />
        <Text style={styles.optionText}>LOGOUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 20,
    color: "#333",
    letterSpacing: 1,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 10,
    color: "#000",
  },
});
