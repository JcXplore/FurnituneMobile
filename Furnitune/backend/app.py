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




def convert_gs_to_http(gs_url: str) -> str:
    """Convert Firebase Storage gs:// URL into a public https://firebasestorage URL."""
    if not gs_url or not gs_url.startswith("gs://"):
        return gs_url
    gs_url = gs_url.replace("gs://", "")
    parts = gs_url.split("/", 1)
    if len(parts) < 2:
        return gs_url
    bucket, path = parts
    return f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path.replace('/', '%2F')}?alt=media"


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
import json, os
from firebase_admin import credentials

firebase_key_json = os.environ.get("FIREBASE_KEY")

if firebase_key_json:
    firebase_key = json.loads(firebase_key_json)
    cred = credentials.Certificate(firebase_key)
else:
    print("⚠️ No FIREBASE_KEY env found — using local key (for dev) USING serviceAccountKey.json")
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


def normalize_category_input(category: str) -> str:
    if not category:
        return category
    return CATEGORY_MAP.get(category.strip().lower(), category)

# ======================================================
# 🧩 EXTRACTOR FUNCTIONS
# ======================================================

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
    """
    Return all size options for the given baseType (category).
    This version removes color and fixes category matching (e.g., Bed → Beds).
    """
    try:
        normalized = normalize_category_input(category)
        normalized_lower = normalized.lower()

        # ✅ Fetch all products once
        all_docs = [d.to_dict() for d in db.collection("products").stream()]

        # ✅ Match baseType more flexibly
        docs = [
            d for d in all_docs
            if str(d.get("baseType", "")).strip().lower() == normalized_lower
        ]

        # 🔄 If still none found, try plural/singular form matching
        if not docs:
            docs = [
                d for d in all_docs
                if str(d.get("baseType", "")).strip().lower().rstrip("s") == normalized_lower.rstrip("s")
            ]

        if not docs:
            return {"category": normalized, "sizes": []}

        size_set = set()
        for data in docs:
            # ✅ Extract from nested options
            sizes = (
                data.get("options", {}).get("sizes")
                or data.get("sizeOptions")
                or data.get("availableSizes")
                or data.get("sizes")
                or []
            )

            for s in sizes:
                if isinstance(s, dict):
                    label = s.get("label") or s.get("id") or s.get("name")
                    if label:
                        size_set.add(label)
                elif isinstance(s, str):
                    size_set.add(s)

        return {"category": normalized, "sizes": sorted(size_set)}

    except Exception as e:
        print("❌ Error in get_options:", e)
        return {"error": str(e)}

# ======================================================
# 🧠 GET ADDITIONALS (like hasCabinet, hasStorage)
# ======================================================
@app.get("/get-additionals/{category}")
async def get_additionals(category: str):
    """
    Return TRUE 'has*' fields that are relevant for the category.
    Filters out features that don't apply (appear <20% of the time).
    """
    try:
        normalized = normalize_category_input(category)
        normalized_lower = normalized.lower()

        # Fetch all products with matching baseType (Beds, Sofas, etc.)
        all_docs = [d.to_dict() for d in db.collection("products").stream()]
        docs = [
            d for d in all_docs
            if str(d.get("baseType", "")).strip().lower() == normalized_lower
            or str(d.get("baseType", "")).strip().lower().rstrip("s") == normalized_lower.rstrip("s")
        ]

        if not docs:
            return {"category": normalized, "additionals": [], "additionalsPretty": [], "additionalsMap": []}

        total_products = len(docs)
        feature_true_count = {}

        # Count TRUE occurrences of each "has*" field
        for data in docs:
            for k, v in data.items():
                if k.startswith("has") and isinstance(v, bool) and v:
                    feature_true_count[k] = feature_true_count.get(k, 0) + 1

        if not feature_true_count:
            return {"category": normalized, "additionals": [], "additionalsPretty": [], "additionalsMap": []}

        # ✅ Filter features by minimum 20% presence (can tweak threshold)
        threshold = 0.2
        filtered = {k: v for k, v in feature_true_count.items() if v / total_products >= threshold}

        if not filtered:
            return {"category": normalized, "additionals": [], "additionalsPretty": [], "additionalsMap": []}

        # ✅ Sort by frequency
        sorted_keys = sorted(filtered, key=lambda k: filtered[k], reverse=True)

        # ✅ Prettify labels
        def pretty(k: str) -> str:
            label = re.sub(r"([A-Z])", r" \1", k[3:]).strip()
            return f"With {label}"

        additionals_map = [{"key": k, "label": pretty(k)} for k in sorted_keys]

        return {
            "category": normalized,
            "totalProducts": total_products,
            "additionals": sorted_keys,
            "additionalsPretty": [pretty(k) for k in sorted_keys],
            "additionalsMap": additionals_map,
        }

    except Exception as e:
        print("❌ Error in get_additionals:", e)
        return {"error": str(e)}

