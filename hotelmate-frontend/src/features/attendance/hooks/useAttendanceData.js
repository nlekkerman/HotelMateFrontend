import { useEffect, useState } from "react";

export function useRosterForDate(hotelSlug, date, department, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    items: [],
  });

  useEffect(() => {
    if (!hotelSlug || !date) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = new URLSearchParams({ date });
    if (department && department !== "all") {
      params.append("department", department);
    }

    fetch(`/api/attendance/${hotelSlug}/roster?` + params.toString())
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load roster");
        return res.json();
      })
      .then((json) => {
        setState({
          loading: false,
          error: null,
          items: json.results || json,
        });
      })
      .catch((err) => {
        console.error(err);
        setState({
          loading: false,
          error: err.message,
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
    if (!hotelSlug || !date) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = new URLSearchParams({ date });
    if (department && department !== "all") {
      params.append("department", department);
    }

    fetch(`/api/attendance/${hotelSlug}/clock-logs?` + params.toString())
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load clock logs");
        return res.json();
      })
      .then((json) => {
        setState({
          loading: false,
          error: null,
          items: json.results || json,
        });
      })
      .catch((err) => {
        console.error(err);
        setState({
          loading: false,
          error: err.message,
          items: [],
        });
      });
  }, [hotelSlug, date, department, refreshKey]);

  return state;
}
