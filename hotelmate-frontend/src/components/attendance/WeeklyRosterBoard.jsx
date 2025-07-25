// WeeklyRosterBoard.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import ShiftModal from "@/components/modals/ShiftModal";
import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";
import api from "@/services/api";
import { FaUserCircle } from "react-icons/fa";

export default function WeeklyRosterBoard({
  hotelSlug,
  department,
  staffList = [],
  shifts = [],
  fetchShifts,          // <- should accept the period id, or you can wrap it
  period,               // <- current period object coming from parent
  periods = [],
  onPeriodChange,       // <- parent setter for period id
  hotelId: injectedHotelId,
}) {
  const [showModal, setShowModal] = useState(false);
  const [targetStaff, setTargetStaff] = useState(null);
  const [targetDate, setTargetDate] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [localShifts, setLocalShifts] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState(period);   // <- keep the full object locally too
const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE || "";

function buildImageUrl(img) {
  if (!img || typeof img !== "string") return null;
  if (img.startsWith("data:")) return img;
  if (/^https?:\/\//i.test(img)) return img;
  return cloudinaryBase ? `${cloudinaryBase}${img}` : img;
}
  // keep local period object in sync when parent changes it
  useEffect(() => {
    if (period && (!currentPeriod || currentPeriod.id !== period.id)) {
      setCurrentPeriod(period);
    }
  }, [period, currentPeriod]);

  const loadPeriod = useCallback(
    async (idOrObj) => {
      // If selector passed back a full object, use it directly.
      if (typeof idOrObj === "object") {
        setCurrentPeriod(idOrObj);
        onPeriodChange?.(idOrObj.id);
        await fetchShifts?.(idOrObj.id);
        return;
      }

      // Otherwise fetch it by id
      const id = idOrObj;
      if (!id) return;
      const { data } = await api.get(`/attendance/${hotelSlug}/periods/${id}/`);
      setCurrentPeriod(data);
      onPeriodChange?.(id);          // tell parent
      await fetchShifts?.(id);       // refresh grid data
    },
    [hotelSlug, fetchShifts, onPeriodChange]
  );

  const toHM = (t) => (typeof t === "string" ? t.slice(0, 5) : t);

  const hotelId =
    injectedHotelId ??
    (() => {
      try {
        return JSON.parse(localStorage.getItem("user"))?.hotel_id;
      } catch {
        return undefined;
      }
    })();

  const weekStart = useMemo(
    () =>
      currentPeriod?.start_date
        ? new Date(currentPeriod.start_date)
        : startOfWeek(new Date(), { weekStartsOn: 0 }),
    [currentPeriod?.start_date]
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const baseRoster = useMemo(() => {
    return (Array.isArray(shifts) ? shifts : []).reduce((acc, shift) => {
      const staffKey = shift.staff_id ?? shift.staff;
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
      if (!targetStaff || !targetDate || !currentPeriod) return;

      const newShift = {
        staff_id: targetStaff.id,
        staff: targetStaff.id,
        department,
        period: currentPeriod.id,
        shift_date: targetDate,
        shift_start: start,
        shift_end: end,
        hotel: hotelId,
        ...(editingShift?.id ? { id: editingShift.id } : {}),
      };

      setLocalShifts((prev) => {
        if (editingShift?.id) {
          return prev.map((s) => (s.id === editingShift.id ? newShift : s));
        }
        return [...prev, newShift];
      });

      setShowModal(false);
    },
    [department, currentPeriod?.id, hotelId, targetStaff, targetDate, editingShift]
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
              className={`shift-chip text-xs mb-1 shadow cursor-pointer ${
                shift.id ? "bg-success text-white" : "bg-info text-white italic"
              }`}
              onClick={() => handleOpenModal(staff, shift.shift_date, shift)}
            >
              {toHM(shift.shift_start)} - {toHM(shift.shift_end)}
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
        period: currentPeriod?.id,   // optional, if your bulk endpoint supports top-level defaults
        hotel: hotelId,
      });

      const created = Array.isArray(res.data.created)
        ? res.data.created.length
        : 0;
      const updated = Array.isArray(res.data.updated)
        ? res.data.updated.length
        : 0;
      const errors = Array.isArray(res.data.errors)
        ? res.data.errors.length
        : 0;

      alert(`✅ ${created} created, ${updated} updated.\n❌ ${errors} errors.`);
      setLocalShifts([]);
      fetchShifts?.(currentPeriod?.id);
    } catch (err) {
      console.error("Bulk save failed:", err);
      alert("❌ Save failed.");
    }
  }, [hotelSlug, localShifts, fetchShifts, currentPeriod?.id, hotelId]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <RosterPeriodSelector
          hotelSlug={hotelSlug}
          selectedPeriod={currentPeriod?.id}
          setSelectedPeriod={(id) => loadPeriod(id)}
          onPeriodCreated={(p) => loadPeriod(p)} // <- load full object directly
        />
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse table-auto">
          <thead>
            <tr className="bg-gray-100 text-sm">
              <th className="sticky left-0 bg-gray-100 border px-4 py-2 text-left z-10 shadow-md w-[150px]">
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
  <div className="flex items-center gap-2">
    <span className="avatar-32">
      {staff.profile_image_url ? (
        <img
          src={buildImageUrl(staff.profile_image_url)}
          alt={`${staff.first_name} ${staff.last_name}`}
          className="avatar-img"
        />
      ) : (
        <FaUserCircle className="avatar-icon" />
      )}
    </span>

    <span>
      {staff.first_name} {staff.last_name}
    </span>
  </div>
</td>



                  {days.map((day) => (
                    <td
                      key={`${staff.id}_${day.getTime()}`}
                      className="border px-2 py-2 w-[calc(100%/7)] hover:bg-blue-50 text-center align-top"
                    >
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
        <div className="d-flex justify-content-center mt-4">
          <button
            className="px-6 py-2 bg-success text-white rounded shadow hover:bg-green-700"
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
