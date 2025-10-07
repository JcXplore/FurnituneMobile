import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#f5f2e9", // beige
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingVertical: 10,
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    backgroundColor: "#ccc",
    height: "60%",
    alignSelf: "center",
  },
});
