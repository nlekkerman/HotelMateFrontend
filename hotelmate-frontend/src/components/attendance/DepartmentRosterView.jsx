// DepartmentRosterView.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import WeeklyRosterBoard from "@/components/attendance/WeeklyRosterBoard";
import { isAfter, parseISO, isWithinInterval, startOfDay } from "date-fns";
import DailyPlan from "@/components/attendance/DailyPlan";
import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";
import DepartmentClockLogs from "@/components/attendance/DepartmentClockLogs";

export default function DepartmentRosterView({
  department,
  hotelSlug,
  onSubmit,
}) {
  const [periods, setPeriods] = useState([]);
  const [periodObj, setPeriodObj] = useState(null); // <-- FULL object
  const [shifts, setShifts] = useState([]);
  const [staffList, setStaffList] = useState([]);
   const [showClockLogs, setShowClockLogs] = useState(false);
  const [showDailyPlan, setShowDailyPlan] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleSubmitSuccess = () => setRefreshKey((prev) => prev + 1);

  // --------------------------------------------------
  // Fetch staff once
  // --------------------------------------------------
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const url = `/staff/${hotelSlug}/by_department/?department=${department}`;

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
        const list = Array.isArray(res.data.results)
          ? res.data.results
          : res.data || [];
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
  const onPeriodSelectedOrCreated = (period) => {
    // period can be full period object or just id, but your selector passes full object in onPeriodCreated
    if (!period) return;

    // If argument is an ID, convert to object
    let periodFullObj = period;

    if (typeof period === "number" || typeof period === "string") {
      periodFullObj = periods.find((p) => p.id === Number(period));
      if (!periodFullObj) return; // can't find it, bail out
    }

    setPeriodObj(periodFullObj);
    fetchShifts(periodFullObj.id);
  };

  // --------------------------------------------------
  // fetchShifts: **must accept an id** (so useRoster can call it)
  // --------------------------------------------------
  const fetchShifts = useCallback(
    async (periodId) => {
      if (!periodId || !department || !hotelSlug) return [];
      const url = `/attendance/${hotelSlug}/shifts/?period=${periodId}&department=${department}`;

      try {
        const res = await api.get(url);
        const data = res.data.results || res.data;
        const arr = Array.isArray(data) ? data : [];
        setShifts(arr);
        return arr; // <-- return the array here
      } catch (err) {
        console.error("❌ Failed to fetch shifts:", err);
        setShifts([]);
        return [];
      }
    },
    [hotelSlug, department]
  );

  // --------------------------------------------------
  // Called by WeeklyRosterBoard (via useRoster) whenever period changes
  // (it passes an **id**, we resolve to object here)
  // --------------------------------------------------
  // <-- here is your handlePeriodChange function
  const handlePeriodChange = useCallback(
    async (periodId, copyFromPeriodId = null) => {
      // add optional source period id
      if (!periodId) return;

      let found = periods.find((p) => p.id === periodId);
      if (!found) {
        try {
          const { data } = await api.get(
            `/attendance/${hotelSlug}/periods/${periodId}/`
          );
          found = data;
          setPeriods((prev) => [
            ...prev.filter((p) => p.id !== periodId),
            found,
          ]);
        } catch (err) {
          console.error("❌ Failed to fetch single period:", err);
          return;
        }
      }

      setPeriodObj(found);

      // If copying shifts from another period:
      if (copyFromPeriodId) {
        try {
          // Make an API call to copy shifts from copyFromPeriodId to periodId
          // Adjust endpoint to your backend API
          const copyRes = await api.post(
            `/attendance/${hotelSlug}/shifts/copy/`,
            {
              from_period: copyFromPeriodId,
              to_period: periodId,
              department,
            }
          );

          // Assume copyRes.data contains new shifts
          const copiedShifts = copyRes.data;
          setShifts(copiedShifts); // update local shifts state with copied shifts
        } catch (err) {
          console.error("❌ Failed to copy shifts:", err);
          // fallback: just fetch shifts normally for new period
          fetchShifts(periodId);
          return;
        }
      } else {
        // Just fetch shifts normally if no copying
        fetchShifts(periodId);
      }
    },
    [periods, hotelSlug, department, fetchShifts]
  );

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
 return (
  <div className="mt-6">
    <h3 className="text-xl font-semibold mb-4 custom-main-text d-flex justify-content-center">
      {department.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </h3>

    {/* Buttons aligned horizontally */}
    <div className="d-flex gap-2 mb-4 justify-center">
      <button
        onClick={() => setShowDailyPlan((prev) => !prev)}
        className="px-4 py-2 custom-button transition"
      >
        {showDailyPlan ? "Hide Daily Plans" : "Show Daily Plans"}
      </button>

      <button
        onClick={() => setShowClockLogs((prev) => !prev)}
        className="px-4 py-2 custom-button transition"
      >
        {showClockLogs ? "Hide Clock Logs" : "Show Clock Logs"}
      </button>
    </div>

    {/* Conditional rendering */}
    {showDailyPlan && (
      <DailyPlan hotelSlug={hotelSlug} departmentSlug={department} />
    )}

    {showClockLogs && (
      <div className="mt-4">
        <DepartmentClockLogs
          hotelSlug={hotelSlug}
          departmentSlug={department}
        />
      </div>
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
