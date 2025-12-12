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
  sendPasswordResetEmail,
  sendEmailVerification, // ✅ Added for verification resend
} from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"; // ✅ Added updateDoc

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

  // ----------------- Forgot Password -----------------
  // ✅ Restored this function so the error disappears
  const handleForgotPassword = async () => {
    // If no email entered, just go to the screen
    if (!email) {
      navigation.navigate("ForgotPassword");
      return;
    }

    // If email is entered, try to send the reset link directly
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

  // ----------------- Email/Password Sign-in -----------------
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    try {
      setLoading(true);

      // 1. Sign In
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      let user = userCredential.user;

      // 🔄 RELOAD USER: Checks if they just clicked the verification link
      await user.reload();
      user = auth.currentUser; 

      // 2. Check Verification Status
      if (!user.emailVerified) {
        Alert.alert(
          "Email Not Verified",
          "You must verify your email before logging in. Check your inbox.",
          [
            {
              text: "Resend Email",
              onPress: async () => {
                try {
                  await sendEmailVerification(user);
                  Alert.alert("Sent!", "A new verification email has been sent.");
                } catch (err) {
                  Alert.alert("Error", "Too many requests. Please wait a moment.");
                }
              }
            },
            { 
              text: "OK", 
              style: "cancel",
              onPress: async () => {
                 await auth.signOut(); 
              }
            }
          ]
        );
        return; 
      }

      // 3. ✅ SYNC TO FIRESTORE
      // If Auth says "Verified" but Firestore says "false", update it now.
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.emailVerified === false) {
           console.log("Syncing email verification status to Firestore...");
           await updateDoc(userDocRef, {
             emailVerified: true,
             updatedAt: new Date()
           });
        }
      }

      Alert.alert("Success", "Login successful!");
      navigation.navigate("Landing");

    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Login Failed", "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Google Sign-In -----------------
  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        throw new Error("No ID token returned from Google Sign-In.");
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      const currentUser = userCredential.user;

      // 🛑 Check Verification for Google Users too
      if (!currentUser.emailVerified) {
         Alert.alert("Access Denied", "Your Google account email is not verified.");
         await auth.signOut();
         await GoogleSignin.signOut();
         return;
      }

      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          // 🔄 EXISTING USER: Update timestamp
          await updateDoc(userDocRef, {
            updatedAt: new Date(),
          });
        } else {
          // 🆕 NEW USER: Create with specific fields
          await setDoc(userDocRef, {
            createdAt: new Date(),
            email: currentUser.email || "",
            emailVerified: true,
            name: currentUser.displayName || "Anonymous",
            photo: currentUser.photoURL || "https://via.placeholder.com/150",
            provider: "google",
            role: "customer", 
            source: "mobile",
            uid: currentUser.uid,
            updatedAt: new Date(),
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
      } else {
        Alert.alert("Sign-In Failed", error.message);
      }
    }
  };

  // ----------------- UI RENDER -----------------
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
          <View style={styles.rememberSection}>
            <Checkbox
              value={rememberMe}
              onValueChange={setRememberMe}
              color={rememberMe ? "#245c4f" : undefined}
              style={styles.checkbox}
            />
            <Text style={styles.rememberText}>Remember Me</Text>
          </View>

          {/* ✅ This button calls the restored function */}
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