# ======================================================
# 🛍️ GET PRODUCTS BY CATEGORY
# ======================================================
@app.get("/get-products/{category}")
async def get_products(category: str):
    """
    Return all products for the given category.
    Handles plural/singular mismatches (e.g., Bed → Beds).
    """
    try:
        normalized = normalize_category_input(category)
        normalized_lower = normalized.lower()

        # 🔍 Fetch all products once
        all_docs = [d for d in db.collection("products").stream()]

        # ✅ Match baseType flexibly (plural/singular)
        docs = [
            d for d in all_docs
            if str(d.to_dict().get("baseType", "")).strip().lower() == normalized_lower
            or str(d.to_dict().get("baseType", "")).strip().lower().rstrip("s") == normalized_lower.rstrip("s")
        ]

        if not docs:
            return {"products": []}

        products = []
        for doc in docs:
            data = doc.to_dict()
            products.append({
                "id": data.get("id") or doc.id,
                "name": data.get("name") or "Unnamed Product",
                "price": data.get("basePrice", "N/A"),
                "description": data.get("description", "No description available."),
                "sizes": extract_sizes(data),
                "features": extract_features(data),
                "style": data.get("style", "N/A"),
                "rating": data.get("ratingAvg", "N/A"),
                "reviews": data.get("reviewsCount", 0),
                "thumbnail": convert_gs_to_http(data.get("thumbnail") or data.get("defaultImagePath")),
            })

        return {"products": products}

    except Exception as e:
        print("❌ Error in get_products:", e)
        return {"error": str(e)}

# ======================================================
# 🎯 RECOMMEND PREFERENCE (filter by color, size, additionals)
# ======================================================
@app.post("/recommend-preference")
async def recommend_preference(preferences: dict = Body(...)):
    """
    Recommend products based on category, size, and additional features.
    Matches if at least one selected additional is present, and ranks results by relevance.
    """
    try:
        category = normalize_category_input(preferences.get("category"))
        selected_size = (preferences.get("size") or "").strip()
        selected_adds = preferences.get("additionals") or []

        product_filter_ids = preferences.get("image_ids") or []
        query = db.collection("products")

        if product_filter_ids:
            # ✅ Only consider products from image-based recommendations
            docs = [db.collection("products").document(pid).get() for pid in product_filter_ids]
            product_docs = [doc for doc in docs if doc.exists]
        else:
            # ✅ Fall back to normal category query
            if category:
                query = query.where("baseType", "==", category)
            product_docs = query.stream()


        candidates = []

        for doc in query.stream():
            data = doc.to_dict()
            sizes = extract_sizes(data)
            features = set(extract_features(data))

            # Filter by size
            if selected_size and selected_size not in sizes:
                continue

            # Skip if no features selected and product has no has* fields
            if selected_adds and not features:
                continue

            # Compute feature match score
            match_count = len(set(selected_adds) & features)
            total_possible = len(selected_adds)
            score = match_count / total_possible if total_possible else 1

            # Include product if there's at least one match
            if match_count > 0 or not selected_adds:
                candidates.append({
                    "id": doc.id,
                    "name": data.get("name") or data.get("id") or doc.id,
                    "basePrice": data.get("basePrice"),
                    "defaultImagePath": convert_gs_to_http(data.get("thumbnail") or data.get("defaultImagePath")),
                    "matchScore": round(score, 2),
                })

        # Sort by match score (descending)
        candidates = sorted(candidates, key=lambda x: x["matchScore"], reverse=True)

        if not candidates:
            return {"recommendations": []}

        return {"recommendations": candidates[:10]}

    except Exception as e:
        print("❌ Error in /recommend-preference:", e)
        return {"error": str(e)}



