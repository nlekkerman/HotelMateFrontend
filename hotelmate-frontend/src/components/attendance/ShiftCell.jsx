import React from "react";
import { format } from "date-fns";

export default function ShiftCell({
  staff,
  date,
  baseRoster = {},
  localShifts = [],
  onAdd,
  onEdit,
  locationsMap = {},        // 👈 NEW
}) {
  const dateStr = format(date, "yyyy-MM-dd");
  const key = `${staff.id}_${dateStr}`;

  const server = baseRoster[key] || [];
  const localForKey = localShifts.filter(
    (s) => (s.staff_id || s.staff) === staff.id && s.shift_date === dateStr
  );

  const combined = [
    ...server.filter((s) => !localForKey.some((ls) => ls.id === s.id)),
    ...localForKey,
  ];

  return (
    <div className={`h-full p-1 ${combined.length === 0 ? "bg-gray-100" : ""}`}>
      {combined.length === 0 && (
        <div className="text-gray-500 text-xs italic text-center mb-1 rounded">
          Off
        </div>
      )}

      {combined.map((shift, i) => {
        const isNew = !shift.id;
        const isUpdated =
          shift.id && localForKey.some((ls) => ls.id === shift.id);

        let cls = "bg-success text-white";
        if (isUpdated && !isNew) cls = "bg-warning text-white";
        if (isNew) cls = "bg-info text-white italic";

        const start =
          typeof shift.shift_start === "string"
            ? shift.shift_start.slice(0, 5)
            : shift.shift_start;
        const end =
          typeof shift.shift_end === "string"
            ? shift.shift_end.slice(0, 5)
            : shift.shift_end;

        const loc =
  shift.location && typeof shift.location === "object"
    ? shift.location
    : locationsMap[shift.location || shift.location_id] || null;

        return (
          <div
            key={shift.id ?? `l${i}`}
            className={`shift-chip text-xs mb-1 shadow cursor-pointer ${cls}`}
            onClick={() => onEdit(staff, dateStr, shift)}
          >
            {start}–{end}
            {loc && (
  <span
    className="badge rounded-pill ms-1 align-middle"
    style={{
      backgroundColor: loc.color || "#666",
      border: "1px solid rgba(0,0,0,.1)",
    }}
    title={loc.name}  // show full name on hover
  >
    {loc.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()}
  </span>
)}

          </div>
        );
      })}

      <div
        className="text-gray-400 text-xs italic text-center cursor-pointer"
        onClick={() => onAdd(staff, dateStr, null)}
      >
        +
      </div>
    </div>
  );
}
