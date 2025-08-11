import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DepartmentRosterView from "@/components/attendance/DepartmentRosterView";
import { useParams } from "react-router-dom";
import useStaffMetadata from "@/hooks/useStaffMetadata";

export default function RosterDashboard() {
  const { hotelSlug } = useParams();
  console.log("hotelSlug:", hotelSlug);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const {
    departments,
    roles,
    accessLevels,
    isLoading,
    isError,
    error,
  } = useStaffMetadata(hotelSlug);

  // Add this log to inspect the departments data
  console.log("departments:", departments);

  if (isError) {
    console.error("Error loading staff metadata:", error);
    return (
      <div className="p-4 text-center text-red-600">
        Error loading departments: {error?.message || "Unknown error"}
      </div>
    );
  }

  const [refreshKey, setRefreshKey] = useState(0);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-600">Loading departments…</div>
    );
  }

  // Normalize departments to array format
  const departmentEntries = Array.isArray(departments)
    ? departments
    : Object.entries(departments || {});

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-center">📋 Roster Management</h1>

      {/* Department Dropdown */}
      <div className="mb-3 d-flex flex-column align-items-center mt-5">
        <label
          htmlFor="departmentSelect"
          className="form-label text-muted small"
        >
          Select Department to edit
        </label>
        <select
          id="departmentSelect"
          className="form-select form-select-sm rounded-pill px-3"
          style={{ width: "auto" }}
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="">-- Choose a department --</option>
          {departmentEntries.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Department View */}
      {selectedDepartment && (
        <DepartmentRosterView
          key={refreshKey}
          department={selectedDepartment}
          hotelSlug={hotelSlug}
          onSubmit={() => setRefreshKey((prev) => prev + 1)}
        />
      )}
    </div>
  );
}
