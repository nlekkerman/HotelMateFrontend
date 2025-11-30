import { useEffect, useState } from "react";
import { safeApiResponse, safeString } from "../utils/safeUtils";
import api from "@/services/api";

export function useRosterForDate(hotelSlug, date, department, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    items: [],
  });

  useEffect(() => {
    if (!hotelSlug || !date) {
      setState({ loading: false, error: null, items: [] });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = { date: safeString(date) };
    if (department && department !== "all") {
      params.department = safeString(department);
    }

    api.get(`/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/shifts/`, { params })
      .then((response) => {
        const items = safeApiResponse(response.data);
        setState({
          loading: false,
          error: null,
          items,
        });
      })
      .catch((err) => {
        console.error("useRosterForDate error:", err);
        setState({
          loading: false,
          error: safeString(err.message) || "Failed to load roster",
          items: [],
        });
      });
  }, [hotelSlug, date, department, refreshKey]);

  return state;
}

export function useClockLogsForDate(hotelSlug, date, department, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    items: [],
  });

  useEffect(() => {
    if (!hotelSlug || !date) {
      setState({ loading: false, error: null, items: [] });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = { date: safeString(date) };
    if (department && department !== "all") {
      params.department = safeString(department);
    }

    api.get(`/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/clock-logs/`, { params })
      .then((response) => {
        const items = safeApiResponse(response.data);
        setState({
          loading: false,
          error: null,
          items,
        });
      })
      .catch((err) => {
        console.error("useClockLogsForDate error:", err);
        setState({
          loading: false,
          error: safeString(err.message) || "Failed to load clock logs",
          items: [],
        });
      });
  }, [hotelSlug, date, department, refreshKey]);

  return state;
}
