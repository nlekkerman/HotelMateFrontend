import React, { useState } from 'react';
import DepartmentRosterView from '@/components/attendance/DepartmentRosterView';
import { useParams } from 'react-router-dom';
import useStaffMetadata from '@/hooks/useStaffMetadata';

export default function RosterDashboard() {
  const { hotelSlug } = useParams();
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const { departments, isLoading, isError } = useStaffMetadata();

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">📋 Roster Management</h1>

      {/* Department Buttons */}
      <div className="flex flex-wrap gap-3">
        {departments.map(([value, label]) => (
          <button
            key={value}
            className={`px-4 py-2 rounded shadow-md border ${
              selectedDepartment === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
            }`}
            onClick={() => setSelectedDepartment(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Department View */}
      {selectedDepartment && (
        <DepartmentRosterView
          department={selectedDepartment}
          hotelSlug={hotelSlug}
        />
      )}
    </div>
  );
}
