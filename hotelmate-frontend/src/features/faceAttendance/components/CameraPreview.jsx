import React, { useEffect } from "react";
import { useCameraStream } from "../hooks/useCameraStream";

/**
 * Camera Preview Component
 * Provides webcam preview with capture functionality
 */
export default function CameraPreview({ 
  onCapture, 
  onError, 
  autoStart = false,
  showFaceOverlay = true,
  faceDetected = false,
  className = "",
  style = {} 
}) {
  const {
    videoRef,
    isActive,
    error,
    isLoading,
    startCamera,
    stopCamera,
    captureImage,
    clearError,
    isCameraSupported
  } = useCameraStream();

  // Auto-start camera if requested
  useEffect(() => {
    if (autoStart && !isActive && !isLoading) {
      startCamera();
    }
  }, [autoStart, isActive, isLoading, startCamera]);

  // Handle errors
  useEffect(() => {
    if (error && typeof onError === 'function') {
      onError(error);
    }
  }, [error, onError]);

  const handleCapture = () => {
    const base64Image = captureImage();
    if (base64Image && typeof onCapture === 'function') {
      onCapture(base64Image);
    }
  };

  const handleStartCamera = () => {
    clearError();
    startCamera();
  };

  if (!isCameraSupported()) {
    return (
      <div className="text-center p-4 bg-light rounded">
        <i className="bi bi-camera-video-off" style={{ fontSize: "2rem" }}></i>
        <p className="mt-2 mb-0 text-muted">
          Camera is not supported on this device or browser.
        </p>
      </div>
    );
  }

  return (
    <div className={`camera-preview ${className}`} style={style}>
      {/* Video Preview */}
      <div className="position-relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-100 h-100"
          style={{ 
            objectFit: "cover",
            backgroundColor: "#000",
            display: isActive ? "block" : "none",
            position: "absolute",
            top: 0,
            left: 0
          }}
        />
        
        {/* Face Frame Overlay */}
        {showFaceOverlay && isActive && (
          <div className="face-frame-overlay">
            <div className="face-frame-placeholder">
            </div>
          </div>
        )}
        

        
        {/* Loading State */}
        {isLoading && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 rounded">
            <div className="text-white text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 mb-0">Starting camera...</p>
            </div>
          </div>
        )}

        {/* No Camera State */}
        {!isActive && !isLoading && (
          <div className="text-center p-4 bg-dark text-white rounded">
            <i className="bi bi-camera-video" style={{ fontSize: "3rem" }}></i>
            <p className="mt-2 mb-0">Camera preview will appear here</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="alert alert-danger mt-2 mb-0">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}
      </div>




    </div>
  );
}