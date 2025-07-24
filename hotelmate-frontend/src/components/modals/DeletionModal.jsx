import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { format, addDays, startOfWeek } from "date-fns";
import DeletionModal from "@/components/modals/DeletionModal";

export default function WeeklyRosterBoard({
  hotelSlug,
  department,
  staffList,
  shifts,
}) {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [showModal, setShowModal] = useState(false);
  const [targetShift, setTargetShift] = useState(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const roster = (Array.isArray(shifts) ? shifts : []).reduce((acc, shift) => {
    const key = `${shift.staff_id}_${shift.shift_date}`;
    acc[key] = acc[key] ? [...acc[key], shift] : [shift];
    return acc;
  }, {});

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await api.get(`/attendance/${hotelSlug}/periods/`);
        const periodList = Array.isArray(res.data.results)
          ? res.data.results
          : [];
        setPeriods(periodList);

        if (periodList.length > 0) {
          setSelectedPeriodId(periodList[0].id);
          setWeekStart(new Date(periodList[0].start_date));
        }
      } catch (err) {
        console.error("Failed to fetch periods:", err);
      }
    };

    fetchPeriods();
  }, [hotelSlug]);

  const handleDeleteShift = async () => {
    if (!targetShift) return;
    try {
      await api.delete(`/attendance/${hotelSlug}/shifts/${targetShift.id}/`);
      setShowModal(false);
      setTargetShift(null);
      alert("Shift deleted. Please refresh.");
    } catch (err) {
      console.error("Failed to delete shift:", err);
      alert("Error deleting shift.");
    }
  };

  const renderShifts = (staffId, date) => {
    const key = `${staffId}_${format(date, "yyyy-MM-dd")}`;
    const shifts = roster[key] || [];

    return (
      <div className="flex flex-col gap-1">
        {shifts.map((shift) => (
          <div
            key={shift.id}
            className="relative bg-blue-600 text-white text-xs px-2 py-1 rounded-md shadow"
          >
            {shift.shift_start} - {shift.shift_end}
            <button
              onClick={() => {
                setTargetShift(shift);
                setShowModal(true);
              }}
              className="absolute top-0 right-1 text-white text-xs hover:text-red-200"
              title="Delete shift"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          className="text-gray-400 text-xs italic hover:text-blue-600 text-center"
          onClick={() =>
            alert(`Assign shift to ${staffId} on ${format(date, "yyyy-MM-dd")}`)
          }
        >
          + Add
        </button>
      </div>
    );
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Period selector */}
      {/* ... unchanged ... */}

      {/* Roster Table */}
      {/* ... unchanged ... */}

      {/* Modal */}
      <DeletionModal
        show={showModal}
        title="Delete Shift"
        onClose={() => {
          setShowModal(false);
          setTargetShift(null);
        }}
        onConfirm={handleDeleteShift}
      >
        Are you sure you want to delete the shift{" "}
        <strong>
          {targetShift?.shift_start} – {targetShift?.shift_end}
        </strong>{" "}
        on <strong>{targetShift?.shift_date}</strong>?
      </DeletionModal>
    </div>
  );
}
