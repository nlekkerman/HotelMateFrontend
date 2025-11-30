import React, { useEffect } from "react";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { safeTimeSlice, safeString } from "../utils/safeUtils";

export default function StaffDetailModal({
  show,
  onClose,
  staffName,
  logs,
}) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && show && typeof onClose === 'function') {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [show, onClose]);

  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("modal") && typeof onClose === 'function') {
      onClose();
    }
  };

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const safeLogs = Array.isArray(logs) ? logs : [];
  const safeStaffName = safeString(staffName) || "Unknown Staff";

  return (
    <div
      className="modal d-block attendance-modal"
      tabIndex="-1"
      onClick={handleBackdropClick}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Attendance details – {safeStaffName}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            {safeLogs.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <i className="bi bi-calendar-x" style={{ fontSize: "2rem" }}></i>
                  <p className="mt-2 mb-0">
                    No logs for this staff in the current view.
                  </p>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Location</th>
                      <th>Unrostered</th>
                      <th>Status</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeLogs.filter(log => log && log.id).map((log, index) => {
                      const date = log.time_in
                        ? safeTimeSlice(log.time_in, 0, 10)
                        : "—";
                      const timeStart = log.time_in 
                        ? safeTimeSlice(log.time_in, 11, 16)
                        : "?";
                      const timeEnd = log.time_out 
                        ? safeTimeSlice(log.time_out, 11, 16)
                        : "…";
                      const timeRange = `${timeStart} – ${timeEnd}`;
                      
                      const location = safeString(
                        log.location_name || log.location
                      ) || "—";
                      
                      let statusText = "Pending";
                      if (!log.time_out) {
                        statusText = "Open";
                      } else if (log.is_rejected) {
                        statusText = "Rejected";
                      } else if (log.is_approved) {
                        statusText = "Approved";
                      }

                      const hours = log.hours_worked 
                        ? `${parseFloat(log.hours_worked).toFixed(1)}h`
                        : "—";

                      return (
                        <tr key={log.id || `log-${index}`}>
                          <td>{date}</td>
                          <td><code className="small">{timeRange}</code></td>
                          <td>{location}</td>
                          <td>
                            <span className={`badge ${log.is_unrostered ? 'bg-warning' : 'bg-secondary'}`}>
                              {log.is_unrostered ? "Yes" : "No"}
                            </span>
                          </td>
                          <td>
                            <AttendanceStatusBadge status={statusText} />
                          </td>
                          <td>{hours}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <div className="text-muted small me-auto">
              {safeLogs.length} log{safeLogs.length !== 1 ? 's' : ''}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}