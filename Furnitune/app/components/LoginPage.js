import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

// Firebase imports
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";

// ✅ Configure Google Sign-In
GoogleSignin.configure({
  webClientId:
    "533053483607-issfugnm64h8blv9qcmub99cru2784ku.apps.googleusercontent.com",
});

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // ----------------- Email/Password Sign-in -----------------
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        Alert.alert(
          "Email not verified",
          "Please verify your email first by clicking the link sent to your inbox."
        );
        await auth.signOut();
        return;
      }

      Alert.alert("Login successful!");
      navigation.navigate("Landing");
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Login failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
  if (!email) {
    navigation.navigate("ForgotPassword");
    return;
  }

  try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Password Reset Email Sent",
        "Check your inbox for a password reset link."
      );
    } catch (error) {
      console.error("Forgot Password Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  // ----------------- Google Sign-In -----------------
  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();

      // Let user select their Google account
      await GoogleSignin.signIn();

      // ✅ Get the ID token
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        throw new Error("No ID token returned from Google Sign-In.");
      }

      // ✅ Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // ✅ Sign in to Firebase with that credential
      const userCredential = await signInWithCredential(auth, googleCredential);

      // ✅ Get the logged-in user's data from Firebase
      const currentUser = userCredential.user;

      // ✅ Save user info in Firestore (first-time only)
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          await setDoc(userDocRef, {
            name: currentUser.displayName || "Anonymous",
            email: currentUser.email || "",
            photo: currentUser.photoURL || "",
            uid: currentUser.uid,
          });
        }
      }
      navigation.navigate("Landing");
    } catch (error) {
      console.error("Google Sign-In Error:", error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert("Sign-In cancelled");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert("Sign-In in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Play services not available");
      } else {
        Alert.alert("Sign-In Failed", error.message);
      }
    }
  };

  // ----------------- Google Sign-Out -----------------
  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      Alert.alert("Signed out successfully");
    } catch (error) {
      console.error("Sign-Out Error:", error);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/loginbg.png")}
      style={styles.container}
      resizeMode="cover"
    >
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
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        

        <View style={styles.rememberForgotContainer}>
          {/* Remember Me */}
          <View style={styles.rememberSection}>
            <Checkbox
              value={rememberMe}
              onValueChange={setRememberMe}
              color={rememberMe ? "#245c4f" : undefined}
              style={styles.checkbox}
            />
            <Text style={styles.rememberText}>Remember Me</Text>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginText}>
            {loading ? "Logging in..." : "LOG IN"}
          </Text>
        </TouchableOpacity>

        <View style={styles.socialRow}>
          {/* ✅ Google Sign-In button */}
          <TouchableOpacity style={styles.socialIcon} onPress={signIn}>
            <Ionicons name="logo-google" size={24} color="#DB4437" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("SignupScreen")}>
          <Text style={styles.signup}>
            Don’t have an account?{" "}
            <Text style={styles.signupLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity> 

        {/* 👇 Browse Button (new) */}
        <TouchableOpacity onPress={() => navigation.navigate("Landing")}>
          <Text style={styles.browse}>
            Just want to explore?{" "}
            <Text style={styles.browseLink}>Browse</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

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
  rememberForgotContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  paddingHorizontal: 15,
  marginBottom: 20,
},

rememberSection: {
  flexDirection: "row",
  alignItems: "center",
},

forgotText: {
  color: "#fff",
  fontSize: 13,
  textDecorationLine: "underline",
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
  browse: {
    color: "#fff",
    fontSize: 13,
    marginTop: 10,
  },
  browseLink: {
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  checkbox: {
    borderColor: "#fff",
  },
});
