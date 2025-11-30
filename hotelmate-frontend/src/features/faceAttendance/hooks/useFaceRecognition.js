import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

/**
 * Hook for managing face-api.js model loading and face detection/encoding
 * This helps bridge the enhanced face recognition API requirements
 */
export function useFaceRecognitionModels() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    if (modelsLoaded) return;
    
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      
      setModelsLoaded(true);
    } catch (err) {
      console.error('Failed to load face-api.js models:', err);
      setError('Failed to load face recognition models. Please check if model files are available.');
    } finally {
      setLoading(false);
    }
  };

  return { modelsLoaded, loading, error, loadModels };
}

/**
 * Hook for extracting face encodings from images
 * Used to generate the 128-dimensional encoding arrays required by enhanced API
 */
export function useFaceEncoder() {
  const { modelsLoaded } = useFaceRecognitionModels();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Extract face encoding from base64 image
   * @param {string} base64Image - Base64 encoded image
   * @returns {Promise<{encoding: number[], confidence: number, error?: string}>}
   */
  const extractFaceEncoding = async (base64Image) => {
    if (!modelsLoaded) {
      throw new Error('Face recognition models not loaded');
    }

    setProcessing(true);
    setError(null);

    try {
      // Convert base64 to HTML image element
      const img = new Image();
      img.src = base64Image;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Detect face with landmarks and descriptor
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return {
          encoding: null,
          confidence: 0,
          error: 'NO_FACE_DETECTED'
        };
      }

      // Convert Float32Array to regular array for JSON serialization
      const encoding = Array.from(detection.descriptor);
      
      // Get confidence score (detection score)
      const confidence = detection.detection.score;

      return {
        encoding,
        confidence,
        error: null
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to process face encoding';
      setError(errorMessage);
      return {
        encoding: null,
        confidence: 0,
        error: errorMessage
      };
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Validate face quality before encoding
   * @param {string} base64Image - Base64 encoded image  
   * @returns {Promise<{valid: boolean, issues: string[]}>}
   */
  const validateFaceQuality = async (base64Image) => {
    if (!modelsLoaded) {
      return { valid: false, issues: ['Face recognition models not loaded'] };
    }

    try {
      const img = new Image();
      img.src = base64Image;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Detect all faces in the image
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      const issues = [];

      if (detections.length === 0) {
        issues.push('No face detected in image');
      } else if (detections.length > 1) {
        issues.push('Multiple faces detected - only one face should be visible');
      } else {
        const detection = detections[0];
        
        // Check confidence score
        if (detection.detection.score < 0.5) {
          issues.push('Face detection confidence too low - improve lighting or image quality');
        }

        // Check face size (should be reasonable portion of image)
        const faceArea = detection.detection.box.width * detection.detection.box.height;
        const imageArea = img.width * img.height;
        const faceRatio = faceArea / imageArea;
        
        if (faceRatio < 0.05) {
          issues.push('Face too small in image - move closer to camera');
        } else if (faceRatio > 0.8) {
          issues.push('Face too large in image - move back from camera');
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };

    } catch (err) {
      return {
        valid: false,
        issues: [`Face validation failed: ${err.message}`]
      };
    }
  };

  return {
    processing,
    error,
    extractFaceEncoding,
    validateFaceQuality,
    modelsLoaded
  };
}

/**
 * Enhanced face recognition utilities
 */
export const FaceRecognitionUtils = {
  /**
   * Get user-friendly error message for face recognition errors
   */
  getErrorMessage(errorCode) {
    const messages = {
      'NO_FACE_DETECTED': 'No face found in the image. Please position yourself in front of the camera.',
      'MULTIPLE_FACES': 'Multiple faces detected. Please ensure only you are visible in the camera view.',
      'FACE_TOO_BLURRY': 'Image quality too low. Please move closer to the camera and ensure good lighting.',
      'FACE_NOT_RECOGNIZED': 'Face not recognized. Ensure you are looking directly at the camera in good lighting.',
      'FACE_DATA_REVOKED': 'Your face data has been revoked. Please register again if needed.',
      'NO_FACE_REGISTERED': 'No face registration found. Please register your face first.',
      'CONSENT_REQUIRED': 'Explicit consent is required for face processing.',
      'HOTEL_FACE_DISABLED': 'Face recognition is not enabled for this hotel.'
    };

    return messages[errorCode] || 'An unexpected face recognition error occurred.';
  },

  /**
   * Check if error code indicates a retryable error
   */
  isRetryableError(errorCode) {
    const retryable = [
      'NO_FACE_DETECTED',
      'MULTIPLE_FACES', 
      'FACE_TOO_BLURRY',
      'FACE_NOT_RECOGNIZED'
    ];
    return retryable.includes(errorCode);
  }
};