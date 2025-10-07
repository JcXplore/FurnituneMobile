import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center",
  },
  logo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2F2F2F",
  },
  icon: {
    width: 20,
    height: 20,
  },
  banner: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 0,
    overflow: "hidden", // needed for rounded corners
    marginVertical: 10,
  },
  bannerImage: {
    resizeMode: "cover",
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.4)", // ✅ must be backgroundColor not background
    padding: 10,
    borderRadius: 0,
  },
  bannerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  categoryBtn: {
    marginRight: 16,
    alignItems: "center",
  },
  categoryImg: {
    width: 60,
    height: 60,
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  productCard: {
    marginRight: 16,
    alignItems: "center",
  },
  productImg: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 5,
  },
  productName: {
    fontSize: 14,
    fontWeight: "500",
  },
  collectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  collectionCard: {
    width: "48%",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 2,
  },
  collectionImg: {
    width: "100%",
    height: 100,
  },
  collectionText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    padding: 8,
  },
  mapImg: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginVertical: 12,
  },
  visitBtn: {
    backgroundColor: "#2F2F2F",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  visitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
  paddingVertical: 20,
  backgroundColor: "#fefcf7",
},

footerTitle: {
  fontSize: 18,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: 5,
},

starsRow: {
  flexDirection: "row",
  justifyContent: "center",
  marginBottom: 15,
},

star: {
  fontSize: 18,
  marginHorizontal: 2,
  color: "#2e7d32", // green stars
},

reviewScroll: {
  paddingHorizontal: 10,
},

reviewCard: {
  width: 260,
  backgroundColor: "#f2ede3",
  borderRadius: 12,
  marginHorizontal: 8,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 3,
  overflow: "hidden",
},

reviewImg: {
  width: "100%",
  height: 130,
},

reviewContent: {
  padding: 12,
},

reviewHeading: {
  fontSize: 14,
  fontWeight: "bold",
  marginBottom: 6,
  textAlign: "center",
  color: "#333",
},

reviewText: {
  fontSize: 13,
  fontStyle: "italic",
  color: "#333",
  marginBottom: 8,
  textAlign: "center",
},

reviewAuthor: {
  fontSize: 12,
  color: "#666",
  textAlign: "center",
},

  serviceCard: {
  width: 200,
  padding: 15,
  backgroundColor: "#8a9a8f",
  borderRadius: 12,
  marginRight: 15,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 6,
  elevation: 3,
  alignItems: "center",
},
serviceImg: {
  width: 50,
  height: 50,
  marginBottom: 10,
  resizeMode: "contain",
},
serviceTitle: {
  fontWeight: "bold",
  fontSize: 16,
  color: "#edededff",
  marginBottom: 5,
},
serviceDesc: {
  fontSize: 12,
  color: "#eaeaeaff",
  textAlign: "center",
},
itemBtn: {
  flexDirection: "row",
  alignItems: "center",
  padding: 12,
  marginVertical: 6,
  backgroundColor: "#fff",
  borderRadius: 10,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
},
section: {
  marginVertical: 16,
  paddingHorizontal: 16,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: "bold",
  marginBottom: 12,
},
collectionGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
},
collectionCard: {
  width: "48%",
  backgroundColor: "#fff",
  borderRadius: 12,
  marginBottom: 14,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
},
collectionImg: {
  width: "100%",
  height: 100,
  resizeMode: "cover",
},
collectionText: {
  textAlign: "center",
  paddingVertical: 10,
  fontSize: 14,
  fontWeight: "600",
  color: "#333",
},


});

export default styles;
