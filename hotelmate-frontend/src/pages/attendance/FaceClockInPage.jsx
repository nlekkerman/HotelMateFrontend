// src/pages/attendance/FaceClockInPage.jsx
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";

export default function FaceClockInPage() {
  const webcamRef = useRef(null);
  const { hotel_slug } = useParams();

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("idle");
  const [userName, setUserName] = useState("");
  const [clockAction, setClockAction] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ])
      .then(() => {
        setModelsLoaded(true);
      })
      .catch((err) => {
        setError("Failed to load face models");
      });
  }, []);

  // inside FaceClockInPage.jsx
  const getDescriptor = async (maxRetries = 10, delayMs = 300) => {
    const videoEl = webcamRef.current?.video;
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
        return Array.from(detection.descriptor);
      }

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
      const res = await api.post(
        `/attendance/clock-logs/detect/${hotel_slug}/`,
        { descriptor }
      );

      const { staff_name, clocked_in } = res.data;
      setUserName(staff_name);
      setClockAction(clocked_in ? "clock_out" : "clock_in");
      setStep("detected");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmClock = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const descriptor = await getDescriptor();
      const res = await api.post(
        `/attendance/clock-logs/face-clock-in/${hotel_slug}/`,
        { descriptor }
      );
      setMessage(res.data.message || "Success");
      setStep("confirmed");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === "confirmed") {
      const t = setTimeout(() => {
        setStep("idle");
        setUserName("");
        setClockAction(null);
        setMessage("");
        setError("");
        // Close the clock-in page and return to previous page
        navigate(-1);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [step, navigate]);

  return (
    <div className="face-terminal clock-in-overlay text-light">
      <button
        className="btn btn-close btn-close-white position-absolute top-0 end-0  m-3"
        onClick={() => navigate("/")}
        aria-label="Close"
        style={{
          fontSize: '1.5rem',
          zIndex: 1000
        }}
      />
      {!modelsLoaded && <h4>Loading face‑api models…</h4>}
      
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "user" }}
        className="webcam-feed shadow-sm mb-4"
        onUserMedia={() => {
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
          <p className="text-white">{message}</p>
        )}

        {error && <p className="text-danger">{error}</p>}
      </div>
    </div>
  );
}
