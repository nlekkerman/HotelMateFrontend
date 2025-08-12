import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom"; // <-- added useParams
import StaffWeeklyRoster from "@/components/staff/StaffWeeklyRoster";
import {
  FaEnvelope,
  FaUserShield,
  FaPhone,
  FaBuilding,
  FaBriefcase,
  FaToggleOn,
  FaToggleOff,
} from "react-icons/fa";
import api from "@/services/api";

const prettify = (v) =>
  (v || "N/A")
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function StaffProfile() {
  const navigate = useNavigate();
  const { hotelSlug } = useParams(); // 👈 get slug from route

  const fetchStaffMe = async () => {
    if (!hotelSlug) {
      throw new Error("Hotel slug is missing from URL");
    }
    const { data } = await api.get(`/staff/${hotelSlug}/me/`);
    return data;
  };

  const {
    data: staff,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["staffMe", hotelSlug],
    queryFn: fetchStaffMe,
    enabled: !!hotelSlug, // run only when slug is available
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

  const handleRegisterFace = () => {
    navigate(`/${hotelSlug}/staff/register-face`);
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-column g-4 justify-content-center align-items-center">
        {/* RIGHT: Weekly roster (8/12 on lg+, full width on small) */}
        <div className="col-12 col-lg-8 mb-4">
          <StaffWeeklyRoster staffId={staff.id} />
        </div>
        <div className="col-12 col-lg-4">
          <div className="card shadow border-0 h-100">
            <div className="card-header bg-primary text-white text-center">
              {!staff.profile_image_url && (
                <div className="mb-2">
                  <FaUserShield size={32} />
                </div>
              )}
              <h4 className="mb-0">Your Profile</h4>
            </div>

            <div className="card-body text-center">
              {staff.profile_image_url && (
                <img
                  src={staff.profile_image_url}
                  alt={`${staff.first_name} ${staff.last_name}`}
                  className="rounded-circle mb-3"
                  style={{ width: 120, height: 120, objectFit: "cover" }}
                />
              )}

              <h5 className="card-title text-primary mb-4">
                {staff.first_name} {staff.last_name}
              </h5>

              <ul className="list-group list-group-flush text-start">
                <li className="list-group-item d-flex align-items-center">
                  <FaEnvelope className="me-2 text-secondary" />
                  <span className="flex-grow-1">Email:</span>
                  <span className="fw-semibold">{staff.email}</span>
                </li>

                <li className="list-group-item d-flex align-items-center">
                  <FaUserShield className="me-2 text-secondary" />
                  <span className="flex-grow-1">Access Level:</span>
                  <span className="fw-semibold">
                    {prettify(staff.access_level)}
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
                  <span className="fw-semibold">
                    {staff.department_detail?.name || "N/A"}
                  </span>
                </li>

                <li className="list-group-item d-flex align-items-center">
                  <FaBriefcase className="me-2 text-secondary" />
                  <span className="flex-grow-1">Role:</span>
                  <span className="fw-semibold">
                    {staff.role_detail?.name || "N/A"}
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

              {!staff.has_registered_face && (
                <div className="mt-4">
                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={handleRegisterFace}
                  >
                    Register Face Data
                  </button>
                </div>
              )}
            </div>

           
          </div>
        </div>
      </div>
    </div>
  );
}
