import React, { useState, useEffect } from "react";

export default function ShiftModal({
  show,
  shift = null,
  date,
  staff,
  onClose,
  onSave,
  onDelete,
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    if (shift) {
      setStart(shift.shift_start);
      setEnd(shift.shift_end);
    } else {
      setStart("");
      setEnd("");
    }
  }, [shift]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 rounded shadow-md w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">
          {shift ? "Edit Shift" : "Assign Shift"} for{" "}
          <span className="text-blue-600">{staff.first_name} {staff.last_name}</span> on{" "}
          <strong>{date}</strong>
        </h3>

        <div className="flex flex-col gap-3 mb-4">
          <label className="text-sm font-medium">
            Start Time:
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full border px-2 py-1 rounded mt-1"
            />
          </label>

          <label className="text-sm font-medium">
            End Time:
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full border px-2 py-1 rounded mt-1"
            />
          </label>
        </div>

        <div className="flex justify-between items-center">
          {shift && (
            <button
              className="text-red-600 hover:underline"
              onClick={() => onDelete(shift)}
            >
              Delete Shift
            </button>
          )}
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-gray-300 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => onSave({ start, end })}
              disabled={!start || !end}
            >
              {shift ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
