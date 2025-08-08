import React, { useState, useEffect } from "react";
import { format } from "date-fns";

export default function CopyDayModal({ show, sourceDate, onClose, onConfirm }) {
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    if (show) setTargetDate("");
  }, [show]);

  if (!show || !sourceDate) return null;

  const handleSubmit = () => {
    if (!targetDate) return alert("Please select a target date.");
    onConfirm(sourceDate, targetDate);
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1050,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      onClick={onClose}
    >
      <div
        className="modal-content bg-white p-4 rounded shadow"
        style={{ minWidth: 320, maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Copy Day for All Staff</h5>
          <button className="btn-close" onClick={onClose} />
        </div>

        <div className="modal-body mb-3">
          <p className="mb-2">
            Copy shifts from:{" "}
            <strong>{format(sourceDate, "EEEE, dd MMM yyyy")}</strong>
          </p>
          <label className="form-label">Select target date:</label>
          <input
            type="date"
            className="form-control"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>

        <div className="modal-footer d-flex justify-content-end">
          <button className="btn btn-secondary me-2" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Copy Day
          </button>
        </div>
      </div>
    </div>
  );
}
