import React from "react";
import HUDGlass from "./HUDGlass";
import OutputText from "./OutputText";
import WebcamView from "./WebcamView";
import VoiceButton from "./VoiceButton";
import GestureButton from "./GestureButton";
import useHUDLogic from "./useHUDLogic";

export default function App() {
  const {
    subtitle,
    videoRef,
    isGestureOn,
    startVoice,
    startGesture,
    stopGesture,
    describeScene   // ✅ NEW
  } = useHUDLogic();

  return (
    <div className="hud-wrapper">
      
      <HUDGlass videoRef={videoRef} />

      {/* top-right small control (optional status) */}
      <div className="hud-topright">
        <div className="hud-mini"> EmpowerX-Assistive Agent </div>
      </div>

      {/* time */}
      <div className="hud-time">
        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>

      {/* CENTER (glass + controls) */}
      <div className="hud-center">
        
        {/* ✅ LEFT: Gesture + Describe Scene (same row) */}
        <div className="hud-left">
          <GestureButton startGesture={startGesture} />

          {/* ✅ NEW BUTTON: Describe Scene */}
          <button
            className="hud-btn vision-btn"
            onClick={describeScene}
          >
            👁 Describe Scene
          </button>
        </div>

        {/* center glass webcam */}
        <div className="hud-glass-slot">
          <WebcamView videoRef={videoRef} isCamOn={isGestureOn} />
        </div>

        {/* right controls */}
        <div className="hud-right">
          <VoiceButton startVoice={startVoice} />
          <button className="hud-btn stop-btn" onClick={stopGesture}>
            ⛔ Stop
          </button>
        </div>
      </div>

      {/* subtitles */}
      <OutputText text={subtitle} />

      {/* bottom corners */}
      <div className="hud-bottom-left">
        <div className="tiny">Date</div>
        <div className="tiny2">{new Date().toLocaleDateString()}</div>
      </div>

      <div className="hud-bottom-right">
        <div className="tiny">Heart</div>
        <div className="tiny2">♥ 76 bpm</div>
      </div>
    </div>
  );
}
