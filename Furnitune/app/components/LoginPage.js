import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ImageBackground, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import {
  signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const IS_EXPO_GO = Constants.appOwnership === "expo";

// 🔒 Hard-force Expo proxy redirect in dev
// Make sure this exact URL is added in your Google Cloud Web OAuth client
// (Authorized redirect URIs) AND in Firebase Auth → Authorized domains.
const EXPO_REDIRECT = "https://auth.expo.io/@furnitune/Furnitune-Mobile";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google Auth request — force proxy + fixed redirect
  const [request, response, promptAsync] = Google.useAuthRequest({
    // Use your WEB OAuth client ID here
    expoClientId:
      "533053483607-issfugnm64h8blv9qcmub99cru2784ku.apps.googleusercontent.com",
    androidClientId:
      "533053483607-gap2cdujij5sp6au8tqhjbes6clrojgn.apps.googleusercontent.com",
    // iosClientId: "<YOUR
    // Disable native flow while debugging the proxy to avoid exp:// redirects
    // androidClientId: "533053483607-gap2cdujij5sp6au8tqhjbes6clrojgn.apps.googleusercontent.com",

    responseType: "id_token",
    scopes: ["openid", "profile", "email"],
    redirectUri: EXPO_REDIRECT, // ✅ fixed https://auth.expo.io/... URL
  });

  useEffect(() => {
    console.log("Google redirectUri:", EXPO_REDIRECT);
  }, []);

  /* ---------------- Email/password ---------------- */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email || email,
          photo: user.photoURL || "",
          createdAt: new Date(),
        });
      }
      navigation.replace("HomeScreen", {
        userData: { uid: user.uid, email: user.email, ...(snap.data() || {}) },
      });
    } catch (e) {
      console.error("Login Error:", e);
      Alert.alert("Login Failed", e?.message ?? "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Google sign-in (Expo proxy) ---------------- */
  const handleGoogleLogin = async () => {
    try {
      // Force proxy here too
      const res = await promptAsync({ useProxy: true, showInRecents: true });

      if (res?.type !== "success") {
        Alert.alert("Google Sign-in cancelled");
        return;
      }

      // Prefer id_token; fallback to access token if needed
      const idToken = res.authentication?.idToken || res.params?.id_token;
      const accessToken = res.authentication?.accessToken || res.params?.access_token;

      if (!idToken && !accessToken) {
        Alert.alert("Google Sign-in Error", "No token returned from Google.");
        return;
      }

      const cred = GoogleAuthProvider.credential(idToken || null, accessToken || null);
      const { user } = await signInWithCredential(auth, cred);

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email || "",
          photo: user.photoURL || "",
          createdAt: new Date(),
        });
      }

      navigation.replace("HomeScreen", { userData: { uid: user.uid, email: user.email } });
    } catch (e) {
      console.error("Google Sign-in Error:", e);
      Alert.alert("Error", e?.message ?? "Failed to sign in with Google.");
    }
  };

  return (
    <ImageBackground source={require("../assets/loginbg.png")} style={styles.container} resizeMode="cover">
      <View style={styles.overlay}>
        <Text style={styles.welcome}>WELCOME!</Text>
        <Text style={styles.title}>FURNITUNE</Text>

        <Text style={styles.label}>Email:</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password:</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.rememberContainer}>
          <Checkbox value={rememberMe} onValueChange={setRememberMe} color={rememberMe ? "#245c4f" : undefined} style={styles.checkbox} />
          <Text style={styles.rememberText}>Remember Me</Text>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.loginText}>{loading ? "Logging in..." : "LOG IN"}</Text>
        </TouchableOpacity>

        <View style={styles.socialRow}>
          <TouchableOpacity style={[styles.socialIcon, !request && { opacity: 0.5 }]} onPress={handleGoogleLogin} disabled={!request}>
            <Ionicons name="logo-google" size={24} color="#DB4437" />
          </TouchableOpacity>
          <View style={styles.socialIcon}><Ionicons name="logo-facebook" size={24} color="#3b5998" /></View>
          <View style={styles.socialIcon}><Ionicons name="logo-apple" size={24} color="black" /></View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("SignupScreen")}>
          <Text style={styles.signup}>Don’t have an account? <Text style={styles.signupLink}>Sign Up</Text></Text>
        </TouchableOpacity>

        {/* Helpful for debugging: shows the exact redirect being used */}
        <Text style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
          Redirect: {EXPO_REDIRECT}
        </Text>
      </View>
    </ImageBackground>
  );
};

/* ------------------ Styles ------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "120%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  welcome: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 5,
    letterSpacing: 2,
  },
  title: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 30,
    letterSpacing: 5,
  },
  label: {
    color: "#fff",
    alignSelf: "flex-start",
    marginBottom: 5,
    marginLeft: 15,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 15,
    width: "100%",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    marginBottom: 15,
    width: "100%",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 14,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: 15,
    marginBottom: 20,
  },
  rememberText: {
    color: "#fff",
    fontSize: 13,
    marginLeft: 5,
  },
  loginBtn: {
    backgroundColor: "#245c4f",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "70%",
    marginBottom: 20,
  },
  socialIcon: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  signup: {
    color: "#fff",
    fontSize: 13,
  },
  signupLink: {
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  checkbox: {
    borderColor: "#fff",
  },
});
