// src/components/ar_logic/ARScene.jsx
import React from "react";


export default function ARScene({ text = "Welcome!" }) {
  return (
    <a-scene
      embedded
      vr-mode-ui="enabled: false"
      arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false;"
    >
      <a-marker
        type="pattern"
        url="/markers/qr-marker.patt"  // make sure this 404s to 200 in network tab
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
