import React from "react";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import AttendanceRowActions from "./AttendanceRowActions";

export default function AttendanceTable({ rows, hotelSlug, onRowAction }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="text-muted mb-0">
        No roster or attendance data for this date/department.
      </p>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0">
        <thead>
          <tr>
            <th>Staff</th>
            <th>Planned Shift</th>
            <th>Actual</th>
            <th>Status</th>
            <th style={{ width: "1%" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rosterSummary =
              row.roster.length > 0
                ? row.roster
                    .map(
                      (s) => `${s.shift_start ?? "?"}–${s.shift_end ?? "?"}`
                    )
                    .join(", ")
                : "—";

            const logSummary =
              row.logs.length > 0
                ? row.logs
                    .map((l) => {
                      const start = l.time_in
                        ? l.time_in.slice(11, 16)
                        : "?";
                      const end = l.time_out
                        ? l.time_out.slice(11, 16)
                        : "…";
                      return `${start}–${end}`;
                    })
                    .join(", ")
                : "—";

            const derivedStatus = row._status || "";

            return (
              <tr key={row.staffId}>
                <td>{row.staffName || row.staffId}</td>
                <td>{rosterSummary}</td>
                <td>{logSummary}</td>
                <td>
                  <AttendanceStatusBadge status={derivedStatus} />
                </td>
                <td>
                  <AttendanceRowActions
                    row={row}
                    hotelSlug={hotelSlug}
                    onAction={onRowAction}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
