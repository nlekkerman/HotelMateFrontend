import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FaEnvelope, FaUserShield, FaPhone, FaBuilding, 
  FaBriefcase, FaToggleOn, FaToggleOff, FaUserCircle 
} from "react-icons/fa";
import api from "@/services/api"; // Axios instance with auth token

const fetchStaffMe = async () => {
  const response = await api.get("/staff/me/");
  return response.data;
};

export default function StaffProfile() {
  const { data: staff, isLoading, isError, error } = useQuery({
    queryKey: ["staffMe"],
    queryFn: fetchStaffMe,
  });

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="alert alert-danger text-center">
          <strong>Error:</strong> {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div className="card shadow border-0 w-100" style={{ maxWidth: 400 }}>
        <div className="card-header bg-primary text-white text-center">
          <FaUserCircle size={32} className="mb-2" />
          <h4 className="mb-0">Staff Profile</h4>
        </div>
        <div className="card-body">
          {/* Name */}
          <h5 className="card-title text-center text-primary mb-4">
            {staff.first_name} {staff.last_name}
          </h5>

          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex align-items-center">
              <FaEnvelope className="me-2 text-secondary" />
              <span className="flex-grow-1">Email:</span>
              <span className="fw-semibold">{staff.email}</span>
            </li>
            <li className="list-group-item d-flex align-items-center">
              <FaUserShield className="me-2 text-secondary" />
              <span className="flex-grow-1">Access Level:</span>
              <span className="fw-semibold">
                {staff.access_level || "N/A"}
              </span>
            </li>
            <li className="list-group-item d-flex align-items-center">
              <FaPhone className="me-2 text-secondary" />
              <span className="flex-grow-1">Phone:</span>
              <span className="fw-semibold">
                {staff.phone_number || "N/A"}
              </span>
            </li>
            <li className="list-group-item d-flex align-items-center">
              <FaBuilding className="me-2 text-secondary" />
              <span className="flex-grow-1">Department:</span>
              <span className="fw-semibold text-capitalize">
                {staff.department}
              </span>
            </li>
            <li className="list-group-item d-flex align-items-center">
              <FaBriefcase className="me-2 text-secondary" />
              <span className="flex-grow-1">Role:</span>
              <span className="fw-semibold text-capitalize">
                {staff.role}
              </span>
            </li>
            <li className="list-group-item d-flex align-items-center">
              {staff.is_active ? (
                <FaToggleOn className="me-2 text-success" />
              ) : (
                <FaToggleOff className="me-2 text-secondary" />
              )}
              <span className="flex-grow-1">Status:</span>
              <span
                className={`badge ${
                  staff.is_active ? "bg-success" : "bg-secondary"
                } text-capitalize`}
              >
                {staff.is_active ? "Active" : "Inactive"}
              </span>
            </li>
            <li className="list-group-item d-flex align-items-center">
              {staff.is_on_duty ? (
                <FaToggleOn className="me-2 text-success" />
              ) : (
                <FaToggleOff className="me-2 text-danger" />
              )}
              <span className="flex-grow-1">On Duty:</span>
              <span
                className={`badge ${
                  staff.is_on_duty ? "bg-success" : "bg-danger"
                } text-capitalize`}
              >
                {staff.is_on_duty ? "On Duty" : "Off Duty"}
              </span>
            </li>
          </ul>
        </div>
        <div className="card-footer text-center text-muted small">
          {/* You could replace this with real timestamp from staff.updated_at */}
          Last updated just now
        </div>
      </div>
    </div>
  );
}
