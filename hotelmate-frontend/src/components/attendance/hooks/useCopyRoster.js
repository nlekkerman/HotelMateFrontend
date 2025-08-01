import { addDays, startOfWeek } from "date-fns";

export default function useCopyRoster({ baseRoster, localShifts, setLocalShifts }) {
  // Generate key for staff+date grouping
  const key = (staffId, date) => `${staffId}_${date}`;

  // Get combined shifts from server + local changes, deduplicated
  const getShiftsFor = (staffId, date) => {
    const dateKey = key(staffId, date);
    const serverShifts = baseRoster[dateKey] || [];
    const localForDate = localShifts.filter(
      (s) =>
        (s.staff_id || s.staff) === staffId &&
        s.shift_date.slice(0, 10) === date
    );

    // Unique shift signature by start/end time + location
    const shiftKey = (s) =>
      `${s.shift_start?.slice(0, 5)}_${s.shift_end?.slice(0, 5)}_${s.location_id || s.location}`;

    // Filter out server shifts that have been overridden locally
    const filteredServer = serverShifts.filter(
      (s) => !localForDate.some((ls) => shiftKey(ls) === shiftKey(s))
    );

    return [...filteredServer, ...localForDate];
  };

  // Copy a single shift to targetDate (creates a new shift without ID)
  const copyOneShift = (shift, targetDate) => {
    const newShift = { ...shift, shift_date: targetDate, id: undefined };
    setLocalShifts((prev) => [...prev, newShift]);
  };

  // Copy all shifts for one staff from sourceDate to targetDate
  const copyDayForStaff = (staff, sourceDate, targetDate) => {
    const shifts = getShiftsFor(staff.id, sourceDate);
    const newShifts = shifts.map((s) => ({
      ...s,
      shift_date: targetDate,
      staff: staff.id,
      staff_id: staff.id,
      id: undefined,
    }));
    setLocalShifts((prev) => [...prev, ...newShifts]);
  };

  // Copy one day from sourceDate to targetDate for all staff in staffList
  const copyDayForAll = (sourceDate, targetDate, staffList) => {
    const allShifts = staffList.flatMap((staff) => {
      const shifts = getShiftsFor(staff.id, sourceDate);
      return shifts.map((s) => ({
        ...s,
        shift_date: targetDate,
        staff: staff.id,
        staff_id: staff.id,
        id: undefined,
      }));
    });
    setLocalShifts((prev) => [...prev, ...allShifts]);
  };

  // Copy entire week starting from sourceDate to targetStart for all staff
  const copyWeekForAllStaff = (sourceDate, targetStart, staffList) => {
    const srcStart = startOfWeek(new Date(sourceDate), { weekStartsOn: 0 });
    const tgtStart = startOfWeek(new Date(targetStart), { weekStartsOn: 0 });

    const allShifts = [];

    for (let i = 0; i < 7; i++) {
      const srcDay = addDays(srcStart, i);
      const tgtDay = addDays(tgtStart, i);

      const srcDate = srcDay.toISOString().slice(0, 10);
      const tgtDate = tgtDay.toISOString().slice(0, 10);

      for (const staff of staffList) {
        const shifts = getShiftsFor(staff.id, srcDate);
        shifts.forEach((s) => {
          allShifts.push({
            ...s,
            shift_date: tgtDate,
            staff: staff.id,
            staff_id: staff.id,
            id: undefined,
          });
        });
      }
    }

    setLocalShifts((prev) => [...prev, ...allShifts]);
  };

  return {
    copyOneShift,
    copyDayForStaff,
    copyDayForAll,
    copyWeekForAllStaff,
  };
}
