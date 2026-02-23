import React, { useRef, useEffect, useState } from "react";

export default function CameraLayer() {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (cameraErr) {
        const msg =
          cameraErr.name === "NotAllowedError"
            ? "Camera access denied. Grant permission to play."
            : cameraErr.name === "NotFoundError"
            ? "No camera found on this device."
            : "Camera unavailable. " + cameraErr.message;
        setError(msg);
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
    return (
      <div style={styles.fallback}>
        <span style={styles.fallbackText}>{error}</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={styles.video}
    />
  );
}

const styles = {
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 0,
  },
  fallback: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  fallbackText: {
    color: "#aaa",
    fontSize: "1rem",
    textAlign: "center",
    padding: "1rem",
  },
};
