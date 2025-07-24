import React, { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import WeeklyRosterBoard from "@/components/attendance/WeeklyRosterBoard";
import { isAfter, parseISO } from "date-fns";

export default function DepartmentRosterView({ department, hotelSlug }) {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // 🔁 Fetch all periods, and default to the latest
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await api.get(`/attendance/${hotelSlug}/periods/`);
        const periodList = Array.isArray(res.data.results)
          ? res.data.results
          : [];
        setPeriods(periodList);

        const sorted = [...periodList].sort((a, b) =>
          isAfter(parseISO(b.start_date), parseISO(a.start_date)) ? 1 : -1
        );
        if (sorted.length > 0) {
          setSelectedPeriod(sorted[0]);
          console.log("📆 Latest period:", sorted[0]);
        } else {
          console.warn("⚠️ No periods found.");
        }
      } catch (err) {
        console.error("❌ Failed to fetch periods:", err);
      }
    };

    if (hotelSlug) fetchPeriods();
  }, [hotelSlug]);

  const fetchShifts = useCallback(async () => {
    if (!selectedPeriod || !department || !hotelSlug) return;

    try {
      const url = `/attendance/${hotelSlug}/shifts/?period=${selectedPeriod.id}&department=${department}`;
      const res = await api.get(url);

      // 🛠 FIX: Properly extract array
      const data = res.data.results || res.data;
      setShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Failed to fetch shifts:", err);
      setShifts([]); // fallback to empty
    }
  }, [hotelSlug, department, selectedPeriod]);

  // 🔁 Fetch staff list
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const url = `/staff/by_department/?department=${department}`;
        console.log("📡 Fetching staff from:", url);

        const res = await api.get(url);
        const results = res.data.results || res.data;
        setStaffList(results);
        console.log(
          "👥 Staff list:",
          results.map((s) => s.id)
        ); // ← Debug here
      } catch (err) {
        console.error("❌ Failed to fetch staff list:", err);
      }
    };

    if (department) fetchStaff();
  }, [department]);

  // ⏳ Re-fetch shifts when period changes
  useEffect(() => {
    if (selectedPeriod?.id) fetchShifts();
  }, [fetchShifts, selectedPeriod]);

  const handlePeriodChange = (periodId) => {
    const selected = periods.find((p) => p.id === periodId);
    if (selected) {
      setSelectedPeriod(selected);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">
        Roster for {department.replace("_", " ").toUpperCase()}
      </h3>

      {selectedPeriod && (
        <WeeklyRosterBoard
          staffList={staffList}
          shifts={shifts}
          hotelSlug={hotelSlug}
          department={department}
          period={selectedPeriod}
          periods={periods}
          onPeriodChange={handlePeriodChange}
          fetchShifts={fetchShifts}
        />
      )}
    </div>
  );
}
