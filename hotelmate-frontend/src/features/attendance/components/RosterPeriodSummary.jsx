import React from "react";

export default function RosterPeriodSummary({
  period,
  stats,
  onFinalize,
  finalizing,
  error,
  onExportCsv,
  onExportXlsx,
  onShowFinalizedRosters,
}) {
  if (!period) {
    return null;
  }

  const exportsDisabled = !period.finalized || !onExportCsv;

  return (
    <div className="card attendance-card mb-3">
      <div className="card-body">
        <div className="row align-items-center">
          <div className="col-md-8">
            <h6 className="mb-2">
              Period: {period.name}
              {period.finalized && (
                <span className="badge bg-success ms-2">Finalized</span>
              )}
            </h6>
            <p className="mb-1 text-muted">
              <strong>Dates:</strong> {period.start_date} to {period.end_date}
            </p>
            {stats && (
              <div className="d-flex gap-3 small text-muted">
                <span>Total logs: {stats.totalLogs}</span>
                <span>Open logs: {stats.openLogs}</span>
                <span>Unapproved: {stats.unapprovedLogs}</span>
                <span>Approved hours: {stats.approvedHours.toFixed(2)}</span>
              </div>
            )}
            {error && (
              <div className="alert alert-danger alert-sm mt-2 mb-0">
                {error}
              </div>
            )}
          </div>

          <div className="col-md-4">
            <div className="text-md-end d-flex flex-column align-items-stretch gap-2">
              {!period.finalized ? (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={finalizing}
                  onClick={onFinalize}
                >
                  {finalizing ? "Finalizing..." : "Finalize Period"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled
                >
                  Already finalized
                </button>
              )}

              <div className="btn-group btn-group-sm mt-1" role="group">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  disabled={exportsDisabled}
                  onClick={onExportCsv}
                >
                  Export CSV
                </button>
                {onExportXlsx && (
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    disabled={exportsDisabled}
                    onClick={onExportXlsx}
                  >
                    Excel
                  </button>
                )}
              </div>
              
              <button
                type="button"
                className="btn btn-sm btn-outline-primary mt-1"
                onClick={onShowFinalizedRosters}
              >
                Finalized Rosters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}