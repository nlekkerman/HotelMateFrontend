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
  const [faceFilter, setFaceFilter] = useState("all"); // "all", "registered", "missing"
  
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

  // Filter staff based on face registration status
  const filteredStaffList = staffList.filter(staff => {
    if (faceFilter === "registered") return staff.has_registered_face;
    if (faceFilter === "missing") return !staff.has_registered_face;
    return true; // "all"
  });

  // Calculate face registration stats
  const totalStaff = staffList.length;
  const withFace = staffList.filter(s => s.has_registered_face).length;
  const withoutFace = totalStaff - withFace;

  return (
    <div className="container my-4">
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-3">
          {showClockedIn ? "Currently Clocked In Staff" : "Staff Directory"}
        </h2>
        
        {/* Face Registration Stats */}
        {!showClockedIn && totalStaff > 0 && (
          <div className="row mb-4">
            <div className="col-md-8 mx-auto">
              <div className="card bg-light">
                <div className="card-body py-3">
                  <div className="row text-center">
                    <div className="col-3">
                      <strong className="d-block fs-5">{totalStaff}</strong>
                      <small className="text-muted">Total Staff</small>
                    </div>
                    <div className="col-3">
                      <strong className="d-block fs-5 text-success">{withFace}</strong>
                      <small className="text-muted">With Face Data</small>
                    </div>
                    <div className="col-3">
                      <strong className="d-block fs-5 text-warning">{withoutFace}</strong>
                      <small className="text-muted">Missing Face</small>
                    </div>
                    <div className="col-3">
                      <strong className="d-block fs-5 text-info">
                        {totalStaff > 0 ? Math.round((withFace / totalStaff) * 100) : 0}%
                      </strong>
                      <small className="text-muted">Coverage</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Face Filter Controls */}
        {!showClockedIn && staffList.length > 0 && (
          <div className="mb-4">
            <div className="btn-group" role="group" aria-label="Face registration filter">
              <button
                type="button"
                className={`btn ${faceFilter === "all" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFaceFilter("all")}
              >
                All Staff ({totalStaff})
              </button>
              <button
                type="button"
                className={`btn ${faceFilter === "registered" ? "btn-success" : "btn-outline-success"}`}
                onClick={() => setFaceFilter("registered")}
              >
                With Face Data ({withFace})
              </button>
              <button
                type="button"
                className={`btn ${faceFilter === "missing" ? "btn-warning" : "btn-outline-warning"}`}
                onClick={() => setFaceFilter("missing")}
              >
                Missing Face Data ({withoutFace})
              </button>
            </div>
          </div>
        )}
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

      {/* Show filtered staff when not in clocked-in view */}
      {!showClockedIn && !loadingStaff && !error && filteredStaffList.length > 0 && (
        <StaffByDepartment
          staffList={filteredStaffList}
          onStaffClick={(staff) => navigate(`/${hotelSlug}/staff/${staff.id}`)}
        />
      )}

      {/* Show no results message when filter produces empty results */}
      {!showClockedIn && !loadingStaff && !error && filteredStaffList.length === 0 && staffList.length > 0 && (
        <div className="alert alert-info text-center">
          <i className="bi bi-funnel me-2"></i>
          No staff members match the current filter. 
          <button 
            className="btn btn-sm btn-outline-primary ms-2"
            onClick={() => setFaceFilter("all")}
          >
            Show All Staff
          </button>
        </div>
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
