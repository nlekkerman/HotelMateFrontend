import React, { useState, useEffect } from "react";
import api from "@/services/api";

export const IngredientAnalytics = ({ hotelId }) => {
  const [analytics, setAnalytics] = useState({});
  const [filterPeriod, setFilterPeriod] = useState("week");
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  const fetchAnalytics = async (period = "week", start = null, end = null) => {
    try {
      const params = {};
      if (period) params.period = period;
      if (start) params.start_date = start;
      if (end) params.end_date = end;
      if (hotelId) params.hotel_id = hotelId;

      const res = await api.get("/stock_tracker/analytics/ingredient-usage/", { params });
      setAnalytics(res.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      alert("Failed to load analytics.");
    }
  };

  useEffect(() => {
    fetchAnalytics(filterPeriod);
  }, [filterPeriod, hotelId]);

  return (
    <div className="ingredient-analytics mt-4 p-3 border rounded bg-light">
      <h2>Ingredient Analytics</h2>

      <div className="mb-3">
        <strong>Filter by period:</strong>
        <div className="d-flex gap-2 mt-1">
          <button className="btn btn-sm btn-outline-primary" onClick={() => setFilterPeriod("day")}>Day</button>
          <button className="btn btn-sm btn-outline-primary" onClick={() => setFilterPeriod("week")}>Week</button>
          <button className="btn btn-sm btn-outline-primary" onClick={() => setFilterPeriod("month")}>Month</button>
        </div>

        <div className="d-flex gap-2 mt-2">
          <input
            type="date"
            className="form-control form-control-sm"
            value={customDates.start}
            onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
          />
          <input
            type="date"
            className="form-control form-control-sm"
            value={customDates.end}
            onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
          />
          <button
            className="btn btn-sm btn-primary"
            onClick={() => fetchAnalytics(null, customDates.start, customDates.end)}
          >
            Apply
          </button>
        </div>
      </div>

      {Object.keys(analytics).length === 0 ? (
        <p>No data for this period.</p>
      ) : (
        <ul className="list-group">
          {Object.entries(analytics).map(([ingredient, qty]) => (
            <li key={ingredient} className="list-group-item">
              {ingredient}: <strong>{qty}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
