// ===========================================
// useHUDLogic.js — VERSION A4
// ✅ Voice Search
// ✅ Gesture Recognition
// ✅ Image Captioning (Describe Scene)
// - Describe Scene will open camera if needed
// ===========================================

import { useState, useRef } from "react";

export default function useHUDLogic() {
  const [subtitle, setSubtitle] = useState("Awaiting action...");
  const [isGestureOn, setGestureOn] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  // -------------------------
  // ✅ SPEAK SYSTEM
  // -------------------------
  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const show = (text) => {
    setSubtitle(text);
    speak(text);
  };

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // -------------------------
  // ✅ VOICE SEARCH (UNCHANGED)
  // -------------------------
  const startVoice = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      show("Speech recognition not supported in this browser.");
      return;
    }

    if (isListeningRef.current) return;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      show("Microphone permission denied.");
      return;
    }

    const rec = new SR();
    recognitionRef.current = rec;
    isListeningRef.current = true;

    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    show("🎤 Listening...");

    rec.start();

    rec.onresult = async (e) => {
      isListeningRef.current = false;
      const query = e.results[0][0].transcript;
      show("Searching: " + query);

      try {
        const res = await fetch("http://localhost:3001/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query })
        });

        const j = await res.json();
        show(j.summary || "No result found.");
      } catch (err) {
        show("Search server not responding.");
      }
    };

    rec.onerror = (e) => {
      isListeningRef.current = false;
      if (e.error !== "aborted") {
        console.error("Speech error:", e);
        show("Microphone error. Please try again.");
      }
    };

    rec.onend = () => {
      isListeningRef.current = false;
    };
  };

  // -------------------------
  // ✅ CAMERA HELPER
  // Used by both Gesture and Describe Scene
  // -------------------------
  const ensureCameraStream = async () => {
    // If we already have a stream, just reuse it
    if (streamRef.current && videoRef.current) {
      if (!videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
      }
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return true;
    } catch (err) {
      console.error("Camera error:", err);
      show("Camera permission denied.");
      return false;
    }
  };

  // -------------------------
  // ✅ START GESTURE (UNCHANGED LOGIC, uses ensureCameraStream)
  // -------------------------
  const startGesture = async () => {
    if (isGestureOn) return;
    setGestureOn(true);

    const ok = await ensureCameraStream();
    if (!ok) {
      setGestureOn(false);
      return;
    }

    show("✋ Gesture mode active");

    intervalRef.current = setInterval(async () => {
      const frame = captureFrame();
      if (!frame) return;

      try {
        const res = await fetch("http://localhost:3001/gesture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frame })
        });

        const j = await res.json();
        if (j.text && j.text !== "no_hand_detected") {
          show(j.text);
        }
      } catch {
        show("Gesture server offline.");
      }
    }, 500);
  };

  // -------------------------
  // ✅ STOP GESTURE
  // -------------------------
  const stopGesture = () => {
    setGestureOn(false);

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    show("Stopped.");
  };

  // -------------------------
  // ✅ FRAME CAPTURE (BASE64)
  // -------------------------
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = (video.videoHeight / video.videoWidth) * 320;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.6);
  };

  // -------------------------
  // ✅ IMAGE CAPTIONING (DESCRIBE SCENE)
  // -------------------------
  const describeScene = async () => {
    // Make sure camera is on
    const ok = await ensureCameraStream();
    if (!ok) return;

    // Give camera a brief moment to render a frame
    await sleep(300);

    show("👁️ Analyzing scene...");

    try {
      const base64 = captureFrame();
      if (!base64) {
        show("Camera not ready.");
        return;
      }

      // Convert base64 → Blob
      const res = await fetch(base64);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append("image", blob, "scene.jpg");

      // Flask service on 5001
      const apiRes = await fetch("http://localhost:5001/api/caption-image", {
        method: "POST",
        body: formData
      });

      const j = await apiRes.json();

      if (j.caption) {
        show(j.caption);
      } else if (j.error) {
        console.error("Caption error:", j.error);
        show("Vision system busy, try again.");
      } else {
        show("Could not understand the scene.");
      }
    } catch (err) {
      console.error("Caption error:", err);
      show("Vision system not responding.");
    }
  };

  return {
    subtitle,
    videoRef,
    isGestureOn,
    startVoice,
    startGesture,
    stopGesture,
    describeScene   // ✅ expose for UI
  };
}
