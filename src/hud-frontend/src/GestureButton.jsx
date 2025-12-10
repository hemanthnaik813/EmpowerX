import React from "react";

export default function GestureButton({ startGesture }) {
  return (
    <button
      className="glass-btn"
      onClick={startGesture}
      title="Start Gesture"
    >
      ✋
    </button>
  );
}
