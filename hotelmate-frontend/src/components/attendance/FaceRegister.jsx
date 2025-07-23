import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function FaceRegister() {
  const webcamRef = useRef(null);
  const { hotel_slug } = useParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const captureAndUpload = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const screenshot = webcamRef.current.getScreenshot();
      const blob = await (await fetch(screenshot)).blob();
      const file = new File([blob], "face.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post(
        `/attendance/clock-logs/register-face/${hotel_slug}/`,
        formData
      );

      setSuccess(response.data.message || "Face registered successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.error || "Upload failed. Please try again."
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
        width={400}
        height={300}
        className="rounded shadow border"
      />
      <div className="mt-3">
        <button
          onClick={captureAndUpload}
          className="btn btn-success"
          disabled={loading}
        >
          {loading ? "Uploading..." : "Save Face"}
        </button>
      </div>

      {success && <p className="mt-3 text-success">{success}</p>}
      {error && <p className="mt-3 text-danger">{error}</p>}
    </div>
  );
}
