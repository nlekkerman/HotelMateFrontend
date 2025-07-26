import React, { useState, useEffect, useMemo } from "react";

export default function ShiftModal({
  show,
  shift = null,
  date,
  staff,
  onClose,
  onSave,
  onDelete,
  locations = [],
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [locationId, setLocationId] = useState("");

  // Fast lookup if you ever need it
  const locationsMap = useMemo(
    () =>
      Array.isArray(locations)
        ? locations.reduce((acc, l) => ((acc[l.id] = l), acc), {})
        : {},
    [locations]
  );

  useEffect(() => {
    if (shift) {
      console.log("🟢 Editing shift:", shift);
      setStart(shift.shift_start || shift.start_time || "");
      setEnd(shift.shift_end || shift.end_time || "");
      setLocationId(String(shift.location || ""));
    } else {
      console.log("🆕 Creating new shift for:", staff, date);
      setStart("");
      setEnd("");
      setLocationId("");
    }
  }, [shift, staff, date]);

  // Close on ESC
  useEffect(() => {
    if (!show) return;
    const handler = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [show, onClose]);

  if (!show) return null;

  const handleSave = () => {
    console.log("💾 Saving shift with values:", {
      start,
      end,
      locationId,
      location: locationId ? Number(locationId) : null,
    });

    onSave({
      shift_start: start,
      shift_end: end,
      location: locationId ? Number(locationId) : null,
    });
  };

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
          <span className="text-blue-600">
            {staff.first_name} {staff.last_name}
          </span>{" "}
          on <strong>{date}</strong>
        </h3>

        <div className="flex flex-col gap-3 mb-4">
          <label className="text-sm font-medium">
            Start Time:
            <input
              type="time"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                console.log("⏰ Start time set to:", e.target.value);
              }}
              className="w-full border px-2 py-1 rounded mt-1"
            />
          </label>

          <label className="text-sm font-medium">
            End Time:
            <input
              type="time"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                console.log("⏰ End time set to:", e.target.value);
              }}
              className="w-full border px-2 py-1 rounded mt-1"
            />
          </label>

          {/* Location selector */}
          <label className="text-sm font-medium">
            Location:
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                console.log("📍 Location selected:", e.target.value);
              }}
              className="w-full border px-2 py-1 rounded mt-1"
            >
              <option value="">— No location —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-between items-center">
          {shift && (
            <button
              className="text-red-600 hover:underline"
              onClick={() => {
                console.log("🗑 Deleting shift:", shift);
                onDelete(shift);
              }}
            >
              Delete Shift
            </button>
          )}
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-danger text-white m-2 rounded-pill shadow hover:bg-dark"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-success text-white rounded-pill"
              onClick={handleSave}
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
