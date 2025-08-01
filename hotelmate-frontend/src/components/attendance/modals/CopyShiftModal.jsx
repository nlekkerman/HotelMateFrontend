import React, { useEffect, useState } from "react";

export default function CopyShiftModal({
  staff,
  date,
  onClose,
  onCopyOneShift,
  onCopyDayForStaff,
  onCopyDayForAll,
  onCopyWeekForAllStaff,
  limitedOptions = false,
  defaultCopyType = null, // 👈 New prop
}) {
  const [step, setStep] = useState(1);
  const [copyType, setCopyType] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetWeekStart, setTargetWeekStart] = useState("");

  // Auto-select and skip to step 2 if defaultCopyType is passed
  useEffect(() => {
    if (defaultCopyType) {
      setCopyType(defaultCopyType);
      setStep(2);
    }
  }, [defaultCopyType]);

  const handleContinue = () => {
    if (copyType) {
      setStep(2);
    }
  };

  const handleConfirm = () => {
    if (copyType === "shift") {
      onCopyOneShift?.(staff, targetDate);
    } else if (copyType === "day_self") {
      onCopyDayForStaff?.(staff, targetDate);
    } else if (copyType === "day_all") {
      onCopyDayForAll?.(date, targetDate);
    } else if (copyType === "week") {
      onCopyWeekForAllStaff?.(date, targetWeekStart);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-96">

        {/* Step 1: Select copy type */}
        {step === 1 && (
          <>
            <h3 className="text-lg font-semibold mb-4">Copy what?</h3>
            <div className="space-y-2">
              <label className="block">
                <input
                  type="radio"
                  value="shift"
                  checked={copyType === "shift"}
                  onChange={(e) => setCopyType(e.target.value)}
                  className="mr-2"
                />
                One shift for this staff
              </label>
              <label className="block">
                <input
                  type="radio"
                  value="day_self"
                  checked={copyType === "day_self"}
                  onChange={(e) => setCopyType(e.target.value)}
                  className="mr-2"
                />
                Whole day for this staff
              </label>

              {!limitedOptions && (
                <>
                  <label className="block">
                    <input
                      type="radio"
                      value="day_all"
                      checked={copyType === "day_all"}
                      onChange={(e) => setCopyType(e.target.value)}
                      className="mr-2"
                    />
                    Whole day for all staff
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      value="week"
                      checked={copyType === "week"}
                      onChange={(e) => setCopyType(e.target.value)}
                      className="mr-2"
                    />
                    Whole week for all staff
                  </label>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50"
                disabled={!copyType}
                onClick={handleContinue}
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Step 2: Pick target date or week */}
        {step === 2 && (
          <>
            <h3 className="text-lg font-semibold mb-4">Select target</h3>

            {(copyType === "shift" || copyType === "day_self" || copyType === "day_all") && (
              <div className="mb-4">
                <label className="block text-sm mb-1">Target date</label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            )}

            {copyType === "week" && (
              <div className="mb-4">
                <label className="block text-sm mb-1">Target week start</label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1"
                  value={targetWeekStart}
                  onChange={(e) => setTargetWeekStart(e.target.value)}
                />
              </div>
            )}

            <div className="mt-4 flex justify-between">
              {!defaultCopyType && (
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
              )}
              <button
                className="bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50"
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

