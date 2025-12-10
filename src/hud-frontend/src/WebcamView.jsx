import React, { useEffect } from "react";

export default function WebcamView({ videoRef, isCamOn }) {
  useEffect(() => {
    // Camera is controlled by useHUDLogic only
  }, [isCamOn, videoRef]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="glass-video"
    />
  );
}
