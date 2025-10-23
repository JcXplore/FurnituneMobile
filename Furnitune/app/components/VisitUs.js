import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function VisitUs() {
  const openGoogleMaps = () => {
    const latitude = 15.3256;
    const longitude = 120.6542;
    const label = "Furnitune Showroom";
    const url = `https://www.google.com/maps?q=${latitude},${longitude}(${encodeURIComponent(
      label
    )})`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Google Maps not supported on this device");
        }
      })
      .catch(() => Alert.alert("Error", "Unable to open Google Maps"));
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Visit Our Showroom</Text>
        <Text style={styles.headerSubtitle}>Concepcion, Tarlac • Philippines</Text>
      </View>

      {/* Hero Image */}
      <TouchableOpacity activeOpacity={0.9} onPress={openGoogleMaps}>
        <Image
          source={require("../assets/cpn.jpeg")}
          style={styles.heroImage}
        />
        <View style={styles.mapOverlay}>
          <Ionicons name="navigate-outline" size={20} color="#fff" />
          <Text style={styles.mapOverlayText}>Open in Google Maps</Text>
        </View>
      </TouchableOpacity>

      {/* Intro Text */}
      <Text style={styles.introText}>
        Discover high-quality furniture handcrafted with precision and designed
        to bring warmth, comfort, and sophistication to your home. Visit
        <Text style={styles.brand}> Furnitune </Text> today and experience the
        beauty of true craftsmanship.
      </Text>

      {/* Info Cards */}
      <View style={styles.infoCard}>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={20} color="#2c6e49" />
          <Text style={styles.infoText}>
            Cristobal St., Brgy. San Jose, Concepcion, Tarlac
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="call-outline" size={20} color="#2c6e49" />
          <Text style={styles.infoText}>+63 965 093 4957</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={20} color="#2c6e49" />
          <Text style={styles.infoText}>Mon – Sat • 9:00 AM – 5:00 PM</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="mail-outline" size={20} color="#2c6e49" />
          <Text style={styles.infoText}>furnitune12@gmail.com</Text>
        </View>
      </View>

      {/* Features Section */}
      <Text style={styles.sectionTitle}>What We Offer</Text>
      <View style={styles.featuresContainer}>
        {[
          {
            image: require("../assets/des.jpg"),
            title: "Custom Designs",
            desc: "Create furniture that matches your space and style perfectly.",
          },
          {
            image: require("../assets/qual.jpg"),
            title: "Repair Services",
            desc: "Restore your favorite furniture pieces with expert care.",
          },
          {
            image: require("../assets/recs.jpg"),
            title: "AI Suggestions",
            desc: "Get personalized furniture recommendations for your home.",
          },
        ].map((item, index) => (
          <View key={index} style={styles.featureCard}>
            <Image source={item.image} style={styles.featureImage} />
            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text style={styles.featureDesc}>{item.desc}</Text>
            <TouchableOpacity style={styles.learnBtn}>
              <Text style={styles.learnBtnText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Closing Text */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Experience Quality Living</Text>
        <Text style={styles.footerText}>
          Visit our showroom today and bring timeless elegance into your home.
          Everything you need is at <Text style={styles.brand}>Furnitune!</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

// ✅ Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  header: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#1B3D36",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#c9d8d3",
    marginTop: 4,
  },
  heroImage: {
    width: "92%",
    height: 200,
    borderRadius: 15,
    alignSelf: "center",
    marginVertical: 16,
  },
  mapOverlay: {
    position: "absolute",
    bottom: 18,
    right: 28,
    backgroundColor: "rgba(27, 61, 54, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  mapOverlayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  introText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 20,
  },
  brand: {
    fontWeight: "700",
    color: "#2c6e49",
  },
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#444",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B3D36",
    textAlign: "center",
    marginBottom: 10,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  featureCard: {
    width: "30%",
    backgroundColor: "#f3f2ee",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureImage: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  featureDesc: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginVertical: 4,
  },
  learnBtn: {
    backgroundColor: "#1B3D36",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  learnBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    backgroundColor: "#1B3D36",
    padding: 30,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    alignItems: "center",
  },
  footerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  footerText: {
    color: "#e8f2ee",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
