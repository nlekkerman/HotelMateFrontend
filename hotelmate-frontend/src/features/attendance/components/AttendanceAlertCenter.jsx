import React, { useState } from "react";
import { safeString } from "../utils/safeUtils";

export default function AttendanceAlertCenter({ alerts, onDismiss, onAction }) {
  const [actionLoading, setActionLoading] = useState(new Set());

  // Defensive check for alerts
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return null;
  }

  const handleAction = async (alert, action) => {
    if (!alert || !alert.id || !action || actionLoading.has(alert.id)) {
      return;
    }

    setActionLoading(prev => new Set([...prev, alert.id]));
    
    try {
      if (typeof onAction === 'function') {
        await onAction(alert, action);
      }
    } catch (error) {
      console.error("Alert action failed:", error);
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  };

  const handleDismiss = (alertId) => {
    if (typeof onDismiss === 'function') {
      onDismiss(alertId);
    }
  };

  return (
    <div className="mb-3">
      {alerts.filter(alert => alert && alert.id).map((alert, index) => {
        const alertType = safeString(alert.type);
        const isHardLimit = alertType === "hard-limit";
        const isBreak = alertType === "break-warning";
        const isOvertime = alertType === "overtime-warning";
        const isUnrostered = alertType === "unrostered-request";
        const isLoading = actionLoading.has(alert.id);

        let className = "alert d-flex justify-content-between align-items-start flex-wrap gap-2";
        let variant = "info";

        if (isHardLimit) variant = "danger";
        else if (isOvertime) variant = "warning";
        else if (isBreak) variant = "primary";
        else if (isUnrostered) variant = "secondary";

        className += ` alert-${variant}`;

        return (
          <div key={alert.id || `alert-${index}`} className={`${className} attendance-alert`}>
            <div className="flex-grow-1">
              <strong>{safeString(alert.staffName) || "Staff"}</strong>{" "}
              <span className="d-block d-sm-inline">
                {safeString(alert.message) || "No message"}
              </span>
              {alert.createdAt && (
                <small className="text-muted d-block">
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </small>
              )}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {isHardLimit && typeof onAction === 'function' && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    disabled={isLoading}
                    onClick={() => handleAction(alert, "stay")}
                  >
                    {isLoading ? "..." : "Stay clocked in"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    disabled={isLoading}
                    onClick={() => handleAction(alert, "clockout")}
                  >
                    {isLoading ? "..." : "Clock out now"}
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={() => handleDismiss(alert.id)}
                disabled={isLoading}
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