import { useState, useEffect, useRef } from "react";

/**
 * Camera Stream Management Hook
 * Handles webcam access, stream management, and image capture
 */
export function useCameraStream() {
  const [stream, setStream] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);

  /**
   * Start camera stream
   */
  const startCamera = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      setStream(mediaStream);
      setIsActive(true);
      
      // Attach stream to video element if it exists
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      let errorMessage = "Camera access denied or not available";
      
      if (err.name === "NotFoundError") {
        errorMessage = "No camera found on this device";
      } else if (err.name === "NotAllowedError") {
        errorMessage = "Camera access was denied. Please allow camera access and try again.";
      } else if (err.name === "NotReadableError") {
        errorMessage = "Camera is being used by another application";
      }
      
      setError(errorMessage);
      console.error("Camera access error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Stop camera stream
   */
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
      setIsActive(false);
      
      // Clear video element source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  /**
   * Capture image from video stream
   * @returns {string|null} Base64 encoded image or null if capture fails
   */
  const captureImage = () => {
    if (!videoRef.current || !isActive) {
      setError("Camera is not active or ready");
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      
      return base64Image;
    } catch (err) {
      setError("Failed to capture image");
      console.error("Image capture error:", err);
      return null;
    }
  };

  /**
   * Check if camera is supported
   */
  const isCameraSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return {
    // State
    stream,
    isActive,
    error,
    isLoading,
    
    // Refs
    videoRef,
    
    // Actions
    startCamera,
    stopCamera,
    captureImage,
    clearError,
    
    // Utilities
    isCameraSupported
  };
}