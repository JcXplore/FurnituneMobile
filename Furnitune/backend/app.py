from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
from typing import List
import re
from fastapi import UploadFile, File
import tempfile
import shutil
import faiss
import pickle
import numpy as np
from PIL import Image
from sentence_transformers import SentenceTransformer
import io

# Load FAISS + CLIP model once
try:
    print("🔍 Loading FAISS index and embeddings...")
    INDEX_PATH = "model/clip_index.faiss"
    PICKLE_PATH = "data/embeddings.pkl"

    index = faiss.read_index(INDEX_PATH)
    with open(PICKLE_PATH, "rb") as f:
        data = pickle.load(f)

    embeddings = data["embeddings"]
    product_ids = data["product_ids"]
    clip_model = SentenceTransformer("clip-ViT-B-32")

    print(f"✅ Loaded {len(product_ids)} product embeddings for visual search.")

except Exception as e:
    print("⚠️ Could not load FAISS index:", e)
    index = None
    embeddings = {}
    product_ids = []
    clip_model = None


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
    "sofas": "Sofas",
    "chair": "Chairs",
    "chairs": "Chairs",
    "bed": "Beds",
    "beds": "Beds",
    "table": "Tables",
    "tables": "Tables",
    "cabinet": "Cabinets",
    "cabinets": "Cabinets",
}

# Put this near CATEGORY_MAP
BAD_FEATURES_BY_CATEGORY = {
    "Beds": {
        "hasArmrest", "hasRecline", "hasWheels", "hasLumbarSupport",
        "hasSwivel", "hasChaise", "hasSectional", "hasSofaBed"
    },
    "Chairs": set(),
    "Sofas": set(),
    "Tables": set(),
    "Cabinets": set(),
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


def humanize_feature_key(k: str) -> str:
    # "hasCabinets" -> "With Cabinets"
    if not k.startswith("has"):
        return k
    pretty = k[3:]  # drop "has"
    # split CamelCase -> "Cabinets"
    out = []
    word = ""
    for ch in pretty:
        if ch.isupper() and word:
            out.append(word)
            word = ch
        else:
            word += ch
    if word:
        out.append(word)
    return "With " + " ".join(out)




# ======================================================
# 🧠 GET ADDITIONALS (like hasCabinet, hasStorage)
# ======================================================

@app.get("/get-additionals/{category}")
async def get_additionals(category: str):
    """
    Return features (has*) that are TRUE for products in the selected category.
    Uses a small deny-list to strip obviously irrelevant features.
    """
    try:
        normalized = normalize_category_input(category)
        docs = []
        for d in db.collection("products").stream():
            data = d.to_dict()
            if str(data.get("baseType", "")).strip().lower() == normalized.lower():
                docs.append(d)

        if not docs:
            return {"category": normalized, "additionals": [], "additionalsPretty": [], "additionalsMap": []}

        bad = BAD_FEATURES_BY_CATEGORY.get(normalized, set())

        # Count true has* fields
        feature_true_count = {}
        for d in docs:
            data = d.to_dict()
            for k, v in data.items():
                if k.startswith("has") and isinstance(v, bool) and v and k not in bad:
                    feature_true_count[k] = feature_true_count.get(k, 0) + 1

        if not feature_true_count:
            return {"category": normalized, "additionals": [], "additionalsPretty": [], "additionalsMap": []}

        sorted_keys = sorted(feature_true_count, key=lambda k: feature_true_count[k], reverse=True)

        def pretty(k: str) -> str:
            label = re.sub(r"([A-Z])", r" \1", k[3:]).strip()
            return f"With {label}"

        return {
            "category": normalized,
            "additionals": sorted_keys,                         # raw keys (e.g., hasCabinets)
            "additionalsPretty": [pretty(k) for k in sorted_keys],
            "additionalsMap": [{"key": k, "label": pretty(k)} for k in sorted_keys],
        }
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


from fastapi import UploadFile, File
import tempfile
import shutil

@app.post("/recommend-image")
async def recommend_image(file: UploadFile = File(...)):
    """
    Receives an uploaded image, encodes it using CLIP,
    compares it to the FAISS index, and returns top similar products.
    """
    try:
        # Read and convert image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        if not clip_model or not index:
            return {"error": "Visual recommender not initialized."}

        # Encode uploaded image using CLIP
        query_vector = clip_model.encode([image])
        query_vector = np.array(query_vector).astype("float32")

        # Search FAISS for top 5 nearest neighbors
        k = 5
        distances, indices = index.search(query_vector, k)
        nearest_ids = [product_ids[i] for i in indices[0] if i < len(product_ids)]

        print(f"✅ Found similar items for {file.filename}: {nearest_ids}")

        return {
            "message": "Image analyzed successfully!",
            "recommendations": nearest_ids,
        }

    except Exception as e:
        print("❌ Error in /recommend-image:", e)
        return {"error": str(e)}



# ======================================================
# 🧪 HEALTH CHECK
# ======================================================
@app.get("/")
def root():
    return {"status": "Recommender system running successfully 🚀"}
