import React, { useState, useCallback } from "react"; // 1. Added useState and useCallback
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  StyleSheet,
  StatusBar,
  RefreshControl, // 2. Added RefreshControl import
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons"; 

// Get Screen Width for responsive Collections Grid
const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2; // Calculates exact width for 2-column grid

const LandingPage = () => {
  const navigation = useNavigation();

  // 3. State to track if the app is currently reloading
  const [refreshing, setRefreshing] = useState(false);

  // 4. Function to handle the swipe-down action
  const onRefresh = useCallback(() => {
    setRefreshing(true);

    // Simulate a reload (wait 2 seconds then stop)
    // In a real app, you would fetch new data from your database here
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fafafa" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
        // 5. Attach the RefreshControl to the ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#1B3D36"]} // Matches your theme color
            tintColor="#1B3D36" // For iOS spinner color
          />
        }
      >

        {/* Hero Banner */}
        <View style={styles.bannerContainer}>
          <ImageBackground
            source={require("../assets/recs.jpg")}
            style={styles.banner}
            imageStyle={{ borderRadius: 16 }}
          >
            <View style={styles.overlay}>
              <Text style={styles.bannerTitle}>MID-YEAR SALE</Text>
              <Text style={styles.bannerSub}>Up to 15% OFF!</Text>
              
              <TouchableOpacity 
                style={styles.shopNowBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("ProductPage")} 
              >
                <Text style={styles.shopNowText}>Shop Now</Text>
                <Ionicons name="arrow-forward" size={14} color="#1B3D36" />
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* OUR SERVICES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OUR SERVICES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {[
              { 
                name: "Customization", 
                desc: "Choose your furniture design, length, width, fabric, and more!", 
                image: require("../assets/settings.png"), 
                route: "CustomizationPage" 
              },
              { 
                name: "Repair", 
                desc: "Restore and repair your furniture to keep it looking brand new.", 
                image: require("../assets/repair.png"), 
                route: "Repair" 
              },
              { 
                name: "Chatbot", 
                desc: "Get instant help and personalized suggestions for your furniture needs.", 
                image: require("../assets/chatbot.png"), 
                route: "ChatbotPage" 
              },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.serviceCard}
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={styles.iconBox}>
                   <Image source={item.image} style={styles.serviceImg} />
                </View>
                <Text style={styles.serviceTitle}>{item.name}</Text>
                <Text style={styles.serviceDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* CATEGORIES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CATEGORIES</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {[
              { name: "Sofas", image: require("../assets/sofa.png") },
              { name: "Chairs", image: require("../assets/chairs.png") },
              { name: "Tables", image: require("../assets/table.png") },
              { name: "Beds", image: require("../assets/bed.png") },
              { name: "Ottomans", image: require("../assets/otto.png") },
              { name: "Sectionals", image: require("../assets/sec.png") },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.productCard}
                onPress={() => navigation.navigate("ProductPage", { product: item.name })}
              >
                <Image source={item.image} style={styles.productImg} />
                <Text style={styles.productName}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* NEW COLLECTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NEW COLLECTIONS</Text>
          <View style={styles.gridContainer}>
            {[
              { name: "Comfort Core", image: require("../assets/Com.png") },
              { name: "Social Sitting", image: require("../assets/socsit.png") },
              { name: "Rest Recharge", image: require("../assets/rest.png") },
              { name: "Sit & Stay", image: require("../assets/sit.png") },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.collectionCard}
                activeOpacity={0.9}
                onPress={() => {
                  let targetCollection = item.name;
                  if (targetCollection === "Sit & Stay") {
                    targetCollection = "Sit Stay";
                  }
                  navigation.navigate("CollectionsPage", { collection: targetCollection });
                }}
              >
                <Image source={item.image} style={styles.collectionImg} />
                <View style={styles.collectionOverlay}>
                  <Text style={styles.collectionTitle}>{item.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* VISIT US */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VISIT US!</Text>
          <TouchableOpacity 
            style={styles.visitCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("VisitUs")}
          >
            <Image source={require("../assets/cpn.jpeg")} style={styles.visitImg} />
            <View style={styles.visitOverlay}>
              <View style={styles.visitContent}>
                <Text style={styles.visitText}>Find Our Location</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

// ------------------- STYLES -------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    elevation: 2, 
  },
  logoText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1B3D36",
    letterSpacing: 1,
  },

  /* Banner */
  bannerContainer: {
    padding: 16,
  },
  banner: {
    width: "100%",
    height: 180,
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    padding: 20,
    justifyContent: "center",
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  bannerSub: {
    color: "#f0f0f0",
    fontSize: 16,
    marginBottom: 15,
  },
  shopNowBtn: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
  },
  shopNowText: {
    color: "#1B3D36",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },

  /* General Sections */
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginLeft: 20,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  /* Services */
  serviceCard: {
    width: 240, 
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    elevation: 3, 
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    alignItems: "flex-start",
  },
  iconBox: {
    width: 50,
    height: 50,
    backgroundColor: "#1B3D36",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceImg: {
    width: 28,
    height: 28,
    resizeMode: "contain",
    tintColor: "#ffffff",
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B3D36",
    marginBottom: 6,
  },
  serviceDesc: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },

  /* Categories */
  productCard: {
    marginRight: 16,
    width: 120, 
    alignItems: "center",
  },
  productImg: {
    width: 120,
    height: 120,
    borderRadius: 12,
    resizeMode: "cover",
    marginBottom: 8,
    backgroundColor: "#eee",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },

  /* Collections Grid */
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  collectionCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.1, 
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  collectionImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  collectionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(27, 61, 54, 0.8)",
    paddingVertical: 8,
    alignItems: "center",
  },
  collectionTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  /* Visit Card */
  visitCard: {
    marginHorizontal: 16,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 30,
    elevation: 4,
  },
  visitImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  visitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  visitContent: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  visitText: {
    color: "#1B3D36",
    fontWeight: "700",
  },
});

export default LandingPage;