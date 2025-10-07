// app/components/Settings.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function Settings({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>SETTINGS</Text>

      {/* Menu options */}
      <TouchableOpacity style={styles.option}  onPress={() => navigation.navigate("Profile")}>
        <Ionicons name="person-circle-outline" size={30} color="#000" />
        <Text style={styles.optionText}>MY ACCOUNT</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={() => navigation.navigate("MyPurchases")}>
        <Ionicons name="cart-outline" size={30} color="#000" />
        <Text style={styles.optionText}>MY PURCHASES</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option}>
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
