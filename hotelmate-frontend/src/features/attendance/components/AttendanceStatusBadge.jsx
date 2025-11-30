import React from "react";
import { getStatusVariant } from "../utils/attendanceStatus";

export default function AttendanceStatusBadge({ status }) {
  if (!status) {
    status = "No data";
  }
  
  const variant = getStatusVariant(status);
  const className = `badge bg-${variant}`;
  
  return <span className={className}>{status}</span>;
}
