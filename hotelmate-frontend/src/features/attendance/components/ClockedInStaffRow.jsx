import React from "react";

function formatTime(dateTime) {
  return new Date(dateTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWorkedDuration(timeIn, now) {
  const diffMs = now - new Date(timeIn);
  const diffMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function getWorkedMinutes(timeIn, now) {
  return Math.floor((now - new Date(timeIn)) / (1000 * 60));
}

/**
 * Simplified staff row for clocked-in view - shows only essential info
 */
export default function ClockedInStaffRow({ log, now }) {
  const workedDuration = getWorkedDuration(log.time_in, now);
  const workedMinutes = getWorkedMinutes(log.time_in, now);
  const staffName = log.staff_name || `Staff #${log.staff}`;
  const departmentName = log.department?.name || "No Department";

  return (
    <div className="d-flex align-items-center py-3 px-3 border-bottom">
      {/* Staff Info - Clean and Simple */}
      <div className="me-3" style={{ minWidth: "200px" }}>
        <div className="d-flex align-items-center">
          <div className="me-3">
            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                 style={{ width: "40px", height: "40px", fontSize: "14px", fontWeight: "bold" }}>
              {staffName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <div className="fw-semibold">{staffName}</div>
            <small className="text-muted">{departmentName}</small>
          </div>
        </div>
      </div>

      {/* Clock In Time */}
      <div className="me-3 text-center" style={{ minWidth: "100px" }}>
        <div className="small text-muted">Clocked In</div>
        <div className="fw-bold">{formatTime(log.time_in)}</div>
      </div>

      {/* Worked Duration */}
      <div className="me-3 text-center" style={{ minWidth: "120px" }}>
        <div className="small text-muted">Time Worked</div>
        <div className="badge bg-success fs-6">{workedDuration}</div>
      </div>

      {/* Simple Time Indicator */}
      <div className="flex-grow-1 d-none d-md-flex align-items-center">
        <div className="w-100">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">Working since {formatTime(log.time_in)}</small>
            <small className="text-muted">
              {workedMinutes < 60 
                ? `${workedMinutes} minutes`
                : `${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m`
              }
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}