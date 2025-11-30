import React from "react";

/**
 * Loading skeleton components for attendance system
 */

// Skeleton for individual table row
export function AttendanceTableRowSkeleton() {
  return (
    <tr>
      <td>
        <div className="placeholder-glow">
          <span className="placeholder col-8"></span>
        </div>
      </td>
      <td>
        <div className="placeholder-glow">
          <span className="placeholder col-10"></span>
        </div>
      </td>
      <td>
        <div className="placeholder-glow">
          <span className="placeholder col-9"></span>
        </div>
      </td>
      <td>
        <div className="placeholder-glow">
          <span className="placeholder col-6 rounded-pill"></span>
        </div>
      </td>
      <td>
        <div className="placeholder-glow">
          <span className="placeholder col-12 rounded" style={{ height: '32px' }}></span>
        </div>
      </td>
    </tr>
  );
}

// Skeleton for full attendance table
export function AttendanceTableSkeleton({ rows = 5 }) {
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0 table-hover">
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
          {Array.from({ length: rows }).map((_, index) => (
            <AttendanceTableRowSkeleton key={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Skeleton for period selector
export function PeriodSelectorSkeleton() {
  return (
    <div className="placeholder-glow">
      <span className="placeholder col-12 rounded" style={{ height: '38px', minWidth: '200px' }}></span>
    </div>
  );
}

// Skeleton for period summary card
export function PeriodSummarySkeleton() {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="placeholder-glow">
          <h5 className="card-title">
            <span className="placeholder col-6"></span>
          </h5>
          <div className="row">
            <div className="col-md-3">
              <span className="placeholder col-8"></span>
              <br />
              <span className="placeholder col-6"></span>
            </div>
            <div className="col-md-3">
              <span className="placeholder col-8"></span>
              <br />
              <span className="placeholder col-6"></span>
            </div>
            <div className="col-md-3">
              <span className="placeholder col-8"></span>
              <br />
              <span className="placeholder col-6"></span>
            </div>
            <div className="col-md-3">
              <span className="placeholder col-8"></span>
              <br />
              <span className="placeholder col-6"></span>
            </div>
          </div>
          <div className="mt-3">
            <span className="placeholder col-3 rounded" style={{ height: '38px' }}></span>
            {' '}
            <span className="placeholder col-3 rounded" style={{ height: '38px' }}></span>
            {' '}
            <span className="placeholder col-3 rounded" style={{ height: '38px' }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for staff summary
export function StaffSummarySkeleton() {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="placeholder-glow">
          <h6 className="card-title">
            <span className="placeholder col-4"></span>
          </h6>
          <div className="row">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="col-md-3 mb-2">
                <div className="text-center">
                  <div className="h4">
                    <span className="placeholder col-6"></span>
                  </div>
                  <small className="text-muted">
                    <span className="placeholder col-8"></span>
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for alert
export function AlertSkeleton() {
  return (
    <div className="alert alert-secondary d-flex justify-content-between align-items-center mb-2">
      <div className="placeholder-glow flex-grow-1">
        <strong><span className="placeholder col-3"></span></strong>
        {' '}
        <span className="placeholder col-8"></span>
      </div>
      <div className="d-flex gap-2">
        <span className="placeholder col-12 rounded" style={{ height: '32px', width: '80px' }}></span>
        <span className="placeholder col-12 rounded" style={{ height: '32px', width: '60px' }}></span>
      </div>
    </div>
  );
}

// Main loading component that shows when dashboard is initially loading
export function AttendanceDashboardSkeleton() {
  return (
    <div className="container py-4">
      {/* Header skeleton */}
      <header className="mb-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <div className="placeholder-glow">
              <h2 className="mb-1">
                <span className="placeholder col-8"></span>
              </h2>
              <small className="text-muted">
                <span className="placeholder col-6"></span>
              </small>
            </div>
          </div>
          <div className="d-flex flex-column flex-sm-row gap-2 w-100 w-md-auto">
            <PeriodSelectorSkeleton />
            <div className="placeholder-glow">
              <span className="placeholder col-12 rounded" style={{ height: '38px', minWidth: '150px' }}></span>
            </div>
            <div className="placeholder-glow">
              <span className="placeholder col-12 rounded" style={{ height: '38px', minWidth: '160px' }}></span>
            </div>
          </div>
        </div>
      </header>

      {/* Period summary skeleton */}
      <PeriodSummarySkeleton />

      {/* Staff summary skeleton */}
      <StaffSummarySkeleton />

      {/* Alerts skeleton */}
      <div className="mb-3">
        <AlertSkeleton />
        <AlertSkeleton />
      </div>

      {/* Filter controls skeleton */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center mb-2 gap-2">
        <div className="flex-grow-1 placeholder-glow">
          <span className="placeholder col-12 rounded" style={{ height: '32px' }}></span>
        </div>
        <div style={{ minWidth: 220 }} className="placeholder-glow">
          <span className="placeholder col-12 rounded" style={{ height: '32px' }}></span>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="card">
        <div className="card-body">
          <AttendanceTableSkeleton rows={8} />
        </div>
      </div>
    </div>
  );
}

export default AttendanceDashboardSkeleton;