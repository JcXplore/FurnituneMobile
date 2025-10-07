import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { useNavigation } from "@react-navigation/native";

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState("ALL");
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Listen for login status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchNotifications(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // ✅ Fetch notifications from the user's subcollection
  const fetchNotifications = async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const notificationsRef = collection(userDocRef, "notifications");
      const querySnapshot = await getDocs(notificationsRef);

      const fetched = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort newest first (optional)
      fetched.sort(
        (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      );

      setNotifications(fetched);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filter logic
  const filteredData =
    filter === "ALL" ? notifications : notifications.filter((n) => !n.read);

  // 🖼 Render notification item
  const renderItem = ({ item }) => (
    <View style={styles.notificationCard}>
      <Image
        source={{ uri: item.imageUrl || "https://via.placeholder.com/60" }}
        style={styles.image}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title || "Notification"}</Text>
        <Text style={styles.message}>{item.message || "No message."}</Text>
      </View>
    </View>
  );

  // 🕐 Loading indicator
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2C6E49" />
      </View>
    );
  }

  // 🚪 If not logged in
  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.loginPrompt}>
          PLEASE LOGIN TO VIEW YOUR NOTIFICATIONS.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("LoginPage")}>
          <Text style={styles.loginLink}>LOG IN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ Main notification list
  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>NOTIFICATIONS</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, filter === "ALL" && styles.activeTab]}
          onPress={() => setFilter("ALL")}
        >
          <Text
            style={[styles.tabText, filter === "ALL" && styles.activeTabText]}
          >
            ALL
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filter === "UNREAD" && styles.activeTab]}
          onPress={() => setFilter("UNREAD")}
        >
          <Text
            style={[styles.tabText, filter === "UNREAD" && styles.activeTabText]}
          >
            UNREAD
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#555" }}>
            No notifications found.
          </Text>
        }
      />

      <TouchableOpacity style={styles.seeMoreButton}>
        <Text style={styles.seeMoreText}>SEE PREVIOUS NOTIFICATIONS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F8F4",
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#000",
    marginBottom: 10,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    backgroundColor: "#E9E9E9",
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 15,
  },
  activeTab: {
    backgroundColor: "#2C6E49",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  activeTabText: {
    color: "#fff",
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: "flex-start",
    gap: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
  },
  message: {
    fontSize: 12,
    color: "#444",
    marginTop: 3,
    lineHeight: 16,
  },
  seeMoreButton: {
    backgroundColor: "#2C6E49",
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    marginVertical: 10,
  },
  seeMoreText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  list: {
    paddingBottom: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F8F4",
  },
  loginPrompt: {
    fontSize: 14,
    color: "#333",
    marginBottom: 6,
  },
  loginLink: {
    color: "#4E6655",
    textDecorationLine: "underline",
    fontWeight: "600",
    fontSize: 18,
  },
});
