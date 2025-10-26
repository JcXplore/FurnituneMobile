import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from "react-native";
import { auth } from "./firebaseConfig";
import { sendEmailVerification } from "firebase/auth";

export default function EmailVerification({ navigation }) {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        setVerified(true);
        clearInterval(interval);
      }
    }, 4000); // Check every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const resendVerificationEmail = async () => {
    try {
      setLoading(true);
      await sendEmailVerification(auth.currentUser);
      Alert.alert("Verification email sent!", "Please check your inbox again.");
    } catch (error) {
      console.error("Resend error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.replace("LoginPage");
  };

  return (
    <ImageBackground
      source={require("../assets/loginbg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {!verified ? (
          <>
            <Text style={styles.title}>VERIFY YOUR EMAIL</Text>
            <Text style={styles.subtitle}>
              A verification link has been sent to{" "}
              <Text style={{ fontWeight: "bold" }}>
                {auth.currentUser?.email}
              </Text>
            </Text>
            <Text style={styles.note}>
              Please check your inbox or spam folder and click the link to verify
              your email.
            </Text>

            <TouchableOpacity
              style={styles.resendBtn}
              onPress={resendVerificationEmail}
              disabled={loading}
            >
              <Text style={styles.resendText}>
                {loading ? "Sending..." : "RESEND EMAIL"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>✅ EMAIL VERIFIED!</Text>
            <Text style={styles.subtitle}>You can now log in to your account.</Text>
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
              <Text style={styles.continueText}>CONTINUE TO LOGIN</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 10,
    letterSpacing: 2,
    textAlign: "center",
  },
  subtitle: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  note: {
    color: "#ddd",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  resendBtn: {
    backgroundColor: "#245c4f",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  resendText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  continueBtn: {
    backgroundColor: "#245c4f",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  continueText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
