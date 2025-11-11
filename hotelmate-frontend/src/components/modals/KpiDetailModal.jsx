import React from "react";

const fmt = (n, digits = 2) =>
  typeof n === "number" && !Number.isNaN(n) ? n.toFixed(digits) : "0.00";

export default function KpiDetailModal({ show, onClose, kpiData, allData }) {
  if (!show) return null;

  const renderDetailContent = () => {
    if (!kpiData || !allData) {
      return <p className="text-muted">No data available</p>;
    }

    switch (kpiData.type) {
      case "hours":
        return (
          <div>
            <div className="alert alert-info">
              <h6>📊 Total Rostered Hours Breakdown</h6>
              <p className="mb-1">
                <strong>Total Hours:</strong> {fmt(Number(allData.total_rostered_hours))}
              </p>
            </div>

            {allData.departmentSummary && allData.departmentSummary.length > 0 && (
              <div className="mt-3">
                <h6>Department Breakdown:</h6>
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Hours</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allData.departmentSummary.map((dept, idx) => {
                      const percentage = (dept.total_rostered_hours / allData.total_rostered_hours) * 100;
                      return (
                        <tr key={idx}>
                          <td>{dept.department_slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                          <td>{fmt(Number(dept.total_rostered_hours))}</td>
                          <td>{fmt(percentage, 1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "shifts":
        return (
          <div>
            <div className="alert alert-info">
              <h6>📋 Total Shifts Breakdown</h6>
              <p className="mb-1">
                <strong>Total Shifts:</strong> {allData.total_shifts}
              </p>
            </div>

            {allData.departmentSummary && allData.departmentSummary.length > 0 && (
              <div className="mt-3">
                <h6>Department Breakdown:</h6>
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Shifts</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allData.departmentSummary.map((dept, idx) => {
                      const percentage = (dept.shifts_count / allData.total_shifts) * 100;
                      return (
                        <tr key={idx}>
                          <td>{dept.department_slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                          <td>{dept.shifts_count}</td>
                          <td>{fmt(percentage, 1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "avgLength":
        return (
          <div>
            <div className="alert alert-info">
              <h6>⏱️ Average Shift Length</h6>
              <p className="mb-1">
                <strong>Average:</strong> {fmt(Number(allData.avg_shift_length))} hours
              </p>
              <p className="mb-0 text-muted small">
                This is calculated across all {allData.total_shifts} shifts in the selected period.
              </p>
            </div>

            {allData.departmentSummary && allData.departmentSummary.length > 0 && (
              <div className="mt-3">
                <h6>Department Averages:</h6>
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Avg Shift Length</th>
                      <th>Total Shifts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allData.departmentSummary.map((dept, idx) => (
                      <tr key={idx}>
                        <td>{dept.department_slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                        <td>{fmt(Number(dept.avg_shift_length))} hrs</td>
                        <td>{dept.shifts_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "staff":
        return (
          <div>
            <div className="alert alert-info">
              <h6>👥 Unique Staff Members</h6>
              <p className="mb-1">
                <strong>Total Unique Staff:</strong> {allData.unique_staff}
              </p>
            </div>

            {allData.staffSummary && allData.staffSummary.length > 0 && (
              <div className="mt-3">
                <h6>Staff Details:</h6>
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table className="table table-sm table-striped">
                    <thead className="sticky-top bg-white">
                      <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Hours</th>
                        <th>Shifts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allData.staffSummary.map((staff, idx) => (
                        <tr key={idx}>
                          <td>{staff.first_name} {staff.last_name}</td>
                          <td>{staff.department}</td>
                          <td>{fmt(Number(staff.total_rostered_hours))}</td>
                          <td>{staff.shifts_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {allData.departmentSummary && allData.departmentSummary.length > 0 && (
              <div className="mt-3">
                <h6>Staff per Department:</h6>
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Unique Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allData.departmentSummary.map((dept, idx) => (
                      <tr key={idx}>
                        <td>{dept.department_slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                        <td>{dept.unique_staff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-muted">No detailed data available for this metric.</p>;
    }
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{kpiData?.title} - Details</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">{renderDetailContent()}</div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
