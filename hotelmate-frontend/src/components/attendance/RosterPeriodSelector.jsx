import React, { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { format, parseISO } from "date-fns";
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

  const fetchRosterPeriods = useCallback(async () => {
    if (!hotelSlug) return;
    try {
      setLoading(true);
      const res = await api.get(`/attendance/${hotelSlug}/periods/`);
      const items = Array.isArray(res.data.results) ? res.data.results : res.data;
      const list = items || [];
      setRosterPeriods(list);

      if (!selectedPeriod && list.length) {
        const latest = [...list].sort(
          (a, b) => new Date(b.start_date) - new Date(a.start_date)
        )[0];
        setSelectedPeriod?.(latest.id);
      }
    } catch (error) {
      console.error("Error fetching roster periods", error);
    } finally {
      setLoading(false);
    }
  }, [hotelSlug, selectedPeriod, setSelectedPeriod]);

  useEffect(() => {
    fetchRosterPeriods();
  }, [fetchRosterPeriods]);

  const handleWeekPick = async (date) => {
    if (!date || !hotelSlug) return;
    setPickDate(date);
    setCreating(true);
    try {
      const res = await api.post(
        `/attendance/${hotelSlug}/periods/create-for-week/`,
        { date: format(date, "yyyy-MM-dd") }
      );
      const period = res.data;

      setRosterPeriods((prev) => {
        const exists = prev.some((p) => p.id === period.id);
        return exists ? prev : [...prev, period];
      });

      setSelectedPeriod?.(period.id);
      onPeriodCreated?.(period);
    } catch (err) {
      console.error("Failed to create/get period for week:", err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p>Loading roster periods...</p>;

return (
<div className="rp-container ">
  <div className=" d-flex  flex-row justify-content-start align-items-center p-3 gap-3 rounded mb-4">
    {/* Pick week */}
<div className="rp-chip d-flex flex-column border p-2 text-muted ">
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

{/* Existing period */}
<div className="rp-chip d-flex flex-column border p-2 text-muted">
  <span className="rp-label">Existing</span>

  {rosterPeriods.length === 0 ? (
    <span className="rp-empty">No periods</span>
  ) : (
    <select
      className="rp-select"
      value={selectedPeriod || ""}
      onChange={(e) => setSelectedPeriod?.(parseInt(e.target.value, 10))}
    >
      <option value="">-- Choose --</option>
      {rosterPeriods
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
        .map((period) => (
          <option key={period.id} value={period.id}>
            {period.title} (
            {format(parseISO(period.start_date), "dd MMM")} –{" "}
            {format(parseISO(period.end_date), "dd MMM")})
          </option>
        ))}
    </select>
  )}
</div>

  </div>
</div>


);

}
