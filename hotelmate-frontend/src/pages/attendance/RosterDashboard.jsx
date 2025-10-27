import React, { useState } from "react";
import DepartmentRosterView from "@/components/attendance/DepartmentRosterView";
import { useParams } from "react-router-dom";
import useStaffMetadata from "@/hooks/useStaffMetadata";

export default function RosterDashboard() {
  const { hotelSlug } = useParams();
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const {
    departments,
    roles,
    accessLevels,
    isLoading,
    isError,
    error,
  } = useStaffMetadata(hotelSlug);

  // For debugging

  if (isError) {
    return (
      <div className="p-4 text-center text-red-600">
        Error loading departments: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-600">Loading departments…</div>
    );
  }

  // departments is an array of objects: [{id, name, slug}, ...]
  // Use slug if available, else fallback to id for the option value
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
          {departments.map(({ id, name, slug }) => (
            <option key={id} value={slug || id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Department View */}
      {selectedDepartment && (
        <DepartmentRosterView
          department={selectedDepartment}
          hotelSlug={hotelSlug}
          onSubmit={() => {
            // Optionally refresh or reset things on submit
            // For example, reset selection or trigger refresh key
          }}
        />
      )}
    </div>
  );
}
