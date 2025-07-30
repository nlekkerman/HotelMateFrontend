import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { useDailyPlanPdfExporter } from "./hooks/useDailyPlanPdfExporter";
import StaffCard from "@/components/staff/StaffCard";

export default function DailyPlan({ hotelSlug, departmentSlug }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyPlan, setDailyPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { generateDailyPlanPdf } = useDailyPlanPdfExporter();

  useEffect(() => {
    if (!hotelSlug || !departmentSlug || !date) return;

    setLoading(true);
    setError(null);

    api
      .get(
        `/attendance/${hotelSlug}/departments/${departmentSlug}/daily-plans/prepare-daily-plan/`,
        { params: { date } }
      )
      .then((res) => {
        setDailyPlan(res.data);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [hotelSlug, departmentSlug, date]);

  const handleDownloadPdf = () => {
    if (!dailyPlan || !dailyPlan.entries) return;

    generateDailyPlanPdf({
      hotelName: hotelSlug.replace(/-/g, " "),
      date,
      department: departmentSlug.replace(/-/g, " "),
      entries: dailyPlan.entries,
    });
  };

  const groupedByLocation = (dailyPlan?.entries || []).reduce((acc, entry) => {
    const loc = entry.location_name || entry.location?.name || "No Location";
    const staff = entry.staff;
    if (!acc[loc]) acc[loc] = [];
    if (staff) acc[loc].push(staff);
    return acc;
  }, {});

  return (
    <div
      className="p-4 border rounded bg-light shadow-sm"
      style={{ maxWidth: 700, margin: "auto" }}
    >
      <h2 className="mb-4 text-center">
        📋 Daily Plan for{" "}
        <span className="text-primary">{departmentSlug.replace(/-/g, " ")}</span> at{" "}
        <span className="text-success">{hotelSlug.replace(/-/g, " ")}</span>
      </h2>

      <div className="mb-4 d-flex align-items-center justify-content-center gap-3 flex-wrap">
        <label htmlFor="datePicker" className="form-label fw-semibold mb-0">
          Select Date:
        </label>
        <input
          id="datePicker"
          type="date"
          className="form-control w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ minWidth: 160 }}
        />
      </div>

      {loading && <p className="text-muted text-center">Loading...</p>}
      {error && <p className="text-danger text-center">Error loading daily plan.</p>}
      {!loading && !error && (!dailyPlan?.entries || dailyPlan.entries.length === 0) && (
        <p className="text-warning text-center">No staff assigned for this date.</p>
      )}

      {!loading && !error && dailyPlan?.entries?.length > 0 && (
        <>
          <h4 className="mt-4 mb-3 border-bottom pb-2">
            👥 Staff relocations on <span className="fw-semibold">{date}</span>
          </h4>

          {Object.entries(groupedByLocation).map(([location, staffList]) => (
            <div key={location} className="mb-4">
              <h5 className="fw-bold text-secondary border-start border-3 border-primary ps-3 mb-3">
               Staff for {location}
              </h5>
              
              <div className="d-flex flex-column gap-2">
                {staffList.map((staff, idx) => (
                  <StaffCard key={staff.id || idx} staff={staff} />
                ))}
              </div>
            </div>
          ))}

          <div className="d-flex justify-content-center">
            <button className="btn btn-primary btn-lg mt-3" onClick={handleDownloadPdf}>
              📥 Download PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
