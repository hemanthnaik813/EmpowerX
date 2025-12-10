import React from "react";

export default function VoiceButton({ startVoice }) {
  return (
    <button
      className="glass-btn"
      onClick={startVoice}
      title="Voice Search"
    >
      🎤
    </button>
  );
}
