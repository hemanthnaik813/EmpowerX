"""
Flask microservice that provides:
  - POST /api/search        -> multilingual short summary (DuckDuckGo + Wikipedia)
  - POST /api/gesture       -> accepts { frame: "<data:image/jpeg;base64,...>" }
                               returns predicted gesture text
  - POST /api/caption-image -> accepts IMAGE FILE and returns scene description (IMAGGA)
"""

import base64
import os
import re
import html
import pickle
from dotenv import load_dotenv
from flask import Flask, request, jsonify
import requests
import wikipedia
from langdetect import detect
import numpy as np
import cv2
import mediapipe as mp
from flask_cors import CORS

# -----------------------
# ✅ LOAD ENV
# -----------------------
load_dotenv()

IMAGGA_API_KEY = os.getenv("IMAGGA_API_KEY")
IMAGGA_API_SECRET = os.getenv("IMAGGA_API_SECRET")

print("✅ IMAGGA KEY FOUND:", bool(IMAGGA_API_KEY))
print("✅ IMAGGA SECRET FOUND:", bool(IMAGGA_API_SECRET))

# -----------------------
# ✅ APP INIT
# -----------------------
app = Flask(__name__)
CORS(app)

# -----------------------
# Configuration
# -----------------------
DUCKDUCKGO_API = "https://api.duckduckgo.com/"
HEADERS = {"User-Agent": "hand-gesture-subtitles/1.0 (contact: you@example.com)"}
MODEL_PATH = "../../models/gesture_model.pkl"

# -----------------------
# ✅ Load gesture model (UNCHANGED)
# -----------------------
try:
    with open(MODEL_PATH, "rb") as f:
        model_data = pickle.load(f)
        if isinstance(model_data, tuple) and len(model_data) >= 2:
            GESTURE_MODEL, GESTURE_CLASSES = model_data[0], list(model_data[1])
        else:
            GESTURE_MODEL = model_data
            GESTURE_CLASSES = None
    print("✅ Gesture model loaded")
except Exception as e:
    print("❌ Failed to load gesture model:", e)
    GESTURE_MODEL = None
    GESTURE_CLASSES = None

# -----------------------
# ✅ MediaPipe init
# -----------------------
mp_hands = mp.solutions.hands
hands_processor = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# -----------------------
# ✅ HELPERS
# -----------------------
def first_two_sentences(text: str) -> str:
    parts = re.split(r"(?<=[.!?]) +", text.strip())
    return " ".join(parts[:2]).strip() if parts else text.strip()

def duckduckgo_instant_answer(query: str):
    params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
    try:
        r = requests.get(DUCKDUCKGO_API, params=params, headers=HEADERS, timeout=5)
        j = r.json()
        return html.unescape(j.get("Answer") or j.get("AbstractText") or "")
    except Exception:
        return None

def wikipedia_summary(query: str, lang_code: str = "en"):
    try:
        wikipedia.set_lang(lang_code)
        return wikipedia.summary(query, sentences=2)
    except Exception:
        return None

# -----------------------
# ✅ IMAGE → HAND LANDMARKS (UNCHANGED)
# -----------------------
def decode_base64_image(data_url: str):
    if "," in data_url:
        _, data = data_url.split(",", 1)
    else:
        data = data_url
    b = base64.b64decode(data)
    arr = np.frombuffer(b, dtype=np.uint8)
    return cv2.imdecode(arr, flags=cv2.IMREAD_COLOR)

def extract_hand_landmarks_from_bgr(bgr_img):
    if bgr_img is None:
        return None
    rgb = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
    results = hands_processor.process(rgb)
    if not results.multi_hand_landmarks:
        return None
    landmarks = []
    for lm in results.multi_hand_landmarks[0].landmark:
        landmarks.extend([lm.x, lm.y, lm.z])
    return landmarks

