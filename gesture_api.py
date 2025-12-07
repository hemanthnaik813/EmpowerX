"""
gesture_api.py
-------------------------------------
Flask API that receives base64 webcam frames,
extracts hand landmarks using MediaPipe,
runs your trained gesture model (.pkl),
and returns the predicted gesture.

Run: python gesture_api.py
-------------------------------------
"""

from flask import Flask, request, jsonify
import numpy as np
import mediapipe as mp
import cv2
import base64
import pickle
import os

app = Flask(__name__)

# ------------------------------
# Load Gesture Model
# ------------------------------
MODEL_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__),
    "../../models/gesture_model.pkl"
))

print("📌 Loading model from:", MODEL_PATH)

with open(MODEL_PATH, "rb") as f:
    model, gesture_names = pickle.load(f)

print("✅ Gesture model loaded successfully!")


# ------------------------------
# Initialize MediaPipe Hands
# ------------------------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    max_num_hands=1,
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)


# ------------------------------
# Helper: Decode base64 → image
# ------------------------------
def decode_base64_image(data_url):
    try:
        encoded = data_url.split(",")[1]
        img_bytes = base64.b64decode(encoded)
        img_np = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(img_np, cv2.IMREAD_COLOR)
    except:
        return None


# ------------------------------
# API Route: /api/gesture
# ------------------------------
@app.route("/api/gesture", methods=["POST"])
def detect_gesture():
    data = request.get_json()

    if not data or "frame" not in data:
        return jsonify({"error": "missing_frame"}), 400

    # Decode incoming base64 image
    img = decode_base64_image(data["frame"])
    if img is None:
        return jsonify({"error": "decode_failed"}), 400

    # Convert BGR → RGB
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Process frame through MediaPipe
    result = hands.process(rgb)

    if not result.multi_hand_landmarks:
        return jsonify({"gesture": "none"}), 200

    # Extract 63 landmark features
    landmarks = []
    for lm in result.multi_hand_landmarks[0].landmark:
        landmarks.extend([lm.x, lm.y, lm.z])

    # Predict using model
    pred = model.predict([landmarks])[0]
    gesture = gesture_names[pred]

    print("🖐 Detected Gesture:", gesture)

    return jsonify({"gesture": gesture})


# ------------------------------
# Start Server
# ------------------------------
if __name__ == "__main__":
    print("🚀 Gesture API running at http://127.0.0.1:5002/api/gesture")
    app.run(host="0.0.0.0", port=5002, debug=True)
