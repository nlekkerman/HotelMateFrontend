import { useState } from "react";
import api from "@/services/api";

export default function useCopyDayForAll(hotelSlug) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const copyDayForAll = async (sourceDate, targetDate) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(
        `/attendance/${hotelSlug}/shift-copy/copy-roster-day-all/`,
        {
          source_date: sourceDate,
          target_date: targetDate,
        }
      );
      setLoading(false);
      return response.data; // { copied_shifts_count }
    } catch (err) {
      setLoading(false);
      setError(err);
      throw err; // rethrow so caller can handle if needed
    }
  };

  return { copyDayForAll, loading, error };
}
