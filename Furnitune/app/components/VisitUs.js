import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
  StatusBar,
  Platform
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function VisitUs() {
  
  const openGoogleMaps = () => {
    const latitude = 15.3266219;
    const longitude = 120.6616784;
    const label = "Furnitune Showroom";
    const url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          );
        }
      })
      .catch(() => Alert.alert("Error", "Unable to open Google Maps"));
  };

  const handleCall = () => Linking.openURL(`tel:+639650934957`);
  const handleEmail = () => Linking.openURL(`mailto:furnitunecp@gmail.com`);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 1. Immersive Hero Section */}
      <ImageBackground
        source={require("../assets/cpn.jpeg")} // Ensure this path is correct
        style={styles.heroImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.safeHeader}>
            <Text style={styles.heroTitle}>Visit Our Showroom</Text>
            <View style={styles.badge}>
              <Ionicons name="ribbon-outline" size={14} color="#fff" />
              <Text style={styles.badgeText}>Official Store</Text>
            </View>
          </SafeAreaView>
        </View>
      </ImageBackground>

      {/* 2. Content Sheet (Slides over the image) */}
      <ScrollView 
        style={styles.sheetContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        
        {/* Address & Map Action */}
        <View style={styles.section}>
          <Text style={styles.label}>LOCATION</Text>
          <Text style={styles.addressText}>
            Cristobal St., Brgy. San Jose, Concepcion, Tarlac, Philippines
          </Text>
          
          <TouchableOpacity 
            style={styles.primaryButton} 
            activeOpacity={0.8} 
            onPress={openGoogleMaps}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Operating Hours */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.label}>OPENING HOURS</Text>
              <Text style={styles.mainText}>Mon – Sat</Text>
            </View>
            <View style={styles.hoursBox}>
              <Text style={styles.hoursText}>9:00 AM – 5:00 PM</Text>
            </View>
          </View>
          <Text style={styles.subText}>Closed on Sundays</Text>
        </View>

        <View style={styles.divider} />

        {/* Quick Actions (Contact) */}
        <View style={styles.section}>
          <Text style={styles.label}>CONTACT US</Text>
          <View style={styles.contactRow}>
            
            <TouchableOpacity style={styles.actionCard} onPress={handleCall}>
              <View style={[styles.iconCircle, { backgroundColor: "#e8f5e9" }]}>
                <Ionicons name="call" size={24} color="#2c6e49" />
              </View>
              <Text style={styles.actionTitle}>Call Us</Text>
              <Text style={styles.actionSub}>+63 965 093 4957</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleEmail}>
              <View style={[styles.iconCircle, { backgroundColor: "#e3f2fd" }]}>
                <Ionicons name="mail" size={24} color="#1565c0" />
              </View>
              <Text style={styles.actionTitle}>Email Us</Text>
              <Text style={styles.actionSub}>Send an inquiry</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Brand Message */}
        <View style={styles.brandSection}>
          <Ionicons name="leaf-outline" size={32} color="#1B3D36" style={{marginBottom:10}} />
          <Text style={styles.brandText}>
            Experience the beauty of true craftsmanship.{"\n"}
            Designed for warmth, comfort, and sophistication.
          </Text>
          <Text style={styles.brandSignature}>— The Furnitune Team</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  
  /* Hero Section */
  heroImage: {
    width: width,
    height: 380, // Tall image for immersive feel
    justifyContent: "flex-start",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)", // Darken image slightly for text readbility
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  safeHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    width: "70%",
    lineHeight: 40,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },

  /* Content Sheet */
  sheetContainer: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -60, // Pulls the sheet UP over the image
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
  },

  /* General Styles */
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    color: "#888",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 20,
    color: "#1B3D36",
    fontWeight: "600",
    lineHeight: 28,
    marginBottom: 16,
  },
  subText: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginBottom: 24,
  },

  /* Buttons */
  primaryButton: {
    backgroundColor: "#1B3D36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#1B3D36",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  /* Hours Section */
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  hoursBox: {
    backgroundColor: "#f3f2ee",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hoursText: {
    color: "#2c6e49",
    fontWeight: "700",
    fontSize: 14,
  },

  /* Quick Actions */
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 12,
    color: "#666",
  },

  /* Footer Brand */
  brandSection: {
    alignItems: "center",
    marginTop: 10,
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
  },
  brandText: {
    textAlign: "center",
    color: "#555",
    fontSize: 14,
    lineHeight: 22,
    fontStyle: "italic",
  },
  brandSignature: {
    marginTop: 10,
    fontWeight: "700",
    color: "#1B3D36",
  }
});