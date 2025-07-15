// src/components/ar_logic/ARScene.jsx
import React, { useEffect, useState } from "react";

export default function ARScene({ text = "Welcome!" }) {
  const [markerFound, setMarkerFound] = useState(false);

  useEffect(() => {
    // Wait a tick for the scene + marker to be in the DOM
    const timeout = setTimeout(() => {
      const markerEl = document.querySelector('a-marker[type="pattern"]');
      if (!markerEl) return;

      const onFound = () => setMarkerFound(true);
      const onLost = () => setMarkerFound(false);

      markerEl.addEventListener("markerFound", onFound);
      markerEl.addEventListener("markerLost", onLost);

      // Cleanup
      return () => {
        markerEl.removeEventListener("markerFound", onFound);
        markerEl.removeEventListener("markerLost", onLost);
      };
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      {/* Always‑on overlay */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "0.5rem 1rem",
          background: "rgba(0,0,0,0.7)",
          color: "white",
          borderRadius: "0.25rem",
          zIndex: 10,
          fontFamily: "sans-serif",
        }}
      >
        {markerFound ? "✅ Marker Found!" : "🔍 Searching for Marker…"}
      </div>

      {/* The AR scene itself */}
      <a-scene
        embedded
        arjs="sourceType: webcam; debugUIEnabled: false;"
        style={{ width: "100vw", height: "100vh" }}
      >
        <a-marker type="pattern" url="/markers/pattern-ar_marker.patt">
          {/* A simple box so you can see something pop in */}
          <a-box position="0 0.5 0" material="color: yellow"></a-box>

          {/* Your dynamic instruction text */}
          <a-text
            value={text}
            position="0 1.2 0"
            rotation="-90 0 0"
            align="center"
            width="2"
          />
        </a-marker>

        <a-entity camera />
      </a-scene>
    </div>
  );
}
