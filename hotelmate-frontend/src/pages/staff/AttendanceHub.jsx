// src/pages/staff/AttendanceHub.jsx
// Canonical entry for the Attendance module.
// Replaces the separate /roster, /department-roster, /enhanced-attendance entry routes.
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import NoAccess from '@/components/NoAccess';
import AttendanceDashboard from '@/features/attendance/pages/AttendanceDashboard';
import DepartmentRosterDashboard from '@/features/attendance/pages/DepartmentRosterDashboard';
import EnhancedAttendanceDashboard from '@/features/attendance/components/EnhancedAttendanceDashboard';
import './RoomServicesHub.css';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  { key: 'department-roster', label: 'Department Roster', icon: 'bi-calendar-week' },
  { key: 'enhanced', label: 'Analytics', icon: 'bi-bar-chart' },
];

export default function AttendanceHub() {
  const { hotelSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const { user } = useAuth();

  // Backend-driven RBAC read gate. Route-level `requiredSlug: 'attendance'`
  // covers nav/module visibility; this enforces the explicit per-module
  // read flag (`user.rbac.attendance.read`) before rendering any attendance
  // surface. Fail-closed when the flag is missing or not strictly true.
  const canReadAttendance = user?.rbac?.attendance?.read === true;

  const selectTab = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'dashboard') next.delete('tab');
    else next.set('tab', key);
    setSearchParams(next, { replace: true });
  };

  if (!canReadAttendance) {
    return (
      <div className="container my-4">
        <h2 className="mb-4 text-center">Attendance</h2>
        <NoAccess message="You do not have permission to view attendance." />
      </div>
    );
  }

  return (
    <div className="attendance-hub">
      <div className="container-fluid pt-3">
        <ul className="nav nav-tabs" role="tablist">
          {TABS.map((t) => (
            <li className="nav-item" key={t.key}>
              <button
                type="button"
                className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => selectTab(t.key)}
                role="tab"
              >
                <i className={`bi ${t.icon} me-2`} />
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="attendance-hub-body">
        {activeTab === 'dashboard' && <AttendanceDashboard />}
        {activeTab === 'department-roster' && <DepartmentRosterDashboard />}
        {activeTab === 'enhanced' && <EnhancedAttendanceDashboard hotelSlug={hotelSlug} />}
      </div>
    </div>
  );
}
