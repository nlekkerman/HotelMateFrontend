// ShootAR — CameraLayer
// Renders the device camera feed as a fullscreen background using getUserMedia.

import React, { useRef, useEffect, useState } from "react";

const cameraStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  zIndex: 0,
};

const errorStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ff6666",
  fontSize: "1.1rem",
  textAlign: "center",
  padding: "2rem",
  zIndex: 0,
  background: "#111",
};

export default function CameraLayer() {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera access denied or unavailable:", err);
        setError("Camera permission denied or not available. Game will still work over black background.");
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (error) {
    return <div style={errorStyle}>{error}</div>;
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={cameraStyle}
    />
  );
}
