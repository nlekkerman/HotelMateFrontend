// src/components/staff/Staff.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api"; // Adjust path if needed

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [hotels, setHotels] = useState({});
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch staff
    const fetchStaff = async () => {
      try {
        const response = await api.get("staff/");
        console.log("API staff response:", response.data);
        console.log("Making request to:", api.defaults.baseURL + "staff/");
        const data = response.data;

        if (Array.isArray(data)) {
          setStaffList(data);
        } else if (Array.isArray(data.results)) {
          setStaffList(data.results);
        } else {
          setStaffList([]);
          console.error("Unexpected staff list format", data);
        }
      } catch (err) {
        setError(
          err.response?.status === 401
            ? "Unauthorized: Please login"
            : "Failed to fetch staff data"
        );
        console.error(err);
      }
    };

    // Fetch hotels into a map { [id]: hotelObj }
    const fetchHotels = async () => {
      try {
        const res = await api.get("hotel/hotel_list/");
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.results)
          ? res.data.results
          : [];
        const map = {};
        list.forEach((h) => {
          map[h.id] = h;
        });
        setHotels(map);
      } catch (err) {
        console.error("Failed to fetch hotels", err);
      }
    };

    fetchStaff();
    fetchHotels();
  }, []);

  const formatDepartment = (dept) => {
    if (!dept) return "N/A";
    return dept
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (error) {
    return (
      <div className="alert alert-danger my-4" role="alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="staff-list-container container rounded shadow-sm bg-light">
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-2">Staff List</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate("/staff/create")}
        >
          Create New Staff
        </button>
      </div>

      {staffList.length === 0 ? (
        <p className="text-center text-muted">No staff available.</p>
      ) : (
        <div className="table-responsive vw-100">
          <table className="table table-bordered table-hover table-striped align-middle">
            <thead className="table-dark">
              <tr>
                <th scope="col">First Name</th>
                <th scope="col">Last Name</th>
                <th scope="col">Department</th>
                <th scope="col">Active</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr
                  key={staff.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/staff/${staff.id}`)}
                >
                  <td className="fw-semibold">{staff.first_name || "N/A"}</td>
                  <td className="fw-semibold">{staff.last_name || "N/A"}</td>
                  <td>{formatDepartment(staff.department)}</td>
                  <td>
                    <span
                      className={`badge ${
                        staff.is_active ? "bg-success" : "bg-secondary"
                      }`}
                    >
                      {staff.is_active ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
