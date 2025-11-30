import React from "react";
import { FaUserCircle } from "react-icons/fa";

export default function StaffCard({ staff, onClick }) {
  const fullName = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim();
  const imgUrl = staff.profile_image_url;

  const department = staff.department_detail?.name || "N/A";
  const role = staff.role_detail?.name || "N/A";
  
  return (
    <div
      className="card shadow-sm px-3 py-2 border-0"
      onClick={onClick}
      role="button"
      style={{
        cursor: "pointer",
        borderRadius: "15px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <div className="d-flex align-items-center gap-3">
        <div
          className="rounded-circle overflow-hidden bg-light d-flex justify-content-center align-items-center"
          style={{ width: 48, height: 48 }}
        >
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={fullName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <FaUserCircle size={32} className="text-muted" />
          )}
        </div>
        
        <div className="flex-grow-1">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h6 className="mb-0 fw-semibold">{fullName || "Unnamed"}</h6>
              <div className="d-flex gap-2 mt-1">
                <small className="text-muted">{department}</small>
                <span className="text-muted">•</span>
                <small className="text-muted">{role}</small>
              </div>
            </div>
            
            <div className="d-flex align-items-center gap-2">
              {/* Active Status Badge */}
              <span className={`badge ${staff.is_active ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                {staff.is_active ? 'Active' : 'Inactive'}
              </span>
              
              {/* Face Registration Status Badge */}
              {staff.has_registered_face ? (
                <span className="badge bg-success" style={{ fontSize: '0.7rem' }} title="Face data registered">
                  <i className="bi bi-person-check me-1"></i>
                  Face OK
                </span>
              ) : (
                <span className="badge bg-warning text-dark" style={{ fontSize: '0.7rem' }} title="Face data missing - click to manage">
                  <i className="bi bi-person-exclamation me-1"></i>
                  No Face
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