# -----------------------
# ✅ /api/search (UNCHANGED)
# -----------------------
@app.route("/api/search", methods=["POST"])
def api_search():
    body = request.get_json() or {}
    query = (body.get("query") or "").strip()
    if not query:
        return jsonify({"error": "missing query"}), 400

    try:
        lang = detect(query)
    except Exception:
        lang = "en"

    wiki_lang = lang if lang in ["en", "hi", "kn", "ta", "te"] else "en"
    ddg = duckduckgo_instant_answer(query) if wiki_lang == "en" else None

    if ddg:
        source = "duckduckgo"
        summary = ddg
    else:
        wiki = wikipedia_summary(query, wiki_lang)
        if wiki:
            source = f"wikipedia ({wiki_lang})"
            summary = wiki
        else:
            source = "none"
            summary = "No concise result found."

    return jsonify({
        "query": query,
        "language_detected": lang,
        "wikipedia_language_used": wiki_lang,
        "summary": summary,
        "source": source,
    })

# -----------------------
# ✅ /api/gesture (UNCHANGED)
# -----------------------
@app.route("/api/gesture", methods=["POST"])
def api_gesture():
    if GESTURE_MODEL is None:
        return jsonify({"error": "gesture_model_not_loaded"}), 500

    body = request.get_json() or {}
    frame = body.get("frame")
    if not frame:
        return jsonify({"error": "missing frame"}), 400

    try:
        img = decode_base64_image(frame)
        landmarks = extract_hand_landmarks_from_bgr(img)
        if landmarks is None:
            return jsonify({"text": "no_hand_detected"}), 200

        X = np.array(landmarks).reshape(1, -1)
        pred_idx = GESTURE_MODEL.predict(X)[0]

        if GESTURE_CLASSES and isinstance(pred_idx, (int, np.integer)):
            text = GESTURE_CLASSES[pred_idx]
        else:
            text = str(pred_idx)

        return jsonify({"text": text}), 200

    except Exception as e:
        return jsonify({"error": "processing_error", "message": str(e)}), 500

# -----------------------
# ✅✅✅ FINAL IMAGE CAPTION ROUTE — IMAGGA (STABLE)
# -----------------------
@app.route("/api/caption-image", methods=["POST"])
def caption_image():
    if not IMAGGA_API_KEY or not IMAGGA_API_SECRET:
        return jsonify({"caption": "Imagga API credentials missing."}), 200

    if "image" not in request.files:
        return jsonify({"caption": "No image received."}), 200

    image_file = request.files["image"]

    try:
        # ✅ Step 1: Upload image
        upload_response = requests.post(
            "https://api.imagga.com/v2/uploads",
            files={"image": image_file},
            auth=(IMAGGA_API_KEY, IMAGGA_API_SECRET),
            timeout=30
        )

        upload_data = upload_response.json()

        if "upload_id" not in upload_data.get("result", {}):
            return jsonify({"caption": "Failed to upload image for recognition."}), 200

        upload_id = upload_data["result"]["upload_id"]

        # ✅ Step 2: Get tags
        tag_response = requests.get(
            "https://api.imagga.com/v2/tags",
            params={"image_upload_id": upload_id},
            auth=(IMAGGA_API_KEY, IMAGGA_API_SECRET),
            timeout=30
        )

        tags_data = tag_response.json()
        tags = tags_data.get("result", {}).get("tags", [])

        if not tags:
            return jsonify({"caption": "Unable to recognize the scene."}), 200

        top_tags = [t["tag"]["en"] for t in tags[:5]]
        caption = "I can see: " + ", ".join(top_tags)

        return jsonify({"caption": caption}), 200

    except Exception as e:
        print("❌ IMAGGA CAPTION CRASH:", str(e))
        return jsonify({"caption": "Vision system temporarily unavailable."}), 200

# -----------------------
# ✅ RUN
# -----------------------
if __name__ == "__main__":
    print("🔥 All APIs running at http://127.0.0.1:5001")
    app.run(host="0.0.0.0", port=5001, debug=True)
