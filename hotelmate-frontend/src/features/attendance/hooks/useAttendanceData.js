import { useEffect, useState } from "react";
import { safeApiResponse, safeString } from "../utils/safeUtils";

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

    const params = new URLSearchParams({ date: safeString(date) });
    if (department && department !== "all") {
      params.append("department", safeString(department));
    }

    fetch(`/api/attendance/${encodeURIComponent(hotelSlug)}/roster?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load roster (${res.status}): ${res.statusText}`);
        }
        return res.json();
      })
      .then((json) => {
        const items = safeApiResponse(json);
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

    const params = new URLSearchParams({ date: safeString(date) });
    if (department && department !== "all") {
      params.append("department", safeString(department));
    }

    fetch(`/api/attendance/${encodeURIComponent(hotelSlug)}/clock-logs?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load clock logs (${res.status}): ${res.statusText}`);
        }
        return res.json();
      })
      .then((json) => {
        const items = safeApiResponse(json);
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
