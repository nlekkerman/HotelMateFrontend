import React from "react";

export default function AttendanceAlertCenter({ alerts, onDismiss, onAction }) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      {alerts.map((alert) => {
        const isHardLimit = alert.type === "hard-limit";
        const isBreak = alert.type === "break-warning";
        const isOvertime = alert.type === "overtime-warning";
        const isUnrostered = alert.type === "unrostered-request";

        let className = "alert alert-info d-flex justify-content-between align-items-center";
        if (isHardLimit) className = "alert alert-danger d-flex justify-content-between align-items-center";
        else if (isOvertime) className = "alert alert-warning d-flex justify-content-between align-items-center";
        else if (isBreak) className = "alert alert-primary d-flex justify-content-between align-items-center";
        else if (isUnrostered) className = "alert alert-secondary d-flex justify-content-between align-items-center";

        return (
          <div key={alert.id} className={className}>
            <div>
              <strong>{alert.staffName || "Staff"}</strong>{" "}
              <span className="d-block d-sm-inline">{alert.message}</span>
            </div>
            <div className="d-flex gap-2">
              {isHardLimit && onAction && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={() => onAction(alert, "stay")}
                  >
                    Stay clocked in
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    onClick={() => onAction(alert, "clockout")}
                  >
                    Clock out now
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={() => onDismiss && onDismiss(alert.id)}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}