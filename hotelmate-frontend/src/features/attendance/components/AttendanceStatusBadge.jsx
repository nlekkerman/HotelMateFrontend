import React from "react";

export default function AttendanceStatusBadge({ status }) {
  if (!status) {
    return <span className="badge bg-secondary">No data</span>;
  }

  const normalized = status.toLowerCase();

  let className = "badge bg-secondary";
  if (normalized.startsWith("on duty")) {
    className = "badge bg-success";
  } else if (normalized.startsWith("unrostered – pending")) {
    className = "badge bg-warning text-dark";
  } else if (normalized.startsWith("unrostered but approved")) {
    className = "badge bg-info text-dark";
  } else if (normalized.startsWith("rejected")) {
    className = "badge bg-danger";
  } else if (normalized.startsWith("completed")) {
    className = "badge bg-primary";
  } else if (normalized.startsWith("no clock log")) {
    className = "badge bg-outline-secondary border";
  }

  return <span className={className}>{status}</span>;
}
