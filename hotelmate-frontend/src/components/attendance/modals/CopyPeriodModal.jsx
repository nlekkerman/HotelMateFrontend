import React, { useState, useEffect } from "react";
import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";

export default function CopyPeriodModal({ 
  show, 
  onClose,
  hotelSlug,
  department,
  currentPeriod,
  onContinue,
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (show) {
      console.log("🟢 MODAL OPENED");
      console.log("Hotel:", hotelSlug);
      console.log("Department:", department);
      console.log("Period:", currentPeriod);
    }
  }, [show, hotelSlug, department, currentPeriod]);

  if (!show) return null;

  return (
  <div
    className={`modal fade ${show ? "show d-block" : ""}`}
    tabIndex="-1"
    role="dialog"
    style={{ backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent" }}
    aria-modal={show}
    aria-hidden={!show}
  >
    <div
      className="modal-dialog modal-dialog-centered"
      role="document"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Prepare to Copy Roster Period</h5>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
          ></button>
        </div>

        <div className="modal-body">
          <p><strong>Hotel:</strong> {hotelSlug}</p>
          <p><strong>Department:</strong> {department?.name || department}</p>
          <p>
            <strong>Current Period:</strong>{" "}
            {currentPeriod?.start_date} → {currentPeriod?.end_date}
          </p>

          <label className="form-label">Select Target Period:</label>
          <RosterPeriodSelector
            hotelSlug={hotelSlug}
            department={department}
            selectedPeriod={selectedPeriodId}
            setSelectedPeriod={setSelectedPeriodId}
          />
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          const [loading, setLoading] = useState(false);

...

<button
  type="button"
  className="btn btn-primary"
  disabled={!selectedPeriodId || loading}
  onClick={async () => {
    if (!selectedPeriodId) {
      alert("Please select a period.");
      return;
    }
    setLoading(true);
    try {
      await onContinue?.(selectedPeriodId); // wait for copy to finish
      onClose(); // ✅ only close if success
    } catch (err) {
      alert("Copy failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
