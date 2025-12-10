import React from "react";

export default function HUDGlass({ videoRef }) {
  return (
    <div className="hud-glass">
      <div className="glass-inner">
        {/* video element in the center glass */}
        <div className="video-slot">
          <video
            ref={videoRef}
            className="hud-video"
            autoPlay
            playsInline
            muted
          />
        </div>
      </div>
    </div>
  );
}
