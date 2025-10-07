// app/components/RepairManagement.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";

export default function Repair() {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [notes, setNotes] = useState("");

  const types = [
    "Bed",
    "Chair",
    "Sofa",
    "Sectionals",
    "Ottoman",
    "Tables",
    "Benches",
  ];

  const fabrics = [
    { id: 1,  color: "#D9D9D9" },
    { id: 2,  color: "#A0522D" },
    { id: 3,  color: "#A9A9A9" },
    { id: 4,  color: "#2F4F4F" },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>REPAIR MANAGEMENT</Text>

      <View style={styles.row}>
        {/* LEFT container */}
        <View style={styles.left}>
          <Image
            source={require("../assets/table.png")}
            style={styles.furnitureImg}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.btnText}>Browse</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.uploadBtn]}>
              <Text style={styles.btnText}>Upload</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>DESCRIPTION</Text>
          <Text style={styles.paragraph}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin
            congue, odio ut vulputate cursus, orci enim lobortis enim, nec
            facilisis turpis nisl placerat felis. Vestibulum ante ipsum primis
            in faucibus orci luctus et ultrices posuere cubilia curae.
          </Text>

          {/* Steps */}
          <Text style={styles.sectionTitle}>STEPS</Text>
          <Text style={styles.paragraph}>
            Follow the steps below to complete your request:
          </Text>

          <View style={styles.steps}>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 1:</Text> Login to your account.
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 2:</Text> Select furniture item.
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 3:</Text> Upload photos of issue.
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 4:</Text> Choose repair fabric.
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 5:</Text> Confirm and submit
              request.
            </Text>
          </View>
        </View>

        {/* RIGHT container */}
        <View style={styles.right}>
          {/* Choose Type */}
          <Text style={styles.sectionTitle}>1. CHOOSE TYPE OF FURNITURE</Text>
          <View style={styles.typeGrid}>
            {types.map((type, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.typeOption,
                  selectedType === type && styles.selectedType,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type && styles.selectedTypeText,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Choose Fabric */}
          <Text style={styles.sectionTitle}>2. CHOOSE FABRIC</Text>
          <View style={styles.fabricGrid}>
            {fabrics.map((fabric) => (
              <TouchableOpacity
                key={fabric.id}
                style={[
                  styles.fabricOption,
                  { backgroundColor: fabric.color },
                  selectedFabric === fabric.id && styles.selectedFabric,
                ]}
                onPress={() => setSelectedFabric(fabric.id)}
              >
                <Text style={styles.fabricLabel}>{fabric.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Additionals */}
          <Text style={styles.sectionTitle}>3. ADDITIONALS</Text>
          <TextInput
            style={styles.notesBox}
            placeholder="Add notes here..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>Place Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF6E9",
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1B3D36",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
  },
  left: {
    flex: 2,
    paddingRight: 10,
  },
  right: {
    flex: 1.5,
    paddingLeft: 10,
  },
  furnitureImg: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: "#1B3D36",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginRight: 10,
  },
  uploadBtn: {
    backgroundColor: "#47695B",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B3D36",
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: "#444",
    marginBottom: 10,
    lineHeight: 20,
  },
  steps: {
    marginBottom: 16,
  },
  step: {
    fontSize: 14,
    color: "#333",
    marginVertical: 2,
  },
  stepNum: {
    fontWeight: "700",
    color: "#1B3D36",
  },
  typeGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between", 
  marginBottom: 16,
},
  typeOption: {
  width: "48%",         
  height: 50,            
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 6,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 8,
  backgroundColor: "#fff",
},
  selectedType: {
    backgroundColor: "#1B3D36",
    borderColor: "#1B3D36",
  },
  typeLabel: {
    fontSize: 10,
    color: "#333",
  },
  selectedTypeText: {
    color: "#fff",
    fontWeight: "600",
  },
  fabricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  fabricOption: {
    width: "48%",
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedFabric: {
    borderWidth: 3,
    borderColor: "#1B3D36",
  },
  fabricLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  notesBox: {
    height: 100,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    textAlignVertical: "top",
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: "#1B3D36",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});
