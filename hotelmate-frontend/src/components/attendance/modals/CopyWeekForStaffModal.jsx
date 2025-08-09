import React, { useState } from "react";
import slugify from "slugify";  // <-- IMPORT slugify here
import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";

export default function CopyWeekForStaffModal({
  show,
  onClose,
  staff,
  currentPeriod,
  onContinue, // ({ staffId, sourcePeriodId, targetPeriodId }) => Promise
  loading,
}) {
  const [targetPeriodId, setTargetPeriodId] = useState(null);

  if (!show) return null;

  return (
    <div
      className={`modal fade ${show ? "show d-block" : ""}`}
      tabIndex="-1"
      role="dialog"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      aria-modal={show}
      aria-hidden={!show}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <h5 className="modal-title">
              Copy Week for {staff?.first_name} {staff?.last_name}
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <p>
              <strong>Source Period:</strong> {currentPeriod?.start_date} →{" "}
              {currentPeriod?.end_date}
            </p>

            <label className="form-label">Select Target Period:</label>

            <RosterPeriodSelector
              hotelSlug={
                staff?.hotel_slug ||
                slugify(staff?.hotel_name || "", { lower: true })
              }
              selectedPeriod={targetPeriodId}
              setSelectedPeriod={setTargetPeriodId}
            />
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!targetPeriodId || loading}
              onClick={() => {
                console.log({
                  staffId: staff?.id,
                  sourcePeriodId: currentPeriod?.id,
                  targetPeriodId,
                });
                onContinue({
                  staffId: staff?.id,
                  sourcePeriodId: currentPeriod?.id,
                  targetPeriodId,
                });
              }}
            >
              {loading ? "Copying..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
