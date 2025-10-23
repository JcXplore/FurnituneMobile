import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { app } from "./firebaseConfig";

const auth = getAuth(app);
const db = getFirestore(app);

export default function NotificationPage({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = auth.currentUser;

  // ✅ Fetch notifications in real time
  useEffect(() => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to view notifications.");
      navigation.navigate("LoginPage");
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(notifData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // ✅ Mark all as read
  const markAllAsRead = async () => {
    try {
      for (const notif of notifications) {
        if (!notif.read) {
          const notifRef = doc(db, "users", user.uid, "notifications", notif.id);
          await updateDoc(notifRef, { read: true });
        }
      }
      Alert.alert("Success", "All notifications marked as read.");
    } catch (error) {
      console.error("🔥 Error marking all as read:", error);
    }
  };

  // ✅ Refresh list
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // ✅ Handle tap on a notification
  const handlePress = async (item) => {
    if (!item.read) {
      const notifRef = doc(db, "users", user.uid, "notifications", item.id);
      await updateDoc(notifRef, { read: true });
    }

    // Navigate to linked page
    if (item.orderId) {
      navigation.navigate("OrderSummary", { orderId: item.orderId });
    }
  };

  // ✅ Render each notification
  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handlePress(item)}
      style={[styles.card, !item.read && styles.unreadCard]}
    >
      {/* 🖼️ Image */}
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      ) : (
        <View style={styles.iconContainer}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color={item.read ? "#888" : "#2c6e49"}
          />
        </View>
      )}

      {/* 📄 Text Section */}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>

        {/* 🏷️ Status Badge */}
        {item.status && (
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>
              {item.status.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.timestamp}>
          {item.createdAt?.toDate
            ? item.createdAt.toDate().toLocaleString()
            : "Just now"}
        </Text>
      </View>

      {/* 🔵 Unread dot */}
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c6e49" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAll}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty state */}
      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>You have no notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

// 🎨 Dynamic color badge styles
const getStatusStyle = (status) => {
  switch (status) {
    case "to_receive":
      return { backgroundColor: "#eaf5ec" };
    case "delivered":
      return { backgroundColor: "#d4edda" };
    case "cancelled":
      return { backgroundColor: "#f8d7da" };
    default:
      return { backgroundColor: "#f1f1f1" };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f8f4",
    paddingHorizontal: 16,
    paddingTop: 55,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2c6e49",
  },
  markAll: {
    fontSize: 13,
    color: "#2c6e49",
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    alignItems: "center",
  },
  unreadCard: {
    backgroundColor: "#eaf5ec",
  },
  productImage: {
    width: 55,
    height: 55,
    borderRadius: 10,
    marginRight: 12,
  },
  iconContainer: {
    backgroundColor: "#eef6f1",
    borderRadius: 10,
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    color: "#999",
    marginTop: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2c6e49",
    alignSelf: "center",
    marginLeft: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginTop: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2c6e49",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    color: "#999",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
