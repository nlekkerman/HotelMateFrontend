import React, { useEffect } from "react";

export default function LoveMarkerAR({ imageUrl }) {
  useEffect(() => {
    console.log("[AR] LoveMarkerAR mounted");
    console.log("[AR] Marker image URL:", imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    const marker = document.querySelector("a-marker");
    if (!marker) return;

    const onFound = () => {
      console.log("[AR] 🎯 Marker FOUND");
    };
    const onLost = () => {
      console.log("[AR] ❌ Marker LOST");
    };

    marker.addEventListener("markerFound", onFound);
    marker.addEventListener("markerLost", onLost);

    return () => {
      marker.removeEventListener("markerFound", onFound);
      marker.removeEventListener("markerLost", onLost);
    };
  }, []);

  return (
    <a-marker type="image" url={imageUrl}>
      {/* Debug plane to confirm marker visibility */}
      <a-plane
        position="0 1 0"
        rotation="-90 0 0"
        width="2"
        height="0.5"
        color="#ffffff"
        opacity="0.6"
      ></a-plane>

      <a-text
        value="Nikola voli Sanju"
        position="0 1.05 0"
        rotation="-90 0 0"
        scale="2 2 2"
        color="red"
        side="double"
        font="kelsonsans"
      ></a-text>

      {/* Debug entity to log position live in browser */}
      <a-entity
        id="love-text"
        position="0 1.05 0"
        geometry="primitive: box; height: 0.05; width: 0.05; depth: 0.05"
        material="color: blue; opacity: 0.7"
      ></a-entity>

      <a-entity light="type: ambient; intensity: 1"></a-entity>
    </a-marker>
  );
}
