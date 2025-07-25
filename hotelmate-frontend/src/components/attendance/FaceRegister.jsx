// src/components/attendance/FaceRegister.jsx
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function FaceRegister() {
  const webcamRef = useRef(null);
  const { hotel_slug } = useParams();

  const [loading, setLoading] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // read global (CDN) faceapi safely
  const faceapi = typeof window !== "undefined" ? window.faceapi : undefined;

  useEffect(() => {
    if (!faceapi) {
      setError("face-api.js not loaded. Check the <script> tag in index.html.");
      return;
    }

    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        console.log("✅ Models loaded");
        setModelsReady(true);
      } catch (err) {
        console.error("Model load error:", err);
        setError("Failed to load face models.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDescriptor = async () => {
    if (!faceapi) throw new Error("faceapi unavailable");
    const videoEl = webcamRef.current?.video;
    if (!videoEl) throw new Error("Webcam not ready");

    const detection = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) throw new Error("No face detected");
    return Array.from(detection.descriptor);
  };

  const captureAndRegister = async () => {
    if (!modelsReady) return setError("Models not ready yet.");
    if (!videoReady) return setError("Camera not ready yet.");

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const descriptor = await getDescriptor();
      const res = await api.post(
        `/attendance/clock-logs/register-face/${hotel_slug}/`,
        { descriptor }
      );
      setSuccess(res.data.message || "Face registered successfully.");
    } catch (err) {
      console.error("Registration failed:", err);
      setError(
        err.response?.data?.error || err.message || "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 text-center">
      <h2 className="mb-4">Register Your Face</h2>

      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "user" }}
        className="rounded shadow border"
        onUserMedia={() => setVideoReady(true)}
        onUserMediaError={(e) => {
          console.error("Camera error:", e);
          setError("Cannot access camera. Use HTTPS and allow permissions.");
        }}
      />

      <div className="mt-3">
        <button
          onClick={captureAndRegister}
          className="btn btn-success"
          disabled={loading || !modelsReady || !videoReady}
        >
          {loading
            ? "Registering..."
            : !modelsReady
            ? "Loading models..."
            : !videoReady
            ? "Waiting for camera..."
            : "Save Face"}
        </button>
      </div>

      {success && <p className="mt-3 text-success">{success}</p>}
      {error && <p className="mt-3 text-danger">{error}</p>}
    </div>
  );
}
