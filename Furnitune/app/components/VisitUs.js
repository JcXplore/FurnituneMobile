// app/components/VisitUs.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function VisitUs() {
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Text style={styles.subtitle}>PHILIPPINES</Text>
      <Text style={styles.subtitle}>CONCEPCION, TARLAC</Text>

      <Text style={styles.paragraph}>
        Welcome to Furnitune! Explore our showroom and see the latest furniture
        designs crafted with quality and care. Our team is ready to help you
        find the perfect fit for your space.
      </Text>

      {/* Info box with icons */}
      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={18} color="#333" />
          <Text style={styles.infoText}>
            Cristobal St., Brgy. San Jose, Concepcion, Tarlac
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={18} color="#333" />
          <Text style={styles.infoText}>+63 965 093 4957</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color="#333" />
          <Text style={styles.infoText}>Mon – Sat: 9:00 AM – 5:00 PM</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={18} color="#333" />
          <Text style={styles.infoText}>furnitune12@gmail.com</Text>
        </View>
      </View>

      <Text style={styles.paragraph}>
        We aim to provide both comfort and style through our products. Visit us
        today and experience quality furniture made just for you.
      </Text>

      {/* Map image */}
      <Text style={styles.sectionTitle}>WELCOME TO FURNITUNE</Text>
      <Image
        style={styles.mapImage}
        source={require("../assets/cpn.jpeg")}
      />

      {/* Footer */}
      <Text style={styles.sectionTitle}>
        EVERYTHING YOU NEED IS AT <Text style={styles.bold}>FURNITUNE!</Text>
      </Text>

      <View style={styles.footerCards}>
        <View style={styles.card}>
          <Image
            source={require("../assets/des.jpg")}
            style={styles.cardImage}
          />
          <Text style={styles.cardTitle}>Customize Your Piece!</Text>
          <Text style={styles.cardText}>
            Bring your vision to life, customize now.
          </Text>
          <TouchableOpacity style={styles.cardBtn}>
            <Text style={styles.cardBtnText}>Learn More</Text>
        </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Image
             source={require("../assets/qual.jpg")}
            style={styles.cardImage}
          />
          <Text style={styles.cardTitle}>Repair Your Furniture!</Text>
          <Text style={styles.cardText}>
            Give your furniture a second life.
          </Text>
          <TouchableOpacity style={styles.cardBtn}>
            <Text style={styles.cardBtnText}>Learn More</Text>
        </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Image
             source={require("../assets/recs.jpg")}
            style={styles.cardImage}
          />
          <Text style={styles.cardTitle}>Ask Furniture Suggestions!</Text>
          <Text style={styles.cardText}>
            Discover furniture that fits your style.
          </Text>
        <TouchableOpacity style={styles.cardBtn}>
            <Text style={styles.cardBtnText}>Learn More</Text>
        </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.cardsText}>
            Don’t just take our word for it. Experience the quality today! So, what are you waiting for? Shop now!
          </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
    padding: 16,
  },
 
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  paragraph: {
    fontSize: 14,
    color: "#444",
    marginVertical: 8,
    lineHeight: 20,
    textAlign: "center",
  },
  infoBox: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B3D36",
    textAlign: "center",
    marginVertical: 12,
  },
  bold: {
    fontWeight: "900",
  },
  mapImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  footerCards: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  card: {
    width: "30%",
     backgroundColor: "#f2ede3",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardBtn: {
  marginTop: 8,
  backgroundColor: "#1B3D36",
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 6,
  alignSelf: "center", // centers button inside card
},
cardBtnText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 12,
},
  cardImage: {
    width: "100%",
    height: 70, 
    borderRadius: 6,
    marginBottom: 6,
    resizeMode: "cover",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
    textAlign: "center",
  },
  cardText: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
    textAlign: "center",
  },
  backBtn: {
    backgroundColor: "#1B3D36",
    padding: 12,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  backText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