from fastapi import UploadFile, File
import tempfile
import shutil

@app.post("/recommend-image")
async def recommend_image(file: UploadFile = File(...)):
    """
    Receives an uploaded image, encodes it using CLIP (SentenceTransformer),
    validates the vector, compares it to the FAISS index, and returns top similar products with image URLs.
    """
    try:
        if not clip_model or not index:
            return {"error": "Visual recommender not initialized."}

        # Read uploaded bytes and create PIL image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # --- Encode image robustly with SentenceTransformer ---
        try:
            query_vec = clip_model.encode([image], convert_to_numpy=True, normalize_embeddings=False)
        except TypeError:
            query_vec = clip_model.encode([image])

        # Ensure numpy array, float32, 2D
        query_vec = np.array(query_vec)
        if query_vec.ndim == 1:
            query_vec = query_vec.reshape(1, -1)
        query_vec = query_vec.astype("float32")

        # Sanity logs for debugging
        print("✅ recommend-image: query_vec shape:", query_vec.shape, "dtype:", query_vec.dtype)
        print("✅ recommend-image: sample values:", query_vec[0][:6].tolist())

        # --- FAISS search ---
        k = min(5, len(product_ids)) if len(product_ids) > 0 else 0
        if k == 0:
            return {"message": "No products in index.", "recommendations": []}

        distances, indices = index.search(query_vec, k)
        distances = distances.tolist()
        indices = indices.tolist()
        nearest_ids_raw = [product_ids[i] for i in indices[0] if i < len(product_ids)]

        # remove duplicates but keep order
        nearest_ids = []
        seen = set()
        for pid in nearest_ids_raw:
            if pid not in seen:
                nearest_ids.append(pid)
                seen.add(pid)

       # Find the best variant for each product (closest image among its variants)
        def pick_best_variant(product_id, query_vec):
            best = None
            best_score = float("inf")  # FAISS distance = smaller = more similar
            
            for img_data in embeddings.get(product_id, {}).get("images", []):
                emb = img_data.get("embedding")
                url = img_data.get("url")
                if emb is None or url is None:
                    continue

                emb_np = np.array(emb).astype("float32")
                emb_np = emb_np.reshape(1, -1)

                dist = np.linalg.norm(query_vec - emb_np)
                if dist < best_score:
                    best_score = dist
                    best = img_data

            return best


                
        print(f"✅ Found similar items for {file.filename}: ids={nearest_ids} distances={distances[0]}")
        
        

        # ✅ NEW: Fetch product data for each matched ID
        results = []
        for pid in nearest_ids:
            doc_ref = db.collection("products").document(pid)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                # results.append({
                #     "id": pid,
                #     "name": data.get("name") or pid,
                #     "basePrice": data.get("basePrice"),
                #     "thumbnail": convert_gs_to_http(data.get("thumbnail") or data.get("defaultImagePath")),
                #     "style": data.get("style"),
                #     "rating": data.get("ratingAvg", 0),
                #     "reviews": data.get("reviewsCount", 0),
                # })
                variant = pick_best_variant(pid, query_vec)

                results.append({
                    "id": pid,
                    "name": data.get("name") or pid,
                    "size": variant.get("size") if variant else None,
                    "color": variant.get("color") if variant else None,
                    "image": convert_gs_to_http(variant.get("url")) if variant else convert_gs_to_http(data.get("thumbnail")),
                    "basePrice": data.get("basePrice"),
                    "style": data.get("style"),
                })


        return {
            "message": "Image analyzed successfully!",
            "recommendations": results,  # ✅ Return full product data
            "debug": {
                "num_products_indexed": len(product_ids),
                "returned_k": k,
                "distances": distances[0],
            },
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


