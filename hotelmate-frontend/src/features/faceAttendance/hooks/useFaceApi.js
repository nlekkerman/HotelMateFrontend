import { useState } from "react";
import api from "@/services/api";



/**
 * Face Recognition API Hook
 * Handles face registration and clock-in with corrected URL format (single hotel_slug)
 */
export function useFaceApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { message: string, code?: string } | null

  /**
   * Register a face for a staff member (Enhanced API)
   * @param {Object} params - Registration parameters
   * @param {string} params.hotelSlug - Hotel slug identifier
   * @param {string|number} params.staffId - Staff ID
   * @param {string} params.imageBase64 - Base64 encoded image
   * @param {Array<number>} params.encoding - 128-dimensional face encoding array
   * @param {boolean} [params.consentGiven=true] - Explicit consent for face processing
   * @returns {Promise<Object>} Registration response data
   */
  async function registerFace({ hotelSlug, staffId, imageBase64, encoding, consentGiven = true }) {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(
        `/staff/hotel/${hotelSlug}/attendance/face-management/register-face/`,
        {
          staff_id: Number(staffId),
          image: imageBase64,
          encoding: encoding,
          consent_given: consentGiven,
        }
      );

      const data = response.data;
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || err.message || 'Registration failed';
      const errorCode = err.response?.data?.code || null;
      
      setError({
        message: errorMessage,
        code: errorCode,
      });
      
      const error = new Error(errorMessage);
      error.code = errorCode;
      throw error;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clock in using face recognition (Enhanced API)
   * @param {Object} params - Clock-in parameters
   * @param {string} params.hotelSlug - Hotel slug identifier
   * @param {string} params.imageBase64 - Base64 encoded image
   * @param {Array<number>} params.encoding - 128-dimensional face encoding array
   * @param {string} [params.locationNote] - Optional location note
   * @param {string} [params.forceAction] - Optional force action ("clock_in" or "clock_out")
   * @returns {Promise<Object>} Clock-in response data
   */
  async function clockInWithFace({ hotelSlug, imageBase64, locationNote, encoding, forceAction }) {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(
        `/staff/hotel/${hotelSlug}/attendance/face-management/face-clock-in/`,
        {
          image: imageBase64,
          encoding: encoding,
          location_note: locationNote || "Kiosk",
          force_action: forceAction,
        }
      );

      const data = response.data;
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || err.message || 'Clock-in failed';
      const errorCode = err.response?.data?.code || null;
      
      setError({
        message: errorMessage,
        code: errorCode,
      });
      
      const error = new Error(errorMessage);
      error.code = errorCode;
      throw error;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Check current user's face registration status
   * @param {Object} params - Status check parameters  
   * @param {string} params.hotelSlug - Hotel slug identifier
   * @returns {Promise<Object>} Face status response data
   */
  async function checkFaceStatus({ hotelSlug }) {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `/staff/hotel/${hotelSlug}/attendance/face-management/face-status/`
      );

      const data = response.data;
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || err.message || 'Status check failed';
      const errorCode = err.response?.data?.code || null;
      
      setError({
        message: errorMessage,
        code: errorCode,
      });
      
      const error = new Error(errorMessage);
      error.code = errorCode;
      throw error;
    } finally {
      setLoading(false);
    }
  }

  /**
   * List registered faces (admin function)
   * @param {Object} params - List parameters
   * @param {string} params.hotelSlug - Hotel slug identifier
   * @param {boolean} [params.activeOnly=true] - Filter active faces only
   * @param {string|number} [params.staffId] - Filter by specific staff ID
   * @returns {Promise<Object>} Face list response data
   */
  async function listRegisteredFaces({ hotelSlug, activeOnly = true, staffId }) {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (activeOnly !== undefined) params.active_only = activeOnly;
      if (staffId) params.staff_id = staffId;

      const response = await api.get(
        `/staff/hotel/${hotelSlug}/attendance/face-management/list-faces/`,
        { params }
      );

      const data = response.data;
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to list faces';
      const errorCode = err.response?.data?.code || null;
      
      setError({
        message: errorMessage,
        code: errorCode,
      });
      
      const error = new Error(errorMessage);
      error.code = errorCode;
      throw error;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clear any existing error state
   */
  function clearError() {
    setError(null);
  }

  return { 
    loading, 
    error, 
    registerFace, 
    clockInWithFace,
    checkFaceStatus,
    listRegisteredFaces,
    clearError 
  };
}