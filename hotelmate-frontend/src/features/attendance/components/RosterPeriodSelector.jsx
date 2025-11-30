import React from "react";
import { safeString } from "../utils/safeUtils";

export default function RosterPeriodSelector({ periods, selectedId, onChange }) {
  // Defensive check for periods
  const safePeriods = Array.isArray(periods) ? periods : [];
  
  if (safePeriods.length === 0) {
    return (
      <div className="text-muted small p-2 border rounded">
        No roster periods defined yet.
      </div>
    );
  }

  const handleChange = (e) => {
    if (typeof onChange !== 'function') return;
    
    const value = e.target.value;
    try {
      onChange(value ? Number(value) : null);
    } catch (error) {
      console.error("Error in period selector change:", error);
    }
  };

  return (
    <select
      className="form-select form-select-sm"
      value={selectedId ?? ""}
      onChange={handleChange}
      style={{ maxWidth: 260, minWidth: 200 }}
    >
      <option value="">Select period</option>
      {safePeriods.filter(p => p && p.id).map((p) => {
        const startDate = safeString(p.start_date);
        const endDate = safeString(p.end_date);
        const title = safeString(p.title);
        
        const label = title || 
          (startDate && endDate ? `${startDate} → ${endDate}` : "Unnamed period") +
          (p.finalized ? " (Finalized)" : "");
          
        return (
          <option key={p.id} value={p.id}>
            {label}
          </option>
        );
      })}
    </select>
  );
}