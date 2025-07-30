// DepartmentRosterView.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import WeeklyRosterBoard from "@/components/attendance/WeeklyRosterBoard";
import { isAfter, parseISO,isWithinInterval, startOfDay } from "date-fns";
import DailyPlan from "@/components/attendance/DailyPlan";
export default function DepartmentRosterView({ department, hotelSlug, onSubmit  }) {
  const [periods, setPeriods] = useState([]);
  const [periodObj, setPeriodObj] = useState(null);     // <-- FULL object
  const [shifts, setShifts] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [showDailyPlan, setShowDailyPlan] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
const handleSubmitSuccess = () => setRefreshKey(prev => prev + 1);

  // --------------------------------------------------
  // Fetch staff once
  // --------------------------------------------------
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const url = `/staff/by_department/?department=${department}`;

        const res = await api.get(url);
        const results = res.data.results || res.data || [];
        setStaffList(results);
      } catch (err) {
        console.error("❌ Failed to fetch staff list:", err);
      }
    };

    if (department) fetchStaff();
  }, [department]);

  // --------------------------------------------------
  // Fetch periods, auto select latest once
  // --------------------------------------------------
  useEffect(() => {
    const fetchPeriods = async () => {
  if (!hotelSlug) return;
  try {
    const res = await api.get(`/attendance/${hotelSlug}/periods/`);
    const list = Array.isArray(res.data.results) ? res.data.results : res.data || [];
    setPeriods(list);

    if (!list.length) {
      console.warn("⚠️ No periods found.");
      return;
    }

    const today = startOfDay(new Date());

    // 1) Try to pick the period that contains today
    const current = list.find((p) => {
      const start = parseISO(p.start_date);
      const end = parseISO(p.end_date);
      return isWithinInterval(today, { start, end });
    });

    // 2) Fallback to latest by start_date
    const latest = [...list].sort((a, b) =>
      isAfter(parseISO(a.start_date), parseISO(b.start_date)) ? -1 : 1
    )[0];

    const picked = current || latest;

    setPeriodObj(picked);
    fetchShifts(picked.id); // initial fetch right here
  } catch (err) {
    console.error("❌ Failed to fetch periods:", err);
  }
};


    fetchPeriods();
  }, [hotelSlug]);

  // --------------------------------------------------
  // fetchShifts: **must accept an id** (so useRoster can call it)
  // --------------------------------------------------
  const fetchShifts = useCallback(
    async (periodId) => {
      if (!periodId || !department || !hotelSlug) return;
      const url = `/attendance/${hotelSlug}/shifts/?period=${periodId}&department=${department}`;

      try {
        const res = await api.get(url);
        const data = res.data.results || res.data;
        const arr = Array.isArray(data) ? data : [];
        setShifts(arr);
      } catch (err) {
        console.error("❌ Failed to fetch shifts:", err);
        setShifts([]);
      }
    },
    [hotelSlug, department]
  );

  // --------------------------------------------------
  // Called by WeeklyRosterBoard (via useRoster) whenever period changes
  // (it passes an **id**, we resolve to object here)
  // --------------------------------------------------
  const handlePeriodChange = useCallback(
    async (periodId) => {
      if (!periodId) return;

      // Try to find it in the cached list first
      const found = periods.find((p) => p.id === periodId);
      if (found) {
        setPeriodObj(found);
        fetchShifts(found.id);
        return;
      }

      // Fallback: fetch it
      try {
        const { data } = await api.get(`/attendance/${hotelSlug}/periods/${periodId}/`);
        setPeriodObj(data);
        fetchShifts(periodId);
      } catch (err) {
        console.error("❌ Failed to fetch single period:", err);
      }
    },
    [periods, hotelSlug, fetchShifts]
  );

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">
  {department.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
</h3>


<button
        onClick={() => setShowDailyPlan((prev) => !prev)}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        {showDailyPlan ? "Hide Daily Plans" : "Show Daily Plans"}
      </button>

      {showDailyPlan && (
        <DailyPlan hotelSlug={hotelSlug} departmentSlug={department} />
      )}



      <WeeklyRosterBoard
        staffList={staffList}
        shifts={shifts}
        hotelSlug={hotelSlug}
        department={department}
        period={periodObj}
        periods={periods}
        onPeriodChange={handlePeriodChange}
        fetchShifts={fetchShifts}
       
        onSubmitSuccess={handleSubmitSuccess}
        refreshKey={refreshKey} 
      />
    </div>
  );
}
