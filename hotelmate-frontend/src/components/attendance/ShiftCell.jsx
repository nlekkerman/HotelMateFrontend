import React, { useState } from "react";
import { format } from "date-fns";
import { FaCopy } from "react-icons/fa";
import CopyShiftModal from "../attendance/modals/CopyShiftModal";

export default function ShiftCell({
  staff,
  date,
  baseRoster = {},
  localShifts = [],
  onAdd,
  onEdit,
  onCopyOneShift,
  onCopyDayForStaff,
  onCopyDayForAll,
  onCopyWeekForAllStaff,
  locationsMap = {},
}) {
  const dateStr = format(date, "yyyy-MM-dd");
  const key = `${staff.id}_${dateStr}`;

  const server = baseRoster[key] || [];
  const safeLocalShifts = Array.isArray(localShifts) ? localShifts : [];

const localForKey = safeLocalShifts.filter(
  (s) =>
    (s.staff_id || s.staff) === staff.id &&
    s.shift_date?.slice(0, 10) === dateStr
);


  const shiftKey = (s) =>
    `${s.shift_start?.slice(0, 5)}_${s.shift_end?.slice(0, 5)}_${
      s.location_id || s.location
    }`;

  const combined = [
    ...server.filter(
      (s) => !localForKey.some((ls) => shiftKey(ls) === shiftKey(s))
    ),
    ...localForKey,
  ];

  const [showCopyModal, setShowCopyModal] = useState(false);

  return (
    <div
      className={`h-full p-1 relative ${
        combined.length === 0 ? "bg-gray-100" : ""
      }`}
      style={{ position: "relative" }}
    >
      <button
        title="Copy options"
        onClick={() => setShowCopyModal(true)}
        className="absolute top-1 right-1 text-gray-400 hover:text-blue-600"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          opacity: 0,
          transition: "opacity 0.2s ease",
        }}
      >
        <FaCopy />
      </button>

      <style>
        {`
          div[style*="position: relative"]:hover > button {
            opacity: 1 !important;
          }
        `}
      </style>

      {combined.length === 0 && (
        <div className="text-gray-500 text-xs italic text-center mb-1 rounded">
          Off
        </div>
      )}

      {combined.map((shift, i) => {
        const isNew = !shift.id;
        const isUpdated = shift.id && localForKey.some((ls) => ls.id === shift.id);

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
                title={loc.name}
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
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === "Enter" && onAdd(staff, dateStr, null)}
      >
        +
      </div>

      {showCopyModal && (
        <CopyShiftModal
          staff={staff}
          date={dateStr}
          onClose={() => setShowCopyModal(false)}
          onCopyOneShift={(s, d) => {
            onCopyOneShift?.(s, d);
            setShowCopyModal(false);
          }}
          onCopyDayForStaff={(s, d) => {
            onCopyDayForStaff?.(s, d);
            setShowCopyModal(false);
          }}
          // Pass a flag to restrict copy options in the modal
          limitedOptions={true}
        />
      )}
    </div>
  );
}
