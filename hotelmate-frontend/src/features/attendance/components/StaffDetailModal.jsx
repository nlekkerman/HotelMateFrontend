import React, { useEffect } from "react";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import TodayShiftsSection from "./TodayShiftsSection";
import AttendanceRowActions from "./AttendanceRowActions";
import StatusBadge from "@/components/common/StatusBadge";
import { safeTimeSlice, safeString } from "../utils/safeUtils";

export default function StaffDetailModal({
  show,
  onClose,
  staffName,
  logs,
  staffSummary,
  hotelSlug,
  onAction,
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
  
  // Check if staff has pending actions (unrostered logs needing approval)
  const pendingLogs = safeLogs.filter(log => 
    log && log.is_unrostered && !log.is_approved && !log.is_rejected
  );
  const hasPendingActions = pendingLogs.length > 0;

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
            <div className="d-flex align-items-center gap-2">
              <h5 className="modal-title mb-0">
                Attendance details – {safeStaffName}
              </h5>
              {staffSummary && (
                <div className="d-flex gap-2">
                  <StatusBadge
                    status={staffSummary.duty_status}
                    mode="duty"
                    badgeData={staffSummary.duty_status_badge}
                    size="sm"
                  />
                  <StatusBadge
                    status={staffSummary.attendance_status}
                    mode="attendance"
                    badgeData={staffSummary.attendance_status_badge}
                    size="sm"
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            {/* Today's Shifts Section - only for active staff */}
            {staffSummary && hotelSlug && (
              <TodayShiftsSection
                staffId={staffSummary.id}
                hotelSlug={hotelSlug}
                staffStatus={{
                  duty_status: staffSummary.duty_status,
                  current_status: staffSummary.current_status
                }}
              />
            )}

            {/* Pending Actions Section */}
            {hasPendingActions && hotelSlug && onAction && (
              <div className="pending-actions-section mb-3">
                <h6 className="mb-2 text-warning">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  Actions Required
                </h6>
                <div className="border rounded p-2 bg-light">
                  <AttendanceRowActions
                    row={{ logs: pendingLogs }}
                    hotelSlug={hotelSlug}
                    onAction={onAction}
                  />
                </div>
              </div>
            )}

            {/* Weekly Summary Section */}
            {staffSummary && (
              <div className="weekly-summary-section mb-3">
                <h6 className="mb-2">
                  <i className="bi bi-calendar-week me-1"></i>
                  Weekly Overview
                </h6>
                <div className="row g-3">
                  <div className="col-md-3 col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <div className="h4 mb-1 text-primary">{staffSummary.planned_shifts || 0}</div>
                      <small className="text-muted">Planned Shifts</small>
                    </div>
                  </div>
                  <div className="col-md-3 col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <div className="h4 mb-1 text-success">{staffSummary.worked_shifts || 0}</div>
                      <small className="text-muted">Worked Shifts</small>
                    </div>
                  </div>
                  <div className="col-md-3 col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <div className="h4 mb-1 text-info">
                        {staffSummary.total_worked_minutes ? Math.round(staffSummary.total_worked_minutes / 60 * 10) / 10 : 0}h
                      </div>
                      <small className="text-muted">Total Hours</small>
                    </div>
                  </div>
                  <div className="col-md-3 col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <div className="h4 mb-1 text-warning">{staffSummary.issues_count || 0}</div>
                      <small className="text-muted">Issues</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Clock Logs Section */}
            <div className="clock-logs-section">
              <h6 className="mb-2">
                <i className="bi bi-clock-history me-1"></i>
                Detailed Clock Logs
              </h6>
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
          </div>
          <div className="modal-footer">
            <div className="text-muted small me-auto">
              {safeLogs.length} log{safeLogs.length !== 1 ? 's' : ''}
            </div>
            <button
              type="button"
              className="hm-btn hm-btn-outline"
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