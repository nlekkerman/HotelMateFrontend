import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function FaceRegister() {
  const webcamRef = useRef(null);
  const { hotel_slug } = useParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // 1) Load face-api.js models once on mount
  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ])
      .then(() => console.log("Models loaded for registration"))
      .catch(err => {
        console.error("Model load error:", err);
        setError("Failed to load face models");
      });
  }, []);

  // helper to get descriptor
  const getDescriptor = async () => {
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
      />
      <div className="mt-3">
        <button
          onClick={captureAndRegister}
          className="btn btn-success"
          disabled={loading}
        >
          {loading ? "Registering..." : "Save Face"}
        </button>
      </div>

      {success && <p className="mt-3 text-success">{success}</p>}
      {error && <p className="mt-3 text-danger">{error}</p>}
    </div>
  );
}