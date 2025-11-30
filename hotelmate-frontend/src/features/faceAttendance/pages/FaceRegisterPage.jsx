import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import CameraPreview from "../components/CameraPreview";
import { useFaceApi } from "../hooks/useFaceApi";

/**
 * Face Registration Page
 * Allows staff members to register their face for attendance
 */
export default function FaceRegisterPage() {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get staffId from URL query params, use as default
  const staffIdFromQuery = searchParams.get("staffId");
  const isPrefilled = !!staffIdFromQuery;
  
  const [staffId, setStaffId] = useState(staffIdFromQuery || "");
  const [capturedImage, setCapturedImage] = useState(null);
  const [step, setStep] = useState("input"); // "input" | "capture" | "processing"
  const [validationError, setValidationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const { loading, error, registerFace, clearError } = useFaceApi();

  const validate = () => {
    if (!staffId.trim()) return "Staff ID is required.";
    const num = Number(staffId);
    if (!Number.isInteger(num) || num <= 0) return "Staff ID must be a positive number.";
    if (step === "capture" && !capturedImage) return "Please capture a face image first.";
    return null;
  };

  const handleStaffIdSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);
    
    const vErr = validate();
    if (vErr) {
      setValidationError(vErr);
      return;
    }

    clearError();
    setStep("capture");
  };

  const handleImageCapture = (base64Image) => {
    setCapturedImage(base64Image);
    setValidationError(null);
    setSuccessMessage(null);
    toast.success("Image captured! Click 'Register Face' to proceed.");
  };

  const handleCameraError = (errorMessage) => {
    toast.error(errorMessage);
  };

  const handleRegisterFace = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    const vErr = validate();
    if (vErr) {
      setValidationError(vErr);
      return;
    }

    setStep("processing");

    try {
      const data = await registerFace({
        hotelSlug,
        staffId,
        imageBase64: capturedImage
      });

      const staffName = data.staff_name || "staff";
      setSuccessMessage(`Face registered successfully for ${staffName}.`);
      setCapturedImage(null); // Allow re-registration if needed
      toast.success(data.message || "Face registration successful!");
      
      // Redirect logic: back to staff detail if manager registered, or to profile if self-registered
      setTimeout(() => {
        if (isPrefilled) {
          // If staffId was prefilled, likely came from manager or staff detail - go to staff detail
          navigate(`/${hotelSlug}/staff/${staffId}`);
        } else {
          // If staffId was manually entered, go to staff profile
          navigate(`/${hotelSlug}/staff/me`);
        }
      }, 2500);
      
    } catch (err) {
      setStep("capture");
      toast.error(err.message || "Face registration failed");
    }
  };

  const handleBack = () => {
    if (step === "capture") {
      setStep("input");
      setCapturedImage(null);
    } else if (step === "input") {
      navigate(-1);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setValidationError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="row w-100 justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow">
            <div className="card-body p-4">
              
              {/* Header */}
              <div className="text-center mb-4">
                <h3 className="card-title">Face Registration</h3>
                <p className="text-muted mb-0">
                  Register your face for quick attendance clock-in
                </p>
                <small className="text-muted">Hotel: <strong>{hotelSlug}</strong></small>
              </div>

              {/* Staff ID Input Step */}
              {step === "input" && (
                <form onSubmit={handleStaffIdSubmit}>
                  <div className="mb-3">
                    <label htmlFor="staffId" className="form-label">
                      Staff ID <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="staffId"
                      className="form-control"
                      placeholder="Enter your staff ID number"
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      required
                      autoFocus
                      disabled={isPrefilled}
                    />
                    <div className="form-text">
                      {isPrefilled 
                        ? "Staff ID has been pre-filled from your profile" 
                        : "Enter the staff ID provided by your manager"
                      }
                    </div>
                    {validationError && (
                      <div className="text-danger small mt-1">{validationError}</div>
                    )}
                  </div>
                  
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleBack}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-fill"
                    >
                      Continue to Camera
                      <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                  </div>
                </form>
              )}

              {/* Camera Capture Step */}
              {step === "capture" && (
                <>
                  <div className="mb-3">
                    <p className="mb-2">
                      <strong>Staff ID:</strong> {staffId}
                    </p>
                    <p className="text-muted mb-3">
                      Position your face in the camera and capture a clear image
                    </p>
                  </div>

                  <CameraPreview
                    onCapture={handleImageCapture}
                    onError={handleCameraError}
                    autoStart={true}
                  />
                  {/* Success Message */}
                  {successMessage && (
                    <div className="alert alert-success mt-3">
                      <i className="bi bi-check-circle me-2"></i>
                      {successMessage}
                    </div>
                  )}

                  {/* Validation Error Display */}
                  {validationError && (
                    <div className="alert alert-warning mt-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {validationError}
                    </div>
                  )}

                  {/* API Error Display */}
                  {error && (
                    <div className="alert alert-danger mt-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {error.message}
                      {error.code && (
                        <span className="ms-1 small text-muted">({error.code})</span>
                      )}
                    </div>
                  )}

                  {/* Captured Image Display */}
                  {capturedImage && (
                    <div className="text-center mt-3">
                      <div className="mb-2">
                        <img
                          src={capturedImage}
                          alt="Captured face"
                          className="img-thumbnail"
                          style={{ maxWidth: "200px", maxHeight: "150px" }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleBack}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Back
                    </button>
                    
                    {capturedImage && (
                      <button
                        type="button"
                        className="btn btn-outline-warning"
                        onClick={handleRetake}
                      >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Retake
                      </button>
                    )}
                    
                    <button
                      type="button"
                      className="btn btn-success flex-fill"
                      onClick={handleRegisterFace}
                      disabled={!capturedImage || loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Registering...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Register Face
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Processing Step */}
              {step === "processing" && (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Processing...</span>
                  </div>
                  <h5>Processing Registration...</h5>
                  <p className="text-muted mb-0">
                    Please wait while we register your face
                  </p>
                </div>
              )}

            </div>
          </div>
          
          {/* Help Text */}
          <div className="text-center mt-3">
            <small className="text-muted">
              Make sure you're in a well-lit area and looking directly at the camera
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}