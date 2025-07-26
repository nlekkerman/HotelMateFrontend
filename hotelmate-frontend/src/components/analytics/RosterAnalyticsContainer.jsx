// src/components/analytics/RosterAnalyticsContainer.jsx
import React, { useMemo, useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { startOfWeek, endOfWeek } from "date-fns";
import RosterAnalytics from "@/components/analytics/RosterAnalytics";

// TEMP: hardcode departments – replace with API if needed
const DEPARTMENTS = [
  { value: "", label: "All departments" },
  { value: "reception", label: "Reception" },
  { value: "kitchen", label: "Kitchen" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "porters", label: "Porters" },
  { value: "maintenance", label: "Maintenance" },
  { value: "leisure", label: "Leisure" },
  { value: "spa", label: "Spa" },
  { value: "security", label: "Security" },
  { value: "management", label: "Management" },
  { value: "food_and_beverage", label: "Food & Beverage" },
  { value: "cleaning", label: "Cleaning Crew" },
  { value: "front_office", label: "Front Office" },
];

export default function RosterAnalyticsContainer({
  hotels = [
    // TEMP: replace with real hotel list
    { slug: "hotel-killarney", name: "Hotel Killarney" },
    { slug: "wayne-manor", name: "Wayne Manor" },
  ],
  defaultHotelSlug = "hotel-killarney",
}) {
  // Defaults to current ISO week
  const [hotelSlug, setHotelSlug] = useState(defaultHotelSlug);
  const [department, setDepartment] = useState("");
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));

  // Just so you can pass everything together if you want later
  const filters = useMemo(
    () => ({ hotelSlug, department, startDate, endDate }),
    [hotelSlug, department, startDate, endDate]
  );

  return (
    <div className="container mt-4">
      {/* Filters bar */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Roster Analytics Filters</h5>

          <div className="row g-3 align-items-center">
            {/* Hotel select */}
            <div className="col-md-3">
              <label className="form-label">Hotel</label>
              <select
                className="form-select"
                value={hotelSlug}
                onChange={(e) => setHotelSlug(e.target.value)}
              >
                {hotels.map((h) => (
                  <option key={h.slug} value={h.slug}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department select */}
            <div className="col-md-3">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="col-md-3">
              <label className="form-label">Start</label>
              <ReactDatePicker
                selected={startDate}
                onChange={setStartDate}
                className="form-control"
                dateFormat="yyyy-MM-dd"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">End</label>
              <ReactDatePicker
                selected={endDate}
                onChange={setEndDate}
                className="form-control"
                dateFormat="yyyy-MM-dd"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Display everything */}
      <RosterAnalytics
        hotelSlug={filters.hotelSlug}
        startDate={filters.startDate}
        endDate={filters.endDate}
        department={filters.department || undefined}
      />
    </div>
  );
}
