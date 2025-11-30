import { useState } from "react";
import api from "@/services/api";

/**
 * Face Administration API Hook
 * Handles manager-level face operations (revoke, reset, etc.)
 */
export function useFaceAdminApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { message: string, code?: string } | null

  /**
   * Revoke face registration for a staff member
   * @param {Object} params - Revoke parameters
   * @param {string} params.hotelSlug - Hotel slug identifier
   * @param {string|number} params.staffId - Staff ID
   * @param {string} [params.reason] - Optional reason for revocation
   * @returns {Promise<Object>} Revoke response data
   */
  async function revokeFace({ hotelSlug, staffId, reason }) {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/staff/${hotelSlug}/${staffId}/revoke-face/`, {
        reason: reason || "Manager revoked face data",
      });

      const data = response.data;
      return data;
    } catch (err) {
      const apiError = {
        message: err.response?.data?.detail || err.response?.data?.error || err.message || "Failed to revoke face data",
        code: err.response?.data?.code || null,
      };
      
      setError(apiError);
      throw apiError;
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
    revokeFace, 
    clearError 
  };
}