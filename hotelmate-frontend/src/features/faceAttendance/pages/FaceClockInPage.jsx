import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CameraPreview from "../components/CameraPreview";
import { useFaceApi } from "../hooks/useFaceApi";
import { useHotelFaceConfig } from "../hooks/useHotelFaceConfig";
import "../styles/faceKiosk.css";

/**
 * Face Clock-In Page
 * Allows staff to clock in using face recognition
 */
export default function FaceClockInPage() {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  
  const [capturedImage, setCapturedImage] = useState(null);
  const [locationNote, setLocationNote] = useState("Kiosk");
  const [mode, setMode] = useState("ready"); // "ready" | "captured" | "processing" | "result"
  const [result, setResult] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const resetTimeoutRef = useRef(null);
  const countdownRef = useRef(null);
  
  const { loading, error, clockInWithFace, clearError } = useFaceApi();
  const { 
    loading: configLoading, 
    isEnabled: faceEnabled, 
    config,
    error: configError 
  } = useHotelFaceConfig(hotelSlug);

  // Auto-reset for kiosk mode with countdown
  const scheduleAutoReset = () => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    setCountdown(7); // 7 seconds countdown
    
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    resetTimeoutRef.current = setTimeout(() => {
      setCapturedImage(null);
      setResult(null);
      setMode("ready");
      setCountdown(0);
      clearError();
    }, 7000);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const handleImageCapture = (base64Image) => {
    setCapturedImage(base64Image);
    setResult(null);
    setMode("captured");
    toast.success("Image captured! Click 'Clock In' to proceed.");
  };

  const handleCameraError = (errorMessage) => {
    toast.error(errorMessage);
  };

  const handleClockIn = async () => {
    if (!capturedImage || !hotelSlug) return;
    
    setMode("processing");
    setResult(null);

    try {
      const data = await clockInWithFace({
        hotelSlug,
        imageBase64: capturedImage,
        locationNote
      });

      setResult({ type: "success", data });
      setMode("result");
      toast.success(data.message || "Clock-in successful!");
      // TODO: Ensure backend emits standard attendance Pusher events
      // when face clock-in/out succeeds so AttendanceDashboard updates live.
      scheduleAutoReset();
      
    } catch (err) {
      setResult({
        type: "error",
        message: err.message,
        code: err.code || null,
      });
      setMode("result");
      toast.error(err.message || "Clock-in failed");
      scheduleAutoReset();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setResult(null);
    setMode("ready");
    setCountdown(0);
    clearError();
    // Clear any pending auto-reset
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const handleNewClockIn = () => {
    setCapturedImage(null);
    setResult(null);
    setMode("ready");
    setCountdown(0);
    clearError();
    // Clear any pending auto-reset
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const handleGoHome = () => {
    navigate(`/${hotelSlug}`);
  };

  // Helper functions for kiosk UX
  const getFriendlyErrorMessage = (errorMessage, errorCode) => {
    switch (errorCode) {
      case "NOT_ROSTERED":
        return {
          title: "Not on Roster",
          message: "You are not scheduled to work at this time. Please contact your supervisor if this is incorrect.",
          action: "Contact Manager"
        };
      case "FACE_NOT_RECOGNIZED":
        return {
          title: "Face Not Recognized", 
          message: "Your face could not be matched. Ensure you're looking directly at the camera in good lighting.",
          action: "Try Again"
        };
      case "FACE_TOO_BLURRY":
        return {
          title: "Image Quality Too Low",
          message: "The camera image is too blurry. Please move closer to the camera and ensure good lighting.",
          action: "Try Again"
        };
      case "MULTIPLE_FACES":
        return {
          title: "Multiple Faces Detected",
          message: "More than one person detected. Please ensure only you are visible in the camera view.",
          action: "Try Again"
        };
      case "NO_FACE_DETECTED":
        return {
          title: "No Face Detected",
          message: "No face was found in the image. Please position yourself in front of the camera.",
          action: "Try Again"
        };
      case "FACE_DISABLED_FOR_HOTEL":
        return {
          title: "Face Clock-In Disabled",
          message: "Face clock-in is not enabled for this hotel. Please use the regular clock-in method.",
          action: "Contact Manager"
        };
      default:
        return {
          title: "Clock-In Failed",
          message: errorMessage || "An unexpected error occurred during clock-in.",
          action: "Try Again"
        };
    }
  };

  const getSessionWarnings = (data) => {
    const warnings = [];
    
    if (data?.needs_break_warning) {
      warnings.push({
        type: "warning",
        title: "Break Recommended",
        message: "You've been working for 6+ hours. Consider taking a break."
      });
    }
    
    if (data?.needs_long_session_warning) {
      warnings.push({
        type: "warning", 
        title: "Long Session Alert",
        message: "You've been working for 10+ hours. Please ensure you're taking adequate breaks."
      });
    }
    
    if (data?.needs_hard_stop_warning) {
      warnings.push({
        type: "severe",
        title: "Maximum Hours Reached",
        message: "You've been working for 12+ hours. Please speak to your manager immediately about ending your shift."
      });
    }
    
    return warnings;
  };

  // Show loading screen while checking configuration
  if (configLoading) {
    return (
      <div className="face-kiosk-page">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8 col-xl-6">
              <div className="face-kiosk-card">
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h4>Loading Face Clock-In</h4>
                  <p className="text-muted">Checking hotel configuration...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show disabled state if face attendance is not enabled
  if (!faceEnabled || configError) {
    return (
      <div className="face-kiosk-page">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8 col-xl-6">
              <div className="face-kiosk-card">
                
                {/* Header */}
                <div className="text-center mb-4">
                  <h1 className="kiosk-title">Face Clock-In</h1>
                  <div className="kiosk-hotel-info">
                    <i className="bi bi-building me-2"></i>
                    {hotelSlug}
                  </div>
                </div>

                {/* Disabled State */}
                <div className="kiosk-alert kiosk-alert-error">
                  <i className="bi bi-x-circle-fill"></i>
                  <div>
                    <strong>Face Clock-In Not Available</strong>
                    <div>
                      {configError 
                        ? "Unable to load face attendance settings. Please contact your manager."
                        : "Face attendance is not enabled for this hotel. Please use the regular clock-in method."
                      }
                    </div>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    className="kiosk-btn kiosk-btn-secondary"
                    onClick={handleGoHome}
                  >
                    <i className="bi bi-house-door"></i>
                    Go to Dashboard
                  </button>
                </div>

                <div className="text-center mt-3">
                  <small className="text-muted">
                    Contact your manager if you believe this is an error
                  </small>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="face-kiosk-page">
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8 col-xl-6">
            <div className="face-kiosk-card">
              
              {/* Header */}
              <div className="text-center mb-4">
                <h1 className="kiosk-title">Face Clock-In</h1>
                <p className="kiosk-subtitle">Use face recognition to clock in to your shift</p>
                <div className="kiosk-hotel-info">
                  <i className="bi bi-building me-2"></i>
                  {hotelSlug}
                </div>
              </div>

              {/* State: Ready for Capture */}
              {mode === "ready" && (
                <div className="kiosk-state-ready">
                  <div className="text-center">
                    <h4><i className="bi bi-camera me-2"></i>Ready to Capture</h4>
                    <p className="mb-0">Position your face in the camera and capture your image</p>
                  </div>
                </div>
              )}

              {/* State: Image Captured */}
              {mode === "captured" && (
                <div className="kiosk-state-captured">
                  <div className="text-center">
                    <h4><i className="bi bi-check-circle me-2"></i>Image Captured</h4>
                    <p className="mb-0">Review your image and confirm to clock in</p>
                  </div>
                </div>
              )}

              {/* State: Processing */}
              {mode === "processing" && (
                <div className="kiosk-state-processing">
                  <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                      <span className="visually-hidden">Processing...</span>
                    </div>
                    <h4>Processing Clock-In</h4>
                    <p className="mb-0">Please wait while we verify your identity...</p>
                  </div>
                </div>
              )}

              {/* Camera Capture Interface */}
              {(mode === "ready" || mode === "captured") && (
                <>
                  <div className="location-selector">
                    <label htmlFor="locationNote">Clock-In Location</label>
                    <select
                      id="locationNote"
                      className="form-select"
                      value={locationNote}
                      onChange={(e) => setLocationNote(e.target.value)}
                    >
                      <option value="Kiosk">Kiosk</option>
                      <option value="Reception">Reception</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Kitchen">Kitchen</option>
                      <option value="Bar">Bar</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Back Office">Back Office</option>
                    </select>
                  </div>

                  <div className={`camera-container ${mode === "ready" ? "ready" : "captured"}`}>
                    <CameraPreview
                      onCapture={handleImageCapture}
                      onError={handleCameraError}
                      autoStart={true}
                    />
                  </div>

                  {/* Captured Image Preview */}
                  {capturedImage && (
                    <div className="text-center mt-4">
                      <h5>Captured Image</h5>
                      <img
                        src={capturedImage}
                        alt="Captured face"
                        className="img-thumbnail"
                        style={{ maxWidth: "250px", maxHeight: "200px", border: "3px solid #27ae60" }}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="d-flex gap-3 mt-4">
                    {mode === "captured" && (
                      <button
                        type="button"
                        className="kiosk-btn kiosk-btn-warning"
                        onClick={handleRetake}
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                        Retake Photo
                      </button>
                    )}
                    
                    <button
                      type="button"
                      className="kiosk-btn kiosk-btn-primary flex-fill"
                      onClick={handleClockIn}
                      disabled={mode !== "captured" || loading}
                    >
                      {mode === "captured" ? (
                        <>
                          <i className="bi bi-clock-history"></i>
                          Confirm Clock-In
                        </>
                      ) : (
                        <>
                          <i className="bi bi-camera"></i>
                          Capture Face
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Result State */}
              {mode === "result" && result && (
                <>
                  {result.type === "success" ? (
                    <div className="kiosk-state-success">
                      <div className="text-center">
                        <i className="bi bi-check-circle-fill" style={{ fontSize: "4rem", color: "#27ae60" }}></i>
                        <h3 className="mt-3 mb-2">Clock-In Successful!</h3>
                        {result.data?.staff_name && (
                          <h4 className="text-success">Welcome, {result.data.staff_name}</h4>
                        )}
                        {result.data?.message && (
                          <p className="mt-2">{result.data.message}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="kiosk-state-error">
                      <div className="text-center">
                        <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: "4rem", color: "#e74c3c" }}></i>
                        {(() => {
                          const errorInfo = getFriendlyErrorMessage(result.message, result.code);
                          return (
                            <>
                              <h3 className="mt-3 mb-2">{errorInfo.title}</h3>
                              <p className="mb-0">{errorInfo.message}</p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Safety Warnings */}
                  {result.type === "success" && result.data && (() => {
                    const warnings = getSessionWarnings(result.data);
                    return warnings.map((warning, index) => (
                      <div key={index} className={`safety-warning ${warning.type === "severe" ? "safety-warning-severe" : ""}`}>
                        <h6>{warning.title}</h6>
                        <p className="mb-0">{warning.message}</p>
                      </div>
                    ));
                  })()}

                  {/* Special Status Badges */}
                  {result.type === "success" && result.data && (
                    <div className="text-center mt-3">
                      {result.data.is_unrostered && (
                        <div className="kiosk-alert kiosk-alert-warning mb-2">
                          <i className="bi bi-exclamation-triangle-fill"></i>
                          <div>
                            <strong>Unrostered Clock-In</strong>
                            <div>This clock-in is pending manager approval</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto-reset countdown */}
                  {countdown > 0 && (
                    <div className="text-center mt-3">
                      <div className="auto-reset-countdown">
                        <i className="bi bi-clock"></i>
                        Resetting in {countdown} seconds...
                      </div>
                    </div>
                  )}

                  {/* Result Action Buttons */}
                  <div className="d-flex gap-3 mt-4">
                    <button
                      type="button"
                      className="kiosk-btn kiosk-btn-secondary"
                      onClick={handleNewClockIn}
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                      Clock In Again
                    </button>
                    <button
                      type="button"
                      className="kiosk-btn kiosk-btn-primary flex-fill"
                      onClick={handleGoHome}
                    >
                      <i className="bi bi-house-door"></i>
                      Go to Dashboard
                    </button>
                  </div>
                </>
              )}

              {/* Help and Registration Link */}
              {(mode === "ready" || mode === "captured") && (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => navigate(`/face/${hotelSlug}/register`)}
                  >
                    <i className="bi bi-person-plus me-2"></i>
                    Need to register your face first?
                  </button>
                </div>
              )}

              {/* Kiosk Instructions */}
              {mode === "ready" && (
                <div className="text-center mt-4 p-3 bg-light rounded">
                  <h6 className="mb-2">
                    <i className="bi bi-info-circle me-2"></i>
                    Instructions
                  </h6>
                  <ul className="list-unstyled small mb-0">
                    <li>• Ensure you're in a well-lit area</li>
                    <li>• Look directly at the camera</li>
                    <li>• Remove sunglasses or face coverings</li>
                    <li>• Position your face in the center of the frame</li>
                  </ul>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}