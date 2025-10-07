import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Profile() {
  const [username, setUsername] = useState("Marc123");
  const [name, setName] = useState("Marc Enrico Valencia");
  const [email, setEmail] = useState("marcy143@jemeyl.com");
  const [phone, setPhone] = useState("(+63) 9123 456 7890");
  const [address, setAddress] = useState("Sitio Teteng Madagul, Brgy. Maliwalo, Tarlac City, Tarlac.");
  const [password, setPassword] = useState("***************");

  const handleSave = () => {
    console.log({
      username,
      name,
      email,
      phone,
      address,
      password,
    });
    alert("Profile saved successfully!");
  };

  return (
    <View style={styles.container}>
      {/* Whole profile inside white card */}
      <View style={styles.card}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Ionicons name="person-circle-outline" size={100} color="#000" />
        </View>

        {/* Name */}
        <Text style={styles.name}>{name.toUpperCase()}</Text>

        {/* Editable Fields */}
        <Text style={styles.label}>USERNAME:</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} />

        <Text style={styles.label}>NAME:</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>EMAIL:</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} />

        <Text style={styles.label}>PHONE NUMBER:</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

        <Text style={styles.label}>ADDRESS:</Text>
        <TextInput
          style={[styles.input, { textAlignVertical: "top" }]}
          value={address}
          onChangeText={setAddress}
          multiline
        />

        <Text style={styles.label}>PASSWORD:</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.changeBtn}>
            <Text style={styles.changeText}>CHANGE</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button just below password row */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>SAVE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7ef",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    flex: 1,
    width: "100%",
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 10,
    elevation: 3,
  },
  avatar: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 5,
  },
  name: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 15,
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
    color: "#444",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 4,
    fontSize: 14,
    color: "#333",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeBtn: {
    backgroundColor: "#d9e6dd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    marginLeft: 8,
  },
  changeText: {
    fontSize: 12,
    color: "#333",
  },
  saveBtn: {
    backgroundColor: "#3d6e57",
    paddingVertical: 8,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignSelf: "flex-end", 
    marginTop: 10,
  },
  saveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
});
