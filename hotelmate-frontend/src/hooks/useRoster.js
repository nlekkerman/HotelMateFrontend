import { useState, useCallback, useEffect } from "react";
import api from "@/services/api";

// ---- helpers to detect overlaps ----
function toMinutes(t) {
  // accepts "HH:mm" or "HH:mm:ss"
  const [hh, mm] = t.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm || "0", 10);
}

function isOverlap(aStart, aEnd, bStart, bEnd) {
  const aS = toMinutes(aStart);
  const aE = toMinutes(aEnd);
  const bS = toMinutes(bStart);
  const bE = toMinutes(bEnd);
  return aS < bE && bS < aE; // classic interval overlap
}

export default function useRoster({
  hotelSlug,
  department,
  fetchShifts,
  initialPeriod,
  injectedHotelId,
  serverShifts = [], // 👈 pass your server shifts in
}) {
  

  // 1️⃣ Keep the current period in state
  const [period, setPeriodObj] = useState(initialPeriod);

  // 2️⃣ Sync initialPeriod and fetch shifts
  useEffect(() => {
  
    if (initialPeriod && (!period || period.id !== initialPeriod.id)) {
      
      setPeriodObj(initialPeriod);
      if (typeof fetchShifts === "function") {
        fetchShifts(initialPeriod.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPeriod, fetchShifts]); // <- don't include `period` to avoid loops

  // 3️⃣ setPeriod
  const setPeriod = useCallback(
    async (idOrObj) => {
      let p;
      if (typeof idOrObj === "object") {
        p = idOrObj;
      } else if (idOrObj) {
        const { data } = await api.get(
          `/attendance/${hotelSlug}/periods/${idOrObj}/`
        );
        p = data;
      } else return;

      setPeriodObj(p);
      if (typeof fetchShifts === "function") {
        fetchShifts(p.id);
      }
    },
    [hotelSlug, fetchShifts]
  );

  // 4️⃣ Local shifts
  const [localShifts, setLocalShifts] = useState([]);

  // 5️⃣ Editing state
  const [editing, setEditing] = useState({
    staff: null,
    date: null,
    shift: null,
  });

  // 6️⃣ Hotel ID
  const hotelId =
    injectedHotelId ?? JSON.parse(localStorage.getItem("user") || "{}").hotel_id;

  // 7️⃣ Handlers
  const open = useCallback((staff, date, shift) => {
    setEditing({ staff, date, shift });
  }, []);

  const close = useCallback(() => {
    setEditing({ staff: null, date: null, shift: null });
  }, []);

  const save = useCallback(
  ({ shift_start, shift_end, location }) => {
    const { staff, date, shift } = editing;
    if (!staff || !date || !period) return;

    const staffId = staff.id;
    const dateStr = date;

    // ---- overlap check ----
    const serverForDay = (Array.isArray(serverShifts) ? serverShifts : []).filter(
      (s) => (s.staff_id ?? s.staff) === staffId && s.shift_date === dateStr
    );
    const localForDay = localShifts.filter(
      (s) => s.staff_id === staffId && s.shift_date === dateStr
    );

    const comparable = [
      ...serverForDay.filter((s) => !(shift?.id && s.id === shift.id)),
      ...localForDay.filter((s) => !(shift?.id && s.id === shift.id)),
    ];

    const hasOverlap = comparable.some((s) =>
      isOverlap(shift_start, shift_end, s.shift_start, s.shift_end)
    );
    if (hasOverlap) {
      alert("❌ Overlapping shift for this staff on this date.");
      return;
    }
    // -----------------------

    const payload = {
      ...(shift?.id && { id: shift.id }),
      staff_id: staff.id,
      staff: staff.id,
      department,
      period: period.id,
      shift_date: dateStr,
      shift_start,
      shift_end,
      location_id: location ?? null,
      hotel: hotelId,
    };

    setLocalShifts((prev) => {
      if (shift?.id) {
        const exists = prev.some((s) => s.id === shift.id);
        if (exists) return prev.map((s) => (s.id === shift.id ? payload : s));
        return [...prev, payload];
      }
      return [...prev, payload];
    });

    close();
  },
  [editing, department, period, hotelId, close, localShifts, serverShifts]
);


  const remove = useCallback(async () => {
    const { shift, staff, date } = editing;
    if (shift?.id) {
      await api.delete(`/attendance/${hotelSlug}/shifts/${shift.id}/`);
      fetchShifts(period.id);
      // also strip any local edited copy of this id
      setLocalShifts((prev) => prev.filter((s) => s.id !== shift.id));
    } else {
      setLocalShifts((prev) =>
        prev.filter(
          (s) => !(s.staff_id === staff.id && s.shift_date === date && !s.id)
        )
      );
    }
    close();
  }, [editing, hotelSlug, fetchShifts, period, close]);

  const bulkSubmit = useCallback(async () => {
  // 1) Overlap safety (unchanged)
  for (let i = 0; i < localShifts.length; i++) {
    for (let j = i + 1; j < localShifts.length; j++) {
      const a = localShifts[i];
      const b = localShifts[j];
      if (
        a.staff_id === b.staff_id &&
        a.shift_date === b.shift_date &&
        isOverlap(a.shift_start, a.shift_end, b.shift_start, b.shift_end)
      ) {
        alert("❌ Overlapping shifts exist in your changes. Please fix before submitting.");
        return;
      }
    }
  }

  // 2) NORMALISE + LOG
  const payloadShifts = localShifts.map((s) => ({
    ...s,
    location:
      s.location === "" || s.location == null ? null : Number(s.location),
  }));

  console.log("🚀 bulkSubmit -> sending payload:", {
    period: period.id,
    hotel: hotelId,
    shifts: payloadShifts,
  });

  try {
    const { data } = await api.post(
      `/attendance/${hotelSlug}/shifts/bulk-save/`,
      {
        shifts: payloadShifts,
        period: period.id,
        hotel: hotelId,
      }
    );

    console.log("✅ bulkSubmit -> server response:", data);

    setLocalShifts([]);
    fetchShifts(period.id);
  } catch (err) {
    console.error("❌ bulkSubmit failed:", err.response?.data || err.message);
    alert(
      `Bulk save failed:\n${
        typeof err.response?.data === "object"
          ? JSON.stringify(err.response.data, null, 2)
          : err.response?.data || err.message
      }`
    );
  }
}, [localShifts, hotelSlug, period, hotelId, fetchShifts]);

  return {
    period,
    setPeriod,
    localShifts,
    editing,
    open,
    close,
    save,
    remove,
    bulkSubmit,
  };
}
