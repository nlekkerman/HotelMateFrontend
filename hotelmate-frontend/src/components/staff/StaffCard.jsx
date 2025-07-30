// src/components/staff/StaffCard.jsx
import React from "react";
import { FaUserCircle } from "react-icons/fa";

export default function StaffCard({ staff, onClick }) {
  const fullName = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim();
  const imgUrl = staff.profile_image_url;

  const formatDepartment = (dept) => {
    if (!dept) return "N/A";

    if (typeof dept === "string") {
      return dept
        .split(/[\s_]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    if (typeof dept === "object") {
      const value = dept.name || dept.slug || dept.department || "";
      if (typeof value === "string" && value.length > 0) {
        return value
          .split(/[\s_]+/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    }

    // if dept is a number or something else, fallback
    if (typeof dept === "number") {
      return `Department #${dept}`;
    }

    return "N/A";
  };


  const department = formatDepartment(
    staff.department_detail ?? staff.department
  );


  return (
    <div
      className="card shadow-sm px-3 py-2 border-0"
      onClick={onClick}
      role="button"
      style={{
        cursor: "pointer",
        borderRadius: "50px", // pill shape
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
        <div>
          <h6 className="mb-0 fw-semibold">{fullName || "Unnamed"}</h6>
          <small className="text-muted">{department}</small>
        </div>
      </div>
    </div>
  );
}
