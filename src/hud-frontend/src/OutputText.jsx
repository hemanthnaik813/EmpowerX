import React from "react";

export default function OutputText({ text = "" }) {
  return (
    <div className="subtitle-box">
      <div className="subtitle-inner">{text}</div>
    </div>
  );
}
