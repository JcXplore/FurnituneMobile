import React from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, ImageBackground } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles from "../styles/landingStyles";


const LandingPage = () => {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>


      {/* Promo Banner */}
      <ImageBackground
  source={require("../assets/recs.jpg")}  // make sure the path is correct
  style={styles.banner}
  imageStyle={styles.bannerImage}
>
  <View style={styles.overlay}>
    <Text style={styles.bannerText}>MID-YEAR SALE UP TO 15% OFF!</Text>
  </View>
</ImageBackground>

      {/* Category Buttons */}
     <View style={styles.section}>
  <Text style={styles.sectionTitle}>OUR SERVICES</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {[
      { 
        name: "Customization", 
        desc: "Choose your furniture design, length, width, fabric, and more!", 
        image: require("../assets/settings.png"), 
        route: "Customization" 
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
        <Image source={item.image} style={styles.serviceImg} />
        <Text style={styles.serviceTitle}>{item.name}</Text>
        <Text style={styles.serviceDesc}>{item.desc}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>


      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CATEGORIES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

      {/* Collections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NEW COLLECTION</Text>
        <View style={styles.collectionGrid}>
          <TouchableOpacity
            style={styles.collectionCard}
            onPress={() => navigation.navigate("CollectionsPage", { collection: "Comfort Core" })}
          >
            <Image source={require("../assets/Com.png")} style={styles.collectionImg} />
            <Text style={styles.collectionText}>Comfort Core Collection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.collectionCard}
            onPress={() => navigation.navigate("CollectionsPage", { collection: "Social Sitting" })}
          >
            <Image source={require("../assets/socsit.png")} style={styles.collectionImg} />
            <Text style={styles.collectionText}>Social Sitting Collection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.collectionCard}
            onPress={() => navigation.navigate("CollectionsPage", { collection: "Rest Recharge" })}
          >
            <Image source={require("../assets/rest.png")} style={styles.collectionImg} />
            <Text style={styles.collectionText}>Rest & Recharge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.collectionCard}
            onPress={() => navigation.navigate("CollectionsPage", { collection: "Sit Stay" })}
          >
            <Image source={require("../assets/sit.png")} style={styles.collectionImg} />
            <Text style={styles.collectionText}>Sit & Stay</Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* Map & Visit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VISIT US!</Text>
        <Image
          source={require("../assets/cpn.jpeg")}
          style={styles.mapImg}
        />
        <TouchableOpacity style={styles.visitBtn}  onPress={() => navigation.navigate("VisitUs")}>
          <Text style={styles.visitText}>Find Our Location</Text>
        </TouchableOpacity>
      </View>

      {/* Footer (Reviews Section) */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>THE REVIEWS? WELL...</Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[...Array(5)].map((_, i) => (
            <Text key={i} style={styles.star}>⭐</Text>
          ))}
        </View>

        {/* Horizontal Scroll Reviews */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reviewScroll}
        >
          {/* Review 1 - Design */}
          <View style={styles.reviewCard}>
            <Image
              source={require("../assets/des.jpg")}
              style={styles.reviewImg}
            />
            <View style={styles.reviewContent}>
              <Text style={styles.reviewHeading}>DESIGN</Text>
              <Text style={styles.reviewText}>
                “Solid. Maayos-kalfa ang gandang-ganda ng design that fits my room. 
                Very modern, subtle na warm design na perfectly nadala nila.”
              </Text>
              <Text style={styles.reviewAuthor}>
                Austria, JC | San Miguel, Tarlac
              </Text>
            </View>
          </View>

          {/* Review 2 - Quality */}
          <View style={styles.reviewCard}>
            <Image
              source={require("../assets/qual.jpg")}
              style={styles.reviewImg}
            />
            <View style={styles.reviewContent}>
              <Text style={styles.reviewHeading}>QUALITY</Text>
              <Text style={styles.reviewText}>
                “The quality is so good. I love their furniture so much. 
                Every time the quality, the materials, every piece is a masterpiece.”
              </Text>
              <Text style={styles.reviewAuthor}>
                Santos, Rhey | Concepcion, Tarlac
              </Text>
            </View>
          </View>

          {/* Review 3 - Delivery */}
          <View style={styles.reviewCard}>
            <Image
              source={require("../assets/deliv.webp")}
              style={styles.reviewImg}
            />
            <View style={styles.reviewContent}>
              <Text style={styles.reviewHeading}>DELIVERY</Text>
              <Text style={styles.reviewText}>
                “The delivery is on time and under bills. Even with a big package, 
                men, bali-bali and energetic sila. Paulyn service talaga and that’s 
                what makes it good!”
              </Text>
              <Text style={styles.reviewAuthor}>
                Valencia, Enrica | Malacampa, Tarlac City
              </Text>
            </View>
          </View>

          {/* Review 4 - Customer Service */}
          <View style={styles.reviewCard}>
            <Image
              source={require("../assets/cuss.jpg")}
              style={styles.reviewImg}
            />
            <View style={styles.reviewContent}>
              <Text style={styles.reviewHeading}>CUSTOMER SERVICE</Text>
              <Text style={styles.reviewText}>
                “Ang bilis ng reply nila and super bait nila sa queries. 
                May guiding assistant, chatbot sa recommendation system. 
                Nakakatulong siya.”
              </Text>
              <Text style={styles.reviewAuthor}>
                Villanueva, Aldrin | Paniqui, Tarlac
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
      
    
    </ScrollView>
  );
};

export default LandingPage;
