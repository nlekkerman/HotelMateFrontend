import React from "react";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import AttendanceRowActions from "./AttendanceRowActions";
import AttendanceClockActions from "./AttendanceClockActions";
import { safeTimeSlice, safeString } from "../utils/safeUtils";

export default function AttendanceTable({ rows, hotelSlug, onRowAction, onRowClick }) {
  // Defensive checks for props
  const safeRows = Array.isArray(rows) ? rows : [];
  
  if (safeRows.length === 0) {
    return (
      <p className="text-muted mb-0">
        No roster or attendance data for this date/department.
      </p>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0 table-hover attendance-table">
        <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th>Staff</th>
            <th>Planned Shift</th>
            <th>Actual</th>
            <th>Status</th>
            <th style={{ width: "1%" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => {
            // Safety checks for row
            if (!row || !row.staffId) {
              console.warn("Invalid row data:", row);
              return null;
            }

            const safeRoster = Array.isArray(row.roster) ? row.roster : [];
            const safeLogs = Array.isArray(row.logs) ? row.logs : [];

            const rosterSummary = safeRoster.length > 0
              ? safeRoster
                  .map((s) => {
                    if (!s) return "Invalid shift";
                    const start = safeString(s.shift_start) || "?";
                    const end = safeString(s.shift_end) || "?";
                    return `${start}–${end}`;
                  })
                  .join(", ")
              : "—";

            const logSummary = safeLogs.length > 0
              ? safeLogs
                  .map((l) => {
                    if (!l) return "Invalid log";
                    
                    const start = l.time_in 
                      ? safeTimeSlice(l.time_in, 11, 16) 
                      : "?";
                    const end = l.time_out 
                      ? safeTimeSlice(l.time_out, 11, 16) 
                      : "…";
                    return `${start}–${end}`;
                  })
                  .join(", ")
              : "—";

            const derivedStatus = safeString(row._status);

            const handleRowClick = (e) => {
              // Prevent row click if clicking on action buttons
              if (e.target.closest('button') || e.target.closest('.btn')) {
                return;
              }
              if (typeof onRowClick === 'function') {
                onRowClick(row);
              }
            };

            return (
              <tr 
                key={row.staffId || `row-${index}`}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
                onClick={handleRowClick}
              >
                <td>{safeString(row.staffName) || row.staffId}</td>
                <td>{rosterSummary}</td>
                <td>{logSummary}</td>
                <td>
                  <AttendanceStatusBadge 
                    status={derivedStatus} 
                    staffId={row.staffId}
                    enhancedStatus={row.current_status}
                  />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="d-flex flex-column gap-2">
                    {/* Unrostered approval actions */}
                    <AttendanceRowActions
                      row={row}
                      hotelSlug={hotelSlug}
                      onAction={onRowAction}
                    />
                    
                    {/* Clock in/out actions */}
                    <AttendanceClockActions
                      staff={{
                        id: row.staffId,
                        first_name: row.staffName?.split(' ')[0] || 'Unknown',
                        last_name: row.staffName?.split(' ').slice(1).join(' ') || '',
                        current_status: row.current_status
                      }}
                      hotelSlug={hotelSlug}
                      onAction={(result) => {
                        console.log('[AttendanceTable] Clock action completed:', result);
                        if (typeof onRowAction === 'function') {
                          onRowAction(result);
                        }
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          }).filter(Boolean)} {/* Filter out null entries */}
        </tbody>
      </table>
    </div>
  );
}
