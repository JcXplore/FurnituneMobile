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
  mode = "department",
  selectedDepartment = "All",
}) {
  
  const allFurnitureTypes = useMemo(
    () => ["Beds", "Sofas", "Chairs", "Tables", "Sectionals", "Ottomans"],
    []
  );

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

  const availableTypes =
    mode === "allTypes"
      ? allFurnitureTypes
      : furnitureTypesByDepartment[selectedDepartment] || [];

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={false} 
      statusBarTranslucent
      onRequestClose={onClose} 
    >
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
            {mode === "allTypes" ? "ALL FURNITURES" : selectedDepartment.replace("-", " ").toUpperCase()}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
        </View>

        {/* 🔹 Scrollable Filters */}
        <ScrollView
          style={{ flex: 1, backgroundColor: "#FAF8F2", paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }} // Increased paddingBottom so last item isn't hidden
          showsVerticalScrollIndicator={false}
        >
          {availableTypes.length > 0 &&
            renderSection("Type", availableTypes, filters, toggleFilter)}

          {renderSection("Cover Material", ["Fabrics", "Leather"], filters, toggleFilter)}
          
          {renderSection("Price", ["Under ₱5,000", "₱5,000–₱9,999", "₱10,000–₱14,999", "₱15,000+"], filters, toggleFilter)}
          
          {renderSection("Frame Material", ["Metal", "Wood"], filters, toggleFilter)}
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
            
            // ✅ FIX: Add extra padding at bottom to lift buttons above Android Nav Bar
            paddingTop: 16,
            paddingBottom: Platform.OS === "android" ? 50 : 30, 

            borderTopWidth: 1,
            borderTopColor: "#D8D6CC",
            elevation: 8,
            flexDirection: 'row',
            gap: 12,
          }}
        >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#fff",
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#ccc",
              }}
              onPress={resetFilters}
            >
              <Text style={{ color: "#555", fontWeight: "600", fontSize: 15 }}>
                Clear Filters
              </Text>
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
    </Modal>
  );
}

function renderSection(title, items, filters, toggleFilter) {
  const key = title.toLowerCase().replace(/\s/g, "");
  return (
    <View style={{ marginBottom: 22, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 15 }}>
      <Text style={{ fontSize: 16, color: "#444", marginBottom: 10 }}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
          onPress={() => toggleFilter(key, item)}
        >
          <Ionicons
            name={filters[key]?.includes(item) ? "checkbox" : "square-outline"} 
            size={20}
            color={filters[key]?.includes(item) ? "#666" : "#888"} 
          />
          <Text style={{ marginLeft: 10, fontSize: 14, color: "#444" }}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}