import React, { useEffect, useState } from "react";

export default function CopyShiftModal({
  staff,
  date,
  onClose,
  onCopyDayForStaff,
  onCopyDayForAll,
  onCopyWeekForAllStaff,
  limitedOptions = false,
  defaultCopyType = null,
}) {
  const [step, setStep] = useState(1);
  const [copyType, setCopyType] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetWeekStart, setTargetWeekStart] = useState("");

  useEffect(() => {
    if (defaultCopyType) {
      setCopyType(defaultCopyType);
      setStep(2);
    }
  }, [defaultCopyType]);

  const handleContinue = () => {
    if (copyType) setStep(2);
  };

  const handleConfirm = () => {
    if (copyType === "day_self") {
      onCopyDayForStaff?.(staff, targetDate);
    } else if (copyType === "day_all") {
      onCopyDayForAll?.(date, targetDate);
    } else if (copyType === "week") {
      onCopyWeekForAllStaff?.(date, targetWeekStart);
    }
    onClose();
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50 z-3">
      <div className="bg-white rounded shadow p-4" style={{ width: "400px", maxWidth: "90%" }}>
        {step === 1 && (
          <>
            <h5 className="mb-3">Copy what?</h5>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="copyType"
                id="daySelf"
                value="day_self"
                checked={copyType === "day_self"}
                onChange={(e) => setCopyType(e.target.value)}
              />
              <label className="form-check-label" htmlFor="daySelf">
                Whole day for this staff
              </label>
            </div>

            {!limitedOptions && (
              <>
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="copyType"
                    id="dayAll"
                    value="day_all"
                    checked={copyType === "day_all"}
                    onChange={(e) => setCopyType(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="dayAll">
                    Whole day for all staff
                  </label>
                </div>
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="copyType"
                    id="weekAll"
                    value="week"
                    checked={copyType === "week"}
                    onChange={(e) => setCopyType(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="weekAll">
                    Whole week for all staff
                  </label>
                </div>
              </>
            )}

            <div className="mt-4 d-flex justify-content-between">
              <button className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!copyType}
                onClick={handleContinue}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h5 className="mb-3">Select target</h5>

            {(copyType === "day_self" || copyType === "day_all") && (
              <div className="mb-3">
                <label className="form-label">Target date</label>
                <input
                  type="date"
                  className="form-control"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            )}

            {copyType === "week" && (
              <div className="mb-3">
                <label className="form-label">Target week start</label>
                <input
                  type="date"
                  className="form-control"
                  value={targetWeekStart}
                  onChange={(e) => setTargetWeekStart(e.target.value)}
                />
              </div>
            )}

            <div className="d-flex justify-content-between">
              {!defaultCopyType && (
                <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
              )}
              <button
                className="btn btn-success"
                onClick={handleConfirm}
                disabled={
                  (copyType === "week" && !targetWeekStart) ||
                  (copyType !== "week" && !targetDate)
                }
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
