import { useState, useCallback } from "react";
import api from "@/services/api";

export default function useCopyRoster({ hotelSlug, onCopySuccess, onCopyError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const copyAndSaveRoster = useCallback(
    async (sourcePeriodId, targetPeriodObj) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.post(
          `/attendance/${hotelSlug}/shift-copy/copy-roster-bulk/`,
          {
            source_period_id: sourcePeriodId,
            target_period_id: targetPeriodObj.id,
          }
        );

        if (response.status === 200 || response.status === 201) {
          onCopySuccess?.(response.data);
          return response.data;
        } else {
          throw new Error("Failed to copy roster bulk.");
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

  return { copyAndSaveRoster, loading, error };
}

