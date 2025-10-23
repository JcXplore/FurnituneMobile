import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth, onAuthStateChanged, updatePassword } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { app } from "./firebaseConfig";

export default function Profile({ navigation }) {
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [focused, setFocused] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadProfile(firebaseUser.uid);
      } else {
        navigation.navigate("LoginPage");
      }
    });
    return unsubscribe;
  }, []);

  const loadProfile = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUsername(data.username || "");
        setName(data.name || auth.currentUser?.displayName || "");
        setEmail(data.email || auth.currentUser?.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
      } else {
        await setDoc(userRef, {
          name: auth.currentUser.displayName || "",
          email: auth.currentUser.email || "",
          username: "",
          phone: "",
          address: "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Could not load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        username,
        name,
        phone,
        address,
        updatedAt: new Date(),
      });
      setEditMode(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    try {
      setChanging(true);
      await updatePassword(user, newPassword);
      setShowPasswordModal(false);
      setNewPassword("");
      Alert.alert("Success", "Password updated!");
    } catch (err) {
      console.error("Error updating password:", err);
      Alert.alert(
        "Error",
        "Unable to update password. Please log in again and try."
      );
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3d6e57" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          {/* Header with Edit Toggle */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity
              onPress={() =>
                editMode ? handleSave() : setEditMode(true)
              }
              style={styles.editToggle}
            >
              <Ionicons
                name={editMode ? "save-outline" : "create-outline"}
                size={22}
                color="#3d6e57"
              />
              <Text style={styles.editToggleText}>
                {editMode ? (saving ? "Saving..." : "Save") : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <View style={styles.avatar}>
            {user?.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={100} color="#000" />
            )}
          </View>

          <Text style={styles.name}>{name?.toUpperCase()}</Text>

          {/* Info Fields */}
          <ProfileField
            label="USERNAME"
            value={username}
            setValue={setUsername}
            editable={editMode}
            focused={focused}
            setFocused={setFocused}
            field="username"
          />
          <ProfileField
            label="NAME"
            value={name}
            setValue={setName}
            editable={editMode}
            focused={focused}
            setFocused={setFocused}
            field="name"
          />
          <ProfileField label="EMAIL" value={email} editable={false} />
          <ProfileField
            label="PHONE NUMBER"
            value={phone}
            setValue={setPhone}
            editable={editMode}
            focused={focused}
            setFocused={setFocused}
            field="phone"
          />
          <ProfileField
            label="ADDRESS"
            value={address}
            setValue={setAddress}
            editable={editMode}
            multiline
            focused={focused}
            setFocused={setFocused}
            field="address"
          />

          {/* Password */}
          <Text style={styles.label}>PASSWORD:</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              secureTextEntry
              editable={false}
              value="***************"
            />
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => setShowPasswordModal(true)}
            >
              <Text style={styles.changeText}>CHANGE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              placeholder="Enter new password"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.modalInput}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={{ color: "#333", fontWeight: "bold" }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#3d6e57" }]}
                onPress={handleChangePassword}
                disabled={changing}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  {changing ? "UPDATING..." : "SAVE"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const ProfileField = ({
  label,
  value,
  setValue,
  editable = true,
  multiline = false,
  focused,
  setFocused,
  field,
}) => (
  <>
    <Text style={styles.label}>{label}:</Text>
    <TextInput
      style={[
        styles.input,
        {
          borderColor: focused === field ? "#3d6e57" : "#ddd",
          backgroundColor: editable ? "#fff" : "#f5f5f5",
        },
      ]}
      value={value}
      onChangeText={setValue}
      editable={editable}
      multiline={multiline}
      onFocus={() => setFocused(field)}
      onBlur={() => setFocused(null)}
    />
  </>
);

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#faf7ef",
  },
  card: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 15,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2f4036",
  },
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#eaf2eb",
    borderRadius: 8,
  },
  editToggleText: {
    color: "#3d6e57",
    fontWeight: "bold",
  },
  avatar: {
    alignItems: "center",
    marginBottom: 5,
  },
  name: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 20,
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
    color: "#444",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#333",
    marginTop: 4,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeBtn: {
    backgroundColor: "#d9e6dd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  changeText: {
    fontSize: 12,
    color: "#333",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2c3e50",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#333",
    marginBottom: 15,
  },
  modalBtns: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
