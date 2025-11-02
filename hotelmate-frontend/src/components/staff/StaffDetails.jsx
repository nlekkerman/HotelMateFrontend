import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import api from "@/services/api";
import { usePermissions } from "@/hooks/usePermissions";
import NavigationPermissionManager from "./NavigationPermissionManager";

function StaffDetails() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const { hotelSlug, id } = useParams();
  const { canAccess } = usePermissions();
  
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
        </div>
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
