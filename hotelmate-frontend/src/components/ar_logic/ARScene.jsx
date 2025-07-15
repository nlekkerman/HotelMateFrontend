import React from "react";

export default function ARScene({ text = "Welcome!" }) {
  return (
    <a-scene
      embedded
      vr-mode-ui="enabled: false"
      arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false;"
      style={{ width: "100vw", height: "100vh" }}
    >
      <a-marker
        type="pattern"
        url="/markers/pattern-ar_marker.patt"
      >
        <a-text
          value={text}
          position="0 0.2 0"
          rotation="-90 0 0"
          align="center"
          width="1.5"
        />
      </a-marker>
      <a-entity camera />
    </a-scene>
  );
}
