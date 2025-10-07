// app/components/CategoryHeader.js
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CategoryHeader({
  title = "ALL FURNITURES",
  categories = [],
  selectedCategory,
  onCategorySelect,
  onFilterPress,
}) {
  return (
    <>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>{title}</Text>
        <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
          <Ionicons name="filter-outline" size={18} color="#333" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Category Bar */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {["All", ...categories].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterBtn,
                selectedCategory === cat && styles.activeFilter,
              ]}
              onPress={() => onCategorySelect(cat)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedCategory === cat && styles.activeFilterText,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c6e49",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterButtonText: {
    fontSize: 14,
    marginLeft: 6,
    color: "#333",
  },
  categoryContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    elevation: 3,
    zIndex: 50,
  },
  filterScroll: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f2f2f2",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    fontSize: 13,
    color: "#444",
  },
  activeFilter: {
    backgroundColor: "#2c6e49",
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
