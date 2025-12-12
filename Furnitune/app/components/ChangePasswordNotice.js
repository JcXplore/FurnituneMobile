// ChangePasswordNotice.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ChangePasswordNotice({ navigation }) {
  return (
    <View style={styles.container}>
      <Ionicons name="mail-outline" size={70} color="#2c6e49" />
      <Text style={styles.title}>Password Reset Email Sent</Text>
      <Text style={styles.message}>
        Please check your email inbox and follow the instructions to reset your password.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("LoginPage")}
      >
        <Text style={styles.buttonText}>Return to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#faf7ef",
    padding: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c6e49",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#2c6e49",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
