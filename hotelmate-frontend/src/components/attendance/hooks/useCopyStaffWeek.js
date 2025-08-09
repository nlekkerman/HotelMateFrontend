import { useState, useCallback } from "react";
import api from "@/services/api";

export default function useCopyStaffWeek({ hotelSlug, onCopySuccess, onCopyError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const copyAndSaveStaffWeek = useCallback(
    async (staffId, sourcePeriodId, targetPeriodId) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.post(
          `/attendance/${hotelSlug}/shift-copy/copy-week-staff/`,
          {
            staff_id: staffId,
            source_period_id: sourcePeriodId,
            target_period_id: targetPeriodId
          }
        );

        if (response.status === 200 || response.status === 201) {
          onCopySuccess?.(response.data);
          return response.data;
        } else {
          throw new Error("Failed to copy staff week.");
        }
      } catch (err) {
        setError(err);
        onCopyError?.(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [hotelSlug, onCopySuccess, onCopyError]
  );

  return { copyAndSaveStaffWeek, loading, error };
}
