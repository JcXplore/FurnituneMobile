import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";

const { height } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {
  const textOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current; // for subtle slide-up effect

  useEffect(() => {
    // Smooth fade and lift animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200), // hold
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -15,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      navigation.replace("Landing");
    });
  }, [navigation, textOpacity, translateY]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E4A42" barStyle="light-content" />
      <Animated.View
        style={[
          styles.textContainer,
          { opacity: textOpacity, transform: [{ translateY }] },
        ]}
      >
        <Text style={styles.welcome}>WELCOME!</Text>
        <Text style={styles.title}>FURNITUNE</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E4A42", // solid color background
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -height * 0.05,
  },
  welcome: {
    fontSize: 16,
    color: "#fff",
    letterSpacing: 3,
    marginBottom: 5,
    fontWeight: "400",
  },
  title: {
    fontSize: 30,
    color: "#fff",
    fontWeight: "bold",
    letterSpacing: 8,
  },
});
