import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api"; // Axios instance with auth token

const fetchStaffMe = async () => {
  console.log("[fetchStaffMe] Fetching staff profile from /staff/me/");
  const response = await api.get("/staff/me/");
  console.log("[fetchStaffMe] Response:", response.data);
  return response.data;
};

function StaffProfile() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["staffMe"],
    queryFn: fetchStaffMe,
  });

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status"></div>
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

  const staff = data;

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 ">
      <div className="card shadow-lg border-0 w-75">
        <div className="card-header bg-primary text-white text-center">
          <h4 className="mb-0">👤 Staff Profile</h4>
        </div>
        <div className="card-body">
          <h5 className="card-title text-center text-primary">
            {staff.first_name} {staff.last_name}
          </h5>
          <ul className="list-group list-group-flush">
            <li className="list-group-item">
              <strong>Email:</strong> {staff.email}
            </li>
            <li className="list-group-item">
              <strong>Access Level:</strong> {staff.access_level || "N/A"}
            </li>
            <li className="list-group-item">
              <strong>Phone:</strong> {staff.phone_number || "N/A"}
            </li>
            <li className="list-group-item">
              <strong>Department:</strong>{" "}
              <span className="text-secondary">{staff.department}</span>
            </li>
            <li className="list-group-item">
              <strong>Role:</strong>{" "}
              <span className="text-dark">{staff.role}</span>
            </li>
            
            <li className="list-group-item">
              <strong>Status:</strong>{" "}
              <span
                className={`badge ${
                  staff.is_active ? "bg-success" : "bg-secondary"
                }`}
              >
                {staff.is_active ? "Active" : "Inactive"}
              </span>
            </li>
            <li className="list-group-item">
              <strong>On Duty:</strong>{" "}
              <span
                className={`badge ${
                  staff.is_on_duty ? "bg-success" : "bg-danger"
                }`}
              >
                {staff.is_on_duty ? "On Duty" : "Off Duty"}
              </span>
            </li>
          </ul>
        </div>
        <div className="card-footer text-muted text-center">
          Last updated just now
        </div>
      </div>
    </div>
  );
}

export default StaffProfile;
