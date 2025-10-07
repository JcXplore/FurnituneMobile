// app/components/FurnitureCustomization.js
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

export default function Customization() {
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [notes, setNotes] = useState("");

  const fabrics = [
    { id: 1,  color: "#D9D9D9" },
    { id: 2,  color: "#A0522D" },
    { id: 3,  color: "#A9A9A9" },
    { id: 4,  color: "#2F4F4F" },
  ];

  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>FURNITURE CUSTOMIZATION</Text>

      <View style={styles.row}>
        {/* LEFT SIDE */}
        <View style={styles.left}>
          <Image
            source={require("../assets/sofa.png")}
            style={styles.furnitureImg}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.removeBtn}>
              <Text style={styles.btnText}>REMOVE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn}>
              <Text style={styles.btnText}>UPLOAD</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>DESCRIPTION</Text>
          <Text style={styles.paragraph}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin
            congue, odio vitae viverra cursus, orci elit lobortis velit, nec
          </Text>

          <Text style={styles.paragraph}>
            Donec vitae nisi vel lacus vehicula. In nec arcu at purus fermentum
            eleifend. Cras ultrices ligula at pulvinar gravida. Fusce vel lectus
          </Text>

          {/* Steps */}
          <Text style={styles.sectionTitle}>STEPS</Text>
          <Text style={styles.paragraph}>
            Mauris sagittis, turpis in gravida tincidunt, sapien nulla porta
            lorem, sed laoreet velit nisi in sapien. In convallis metus at risus
          </Text>

          <View style={styles.steps}>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 1:</Text> Lorem ipsum dolor sit
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 2:</Text> Nullam facilisi.
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 3:</Text> Vivamus convalli
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 4:</Text> Sed ut perspiciatis
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>STEP 5:</Text> Cras ultricies ligula
            </Text>
          </View>
        </View>

        {/* RIGHT SIDE */}
        <View style={styles.right}>
          {/* Choose Fabric */}
          <Text style={styles.sectionTitle}>1. CHOOSE FABRIC</Text>
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

          {/* Choose Size */}
          <Text style={styles.sectionTitle}>2. CHOOSE SIZE</Text>
          <View style={styles.sizeGrid}>
            {sizes.map((size, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.sizeOption,
                  selectedSize === size && styles.selectedSize,
                ]}
                onPress={() => setSelectedSize(size)}
              >
                <Text
                  style={[
                    styles.sizeLabel,
                    selectedSize === size && styles.selectedSizeText,
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Additionals */}
          <Text style={styles.sectionTitle}>3. ADDITIONALS</Text>
          <TextInput
            style={styles.notesBox}
            placeholder="Description..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <TouchableOpacity style={styles.placeBtn}>
            <Text style={styles.placeBtnText}>PLACE ORDER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
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
  removeBtn: {
    backgroundColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginRight: 10,
  },
  uploadBtn: {
    backgroundColor: "#1B3D36",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
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
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sizeOption: {
    width: "30%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  selectedSize: {
    backgroundColor: "#1B3D36",
    borderColor: "#1B3D36",
  },
  sizeLabel: {
    fontSize: 14,
    color: "#333",
  },
  selectedSizeText: {
    color: "#fff",
    fontWeight: "600",
  },
  notesBox: {
    height: 80,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    textAlignVertical: "top",
    marginBottom: 8,
  },
  placeBtn: {
    backgroundColor: "#1B3D36",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  placeBtnText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});
