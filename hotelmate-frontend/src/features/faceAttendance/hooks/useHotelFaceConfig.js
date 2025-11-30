import { useState, useEffect } from "react";
import api from "@/services/api";

/**
 * Hotel Face Configuration Hook
 * Fetches and manages hotel-specific face attendance settings
 */
export function useHotelFaceConfig(hotelSlug) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hotelSlug) {
      setConfig(null);
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      setLoading(true);
      setError(null);

      try {
        // Enable face attendance by default for development/testing
        const faceConfig = {
          face_attendance_enabled: true,
          face_attendance_min_confidence: 0.8,
          face_department_restrictions: [],
          face_role_restrictions: [],
          max_session_hours: 12,
          break_warning_hours: 6,
          long_session_warning_hours: 10,
        };

        setConfig(faceConfig);
      } catch (err) {
        console.error("[useHotelFaceConfig] Error fetching face config:", err);
        
        // Set default config on error
        setConfig({
          face_attendance_enabled: true,
          face_attendance_min_confidence: 0.8,
          face_department_restrictions: [],
          face_role_restrictions: [],
          max_session_hours: 12,
          break_warning_hours: 6,
          long_session_warning_hours: 10,
        });
        
        setError({
          message: "Face recognition is not available on this system",
          code: "FACE_NOT_IMPLEMENTED",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [hotelSlug]);

  /**
   * Check if face attendance is enabled for a specific staff member
   * @param {Object} staff - Staff object with department and role info
   * @returns {Object} - { enabled: boolean, reason?: string }
   */
  const isFaceEnabledForStaff = (staff) => {
    if (!config) {
      return { enabled: true };
    }

    if (!config.face_attendance_enabled) {
      return { 
        enabled: false, 
        reason: "Face attendance is disabled for this hotel" 
      };
    }

    // Check department restrictions
    if (config.face_department_restrictions?.length > 0) {
      const staffDeptId = staff.department || staff.department_detail?.id;
      if (staffDeptId && config.face_department_restrictions.includes(staffDeptId)) {
        return { 
          enabled: false, 
          reason: "Face attendance is not available for your department" 
        };
      }
    }

    // Check role restrictions  
    if (config.face_role_restrictions?.length > 0) {
      const staffRoleId = staff.role || staff.role_detail?.id;
      if (staffRoleId && config.face_role_restrictions.includes(staffRoleId)) {
        return { 
          enabled: false, 
          reason: "Face attendance is not available for your role" 
        };
      }
    }

    return { enabled: true };
  };

  /**
   * Check if face registration is allowed for a staff member
   * @param {Object} staff - Staff object
   * @returns {boolean}
   */
  const canRegisterFace = (staff) => {
    const { enabled } = isFaceEnabledForStaff(staff);
    return enabled;
  };

  /**
   * Check if face clock-in is allowed for a staff member
   * @param {Object} staff - Staff object  
   * @returns {boolean}
   */
  const canUseFaceClockIn = (staff) => {
    const { enabled } = isFaceEnabledForStaff(staff);
    return enabled && staff.has_registered_face;
  };

  return {
    config,
    loading,
    error,
    isFaceEnabledForStaff,
    canRegisterFace,
    canUseFaceClockIn,
    // Convenience getters
    isEnabled: config?.face_attendance_enabled ?? true,
    minConfidence: config?.face_attendance_min_confidence ?? 0.8,
    maxSessionHours: config?.max_session_hours ?? 12,
    breakWarningHours: config?.break_warning_hours ?? 6,
    longSessionWarningHours: config?.long_session_warning_hours ?? 10,
  };
}