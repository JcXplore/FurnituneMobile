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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { app } from "./firebaseConfig";
import * as ImagePicker from "expo-image-picker";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
} from "firebase/storage";

export default function Profile({ navigation }) {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  // 🟢 Load user info
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

  // 🟢 Load profile from Firestore
  const loadProfile = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      let nameValue = auth.currentUser?.displayName || "";
      let emailValue = auth.currentUser?.email || "";
      let photoValue = auth.currentUser?.photoURL || "";

      if (snap.exists()) {
        const data = snap.data();
        nameValue = data.name || nameValue;
        emailValue = data.email || emailValue;
        photoValue = data.photo || photoValue;
      }

      setName(nameValue);
      setEmail(emailValue);
      setPhotoURL(photoValue);
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Could not load profile data.");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Change Profile Photo (auto-delete old)
  const handleChangeProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Allow photo access to change your profile image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploading(true);

      const imageUri = result.assets[0].uri;
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "Please log in first.");
        setUploading(false);
        return;
      }

      // 🧹 Delete old photos first
      const userFolderRef = ref(storage, `avatars/${currentUser.uid}`);
      const listResult = await listAll(userFolderRef);
      for (const fileRef of listResult.items) {
        await deleteObject(fileRef).catch(() => {});
      }

      // Upload new photo
      const filename = `avatars/${currentUser.uid}/${Date.now()}_profile.jpg`;
      const storageRef = ref(storage, filename);

      const response = await fetch(imageUri);
      const blob = await response.blob();
      const metadata = { contentType: blob.type || "image/jpeg" };

      await uploadBytes(storageRef, blob, metadata);
      const downloadURL = await getDownloadURL(storageRef);

      // ✅ Update Firestore user document
      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || "Unnamed User",
          photo: downloadURL,
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        Alert.alert("Success", "Profile photo added successfully!");
      } else {
        await setDoc(
          userRef,
          {
            photo: downloadURL,
            updatedAt: new Date(),
          },
          { merge: true }
        );
        Alert.alert("Success", "Profile photo updated successfully!");
      }

      // ✅ Update Firebase Auth profile photo
      await updateProfile(currentUser, { photoURL: downloadURL });

      setPhotoURL(downloadURL);
    } catch (err) {
      console.error("Error updating photo:", err);
      Alert.alert("Error", "Failed to update profile photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // 🟢 Handle Password Reset
  const handlePasswordReset = async () => {
    try {
      if (!email) {
        Alert.alert("Error", "No email associated with this account.");
        return;
      }
      await sendPasswordResetEmail(auth, email);
      navigation.replace("ChangePasswordNotice");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      Alert.alert("Error", "Could not send reset link. Please try again.");
    }
  };

  // 🟡 Loading states
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3d6e57" />
      </View>
    );
  }

  if (uploading) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#3d6e57" />
        <Text style={{ marginTop: 10, color: "#3d6e57", fontWeight: "600" }}>
          Uploading your photo...
        </Text>
      </View>
    );
  }

  // 🟢 Profile UI
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>My Profile</Text>
          </View>

          {/* Avatar */}
          <View style={styles.avatar}>
            <TouchableOpacity onPress={handleChangeProfilePhoto}>
              {photoURL ? (
                <Image
                  source={{ uri: photoURL }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              ) : (
                <Ionicons name="person-circle-outline" size={100} color="#000" />
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera-outline" size={22} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <Text style={styles.label}>NAME:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#f4f4f4" }]}
            value={name}
            editable={false}
          />

          <Text style={styles.label}>EMAIL:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#f4f4f4" }]}
            value={email}
            editable={false}
            keyboardType="email-address"
          />

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
              onPress={handlePasswordReset}
            >
              <Text style={styles.changeText}>CHANGE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2f4036",
  },
  avatar: {
    alignItems: "center",
    marginBottom: 10,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#3d6e57",
    borderRadius: 20,
    padding: 6,
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
    color: "#444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
});
