import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CameraPreview from "../components/CameraPreview";
import { useFaceApi } from "../hooks/useFaceApi";
import { useHotelFaceConfig } from "../hooks/useHotelFaceConfig";
import { useFaceEncoder } from "../hooks/useFaceRecognition";
import api from "@/services/api";
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
  const [mode, setMode] = useState("ready"); // "ready" | "captured" | "processing" | "success" | "options" | "result"
  const [result, setResult] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [unrosteredData, setUnrosteredData] = useState(null);
  const [actionOptions, setActionOptions] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [availableActions, setAvailableActions] = useState([]);
  const [countdown, setCountdown] = useState(0);
  const resetTimeoutRef = useRef(null);
  const countdownRef = useRef(null);
  
  const { loading, error, clockInWithFace, toggleBreakWithFace, clockOutWithFace, clearError } = useFaceApi();
  const { 
    loading: configLoading, 
    isEnabled: faceEnabled, 
    config,
    error: configError 
  } = useHotelFaceConfig(hotelSlug);
  const { processing: encodingProcessing, extractFaceEncoding, modelsLoaded } = useFaceEncoder();

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
  };

  const handleCameraError = (errorMessage) => {
    toast.error(errorMessage);
  };

  const handleTakePhoto = async () => {
    if (!hotelSlug) return;
    
    setMode("processing");
    setResult(null);

    try {
      // Capture image from camera
      const imageBase64 = capturedImage || await new Promise((resolve) => {
        // Trigger camera capture programmatically
        const video = document.querySelector('video');
        if (video) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        }
      });
      
      if (!imageBase64) {
        throw new Error('Failed to capture image');
      }

      // Extract face encoding
      const encodingResult = await extractFaceEncoding(imageBase64);
      
      if (encodingResult.error) {
        throw new Error(encodingResult.error === 'NO_FACE_DETECTED' ? 
          'No face detected. Please position your face in the oval frame.' : 
          'Failed to process face data. Please try again.');
      }
      
      if (!encodingResult.encoding) {
        throw new Error('Unable to extract face data. Please ensure you are looking directly at the camera.');
      }

      // Send to backend for recognition
      const data = await clockInWithFace({
        hotelSlug,
        imageBase64,
        encoding: encodingResult.encoding,
        locationNote: "Kiosk"
      });
      
      // Handle different response types based on backend flow
      switch (data.action) {
        case 'clock_in_success':
          // Show success with staff info
          setStaffData({
            name: data.staff?.name || data.staff_name || 'Staff Member',
            image: data.staff?.image || data.staff_image,
            department: data.staff?.department,
            actionMessage: '✅ Clocked In Successfully!',
            actionTime: new Date().toLocaleTimeString(),
            actionType: 'clock_in_success'
          });
          setMode("success");
          toast.success(`Welcome, ${data.staff?.name || 'Staff Member'}!`);
          
          // Auto-refresh for next person after 4 seconds
          setTimeout(() => {
            handleReset();
          }, 4000);
          break;
          
        case 'unrostered_detected':
          // Show unrostered confirmation dialog
          setUnrosteredData({
            staff: data.staff,
            message: data.message,
            confirmationEndpoint: data.confirmation_endpoint,
            encoding: encodingResult.encoding
          });
          setMode("unrostered");
          break;
          
        case 'clock_out_options':
          // Show action selection interface for clock-out/break options
          const { staff, session_info, available_actions } = data;
          setStaffData(staff);
          setSessionInfo(session_info);
          setAvailableActions(available_actions);
          setActionOptions({
            encoding: encodingResult.encoding,
            imageBase64: imageBase64
          });
          setMode("options");
          break;
          
        default:
          throw new Error(data.message || 'Face not recognized or unknown response from server');
      }
      
    } catch (err) {
      setResult({
        type: "error",
        message: err.message || "Face recognition failed"
      });
      setMode("result");
      
      // Auto-refresh on error after 3 seconds
      setTimeout(() => {
        handleReset();
      }, 3000);
    }
  };

  const handleFaceRecognition = async () => {
    if (!capturedImage || !hotelSlug) return;
    
    setMode("processing");
    setResult(null);

    try {
      // Extract face encoding first
      const encodingResult = await extractFaceEncoding(capturedImage);
      
      if (encodingResult.error) {
        throw new Error(encodingResult.error === 'NO_FACE_DETECTED' ? 
          'No face detected in the image. Please try again.' : 
          'Failed to process face data. Please try again.');
      }
      
      if (!encodingResult.encoding) {
        throw new Error('Unable to extract face data. Please ensure you are looking directly at the camera.');
      }

      const data = await clockInWithFace({
        hotelSlug,
        imageBase64: capturedImage,
        encoding: encodingResult.encoding,
        locationNote
      });
      
      // Handle different response types based on backend flow
      switch (data.action) {
        case 'clock_in_success':
          handleClockInSuccess(data);
          break;
        case 'clock_out_options':
          handleClockOutOptions(data);
          break;
        case 'unrostered_detected':
          handleUnrosteredDetection(data);
          break;
        default:
          throw new Error(data.message || 'Unknown response from server');
      }
      
    } catch (err) {
      setResult({
        type: "error",
        message: err.message,
        code: err.code || null,
      });
      setMode("result");
      toast.error(err.message || "Face recognition failed");
      scheduleAutoReset();
    }
  };  const handleClockInSuccess = (data) => {
    const { staff, shift_info, confidence_score, clock_log } = data;
    setStaffData({
      name: staff.name,
      image: staff.image,
      department: staff.department,
      actionMessage: '✅ Clocked In Successfully!',
      actionTime: new Date(clock_log.time_in).toLocaleTimeString(),
      actionType: 'clock_in_success',
      shiftInfo: shift_info,
      confidence: Math.round((1 - (confidence_score || 0)) * 100)
    });
    setMode("success");
    toast.success(`Welcome, ${staff.name}!`);
    scheduleAutoReset();
  };

  const handleClockOutOptions = (data) => {
    const { staff, session_info, available_actions } = data;
    setStaffData(staff);
    setSessionInfo(session_info);
    setAvailableActions(available_actions);
    setMode("options");
  };

  const handleUnrosteredDetection = (data) => {
    setResult({
      type: "warning",
      message: "You are not scheduled to work at this time. Contact your supervisor if this is incorrect.",
      staffName: data.staff?.name
    });
    setMode("result");
    scheduleAutoReset();
  };



  const handleReset = () => {
    setCapturedImage(null);
    setResult(null);
    setStaffData(null);
    setUnrosteredData(null);
    setActionOptions(null);
    setSessionInfo(null);
    setAvailableActions([]);
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

  const confirmUnrosteredClockIn = async (reason, location) => {
    if (!unrosteredData || !hotelSlug) return;
    
    setMode("processing");
    
    try {
      const response = await api.post(unrosteredData.confirmationEndpoint, {
        encoding: unrosteredData.encoding,
        reason: reason || '',
        location_note: location || 'Kiosk'
      });
      
      const data = response.data;
      
      // Show success with staff info
      setStaffData({
        name: data.staff?.name || unrosteredData.staff?.name || 'Staff Member',
        image: data.staff?.image || unrosteredData.staff?.image,
        department: data.staff?.department || unrosteredData.staff?.department,
        actionMessage: '✅ Clocked In Successfully!',
        actionTime: new Date().toLocaleTimeString(),
        actionType: 'clock_in_success'
      });
      setMode("success");
      toast.success(`Welcome, ${data.staff?.name || unrosteredData.staff?.name || 'Staff Member'}!`);
      
      // Handle kiosk vs personal mode
      const isKioskMode = localStorage.getItem('kioskMode') === 'true';
      if (isKioskMode) {
        // Kiosk mode: Auto-refresh for next person after 4 seconds
        setTimeout(() => {
          handleReset();
        }, 4000);
      } else {
        // Personal mode: Close camera and navigate back after 2 seconds
        setTimeout(() => {
          navigate(-1); // Go back to previous page
        }, 2000);
      }
      
    } catch (err) {
      setResult({
        type: "error",
        message: err.response?.data?.detail || err.message || "Unrostered clock-in failed"
      });
      setMode("result");
      
      // Auto-refresh on error after 3 seconds
      setTimeout(() => {
        handleReset();
      }, 3000);
    }
  };

  const handleActionFromBackend = async (actionObj) => {
    setMode("processing");
    
    try {
      // Clean the endpoint URL - remove /api/ prefix if it exists since api.js already includes it
      let cleanEndpoint = actionObj.endpoint;
      if (cleanEndpoint.startsWith('/api/')) {
        cleanEndpoint = cleanEndpoint.substring(4); // Remove '/api' prefix
      }
      
      const response = await api.post(cleanEndpoint, {
        encoding: actionOptions.encoding
      });
      
      const result = response.data;
      
      // Set consistent success data using staffData approach
      setStaffData({
        name: result.staff.name,
        image: result.staff.image,
        department: result.staff.department,
        actionMessage: getSuccessTitle(result.action),
        actionTime: new Date().toLocaleTimeString(),
        actionType: result.action,
        sessionSummary: result.session_summary || null
      });
      setMode("success");
      
      // Show toast notification
      toast.success(getSuccessToastMessage(result.action, result.staff.name));
      
      // Handle kiosk vs personal mode based on backend response or localStorage
      const kioskAction = result.kiosk_action;
      const isKioskMode = localStorage.getItem('kioskMode') === 'true';
      
      if (kioskAction === 'refresh_for_next_person' || (isKioskMode && !kioskAction)) {
        // Kiosk mode: Auto-refresh for next person
        if (result.action === 'clock_out_success') {
          // Longer delay for clock-out to read session summary
          setTimeout(() => {
            handleReset();
          }, 10000);
        } else {
          scheduleAutoReset();
        }
      } else if (kioskAction === 'stay_logged_in' || (!isKioskMode && !kioskAction)) {
        // Personal mode: Close camera after short delay
        setTimeout(() => {
          navigate(-1); // Go back to previous page
        }, result.action === 'clock_out_success' ? 5000 : 2000);
      } else {
        // Fallback to existing logic
        if (result.action === 'clock_out_success') {
          setTimeout(() => {
            handleReset();
          }, 10000);
        } else {
          scheduleAutoReset();
        }
      }
      
    } catch (err) {
      setResult({
        type: "error", 
        message: err.message || "Action failed"
      });
      setMode("result");
      scheduleAutoReset();
    }
  };

  const getSuccessTitle = (action) => {
    switch (action) {
      case 'clock_out_success': return '👋 Clocked Out Successfully!';
      case 'break_started': return '🕐 Break Started';
      case 'break_ended': return '✅ Break Ended - Shift Resumed';
      default: return '✅ Action Completed';
    }
  };

  const getSuccessToastMessage = (action, staffName) => {
    switch (action) {
      case 'clock_out_success': return `Goodbye, ${staffName}!`;
      case 'break_started': return `${staffName}, enjoy your break!`;
      case 'break_ended': return `Welcome back, ${staffName}!`;
      default: return `Action completed for ${staffName}`;
    }
  };

  const getActionTimeMessage = (actionType) => {
    switch (actionType) {
      case 'clock_in_success': return 'Clocked in at';
      case 'clock_out_success': return 'Clocked out at';
      case 'break_started': return 'Break started at';
      case 'break_ended': return 'Break ended at';
      default: return 'Action completed at';
    }
  };

  const formatSessionSummary = (summaryObj) => {
    if (!summaryObj || typeof summaryObj !== 'object') {
      return '';
    }
    
    return (
      <div className="shift-report">
        {/* Shift Duration */}
        {summaryObj.duration_hours && (
          <div className="report-item mb-2">
            <div className="report-label">⏰ Total Shift Duration</div>
            <div className="report-value fw-bold">
              {(() => {
                const hours = parseFloat(summaryObj.duration_hours);
                const wholeHours = Math.floor(hours);
                const minutes = Math.round((hours - wholeHours) * 60);
                
                if (wholeHours > 0 && minutes > 0) {
                  return `${wholeHours} hours ${minutes} minutes`;
                } else if (wholeHours > 0) {
                  return `${wholeHours} hours`;
                } else if (minutes > 0) {
                  return `${minutes} minutes`;
                }
                return 'Less than a minute';
              })()} 
            </div>
          </div>
        )}
        
        {/* Time Range */}
        {summaryObj.clock_in_time && summaryObj.clock_out_time && (
          <div className="report-item mb-2">
            <div className="report-label">🕐 Shift Times</div>
            <div className="report-value">
              <span className="text-success">
                {new Date(summaryObj.clock_in_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </span>
              <span className="mx-2">→</span>
              <span className="text-danger">
                {new Date(summaryObj.clock_out_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </span>
            </div>
          </div>
        )}
        
        {/* Break Information */}
        <div className="report-item mb-2">
          <div className="report-label">☕ Break Time</div>
          <div className="report-value">
            {summaryObj.total_break_minutes ? (
              (() => {
                const totalMinutes = parseInt(summaryObj.total_break_minutes);
                const breakHours = Math.floor(totalMinutes / 60);
                const breakMins = totalMinutes % 60;
                
                if (breakHours > 0 && breakMins > 0) {
                  return `${breakHours}h ${breakMins}m`;
                } else if (breakHours > 0) {
                  return `${breakHours} hours`;
                } else if (breakMins > 0) {
                  return `${breakMins} minutes`;
                } else {
                  return 'No breaks taken';
                }
              })()
            ) : (
              'No breaks taken'
            )}
          </div>
        </div>
        
        {/* Work Time (Duration - Breaks) */}
        {summaryObj.duration_hours && (
          <div className="report-item mb-2">
            <div className="report-label">💼 Active Work Time</div>
            <div className="report-value text-primary fw-bold">
              {(() => {
                const totalHours = parseFloat(summaryObj.duration_hours);
                const breakHours = summaryObj.total_break_minutes ? summaryObj.total_break_minutes / 60 : 0;
                const workHours = totalHours - breakHours;
                const wholeHours = Math.floor(workHours);
                const minutes = Math.round((workHours - wholeHours) * 60);
                
                if (wholeHours > 0 && minutes > 0) {
                  return `${wholeHours}h ${minutes}m`;
                } else if (wholeHours > 0) {
                  return `${wholeHours} hours`;
                } else if (minutes > 0) {
                  return `${minutes} minutes`;
                }
                return 'Less than a minute';
              })()} 
            </div>
          </div>
        )}
        
        {/* Date */}
        {summaryObj.clock_in_time && (
          <div className="report-item">
            <div className="report-label">📅 Date</div>
            <div className="report-value">
              {new Date(summaryObj.clock_in_time).toLocaleDateString([], {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        )}
      </div>
    );
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
    <div className="fullscreen-kiosk">
              






              {/* State: Processing */}
              {mode === "processing" && (
                <div className="fullscreen-processing">
                  <div className="spinner-border spinner-border-lg text-success mb-3" role="status">
                    <span className="visually-hidden">Processing...</span>
                  </div>
                  <h4 className="text-success">Processing Face Recognition</h4>
                  <p className="text-muted">Please wait while we verify your identity...</p>
                </div>
              )}

              {/* Full Screen Camera Interface */}
              {mode === "ready" && (
                <div className="fullscreen-camera-overlay">
                  {/* Instructions at top */}
                  <div className="camera-instructions">
                    <small>
                      • Position your face in the oval frame • Ensure good lighting • Look directly at camera
                    </small>
                  </div>

                  {/* Full screen camera */}
                  <div className="fullscreen-camera-container">
                    <CameraPreview
                      onCapture={handleImageCapture}
                      onError={handleCameraError}
                      autoStart={true}
                      showFaceOverlay={true}
                      faceDetected={false}
                    />
                  </div>

                  {/* Take Photo Button in Overlay */}
                  <div className="camera-button-container">
                    <button
                      type="button"
                      className="btn btn-success btn-lg px-5"
                      onClick={handleTakePhoto}
                      disabled={loading || encodingProcessing || !modelsLoaded}
                      style={{
                        fontSize: "1.2rem",
                        borderRadius: "25px",
                        boxShadow: "0 4px 15px rgba(40, 167, 69, 0.3)"
                      }}
                    >
                      {loading || encodingProcessing ? (
                        <>
                          <div className="spinner-border spinner-border-sm me-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-camera-fill me-2"></i>
                          Take Photo
                        </>
                      )}
                    </button>
                  </div>


                </div>
              )}

              {/* Result State */}
              {/* Error Display */}
              {mode === "result" && result && result.type === "error" && (
                <div className="error-display text-center py-4">
                  <div className="error-icon mb-3" style={{fontSize: "3rem"}}>❌</div>
                  <h4 className="text-danger mb-2">Clock-In Failed</h4>
                  <p className="text-muted">{result.message}</p>
                  <small className="text-muted">
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Refreshing automatically...
                  </small>
                </div>
              )}

              {/* Unrostered Confirmation Dialog */}
              {mode === "unrostered" && unrosteredData && (
                <div className="unrostered-confirmation-display">
                  <div className="confirmation-card">
                    <div className="confirmation-header">
                      <div className="warning-icon">⚠️</div>
                      <h3>Unrostered Clock-In Detected</h3>
                    </div>
                    
                    <div className="staff-verification">
                      {unrosteredData.staff?.image && (
                        <img 
                          src={unrosteredData.staff.image} 
                          alt={unrosteredData.staff.name}
                          className="verification-photo"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="staff-details">
                        <h4>{unrosteredData.staff?.name || 'Staff Member'}</h4>
                        {unrosteredData.staff?.department && (
                          <p className="department">{unrosteredData.staff.department}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="confirmation-message">
                      <p>{unrosteredData.message || 'No scheduled shift found. Confirm to clock in anyway?'}</p>
                    </div>
                    
                    <div className="confirmation-form">
                      <div className="form-group">
                        <label>Reason (optional):</label>
                        <input 
                          type="text" 
                          id="unrostered-reason"
                          placeholder="e.g., Emergency shift, Manager approval"
                          className="form-control"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Location:</label>
                        <input 
                          type="text" 
                          id="unrostered-location"
                          defaultValue="Kiosk"
                          className="form-control"
                        />
                      </div>
                    </div>
                    
                    <div className="confirmation-actions">
                      <button 
                        className="btn btn-secondary btn-lg me-3"
                        onClick={() => handleReset()}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn btn-warning btn-lg"
                        onClick={() => {
                          const reason = document.getElementById('unrostered-reason')?.value || '';
                          const location = document.getElementById('unrostered-location')?.value || 'Kiosk';
                          confirmUnrosteredClockIn(reason, location);
                        }}
                      >
                        Confirm Clock In
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Selection Dialog */}
              {mode === "options" && staffData && sessionInfo && (
                <div className="action-selection-display">
                  <div className="action-card">
                    <div className="action-header">
                      <h3>Choose Action</h3>
                    </div>
                    
                    <div className="staff-verification">
                      {staffData.image && (
                        <img 
                          src={staffData.image} 
                          alt={staffData.name}
                          className="verification-photo"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="staff-details">
                        <h4>{staffData.name}</h4>
                        {staffData.department && (
                          <p className="department">{staffData.department}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="action-message">
                      <p>
                        {sessionInfo.is_on_break ? 
                          'You are currently on break. What would you like to do?' : 
                          'What would you like to do?'
                        }
                      </p>
                      
                      {sessionInfo && (
                        <div className="current-session-info mt-3 p-2 bg-light rounded">
                          <small className="text-muted d-block mb-1">Current Session:</small>
                          <small className="text-dark">
                            {sessionInfo.clock_in_time && (
                              `Started: ${new Date(sessionInfo.clock_in_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`
                            )}
                            {sessionInfo.duration_hours && (
                              ` • Duration: ${parseFloat(sessionInfo.duration_hours).toFixed(1)}h`
                            )}
                            {sessionInfo.total_break_minutes > 0 && (
                              ` • Break: ${sessionInfo.total_break_minutes}m`
                            )}
                          </small>
                        </div>
                      )}
                    </div>
                    
                    <div className="action-buttons">
                      {availableActions.map((action, index) => (
                        <button 
                          key={index}
                          className={`btn ${action.primary ? 'btn-primary' : 'btn-warning'} btn-lg me-3`}
                          onClick={() => handleActionFromBackend(action)}
                        >
                          {action.label}
                        </button>
                      ))}
                      
                      <button 
                        className="btn btn-secondary btn-lg"
                        onClick={() => handleReset()}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {mode === "success" && staffData && (
                <div className="success-display text-center py-5">
                  <div className="success-icon mb-3">
                    ✅
                  </div>
                  
                  <h2 className="text-success mb-3">{staffData.actionMessage}</h2>
                  
                  {staffData.image && (
                    <div className="mb-3">
                      <img 
                        src={staffData.image} 
                        alt={staffData.name}
                        className="staff-success-photo"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  
                  <h3 className="staff-name mb-2">{staffData.name}</h3>
                  {staffData.department && (
                    <p className="department-name text-muted">{staffData.department}</p>
                  )}
                  
                  <p className="action-time text-success mb-3">
                    {getActionTimeMessage(staffData.actionType)} {staffData.actionTime}
                  </p>
                  
                  {staffData.sessionSummary && (
                    <div className="session-summary mb-4 p-4 bg-white border rounded shadow-sm" style={{maxWidth: '400px', margin: '0 auto'}}>
                      <div className="text-center mb-3">
                        <h4 className="text-primary mb-1">📊 Complete Shift Report</h4>
                        <small className="text-muted">Your work session summary</small>
                      </div>
                      <div className="shift-report-content" style={{fontSize: '0.95rem'}}>
                        {typeof staffData.sessionSummary === 'string' 
                          ? <div className="text-center text-dark">{staffData.sessionSummary}</div>
                          : formatSessionSummary(staffData.sessionSummary)
                        }
                      </div>
                      <div className="text-center mt-3">
                        <small className="text-success">✨ Great work today! Have a wonderful rest of your day!</small>
                      </div>
                    </div>
                  )}
                  
                  <div className="auto-refresh-info mt-4">
                    <small className="text-muted">
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Refreshing for next person...
                    </small>
                  </div>
                </div>
              )}

    </div>
  );
}