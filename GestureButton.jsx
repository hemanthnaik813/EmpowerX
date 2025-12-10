import React from "react";

export default function GestureButton({ startGesture }) {
  return (
    <button className="hud-btn gesture-btn" onClick={startGesture}>
      ✋ Start Gesture
    </button>
  );
}
