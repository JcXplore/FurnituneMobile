from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
from typing import List

# --- Initialize Firebase ---
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# --- FastAPI App ---
app = FastAPI()

# --- CORS setup ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# 🚀 CATEGORY NORMALIZER
# ======================================================
CATEGORY_MAP = {
    "sofa": "Sofas",
    "chair": "Chairs",
    "bed": "Beds",
    "table": "Tables",
    "cabinet": "Cabinets",
}

def normalize_category_input(category: str) -> str:
    if not category:
        return category
    return CATEGORY_MAP.get(category.strip().lower(), category)


# ======================================================
# 🧩 EXTRACTOR FUNCTIONS
# ======================================================
def extract_colors(data: dict) -> List[str]:
    colors = set()
    if isinstance(data.get("options", {}).get("colors"), list):
        for c in data["options"]["colors"]:
            if isinstance(c, dict):
                colors.add(c.get("label") or c.get("name") or c.get("id"))
            elif isinstance(c, str):
                colors.add(c)

    for key in ["colorOptions", "availableColors", "colors"]:
        if isinstance(data.get(key), list):
            for v in data[key]:
                if isinstance(v, dict):
                    colors.add(v.get("name") or v.get("label") or v.get("id"))
                elif isinstance(v, str):
                    colors.add(v)

    if data.get("color"):
        colors.add(str(data["color"]))

    return sorted(x for x in colors if x)


def extract_sizes(data: dict) -> List[str]:
    sizes = set()
    if isinstance(data.get("options", {}).get("sizes"), list):
        for s in data["options"]["sizes"]:
            if isinstance(s, dict):
                sizes.add(s.get("label") or s.get("id"))
            elif isinstance(s, str):
                sizes.add(s)

    for key in ["sizeOptions", "availableSizes", "sizes"]:
        if isinstance(data.get(key), list):
            for s in data[key]:
                if isinstance(s, dict):
                    sizes.add(s.get("label") or s.get("id"))
                elif isinstance(s, str):
                    sizes.add(s)

    if data.get("size"):
        sizes.add(str(data["size"]))

    return sorted(x for x in sizes if x)


def extract_features(data: dict) -> List[str]:
    return [k for k, v in data.items() if k.startswith("has") and isinstance(v, bool) and v]


# ======================================================
# 🛋️ GET OPTIONS (color, size)
# ======================================================
@app.get("/get-options/{category}")
async def get_options(category: str):
    try:
        normalized = normalize_category_input(category)
        docs = db.collection("products").where("baseType", "==", normalized).stream()

        color_set, size_set = set(), set()
        for doc in docs:
            data = doc.to_dict()
            color_set.update(extract_colors(data))
            size_set.update(extract_sizes(data))

        return {"colors": sorted(color_set), "sizes": sorted(size_set)}
    except Exception as e:
        return {"error": str(e)}


# ======================================================
# 🧠 GET ADDITIONALS (like hasCabinet, hasStorage)
# ======================================================
@app.get("/get-additionals/{category}")
async def get_additionals(category: str):
    try:
        normalized = normalize_category_input(category)
        docs = db.collection("products").where("baseType", "==", normalized).stream()

        feature_count = {}
        for doc in docs:
            for feature in extract_features(doc.to_dict()):
                feature_count[feature] = feature_count.get(feature, 0) + 1

        sorted_features = sorted(feature_count, key=lambda x: feature_count[x], reverse=True)
        return {"additionals": sorted_features}
    except Exception as e:
        return {"error": str(e)}


# ======================================================
# 🛍️ GET PRODUCTS BY CATEGORY
# ======================================================
@app.get("/get-products/{category}")
async def get_products(category: str):
    try:
        normalized = normalize_category_input(category)
        docs = db.collection("products").where("baseType", "==", normalized).stream()

        products = []
        for doc in docs:
            data = doc.to_dict()
            products.append({
                "id": doc.id,
                "name": data.get("name") or data.get("id") or doc.id,
                "price": data.get("basePrice", "N/A"),
                "description": data.get("description", "No description available."),
                "colors": extract_colors(data),
                "sizes": extract_sizes(data),
                "features": extract_features(data),
                "style": data.get("style", "N/A"),
                "rating": data.get("ratingAvg", "N/A"),
                "reviews": data.get("reviewsCount", 0),
                "thumbnail": data.get("thumbnail") or data.get("defaultImagePath"),
            })
        return {"products": products}
    except Exception as e:
        return {"error": str(e)}


# ======================================================
# 🎯 RECOMMEND PREFERENCE (filter by color, size, additionals)
# ======================================================
@app.post("/recommend-preference")
async def recommend_preference(preferences: dict = Body(...)):
    try:
        category = normalize_category_input(preferences.get("category"))
        selected_color = (preferences.get("color") or "").strip()
        selected_size = (preferences.get("size") or "").strip()
        selected_adds = preferences.get("additionals") or []

        query = db.collection("products")
        if category:
            query = query.where("baseType", "==", category)

        candidates = []
        for doc in query.stream():
            data = doc.to_dict()
            colors = extract_colors(data)
            sizes = extract_sizes(data)
            features = set(extract_features(data))

            # Filter by color
            if selected_color and selected_color not in colors:
                continue
            # Filter by size
            if selected_size and selected_size not in sizes:
                continue
            # Filter by all selected additionals
            if selected_adds and not set(selected_adds).issubset(features):
                continue

            candidates.append({
                "id": doc.id,
                "name": data.get("name") or data.get("id") or doc.id,
                "basePrice": data.get("basePrice"),
                "defaultImagePath": data.get("thumbnail") or data.get("defaultImagePath"),
            })

        return {"recommendations": candidates[:10]}
    except Exception as e:
        return {"error": str(e)}


# ======================================================
# 🧪 HEALTH CHECK
# ======================================================
@app.get("/")
def root():
    return {"status": "Recommender system running successfully 🚀"}
