// src/pages/attendance/FaceClockInPage.jsx
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function FaceClockInPage() {
  const webcamRef = useRef(null);
  const { hotel_slug } = useParams();

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("idle");
  const [userName, setUserName] = useState("");
  const [clockAction, setClockAction] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("⏳ Loading face-api models...");
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ])
      .then(() => {
        console.log("✅ Models loaded");
        setModelsLoaded(true);
      })
      .catch((err) => {
        console.error("❌ Model load error:", err);
        setError("Failed to load face models");
      });
  }, []);

  // inside FaceClockInPage.jsx
  const getDescriptor = async (maxRetries = 10, delayMs = 300) => {
    const videoEl = webcamRef.current?.video;
    console.log("📸 Getting descriptor… video element:", videoEl);
    if (!videoEl) throw new Error("Webcam not ready");

    if (videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise((resolve) =>
        videoEl.addEventListener("loadeddata", resolve, { once: true })
      );
    }

    let attempt = 0;
    while (attempt < maxRetries) {
      const detection = await faceapi
        .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        console.log("🧠 Face detection result:", detection);
        return Array.from(detection.descriptor);
      }

      console.warn("❌ No face detected, retrying...");
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }

    throw new Error("No face detected after multiple attempts.");
  };

  const detectFace = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setStep("idle");

    try {
      const descriptor = await getDescriptor();
      console.log("📤 Sending descriptor to backend /detect/");
      const res = await api.post(
        `/attendance/clock-logs/detect/${hotel_slug}/`,
        { descriptor }
      );
      console.log("✅ Backend response:", res.data);

      const { staff_name, clocked_in } = res.data;
      setUserName(staff_name);
      setClockAction(clocked_in ? "clock_out" : "clock_in");
      setStep("detected");
    } catch (err) {
      console.error("❌ detectFace error:", err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmClock = async () => {
    console.log("👆 [CLICK] Confirm Clock button pressed");
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const descriptor = await getDescriptor();
      console.log("📤 Sending descriptor to backend /face-clock-in/");
      const res = await api.post(
        `/attendance/clock-logs/face-clock-in/${hotel_slug}/`,
        { descriptor }
      );
      console.log("✅ Clock action result:", res.data);
      setMessage(res.data.message || "Success");
      setStep("confirmed");
    } catch (err) {
      console.error("❌ confirmClock error:", err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === "confirmed") {
      const t = setTimeout(() => {
        console.log("🔄 Resetting state after confirmation");
        setStep("idle");
        setUserName("");
        setClockAction(null);
        setMessage("");
        setError("");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="face-terminal clock-in-overlay text-light">
      {!modelsLoaded && <h4>Loading face‑api models…</h4>}
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "user" }}
        className="webcam-feed shadow-sm mb-4"
        onUserMedia={() => {
          console.log("📹 Camera ready");
          setCameraReady(true);
        }}
      />

      <div className="d-flex flex-column align-items-center text-center">
        {step === "idle" && (
          <button
            onClick={detectFace}
            className="btn btn-primary"
            disabled={loading || !modelsLoaded || !cameraReady}
          >
            {loading
              ? "Detecting…"
              : !modelsLoaded
              ? "Models loading…"
              : !cameraReady
              ? "Waiting for camera…"
              : "Scan Face"}
          </button>
        )}

        {step === "detected" && (
          <>
            <p>
              Welcome, <strong>{userName}</strong>.<br />
              Would you like to proceed to{" "}
              <strong>
                {clockAction === "clock_in" ? "clock in" : "clock out"}
              </strong>
              ?
            </p>
            <button
              onClick={confirmClock}
              className={`btn btn-${
                clockAction === "clock_in" ? "success" : "danger"
              }`}
              disabled={loading}
            >
              {loading
                ? "Processing…"
                : `Confirm ${clockAction.replace("_", " ").toUpperCase()}`}
            </button>
          </>
        )}

        {step === "confirmed" && message && (
          <p className="text-success">{message}</p>
        )}

        {error && <p className="text-danger">{error}</p>}
      </div>
    </div>
  );
}
