import React from "react";

export default function PeriodStaffSummary({ logsInPeriod }) {
  if (!logsInPeriod || logsInPeriod.length === 0) {
    return (
      <div className="card mb-3">
        <div className="card-body">
          <p className="mb-0 text-muted">
            No approved attendance data for this period yet.
          </p>
        </div>
      </div>
    );
  }

  // Aggregate by staff
  const byStaff = new Map();

  for (const log of logsInPeriod) {
    const staffId = log.staff || log.staff_id;
    const staffName = log.staff_name || `Staff #${staffId}`;

    if (!byStaff.has(staffId)) {
      byStaff.set(staffId, {
        staffId,
        staffName,
        totalLogs: 0,
        approvedLogs: 0,
        approvedHours: 0,
        overtimeHours: 0, // placeholder if you track overtime separately
      });
    }

    const record = byStaff.get(staffId);
    record.totalLogs += 1;

    const isApproved = log.is_approved && !log.is_rejected;
    if (isApproved) {
      record.approvedLogs += 1;
      if (log.hours_worked) {
        record.approvedHours += parseFloat(log.hours_worked);
      }
      // If backend provides an `overtime_hours` or similar field, add it here
      if (log.overtime_hours) {
        record.overtimeHours += parseFloat(log.overtime_hours);
      }
    }
  }

  const rows = Array.from(byStaff.values()).sort((a, b) =>
    a.staffName.localeCompare(b.staffName)
  );

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h6 className="mb-3">Period Staff Summary</h6>
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Staff</th>
                <th className="text-end">Approved hours</th>
                <th className="text-end">Overtime hours</th>
                <th className="text-end">Approved logs</th>
                <th className="text-end">Total logs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.staffId}>
                  <td>{row.staffName}</td>
                  <td className="text-end">
                    {row.approvedHours.toFixed(2)}
                  </td>
                  <td className="text-end">
                    {row.overtimeHours.toFixed(2)}
                  </td>
                  <td className="text-end">{row.approvedLogs}</td>
                  <td className="text-end">{row.totalLogs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}