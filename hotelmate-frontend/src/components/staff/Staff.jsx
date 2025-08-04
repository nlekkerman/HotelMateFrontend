import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import StaffByDepartment from "./StaffByDepartment";  // <-- import here

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await api.get("staff/");
        const data = response.data;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
          ? data.results
          : [];
        setStaffList(list);
      } catch (err) {
        setError(
          err.response?.status === 401
            ? "Unauthorized: Please login"
            : "Failed to fetch staff data"
        );
        console.error(err);
      }
    };
    fetchStaff();
  }, []);

  return (
    <div className="container my-4">
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-3">Staff Directory</h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/staff/create")}
        >
          + Create New Staff
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : staffList.length === 0 ? (
        <p className="text-center text-muted">No staff available.</p>
      ) : (
        <StaffByDepartment   // <-- use StaffByDepartment here
          staffList={staffList}
          onStaffClick={(staff) => navigate(`/staff/${staff.id}`)}
        />
      )}
    </div>
  );
}
