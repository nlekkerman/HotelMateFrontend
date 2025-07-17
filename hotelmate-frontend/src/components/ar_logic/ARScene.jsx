import React, { useEffect, useState } from "react";

export default function ARScene({ text = "Welcome!" }) {
  const [markerFound, setMarkerFound] = useState(false);

  // Once A-Frame has stamped the scene into the DOM, wire up the events
  useEffect(() => {
    const onLoaded = () => {
      const marker = document.querySelector("a-marker");
      if (!marker) return;

      const onFound = () => setMarkerFound(true);
      const onLost  = () => setMarkerFound(false);

      marker.addEventListener("markerFound", onFound);
      marker.addEventListener("markerLost",  onLost);
      return () => {
        marker.removeEventListener("markerFound", onFound);
        marker.removeEventListener("markerLost",  onLost);
      };
    };

    // Wait for A-Frame to finish loading its components
    if (window.AFRAME && window.AFRAME.scenes && window.AFRAME.scenes.length) {
      onLoaded();
    } else {
      window.addEventListener("load", onLoaded);
      return () => window.removeEventListener("load", onLoaded);
    }
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div style={{
        position: "absolute", top: 10, left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.7)",
        color: "#fff",
        padding: "0.5rem 1rem",
        borderRadius: 4,
        zIndex: 10,
      }}>
        {markerFound ? "✅ Marker Found!" : "🔍 Searching for Marker…"}
      </div>

      <a-scene
        embedded
        arjs="sourceType: webcam; debugUIEnabled: true; cameraParametersUrl: /camera_para.dat;"
        style={{ width: "100%", height: "100%" }}
      >
        <a-marker
          type="pattern"
          url="/markers/pattern-ar_marker.patt"
          smooth="true"
          smoothCount="10"
        >
          <a-box position="0 0.5 0" material="color: yellow"></a-box>
          <a-text
            value={text}
            position="0 1.2 0"
            rotation="-90 0 0"
            align="center"
            width="2"
          />
        </a-marker>
        <a-entity camera></a-entity>
      </a-scene>
    </div>
  );
}
