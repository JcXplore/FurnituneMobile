import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 20,
    backgroundColor: "#f7f4e9",
    marginTop: 30, // safe area spacing
    elevation: 3, // Android shadow
  },
  logo: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#2c6e49",
  },
  iconContainer: {
    flexDirection: "row",
    gap: 15,
  },
  iconBtn: {
    marginLeft: 15,
  },
});

export default styles;
