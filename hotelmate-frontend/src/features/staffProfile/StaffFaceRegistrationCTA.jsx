import React from "react";
import { useNavigate } from "react-router-dom";
import { useHotelFaceConfig } from "@/features/faceAttendance/hooks/useHotelFaceConfig";

/**
 * Face Registration Call-to-Action Component
 * Shows a button to register face data only when:
 * - User is viewing their own profile
 * - Staff hasn't registered face yet
 */
export default function StaffFaceRegistrationCTA({ staff, hotelSlug, isOwnProfile }) {
  const navigate = useNavigate();
  const { loading: configLoading, canRegisterFace, isFaceEnabledForStaff } = useHotelFaceConfig(hotelSlug);

  // Don't show if not own profile or face already registered
  if (!isOwnProfile || staff.has_registered_face) {
    return null;
  }

  // Don't show while config is loading
  if (configLoading) {
    return null;
  }

  // Check if face registration is allowed for this staff member
  const faceStatus = isFaceEnabledForStaff(staff);
  const canRegister = canRegisterFace(staff);

  // If face is disabled, show informational message instead of button
  if (!faceStatus.enabled) {
    return (
      <div className="mt-4">
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Face Registration Not Available</strong>
          <div className="small mt-1">{faceStatus.reason}</div>
        </div>
      </div>
    );
  }

  function handleRegisterFaceClick() {
    navigate(`/face/${hotelSlug}/register?staffId=${staff.id}`);
  }

  return (
    <div className="mt-4">
      <button
        className="btn btn-outline-primary w-100 staff-face-cta"
        onClick={handleRegisterFaceClick}
      >
        Register Face Data
      </button>
      <p className="small text-muted mt-1 text-center">
        Used for fast and secure face clock-in at the staff kiosk.
      </p>
    </div>
  );
}