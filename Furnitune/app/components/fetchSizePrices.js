import { collection, getDocs, query, where } from "firebase/firestore";

/**
 * Fetch all sizePrices for a given furniture type.
 * @param {object} firestore  your Firestore instance
 * @param {string} typeLabel  e.g. "Beds"
 * @param {number} basePrice  product’s base price
 * @returns {Promise<object>} e.g. { "California King": 25000, "Queen": 20000 }
 */
export const fetchSizePrices = async (firestore, typeLabel, basePrice = 0) => {
  const priceMap = {};
  if (!typeLabel) return priceMap;

  try {
    const q = query(collection(firestore, "sizePrices"), where("type", "==", typeLabel));
    const snap = await getDocs(q);

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.active) return;

      const size = data.size || docSnap.id;
      const price = Number(data.price ?? basePrice);
      priceMap[size] = price;
    });

    console.log("✅ sizePrices fetched:", priceMap);
  } catch (err) {
    console.warn("⚠️ fetchSizePrices error:", err);
  }

  return priceMap;
};
