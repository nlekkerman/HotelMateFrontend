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
    <div>
      {/* Toggle Button */}
      <button
        onClick={() => setShowLogs((prev) => !prev)}
        className="mb-4 px-4 py-2 custom-button transition"
      >
        {showLogs ? "Hide Logs" : "Show Logs"}
      </button>

      {showLogs && (
        <>
          {loading && <p>Loading logs...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {!loading && !error && !logs.length && <p>No clock logs found.</p>}
          {!loading && !error && logs.length > 0 && (
            <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
              <thead>
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
                    <td>{log.verified_by_face ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default DepartmentClockLogs;
