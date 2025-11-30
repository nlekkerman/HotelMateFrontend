import { useState } from "react";

/**
 * Handle API response and parse structured errors
 * @param {Response} res - Fetch response object
 * @returns {Promise<Object>} Parsed response data
 */
async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiCode = data.code || null;
    const apiDetail = data.detail || data.error || "Unexpected error";
    const err = new Error(apiDetail);
    err.code = apiCode;
    err.raw = data;
    throw err;
  }
  return data;
}

/**
 * Face Recognition API Hook
 * Handles face registration and clock-in with corrected URL format (single hotel_slug)
 */
export function useFaceApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { message: string, code?: string } | null

  /**
   * Register a face for a staff member
   * @param {Object} params - Registration parameters
   * @param {string} params.hotelSlug - Hotel slug identifier
   * @param {string|number} params.staffId - Staff ID
   * @param {string} params.imageBase64 - Base64 encoded image
   * @returns {Promise<Object>} Registration response data
   */
  async function registerFace({ hotelSlug, staffId, imageBase64 }) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/staff/hotel/${hotelSlug}/attendance/clock-logs/register-face/`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            // Add CSRF token if required
            ...(document.querySelector('[name=csrfmiddlewaretoken]') && {
              'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            })
          },
          body: JSON.stringify({
            staff_id: Number(staffId),
            image: imageBase64,
          }),
        }
      );

      const data = await handleResponse(res);
      return data;
    } catch (err) {
      setError({
        message: err.message,
        code: err.code || null,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clock in using face recognition
   * @param {Object} params - Clock-in parameters
   * @param {string} params.hotelSlug - Hotel slug identifier
   * @param {string} params.imageBase64 - Base64 encoded image
   * @param {string} [params.locationNote] - Optional location note
   * @returns {Promise<Object>} Clock-in response data
   */
  async function clockInWithFace({ hotelSlug, imageBase64, locationNote }) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/staff/hotel/${hotelSlug}/attendance/clock-logs/face-clock-in/`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            // Add CSRF token if required
            ...(document.querySelector('[name=csrfmiddlewaretoken]') && {
              'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            })
          },
          body: JSON.stringify({
            image: imageBase64,
            location_note: locationNote || "Kiosk",
          }),
        }
      );

      const data = await handleResponse(res);
      return data;
    } catch (err) {
      setError({
        message: err.message,
        code: err.code || null,
      });
      throw err;
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
    clearError 
  };
}