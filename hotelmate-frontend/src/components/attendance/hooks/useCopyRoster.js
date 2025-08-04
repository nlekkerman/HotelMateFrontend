import { useState, useCallback } from "react";
import api from "@/services/api";

function toMinutes(t) {
  const [hh, mm] = t.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm || "0", 10);
}
function isOverlap(aStart, aEnd, bStart, bEnd) {
  const aS = toMinutes(aStart);
  const aE = toMinutes(aEnd);
  const bS = toMinutes(bStart);
  const bE = toMinutes(bEnd);
  return aS < bE && bS < aE;
}

export default function useCopyRoster({
  hotelSlug,
  fetchShifts,
  onCopySuccess,
  onCopyError,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Main copy function
  const copyRoster = useCallback(
    async (sourcePeriodId, targetPeriodId) => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch shifts from source period
        const sourceShifts = await fetchShifts(sourcePeriodId);

        // 2. Fetch shifts from target period (existing shifts to check overlap)
        const targetShifts = await fetchShifts(targetPeriodId);

        // 3. Prepare shifts to copy
        // Assuming shifts have shift_date, you might need to adjust dates here
        // For demo: keep dates as is (or transform as needed)
        const shiftsToCopy = sourceShifts.map((shift) => ({
          ...shift,
          period: targetPeriodId,
          // If needed, transform shift_date here to target period's date
        }));

        // 4. Check overlaps between shiftsToCopy and targetShifts for each staff and date
        for (const newShift of shiftsToCopy) {
          for (const existingShift of targetShifts) {
            if (
              newShift.staff_id === existingShift.staff_id &&
              newShift.shift_date === existingShift.shift_date &&
              isOverlap(
                newShift.shift_start,
                newShift.shift_end,
                existingShift.shift_start,
                existingShift.shift_end
              )
            ) {
              throw new Error(
                `Overlap detected for staff ${newShift.staff_id} on ${newShift.shift_date}`
              );
            }
          }
        }

        // 5. Submit the shifts to the server via bulk-save endpoint
        await api.post(`/attendance/${hotelSlug}/shifts/bulk-save/`, {
          shifts: shiftsToCopy,
          period: targetPeriodId,
          hotel: shiftsToCopy[0]?.hotel || null,
        });

        onCopySuccess?.();
      } catch (err) {
        setError(err);
        onCopyError?.(err);
      } finally {
        setLoading(false);
      }
    },
    [fetchShifts, hotelSlug, onCopySuccess, onCopyError]
  );

  return { copyRoster, loading, error };
}
