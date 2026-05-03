import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useCan } from "@/rbac";
import { useFaceAdminApi } from "@/features/faceAttendance/hooks/useFaceAdminApi";
import { useHotelFaceConfig } from "@/features/faceAttendance/hooks/useHotelFaceConfig";
import NavigationPermissionManager from "./NavigationPermissionManager";
import StaffRosterAnalytics from "./StaffRosterAnalytics";
import useStaffMetadata from "@/hooks/useStaffMetadata";

function StaffDetails() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const { hotelSlug, id } = useParams();
  // Phase 1 RBAC: backend-driven action authority via `user.rbac.<module>.actions.<key>`.
  // Profile-field edits and authority assignments are intentionally separated:
  //   - profile fields (name, active) → `staff_update_profile` (or self-edit)
  //   - role / department / access_level dropdowns → matching `authority_*` keys
  // Holding an authority_* key alone must NOT grant profile-field edits.
  const { can } = useCan();
  const { user: authUser } = useAuth();
  const canReadModule = can('staff_management', 'staff_read');
  const isViewingOwnProfile =
    !!authUser?.id && !!staff?.user?.id && authUser.id === staff.user.id;
  // Edit gate: explicit RBAC permission, OR self-edit on own profile.
  // No hidden backend flags, no implicit fallbacks. Backend remains the
  // final 403 authority; this only controls UI affordance.
  const canEditProfile =
    can('staff_management', 'staff_update_profile') || isViewingOwnProfile;
  const canViewAuthority = can('staff_management', 'authority_view');
  const canAssignDepartment = can('staff_management', 'authority_department_assign');
  const canAssignRole = can('staff_management', 'authority_role_assign');
  const canAssignAccessLevel = can('staff_management', 'authority_access_level_assign');
  const canDepartmentManage = can('staff_management', 'department_manage');
  const canRoleManage = can('staff_management', 'role_manage');
  // RBAC: face management actions live in the canonical `attendance` module.
  // Each button below is gated on its specific action key. Section visibility
  // is the OR of these — show if user has any of them. NO `face_manage`
  // shortcut (that key does not exist in backend MODULE_POLICY).
  const canRegisterOtherFace = can('attendance', 'face_register_other');
  const canRevokeFace = can('attendance', 'face_revoke');
  const canViewFaceAudit = can('attendance', 'face_audit_read');
  const canShowFaceSection =
    canRegisterOtherFace || canRevokeFace || canViewFaceAudit;
  const queryClient = useQueryClient();
  const { departments, roles, accessLevels, refetch: refetchMetadata } = useStaffMetadata(hotelSlug);
  const [newDeptName, setNewDeptName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  
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
      try {
        const response = await api.get(`staff/${hotelSlug}/${id}/`);
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

  const startEditing = () => {
    setEditData({
      first_name: staff.first_name || '',
      last_name: staff.last_name || '',
      department: staff.department_detail?.id || staff.department || '',
      role: staff.role_detail?.id || staff.role || '',
      access_level: staff.access_level || 'regular_staff',
      is_active: staff.is_active,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim()) return;
    setCreatingDept(true);
    try {
      await api.post(`/staff/${hotelSlug}/departments/`, { name: newDeptName.trim() });
      toast.success(`Department "${newDeptName.trim()}" created`);
      setNewDeptName('');
      await refetchMetadata();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to create department');
    } finally {
      setCreatingDept(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      await api.post(`/staff/${hotelSlug}/roles/`, { name: newRoleName.trim() });
      toast.success(`Role "${newRoleName.trim()}" created`);
      setNewRoleName('');
      await refetchMetadata();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to create role');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        first_name: editData.first_name,
        last_name: editData.last_name,
        department: editData.department || null,
        role: editData.role || null,
        access_level: editData.access_level,
        is_active: editData.is_active,
      };
      await api.patch(`staff/${hotelSlug}/${id}/`, payload);
      const response = await api.get(`staff/${hotelSlug}/${id}/`);
      setStaff(response.data);
      setIsEditing(false);
      toast.success('Staff profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ["staffMe", hotelSlug] });
    } catch (err) {
      console.error('Failed to update staff:', err);
      toast.error(err.response?.data?.detail || 'Failed to update staff profile');
    } finally {
      setSaving(false);
    }
  };

  const formatDepartment = (dept) => {
    if (!dept) return "N/A";
    let name = typeof dept === "object" ? dept.name || dept.slug || "" : dept;
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (error) return <div className="alert alert-danger mt-3">{error}</div>;
  if (!staff) {

    return <div className="text-muted mt-3">Loading staff details...</div>;
  }
  // Phase 1 RBAC: top-level read gate. Backend-authoritative.
  if (!canReadModule) {
    return (
      <div className="container mt-4 mb-5 p-4 bg-white rounded shadow-sm">
        <h2 className="mb-3 text-danger">
          <i className="bi bi-shield-lock me-2"></i>Access denied
        </h2>
        <p className="text-muted mb-3">
          You do not have permission to view this staff profile.
        </p>
        <button
          onClick={() => navigate(`/${hotelSlug}/staff`)}
          className="btn btn-outline-secondary"
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to Staff List
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5 p-4 bg-white rounded shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 text-primary">👤 Staff Details</h2>
        <div className="d-flex gap-2">
          {canEditProfile && !isEditing && (
            <button onClick={startEditing} className="btn btn-outline-primary">
              <i className="bi bi-pencil me-2"></i>Edit Profile
            </button>
          )}
          {isEditing && (
            <>
              <button onClick={cancelEditing} className="btn btn-outline-secondary" disabled={saving}>
                Cancel
              </button>
              {canEditProfile && (
                <button onClick={handleSave} className="btn btn-success" disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-2"></i>Save</>}
                </button>
              )}
            </>
          )}
          <button
            onClick={() => navigate(`/${hotelSlug}/staff`)}
            className="btn btn-outline-secondary"
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Staff List
          </button>
        </div>
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
          {isEditing ? (
            <>
              <div className="mb-3">
                <label className="form-label fw-bold">First Name</label>
                <input type="text" className="form-control" value={editData.first_name}
                  disabled={!canEditProfile}
                  onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-bold">Last Name</label>
                <input type="text" className="form-control" value={editData.last_name}
                  disabled={!canEditProfile}
                  onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))} />
              </div>
            </>
          ) : (
            <>
              <p><strong>First Name:</strong> {staff.first_name}</p>
              <p><strong>Last Name:</strong> {staff.last_name}</p>
            </>
          )}
          <p>
            <strong>Phone Number:</strong> {staff.phone_number || "—"}
          </p>
        </div>
        <div className="col-md-6">
          {isEditing ? (
            <>
              <div className="mb-3">
                <label className="form-label fw-bold">Department</label>
                <select className="form-select" value={editData.department}
                  disabled={!canAssignDepartment}
                  onChange={(e) => setEditData(prev => ({ ...prev, department: e.target.value }))}>
                  <option value="">-- No Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {departments.length === 0 && canDepartmentManage && (
                  <div className="mt-2">
                    <div className="input-group input-group-sm">
                      <input type="text" className="form-control" placeholder="New department name"
                        value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateDept()} />
                      <button className="btn btn-outline-success" type="button" onClick={handleCreateDept} disabled={creatingDept || !newDeptName.trim()}>
                        {creatingDept ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-plus"></i> Add</>}
                      </button>
                    </div>
                    <small className="text-muted">No departments exist. Create one first.</small>
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label fw-bold">Role</label>
                <select className="form-select" value={editData.role}
                  disabled={!canAssignRole}
                  onChange={(e) => setEditData(prev => ({ ...prev, role: e.target.value }))}>
                  <option value="">-- No Role --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {roles.length === 0 && canRoleManage && (
                  <div className="mt-2">
                    <div className="input-group input-group-sm">
                      <input type="text" className="form-control" placeholder="New role name"
                        value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateRole()} />
                      <button className="btn btn-outline-success" type="button" onClick={handleCreateRole} disabled={creatingRole || !newRoleName.trim()}>
                        {creatingRole ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-plus"></i> Add</>}
                      </button>
                    </div>
                    <small className="text-muted">No roles exist. Create one first.</small>
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label fw-bold">Access Level</label>
                <select className="form-select" value={editData.access_level}
                  disabled={!canAssignAccessLevel}
                  onChange={(e) => setEditData(prev => ({ ...prev, access_level: e.target.value }))}>
                  {accessLevels.length > 0 ? accessLevels.map(al => (
                    <option key={al.value || al} value={al.value || al}>{al.label || al}</option>
                  )) : (
                    <>
                      <option value="regular_staff">Regular Staff</option>
                      <option value="staff_admin">Staff Admin</option>
                      <option value="super_staff_admin">Super Staff Admin</option>
                    </>
                  )}
                </select>
              </div>
              <div className="mb-3 form-check">
                <input type="checkbox" className="form-check-input" id="isActiveCheck" checked={editData.is_active}
                  disabled={!canEditProfile}
                  onChange={(e) => setEditData(prev => ({ ...prev, is_active: e.target.checked }))} />
                <label className="form-check-label fw-bold" htmlFor="isActiveCheck">Active</label>
              </div>
            </>
          ) : (
            <>
              <p>
                <strong>Department:</strong>{" "}
                {formatDepartment(staff.department_detail || staff.department)}
              </p>
              <p>
                <strong>Role:</strong> {staff.role_detail?.name || "—"}
              </p>
              <p>
                <strong>Access Level:</strong>{" "}
                <span className={`badge ${staff.access_level === 'super_staff_admin' ? 'bg-danger' : staff.access_level === 'staff_admin' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                  {staff.access_level?.replace(/_/g, ' ') || "—"}
                </span>
              </p>
              <p>
                <strong>Active:</strong>
                <span className={`ms-2 badge ${staff.is_active ? "bg-success" : "bg-secondary"}`}>
                  {staff.is_active ? "Yes" : "No"}
                </span>
              </p>
            </>
          )}
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
      {/* RBAC: face data lives in the `attendance` module. Section visibility
          is the OR of the three canonical action keys; each individual
          control below is gated on its specific key. NO tier / role-string
          checks. NO synthetic `face_manage` key. */}
      {canShowFaceSection && (
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
                    canRevokeFace && (
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => setShowRevokeConfirm(true)}
                    >
                      <i className="bi bi-person-x me-2"></i>
                      Revoke Face Data
                    </button>
                    )
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
                  
                  {canRegisterOtherFace && (
                  <button
                    className="btn btn-primary"
                    onClick={handleRegisterFace}
                  >
                    <i className="bi bi-camera me-2"></i>
                    Register Face Data
                  </button>
                  )}
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

      {/* Navigation Permissions Section */}
      {/* Phase 1 RBAC: visibility = `authority_view` (View authority/permissions */}
      {/* for staff). NavigationPermissionManager is read-only (disabled */}
      {/* checkboxes); a future editor would gate writes on `authority_nav_assign`. */}
      {canViewAuthority && (
        <div className="mt-5">
          <hr className="mb-4" />
          <button 
            className="btn btn-outline-primary mb-3"
            onClick={() => setShowPermissions(!showPermissions)}
          >
            <i className={`bi bi-${showPermissions ? 'eye-slash' : 'shield-lock'} me-2`}></i>
            {showPermissions ? 'Hide' : 'Show'} Navigation Access
          </button>
          
          {showPermissions && (
            <NavigationPermissionManager staffId={id} hotelSlug={hotelSlug} />
          )}
        </div>
      )}
    </div>
  );
}

export default StaffDetails;
