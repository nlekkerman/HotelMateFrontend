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
  <div className="rp-container bg-light rounded">
    <div className="d-flex flex-column flex-md-row gap-3 align-items-center">
      {/* Pick Week */}
      <div className="rp-chip d-flex align-items-center flex-grow-1 max-w-280 bg-white rounded-pill px-3 py-1 shadow-sm text-muted">
        <span className="rp-label me-2" style={{ minWidth: '50px', userSelect: 'none' }}>
          Create Period:
        </span>
        <DatePicker
          selected={pickDate}
          onChange={handleWeekPick}
          dateFormat="dd MMM yyyy"
          className="form-control form-control-sm border-0 bg-transparent p-0"
          placeholderText="Select date"
          showWeekNumbers
          popperClassName="big-datepicker"
        />
        {creating && <small className="ms-2 text-muted fst-italic">Creating…</small>}
      </div>

      {/* Existing Periods */}
      <div className="rp-chip d-flex align-items-center flex-grow-1 max-w-280 bg-white rounded-pill px-3 py-1 shadow-sm text-muted">
        <span className="rp-label me-2" style={{ minWidth: '60px', userSelect: 'none' }}>
          Existing:
        </span>
        {rosterPeriods.length === 0 ? (
          <small className="text-muted">No periods</small>
        ) : (
          <select
            className="form-select form-select-sm border-0 bg-transparent p-0"
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
