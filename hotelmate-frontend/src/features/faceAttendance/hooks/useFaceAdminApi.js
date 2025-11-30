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
      const response = await api.post(`/staff/hotel/${hotelSlug}/attendance/face-management/revoke-face/`, {
        staff_id: Number(staffId),
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
   * Get face lifecycle audit logs
   * @param {Object} params - Audit log parameters
   * @param {string} params.hotelSlug - Hotel slug identifier
   * @param {string|number} [params.staffId] - Filter by staff ID
   * @param {string} [params.action] - Filter by action (REGISTERED/REVOKED/RE_REGISTERED)
   * @param {string} [params.startDate] - Filter from date (YYYY-MM-DD)
   * @param {string} [params.endDate] - Filter to date (YYYY-MM-DD)
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.pageSize=50] - Results per page
   * @returns {Promise<Object>} Audit logs response data
   */
  async function getFaceAuditLogs({ hotelSlug, staffId, action, startDate, endDate, page = 1, pageSize = 50 }) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (staffId) params.append('staff_id', staffId);
      if (action) params.append('action', action);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (page) params.append('page', page);
      if (pageSize) params.append('page_size', pageSize);

      const response = await api.get(`/staff/hotel/${hotelSlug}/attendance/face-management/audit-logs/?${params.toString()}`);
      const data = response.data;
      return data;
    } catch (err) {
      const apiError = {
        message: err.response?.data?.detail || err.response?.data?.error || err.message || "Failed to fetch audit logs",
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
    getFaceAuditLogs,
    clearError 
  };
}