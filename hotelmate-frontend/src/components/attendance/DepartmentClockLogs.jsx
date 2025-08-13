// DepartmentClockLogs.jsx
import React, { useEffect, useState } from "react";
import api from "@/services/api"; // ✅ Use api.js

const DepartmentClockLogs = ({ hotelSlug, departmentSlug }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogs, setShowLogs] = useState(false); // Toggle visibility

  useEffect(() => {
  if (!hotelSlug || !showLogs) return; // Only fetch when visible

  const fetchLogs = async () => {
    setLoading(true);
    setError("");

    const params = { hotel_slug: hotelSlug };
    if (departmentSlug) params.department_slug = departmentSlug;

    try {
      const res = await api.get(`/attendance/clock-logs/department-logs/`, { params });
      const data = res.data;
      console.log("📡 Fetched clock logs:", data);
      setLogs(Array.isArray(data.results) ? data.results : []); // ✅ Use results
    } catch (err) {
      setError(err.response?.data?.error || "Error fetching logs");
    } finally {
      setLoading(false);
    }
  };

  fetchLogs();
}, [hotelSlug, departmentSlug, showLogs]);


   return (
    <div className="container mt-3">
      {/* Toggle Button */}
      <div className="d-flex justify-content-end mb-3">
        <button
          className={`btn ${showLogs ? "btn-secondary" : "btn-primary"}`}
          onClick={() => setShowLogs((prev) => !prev)}
        >
          {showLogs ? "Hide Logs" : "Show Logs"}
        </button>
      </div>

      {showLogs && (
        <>
          {loading && <div className="alert alert-info">Loading logs...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {!loading && !error && logs.length === 0 && (
            <div className="alert alert-warning">No clock logs found.</div>
          )}

          {!loading && !error && logs.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped table-hover align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Staff</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Verified By Face</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.staff_name}</td>
                      <td>{new Date(log.time_in).toLocaleString()}</td>
                      <td>{log.time_out ? new Date(log.time_out).toLocaleString() : "-"}</td>
                      <td>
                        {log.verified_by_face ? (
                          <span className="badge bg-success">Yes</span>
                        ) : (
                          <span className="badge bg-danger">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DepartmentClockLogs;
