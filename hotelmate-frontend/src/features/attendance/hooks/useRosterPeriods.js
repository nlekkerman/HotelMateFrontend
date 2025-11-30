import { useEffect, useState } from "react";
import api from "@/services/api";
import { safeApiResponse, safeString } from "../utils/safeUtils";

export function useRosterPeriods(hotelSlug, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    items: [],
  });

  useEffect(() => {
    if (!hotelSlug) {
      setState({ loading: false, error: null, items: [] });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    api.get(`/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/periods/`)
      .then((response) => {
        const items = safeApiResponse(response?.data);
        setState({
          loading: false,
          error: null,
          items,
        });
      })
      .catch((err) => {
        console.error("useRosterPeriods error:", err);
        const errorMessage = err?.response?.data?.message || 
                           err?.message || 
                           "Failed to load roster periods";
        setState({
          loading: false,
          error: safeString(errorMessage),
          items: [],
        });
      });
  }, [hotelSlug, refreshKey]);

  return state;
}