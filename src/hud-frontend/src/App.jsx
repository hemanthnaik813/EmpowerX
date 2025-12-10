import React from "react";
import WebcamView from "./WebcamView";
import VoiceButton from "./VoiceButton";
import GestureButton from "./GestureButton";
import OutputText from "./OutputText";
import useHUDLogic from "./useHUDLogic";
import "./styles.css";

export default function App() {
  const {
    subtitle,
    videoRef,
    isGestureOn,
    startVoice,
    startGesture,
    stopGesture,
    describeScene
  } = useHUDLogic();

  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  const date = new Date().toLocaleDateString();

  return (
    <div className="hud-wrapper">

      {/* 🕶️ SINGLE EYEGLASS VISOR */}
      <div className="glass-frame">

        {/* 🕒 TIME + DATE INSIDE GLASS (TOP LEFT) */}
        <div className="glass-time">
          <div className="time">{time}</div>
          <div className="date">{date}</div>
        </div>

        {/* ⬅️ LEFT ROUND GLASS BUTTONS */}
        <div className="glass-buttons">

          <GestureButton startGesture={startGesture} />

          <button className="glass-btn" onClick={describeScene}>
            👁
          </button>

          <VoiceButton startVoice={startVoice} />

          <button className="glass-btn stop-btn" onClick={stopGesture}>
            ⛔
          </button>

        </div>

        {/* 🎥 FULL VISOR CAMERA */}
        <div className="glass-camera">
          <WebcamView videoRef={videoRef} isCamOn={isGestureOn} />
        </div>

        {/* 📝 SUBTITLES INSIDE GLASS */}
        <div className="glass-subtitle">
          <OutputText text={subtitle || "Awaiting action..."} />
        </div>

      </div>

    </div>
  );
}
