import io
import os
import pickle
import faiss
import numpy as np
import requests
from PIL import Image
from sentence_transformers import SentenceTransformer
from google.cloud import firestore
from google.oauth2 import service_account

# ======================
# CONFIGURATION
# ======================
SERVICE_ACCOUNT_PATH = "serviceAccountKey.json"  # <-- replace with your actual key filename
INDEX_PATH = "model/clip_index.faiss"
PICKLE_PATH = "data/embeddings.pkl"

# Create folders if missing
os.makedirs("model", exist_ok=True)
os.makedirs("data", exist_ok=True)

# ======================
# INITIALIZE CLIP MODEL
# ======================
print("🚀 Loading CLIP model (clip-ViT-B-32)...")
model = SentenceTransformer("clip-ViT-B-32")

# ======================
# CONNECT TO FIRESTORE
# ======================
print("🔗 Connecting to Firestore...")
credentials = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_PATH)
db = firestore.Client(credentials=credentials)

# ======================
# FETCH PRODUCTS
# ======================
print("📦 Fetching product data...")
products_ref = db.collection("products")
docs = products_ref.stream()

embeddings = {}
vectors = []
product_ids = []

for doc in docs:
    data = doc.to_dict()
    product_id = data.get("id") or doc.id

    # Choose best available image
    image_url = (
        data.get("defaultImagePath")
        or data.get("thumbnail")
        or (data.get("images")[0] if data.get("images") else None)
    )

    if not image_url:
        print(f"⚠️ No image found for {product_id}")
        continue

    # Convert gs:// URL to a downloadable Firebase Storage URL
    # Convert gs:// URL to a downloadable Firebase Storage URL
    if image_url.startswith("gs://"):
        bucket_name = image_url.split("/")[2]
        file_path = "/".join(image_url.split("/")[3:])

        # Handle both old and new Firebase bucket domains
        if bucket_name.endswith(".firebasestorage.app"):
            image_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{file_path.replace('/', '%2F')}?alt=media"
        else:
            # Convert .appspot.com to .firebasestorage.app if needed
            bucket_name = bucket_name.replace(".appspot.com", ".firebasestorage.app")
            image_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{file_path.replace('/', '%2F')}?alt=media"



    try:
        # Download and process image
        response = requests.get(image_url)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")

        # Encode image with CLIP
        vector = model.encode([image])[0]

        # Save embedding and metadata
        vectors.append(vector)
        product_ids.append(product_id)
        embeddings[product_id] = {
            "name": data.get("name"),
            "image_url": image_url,
            "embedding": vector.tolist(),
            "category": data.get("categorySlug"),
            "price": data.get("basePrice"),
            "style": data.get("style"),
        }

        print(f"✅ Encoded {product_id}")

    except Exception as e:
        print(f"❌ Failed to encode {product_id}: {e}")

# ======================
# BUILD AND SAVE INDEX
# ======================
if not vectors:
    print("❌ No vectors were created. Check Firestore or image URLs.")
    exit()

print("\n💾 Building FAISS index...")
vectors = np.array(vectors).astype("float32")
index = faiss.IndexFlatL2(vectors.shape[1])
index.add(vectors)
faiss.write_index(index, INDEX_PATH)

with open(PICKLE_PATH, "wb") as f:
    pickle.dump({"embeddings": embeddings, "product_ids": product_ids}, f)

print("\n✅ Done!")
print(f"🧩 Saved {len(embeddings)} embeddings to {PICKLE_PATH}")
print(f"🗂️ Saved FAISS index to {INDEX_PATH}")
