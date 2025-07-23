import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function FaceClockInPage() {
  const webcamRef = useRef(null);
  const { hotel_slug } = useParams();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("idle"); // idle | detected | confirmed
  const [identifiedStaff, setIdentifiedStaff] = useState(null);
  const [clockAction, setClockAction] = useState(null); // "clock_in" | "clock_out"
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const captureScreenshot = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const blob = await (await fetch(imageSrc)).blob();
    return new File([blob], "face.jpg", { type: "image/jpeg" });
  };

  const detectFace = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setIdentifiedStaff(null);
    setClockAction(null);
    setStep("idle");

    try {
      const file = await captureScreenshot();
      const formData = new FormData();
      formData.append("image", file);

      const res = await api.post(`/attendance/clock-logs/detect/${hotel_slug}/`, formData);
      const { staff_name, clocked_in } = res.data;

      setIdentifiedStaff(staff_name);
      setClockAction(clocked_in ? "clock_out" : "clock_in");
      setStep("detected");
    } catch (err) {
      setError(err?.response?.data?.error || "Face not recognized.");
    } finally {
      setLoading(false);
    }
  };

  const confirmClock = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const file = await captureScreenshot();
      const formData = new FormData();
      formData.append("image", file);

      const endpoint = `/attendance/clock-logs/face-clock-in/${hotel_slug}/`;
      const res = await api.post(endpoint, formData);

      setMessage(res.data.message);
      setStep("confirmed");
    } catch (err) {
      setError(err?.response?.data?.error || "Clock action failed.");
    } finally {
      setLoading(false);
    }
  };

  // ⏳ Auto-reset UI after 3 seconds
  useEffect(() => {
    if (step === "confirmed") {
      const timer = setTimeout(() => {
        setStep("idle");
        setMessage(null);
        setIdentifiedStaff(null);
        setClockAction(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div className="container py-5 text-center">
      <h1 className="mb-4">Facial Clock Terminal</h1>

      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={400}
        height={300}
        className="rounded shadow-sm"
      />

      <div className="mt-4">
        {step === "idle" && (
          <button onClick={detectFace} className="btn btn-primary" disabled={loading}>
            {loading ? "Detecting…" : "Scan Face"}
          </button>
        )}

        {step === "detected" && (
          <>
            <p className="mt-3">
              Recognized as <strong>{identifiedStaff}</strong>.
              <br />
              Would you like to <strong>{clockAction.replace("_", " ").toUpperCase()}</strong>?
            </p>
            <button
              onClick={confirmClock}
              className={`btn btn-${clockAction === "clock_in" ? "success" : "danger"}`}
              disabled={loading}
            >
              {loading ? "Processing…" : `Confirm ${clockAction.replace("_", " ")}`}
            </button>
          </>
        )}

        {step === "confirmed" && message && (
          <p className="mt-3 text-success">{message}</p>
        )}
      </div>

      {error && <p className="mt-3 text-danger">{error}</p>}
    </div>
  );
}
