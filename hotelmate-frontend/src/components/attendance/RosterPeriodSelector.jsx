import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { format, parseISO } from 'date-fns';

export default function RosterPeriodSelector({ hotelSlug, selectedPeriod, setSelectedPeriod }) {
  const [rosterPeriods, setRosterPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hotelSlug) return;

    async function fetchRosterPeriods() {
      try {
        const res = await api.get(`/attendance/${hotelSlug}/periods/`);
        if (Array.isArray(res.data.results)) {
          setRosterPeriods(res.data.results);
        } else {
          console.error("Expected results to be array but got:", res.data);
        }
      } catch (error) {
        console.error("Error fetching roster periods", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRosterPeriods();
  }, [hotelSlug]);

  if (loading) return <p>Loading roster periods...</p>;
  if (rosterPeriods.length === 0) return <p>No roster periods found. Please create one.</p>;

  return (
    <div>
      <label className="block text-sm font-medium">Select Roster Period</label>
      <select
        className="border rounded px-3 py-2"
        value={selectedPeriod}
        onChange={(e) => setSelectedPeriod(e.target.value)}
      >
        <option value="">-- Choose --</option>
        {rosterPeriods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.title} ({format(parseISO(period.start_date), 'dd MMM')} ➝ {format(parseISO(period.end_date), 'dd MMM')})
          </option>
        ))}
      </select>
    </div>
  );
}
