import React, { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import {
  format,
  parseISO,
  startOfDay,
  isWithinInterval,   // 👈 import this
} from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function RosterPeriodSelector({
  hotelSlug,
  selectedPeriod,
  setSelectedPeriod,
  onPeriodCreated,
}) {
  const [rosterPeriods, setRosterPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickDate, setPickDate] = useState(new Date());
  const [creating, setCreating] = useState(false);
  const [didAutoSelect, setDidAutoSelect] = useState(false);

  const fetchRosterPeriods = useCallback(async () => {
    if (!hotelSlug) return;
    setLoading(true);
    try {
      const res = await api.get(`/attendance/${hotelSlug}/periods/`);
      const items = Array.isArray(res.data.results) ? res.data.results : res.data;
      setRosterPeriods(items || []);
    } catch (err) {
      console.error("Error fetching roster periods", err);
    } finally {
      setLoading(false);
    }
  }, [hotelSlug]);

  useEffect(() => {
    fetchRosterPeriods();
  }, [fetchRosterPeriods]);

  // Auto-select the period that contains "today", else latest
  useEffect(() => {
    if (loading || didAutoSelect || selectedPeriod || rosterPeriods.length === 0) return;

    const today = startOfDay(new Date());

    const current = rosterPeriods.find((p) => {
      const start = parseISO(p.start_date);
      const end = parseISO(p.end_date);
      return isWithinInterval(today, { start, end });
    });

    const fallback = rosterPeriods
      .slice()
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];

    const picked = current || fallback;
    if (!picked) return;

    setSelectedPeriod(picked.id);
    setPickDate(new Date(picked.start_date));
    onPeriodCreated?.(picked);
    setDidAutoSelect(true);
  }, [
    loading,
    didAutoSelect,
    selectedPeriod,
    rosterPeriods,
    setSelectedPeriod,
    onPeriodCreated,
  ]);

  const handleWeekPick = async (date) => {
    if (!hotelSlug || !date) return;
    setCreating(true);
    try {
      const res = await api.post(
        `/attendance/${hotelSlug}/periods/create-for-week/`,
        { date: format(date, "yyyy-MM-dd") }
      );
      const period = res.data;
      setRosterPeriods((prev) =>
        prev.some((r) => r.id === period.id) ? prev : [...prev, period]
      );
      setSelectedPeriod(period.id);
      onPeriodCreated?.(period);
      setPickDate(new Date(period.start_date));
    } catch (err) {
      console.error("Failed to create/get period for week:", err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p>Loading roster periods…</p>;

  return (
    <div className="rp-container">
      <div className="d-flex flex-row gap-3 p-3 mb-4 rounded">
        {/* Pick Week */}
        <div className="rp-chip border p-2 text-muted">
          <span className="rp-label">Pick Week:</span>
          <DatePicker
            selected={pickDate}
            onChange={handleWeekPick}
            dateFormat="dd MMM yyyy"
            className="rp-input"
            placeholderText="Select date"
            showWeekNumbers
          />
          {creating && <span className="rp-status">Creating…</span>}
        </div>

        {/* Existing Periods */}
        <div className="rp-chip border p-2 text-muted">
          <span className="rp-label">Existing</span>
          {rosterPeriods.length === 0 ? (
            <span className="rp-empty">No periods</span>
          ) : (
            <select
              className="rp-select"
              value={selectedPeriod || ""}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10);
                setSelectedPeriod(id);
                const p = rosterPeriods.find((r) => r.id === id);
                if (p) {
                  onPeriodCreated?.(p);
                  setPickDate(new Date(p.start_date));
                }
              }}
            >
              <option value="">-- Choose --</option>
              {rosterPeriods
                .slice()
                .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({format(parseISO(p.start_date), "dd MMM")} –{" "}
                    {format(parseISO(p.end_date), "dd MMM")})
                  </option>
                ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
