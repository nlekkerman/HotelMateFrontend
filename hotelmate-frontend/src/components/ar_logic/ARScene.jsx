// src/components/ar_logic/ARScene.jsx
import React from "react";

export default function ARScene({ text = "Welcome!" }) {
  return (
    <a-scene
      embedded
      vr-mode-ui="enabled: false"
      arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false;"
    >
      <a-marker type="pattern" url="/markers/qr-marker.patt">
        <a-entity
          position="0 0.2 0"
          rotation="-90 0 0"
          text={`value: ${text}; align: center; width: 1.5;`}
        ></a-entity>
      </a-marker>
      <a-entity camera></a-entity>
    </a-scene>
  );
}
