import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useFaceAdminApi } from "@/features/faceAttendance/hooks/useFaceAdminApi";
import { useHotelFaceConfig } from "@/features/faceAttendance/hooks/useHotelFaceConfig";
import NavigationPermissionManager from "./NavigationPermissionManager";
import StaffRosterAnalytics from "./StaffRosterAnalytics";

function StaffDetails() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const { hotelSlug, id } = useParams();
  const { canAccess } = usePermissions();
  const queryClient = useQueryClient();
  
  // Face admin operations
  const { loading: revokeLoading, error: revokeError, revokeFace, clearError } = useFaceAdminApi();
  
  // Face configuration
  const { 
    loading: configLoading, 
    canRegisterFace, 
    isFaceEnabledForStaff 
  } = useHotelFaceConfig(hotelSlug);
  
  useEffect(() => {
    const fetchStaff = async () => {
      console.log("[StaffDetails] Fetching staff details for:", {
        hotelSlug,
        id,
      });
      try {
        const response = await api.get(`staff/${hotelSlug}/${id}/`);
        console.log("[StaffDetails] API response data:", response.data);
        setStaff(response.data);
      } catch (err) {
        setError("Failed to fetch staff details");
        console.error(err);
      }
    };

    fetchStaff();
  }, [hotelSlug, id]);

  // Handle face revoke action
  const handleRevokeClick = async () => {
    try {
      clearError();
      await revokeFace({
        hotelSlug,
        staffId: id,
        reason: revokeReason
      });

      // Success: refetch staff data to update UI
      const response = await api.get(`staff/${hotelSlug}/${id}/`);
      setStaff(response.data);
      
      // Reset UI state
      setShowRevokeConfirm(false);
      setRevokeReason("");
      
      // Show success message
      toast.success("Face data revoked successfully");
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["staffMe", hotelSlug] });
      queryClient.invalidateQueries({ queryKey: ["staffDetails", hotelSlug, id] });
      
    } catch (err) {
      toast.error(err.message || "Failed to revoke face data");
    }
  };

  // Handle register face navigation
  const handleRegisterFace = () => {
    navigate(`/face/${hotelSlug}/register?staffId=${id}`);
  };

  const formatDepartment = (dept) => {
    console.log("[StaffDetails] Formatting department:", dept);
    if (!dept) return "N/A";
    let name = typeof dept === "object" ? dept.name || dept.slug || "" : dept;
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (error) return <div className="alert alert-danger mt-3">{error}</div>;
  if (!staff) {
    console.log("[StaffDetails] No staff data yet — showing loading message.");
    return <div className="text-muted mt-3">Loading staff details...</div>;
  }

  console.log("[StaffDetails] Rendering staff details:", staff);

  return (
    <div className="container mt-4 mb-5 p-4 bg-white rounded shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 text-primary">👤 Staff Details</h2>
        <button
          onClick={() => navigate(`/${hotelSlug}/staff`)}
          className="btn btn-outline-secondary"
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to Staff List
        </button>
      </div>

      <div
        className="mb-4  d-flex align-items-center justify-content-start"
        style={{ height: 180 }}
      >
        <div
          className="rounded-circle overflow-hidden bg-light d-flex justify-content-center align-items-center border"
          style={{ width: 180, height: 180 }}
        >
          {staff.profile_image_url ? (
            <img
              src={staff.profile_image_url}
              alt={`${staff.first_name} ${staff.last_name}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <FaUserCircle size={120} className="text-muted" />
          )}
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          {console.log("[StaffDetails] Hotel path check:", staff.user)}
          <p className="bg-success text-white">
            <strong className="ps-1">Hotel:</strong>{" "}
            <strong>{staff.user?.staff_profile?.hotel?.name || "N/A"}</strong>
          </p>
          <p>
            <strong>Username:</strong>{" "}
            <span className="text-capitalize">
              {staff.user?.username || "—"}
            </span>
          </p>
          <p>
            <strong>Email:</strong> {staff.user?.email || "N/A"}
          </p>
          <p>
            <strong>First Name:</strong> {staff.first_name}
          </p>
          <p>
            <strong>Last Name:</strong> {staff.last_name}
          </p>
          <p>
            <strong>Phone Number:</strong> {staff.phone_number || "—"}
          </p>
        </div>
        <div className="col-md-6">
          <p>
            <strong>Department:</strong>{" "}
            {formatDepartment(staff.department_detail || staff.department)}
          </p>
          <p>
            <strong>Role:</strong> {staff.role_detail?.name || "—"}
          </p>
          <p>
            <strong>Active:</strong>
            <span
              className={`ms-2 badge ${
                staff.is_active ? "bg-success" : "bg-secondary"
              }`}
            >
              {staff.is_active ? "Yes" : "No"}
            </span>
          </p>
          <p>
            <strong>Face Registration:</strong>
            <span
              className={`ms-2 badge ${
                staff.has_registered_face ? "bg-success" : "bg-warning text-dark"
              }`}
            >
              <i className={`bi bi-${staff.has_registered_face ? "person-check" : "person-exclamation"} me-1`}></i>
              {staff.has_registered_face ? "Registered" : "Missing"}
            </span>
          </p>
        </div>
      </div>

      {/* Face Management Section */}
      {(canAccess(['staff_admin', 'super_staff_admin']) || canAccess(['manager'])) && (
        <div className="mt-4">
          <hr className="mb-4" />
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-person-badge me-2"></i>
                Face Registration Management
              </h5>
            </div>
            <div className="card-body">
              {configLoading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm me-2"></div>
                  Loading face configuration...
                </div>
              ) : (() => {
                const faceStatus = isFaceEnabledForStaff(staff);
                const canRegister = canRegisterFace(staff);
                
                if (!faceStatus.enabled) {
                  return (
                    <div className="alert alert-warning">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      <strong>Face Registration Not Available</strong>
                      <div className="small mt-1">{faceStatus.reason}</div>
                    </div>
                  );
                }
                
                return staff.has_registered_face ? (
                <div>
                  <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>
                    This staff member has face data registered and can use face clock-in.
                  </div>
                  
                  {!showRevokeConfirm ? (
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => setShowRevokeConfirm(true)}
                    >
                      <i className="bi bi-person-x me-2"></i>
                      Revoke Face Data
                    </button>
                  ) : (
                    <div className="border rounded p-3 bg-light">
                      <h6 className="mb-3">Confirm Face Data Revocation</h6>
                      <div className="mb-3">
                        <label className="form-label">
                          Reason (optional)
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., Security concern, staff request, etc."
                          value={revokeReason}
                          onChange={(e) => setRevokeReason(e.target.value)}
                        />
                      </div>
                      
                      {revokeError && (
                        <div className="alert alert-danger">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          {revokeError.message}
                        </div>
                      )}
                      
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowRevokeConfirm(false);
                            setRevokeReason("");
                            clearError();
                          }}
                          disabled={revokeLoading}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={handleRevokeClick}
                          disabled={revokeLoading}
                        >
                          {revokeLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2"></span>
                              Revoking...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-person-x me-2"></i>
                              Confirm Revoke
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    This staff member has not registered face data and cannot use face clock-in.
                  </div>
                  
                  <button
                    className="btn btn-primary"
                    onClick={handleRegisterFace}
                  >
                    <i className="bi bi-camera me-2"></i>
                    Register Face Data
                  </button>
                </div>
              );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Staff Roster Analytics Section */}
      <div className="mt-4">
        <StaffRosterAnalytics 
          hotelSlug={hotelSlug} 
          staffId={id}
        />
      </div>

      {/* Navigation Permissions Section - Super Admin Only */}
      {canAccess(['super_staff_admin']) && (
        <div className="mt-5">
          <hr className="mb-4" />
          <button 
            className="btn btn-outline-primary mb-3"
            onClick={() => setShowPermissions(!showPermissions)}
          >
            <i className={`bi bi-${showPermissions ? 'eye-slash' : 'key'} me-2`}></i>
            {showPermissions ? 'Hide' : 'Manage'} Navigation Permissions
          </button>
          
          {showPermissions && (
            <NavigationPermissionManager staffId={id} />
          )}
        </div>
      )}
    </div>
  );
}

export default StaffDetails;
