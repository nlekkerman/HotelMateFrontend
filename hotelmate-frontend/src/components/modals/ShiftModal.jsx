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
  className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-50 d-flex align-items-center justify-content-center z-3"
  onClick={onClose}
>
  <div
    className="bg-white p-4 rounded shadow w-100"
    style={{ maxWidth: '500px' }}
    onClick={(e) => e.stopPropagation()}
  >
    <h3 className="fs-5 fw-semibold mb-4">
      {shift ? "Edit Shift" : "Assign Shift"} for{" "}
      <span className="text-primary">
        {staff.first_name} {staff.last_name}
      </span>{" "}
      on <strong>{date}</strong>
    </h3>

    <div className="mb-4">
      <div className="mb-3">
        <label className="form-label">Start Time:</label>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="form-control"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">End Time:</label>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="form-control"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Location:</label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="form-select"
        >
          <option value="">— No location —</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="d-flex justify-content-between align-items-center">
      {shift && (
        <button
          className="btn btn-link text-danger p-0"
          onClick={() => onDelete(shift)}
        >
          Delete Shift
        </button>
      )}
      <div>
        <button className="btn btn-outline-secondary me-2" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-success"
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
