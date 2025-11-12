import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "@/services/api";
import StaffByDepartment from "./StaffByDepartment";
import ClockedInTicker from "@/components/analytics/ClockedInTicker.jsx";

export default function Staff() {
  const { hotelSlug } = useParams();
  const [staffList, setStaffList] = useState([]);
  const [clockedInLogs, setClockedInLogs] = useState([]);
  const [error, setError] = useState(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingClockedIn, setLoadingClockedIn] = useState(false);
  const navigate = useNavigate();
  const [showClockedIn, setShowClockedIn] = useState(false);
  
  // Expose toggle function globally so quick actions can access it
  useEffect(() => {
    window.toggleClockedInView = () => {
      setShowClockedIn((prev) => !prev);
    };
    return () => {
      delete window.toggleClockedInView;
    };
  }, []);

  useEffect(() => {
  const fetchStaff = async () => {
    if (!hotelSlug) return; // safety check
    setLoadingStaff(true);
    try {
      // Update URL to include hotelSlug in the path
      const response = await api.get(`staff/${hotelSlug}/`);
      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
        ? data.results
        : [];
      setStaffList(list);
      setError(null);
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Unauthorized: Please login"
          : "Failed to fetch staff data"
      );
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  };
  fetchStaff();
}, [hotelSlug]);

  useEffect(() => {
    if (!showClockedIn) {
      setClockedInLogs([]);
      return;
    }

    const fetchClockedInLogs = async () => {
      setLoadingClockedIn(true);
      try {
        const { data } = await api.get(
          "/attendance/clock-logs/currently-clocked-in/",
          {
            params: { hotel_slug: hotelSlug },
          }
        );
        setClockedInLogs(data.results || []);
      } catch (err) {
        console.error("Failed to fetch clocked-in logs", err);
      } finally {
        setLoadingClockedIn(false);
      }
    };

    fetchClockedInLogs();
  }, [showClockedIn, hotelSlug]);

  return (
    <div className="container my-4">
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-3">
          {showClockedIn ? "Currently Clocked In Staff" : "Staff Directory"}
        </h2>
      </div>

      {/* Show loading indicators */}
      {loadingStaff && !showClockedIn && (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status" />
          <div>Loading staff...</div>
        </div>
      )}

      {showClockedIn && loadingClockedIn && (
        <div className="text-center my-4">
          <div className="spinner-border text-success" role="status" />
          <div>Loading clocked-in staff...</div>
        </div>
      )}

      {/* Show clocked-in staff when toggled */}
      {showClockedIn && !loadingClockedIn && (
        <>
          {clockedInLogs.length > 0 ? (
            <ClockedInTicker staffList={clockedInLogs} />
          ) : (
            <div className="alert alert-info text-center">
              <i className="bi bi-info-circle me-2"></i>
              No staff currently clocked in
            </div>
          )}
        </>
      )}

      {/* Show all staff when not in clocked-in view */}
      {!showClockedIn && !loadingStaff && !error && staffList.length > 0 && (
        <StaffByDepartment
          staffList={staffList}
          onStaffClick={(staff) => navigate(`/${hotelSlug}/staff/${staff.id}`)}
        />
      )}

      {!showClockedIn && !loadingStaff && error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {!showClockedIn && !loadingStaff && !error && staffList.length === 0 && (
        <p className="text-center text-muted">No staff available.</p>
      )}
    </div>
  );
}
