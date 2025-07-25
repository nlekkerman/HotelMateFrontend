import React, { useEffect, useState, useMemo, useCallback } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import ShiftModal from "@/components/modals/ShiftModal";
import api from "@/services/api";

export default function WeeklyRosterBoard({
  hotelSlug,
  department,
  staffList = [],
  shifts = [],
  fetchShifts,
  period,
  periods = [],
  onPeriodChange,
  hotelId: injectedHotelId, // ← pass from parent to avoid localStorage in render
}) {
  const [showModal, setShowModal] = useState(false);
  const [targetStaff, setTargetStaff] = useState(null);
  const [targetDate, setTargetDate] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [localShifts, setLocalShifts] = useState([]);

  const hotelId = injectedHotelId ?? (() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.hotel_id;
    } catch {
      return undefined;
    }
  })();

  const weekStart = useMemo(
    () =>
      period?.start_date
        ? new Date(period.start_date)
        : startOfWeek(new Date(), { weekStartsOn: 0 }),
    [period?.start_date]
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Build a roster index once
  const baseRoster = useMemo(() => {
    return (Array.isArray(shifts) ? shifts : []).reduce((acc, shift) => {
      const staffKey = shift.staff_id ?? shift.staff; // fallback
      const key = `${staffKey}_${shift.shift_date}`;
      acc[key] = acc[key] ? [...acc[key], shift] : [shift];
      return acc;
    }, {});
  }, [shifts]);

  const handleOpenModal = useCallback((staff, date, shift = null) => {
    setTargetStaff(staff);
    setTargetDate(date);
    setEditingShift(shift);
    setShowModal(true);
  }, []);

  const handleSaveShift = useCallback(
    ({ start, end }) => {
      if (!targetStaff || !targetDate) return;

      const newShift = {
        staff_id: targetStaff.id,
        staff: targetStaff.id,
        department,
        period: period.id,
        shift_date: targetDate,
        shift_start: start,
        shift_end: end,
        hotel: hotelId,
        ...(editingShift?.id ? { id: editingShift.id } : {}),
      };

      setLocalShifts((prev) => {
        // If editing an existing one => replace it
        if (editingShift?.id) {
          return prev.map((s) => (s.id === editingShift.id ? newShift : s));
        }

        // Creating a new one: allow multiple per day (split shifts)
        return [...prev, newShift];
      });

      setShowModal(false);
    },
    [department, period?.id, hotelId, targetStaff, targetDate, editingShift]
  );

  const handleDeleteShift = useCallback(() => {
    if (editingShift?.id) {
      setLocalShifts((prev) => prev.filter((s) => s.id !== editingShift.id));
    }
    setShowModal(false);
  }, [editingShift]);

  const renderShifts = useCallback(
    (staff, date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const key = `${staff.id}_${dateStr}`;

      const serverShifts = baseRoster[key] || [];
      const localShiftsForKey = localShifts.filter(
        (s) => s.staff_id === staff.id && s.shift_date === dateStr
      );

      const combined = [
        ...serverShifts.filter(
          (s) => !localShiftsForKey.some((ls) => ls.id && ls.id === s.id)
        ),
        ...localShiftsForKey,
      ];

      return (
        <div className="flex flex-col gap-1">
          {combined.map((shift, idx) => (
            <div
              key={shift.id ?? `local-${idx}`}
              className={`text-xs px-2 py-1 rounded-md shadow cursor-pointer ${
                shift.id ? "bg-danger text-white" : "bg-success text-white italic"
              }`}
              onClick={() => handleOpenModal(staff, shift.shift_date, shift)}
            >
              {shift.shift_start} - {shift.shift_end}
            </div>
          ))}

          <div
            className="text-gray-400 text-xs text-center italic cursor-pointer"
            onClick={() => handleOpenModal(staff, dateStr, null)}
          >
            +
          </div>
        </div>
      );
    },
    [baseRoster, localShifts, handleOpenModal]
  );

  const handleSubmitRoster = useCallback(async () => {
    try {
      const res = await api.post(`/attendance/${hotelSlug}/shifts/bulk-save/`, {
        shifts: localShifts,
      });

      const created = Array.isArray(res.data.created) ? res.data.created.length : 0;
      const updated = Array.isArray(res.data.updated) ? res.data.updated.length : 0;
      const errors = Array.isArray(res.data.errors) ? res.data.errors.length : 0;

      alert(`✅ ${created} created, ${updated} updated.\n❌ ${errors} errors.`);
      setLocalShifts([]);
      fetchShifts?.();
    } catch (err) {
      console.error("Bulk save failed:", err);
      alert("❌ Save failed.");
    }
  }, [hotelSlug, localShifts, fetchShifts]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <label className="font-semibold text-sm">Select Week:</label>
        <select
          className="border border-gray-300 rounded px-3 py-2 text-sm"
          value={period?.id ?? ""}
          onChange={(e) => onPeriodChange?.(parseInt(e.target.value))}
        >
          {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {format(new Date(p.start_date), "dd MMM")} – {format(new Date(p.end_date), "dd MMM")}
          </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-sm">
              <th className="sticky left-0 bg-gray-100 border px-4 py-2 text-left z-10 shadow-md">
                Staff
              </th>
              {days.map((day) => (
                <th
                  key={day.getTime()}
                  className="border px-4 py-2 text-center whitespace-nowrap"
                >
                  {format(day, "EEE dd")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-6">
                  No staff available.
                </td>
              </tr>
            ) : (
              staffList.map((staff) => (
                <tr key={staff.id} className="even:bg-gray-50 text-sm">
                  <td className="sticky left-0 bg-white border px-4 py-2 font-medium whitespace-nowrap shadow-md z-10">
                    {staff.first_name} {staff.last_name}
                  </td>
                  {days.map((day) => (
                    <td key={`${staff.id}_${day.getTime()}`} className="border px-2 py-1 min-w-[100px] hover:bg-blue-50">
                      {renderShifts(staff, day)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {localShifts.length > 0 && (
        <div className="flex justify-end mt-4">
          <button
            className="px-6 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700"
            onClick={handleSubmitRoster}
          >
            Submit Roster ({localShifts.length} changes)
          </button>
        </div>
      )}

      <ShiftModal
        show={showModal}
        shift={editingShift}
        date={targetDate}
        staff={targetStaff}
        onClose={() => setShowModal(false)}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
      />
    </div>
  );
}
