import io
import os
import time
import pickle
import faiss
import numpy as np
import requests
from PIL import Image
from sentence_transformers import SentenceTransformer
from google.cloud import firestore
from google.oauth2 import service_account
from google.api_core.exceptions import (
    DeadlineExceeded,
    ServiceUnavailable,
    InternalServerError,
    GoogleAPICallError,
)

# ======================
# CONFIGURATION
# ======================
SERVICE_ACCOUNT_PATH = "serviceAccountKey.json"
INDEX_PATH = "model/clip_index.faiss"
PICKLE_PATH = "data/embeddings.pkl"

os.makedirs("model", exist_ok=True)
os.makedirs("data", exist_ok=True)

# ======================
# LOAD CLIP MODEL
# ======================
print("🚀 Loading CLIP model (clip-ViT-B-32)...")
model = SentenceTransformer("clip-ViT-B-32")

# ======================
# FIRESTORE
# ======================
print("🔗 Connecting to Firestore...")
credentials = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_PATH)
db = firestore.Client(credentials=credentials)

# ======================
# HELPERS
# ======================
def convert_gs_to_https(gs_url):
    """Convert gs:// URL to Firebase downloadable link."""
    if not isinstance(gs_url, str):
        return None
    if not gs_url.startswith("gs://"):
        return None

    bucket = gs_url.split("/")[2]
    path = "/".join(gs_url.split("/")[3:]).replace("/", "%2F")

    bucket = bucket.replace(".appspot.com", ".firebasestorage.app")
    return f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media"


def extract_all_images(data):
    """Return list of {url, size, color} based on FINAL database structure."""
    images = []

    # ------------------------
    # 1. DEFAULT IMAGE
    # ------------------------
    default_img = data.get("defaultImagePath")
    if default_img:
        images.append({"url": default_img, "size": None, "color": None})

    # ------------------------
    # 2. ARRAY 'images'
    # ------------------------
    arr = data.get("images")
    if isinstance(arr, list):
        for url in arr:
            if isinstance(url, str):
                images.append({"url": url, "size": None, "color": None})

    # ------------------------
    # 3. imagesBySize → size → [urls]
    # ------------------------
    if isinstance(data.get("imagesBySize"), dict):
        for size_key, arr in data["imagesBySize"].items():
            if isinstance(arr, list):
                for url in arr:
                    if isinstance(url, str):
                        images.append({"url": url, "size": size_key, "color": None})

    # ------------------------
    # 4. imagesByOption → color → size → [urls]
    # THIS IS YOUR MAIN STRUCTURE FOR VARIANTS
    # ------------------------
    if isinstance(data.get("imagesByOption"), dict):
        for color_id, size_map in data["imagesByOption"].items():
            if isinstance(size_map, dict):
                for size_id, arr in size_map.items():
                    if isinstance(arr, list):
                        for url in arr:
                            if isinstance(url, str):
                                if url.endswith(".keep"):
                                    continue  # skip placeholder
                                images.append({
                                    "url": url,
                                    "size": size_id,
                                    "color": color_id,
                                })

    # ------------------------
    # 5. measurementImages
    # ------------------------
    if isinstance(data.get("measurementImages"), dict):
        for size_label, url in data["measurementImages"].items():
            if isinstance(url, str) and url:
                images.append({"url": url, "size": size_label, "color": None})

    return images


# ======================
# PAGINATED FETCH
# ======================
print("📦 Fetching product data with pagination...")

page_size = 100
max_retries = 5
backoff_factor = 2.0

products_ref = db.collection("products")
last_doc = None

embeddings = {}
vectors = []
product_ids = []

while True:
    q = products_ref.order_by("__name__").limit(page_size)
    if last_doc:
        q = q.start_after(last_doc)

    # Retry-safe fetch
    attempt = 0
    while True:
        try:
            docs = list(q.stream())
            break
        except Exception as exc:
            attempt += 1
            if attempt > max_retries:
                raise
            time.sleep(1 * (backoff_factor ** attempt))

    if not docs:
        print("✅ Pagination finished.")
        break

    last_doc = docs[-1]

    for doc in docs:
        data = doc.to_dict()
        product_id = data.get("id") or doc.id

        images = extract_all_images(data)
        if not images:
            print(f"⚠️ No images for {product_id}")
            continue

        print(f"\n🖼️ Processing: {product_id} ({len(images)} images)")
        embeddings.setdefault(product_id, {"name": data.get("name"), "images": []})

        for entry in images:
            url = entry["url"]

            # Skip invalid image entries
            if not isinstance(url, str):
                print(f"   ❌ Skipping non-string value: {url}")
                continue
            if not url.startswith("gs://"):
                print(f"   ⚠️ Skipping invalid entry: {url}")
                continue

            https = convert_gs_to_https(url)
            if https is None:
                print(f"   ⚠️ Invalid gs:// path: {url}")
                continue

            try:
                response = requests.get(https, timeout=20)
                response.raise_for_status()

                img = Image.open(io.BytesIO(response.content)).convert("RGB")
                vec = model.encode([img])[0]

                vectors.append(vec)
                product_ids.append(product_id)

                embeddings[product_id]["images"].append({
                    "url": https,
                    "size": entry["size"],
                    "color": entry["color"],
                    "embedding": vec.tolist()
                })

                print(f"   ✅ Indexed: {entry['color']} | {entry['size']} | {url}")

            except Exception as e:
                print(f"   ❌ Failed: {url} — {e}")


# ======================
# BUILD & SAVE INDEX
# ======================
if not vectors:
    print("❌ No vectors created. Exiting.")
    exit()

print("\n💾 Building FAISS index...")
vec_np = np.array(vectors).astype("float32")

dim = 512  # <<<<<<<<<< ADD THIS

quantizer = faiss.IndexFlatL2(dim)
index = faiss.IndexIVFFlat(quantizer, dim, 100)  # 100 clusters
index.train(vec_np)
index.add(vec_np)

faiss.write_index(index, INDEX_PATH)

with open(PICKLE_PATH, "wb") as f:
    pickle.dump({"embeddings": embeddings, "product_ids": product_ids}, f)

print("\n🎉 DONE!")
print(f"🧩 Products encoded: {len(embeddings)}")
print(f"📦 Total vectors: {len(vectors)}")
print(f"💾 Pickle saved at {PICKLE_PATH}")
print(f"🗂️ FAISS saved at {INDEX_PATH}")
