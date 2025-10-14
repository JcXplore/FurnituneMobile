// components/FilterModal.js
import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function FilterModal({
  visible,
  onClose,
  filters,
  toggleFilter,
  resetFilters,
  mode = "department",          // "department" or "allTypes"
  selectedDepartment = "All",   // used only in department mode
}) {
  // 🔹 Furniture types for allTypes mode
  const allFurnitureTypes = useMemo(
    () => ["Beds", "Sofas", "Chairs", "Tables", "Sectionals", "Ottomans"],
    []
  );

  // 🔹 Furniture types by department
  const furnitureTypesByDepartment = useMemo(
    () => ({
      "living-room": ["Sofas", "Chairs", "Tables", "Sectionals", "Ottomans"],
      bedroom: ["Beds", "Chairs", "Tables", "Ottomans"],
      "dining-room": ["Tables", "Chairs"],
      outdoor: ["Chairs", "Tables", "Ottomans"],
      All: allFurnitureTypes,
    }),
    [allFurnitureTypes]
  );

  // 🔹 Decide which types to display
  const availableTypes =
    mode === "allTypes"
      ? allFurnitureTypes
      : furnitureTypesByDepartment[selectedDepartment] || [];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        }}
      >
        {/* 🔹 Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#e2e2e2",
            backgroundColor: "#fff",
            elevation: 3,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#2C6E49", letterSpacing: 0.5 }}>
            Filters
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
        </View>

        {/* 🔹 Scrollable Filters */}
        <ScrollView
          style={{ flex: 1, backgroundColor: "#FAF8F2", paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              letterSpacing: 1,
              color: "#2C2C2C",
              textTransform: "uppercase",
              marginBottom: 14,
              borderBottomWidth: 0.6,
              borderBottomColor: "#B8B6AE",
              paddingBottom: 8,
            }}
          >
            {mode === "allTypes"
              ? "All Furnitures"
              : selectedDepartment.replace("-", " ").toUpperCase()}
          </Text>

          {/* ✅ Furniture Types */}
          {availableTypes.length > 0 &&
            renderSection("Type", availableTypes, filters, toggleFilter)}

          {/* ✅ Common Filters */}
          {renderSection(
            "Sizes",
            ['Smaller than 60"', '60" - 69"', '70" - 79"', '80" - 89"', '90" - 99"'],
            filters,
            toggleFilter
          )}
          {renderSection("Materials", ["Fabrics", "Leather", "Wood"], filters, toggleFilter)}
          {renderSection(
            "Number of Seats",
            ["4 Seater", "6 Seater", "8 Seater", "Extendable"],
            filters,
            toggleFilter
          )}
          {renderSection(
            "Product Shape",
            ["Rectangle", "Round", "Square"],
            filters,
            toggleFilter
          )}
        </ScrollView>

        {/* 🔹 Footer Buttons */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#FAF8F2",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: "#D8D6CC",
            elevation: 8,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: -2 },
            shadowRadius: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#E3E3E3",
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: "center",
              }}
              onPress={resetFilters}
            >
              <Text style={{ color: "#333", fontWeight: "600", fontSize: 15 }}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#2C6E49",
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: "center",
              }}
              onPress={onClose}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.5 }}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 🔸 Helper to render filter sections
function renderSection(title, items, filters, toggleFilter) {
  const key = title.toLowerCase().replace(/\s/g, "");
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#2E2E2E", marginBottom: 10 }}>
        {title}
      </Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, paddingLeft: 6 }}
          onPress={() => toggleFilter(key, item)}
        >
          <Ionicons
            name={filters[key]?.includes(item) ? "checkbox-outline" : "square-outline"}
            size={20}
            color="#2C6E49"
          />
          <Text style={{ marginLeft: 10, fontSize: 14, color: "#333" }}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
