import React, { useState, useEffect } from "react";
import { Card, Spinner, Alert } from "react-bootstrap";
import { useClockLogsForDate } from "../hooks/useAttendanceData";
import ClockedInStaffRow from "./ClockedInStaffRow";
import api from "@/services/api";
import "./ClockedInByDepartment.css";

/**
 * Simple list component for clocked-in staff
 */
function ClockedInStaffList({ staffList }) {
  const [now, setNow] = useState(new Date());

  // Live update every 30 seconds for more accurate time display
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (staffList.length === 0) {
    return (
      <div className="cid-empty py-4">
        <i className="bi bi-clock cid-empty-icon"></i>
        <div>No staff clocked in for this department</div>
      </div>
    );
  }

  return (
    <div>
      {staffList.map((log) => (
        <ClockedInStaffRow key={log.id} log={log} now={now} />
      ))}
    </div>
  );
}

/**
 * Component to display all currently clocked-in staff organized by department
 */
export default function ClockedInByDepartment({ hotelSlug, refreshKey = 0 }) {
  const [clockedInLogs, setClockedInLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [autoRefreshKey, setAutoRefreshKey] = useState(0);

  // Auto-refresh data every 30 seconds to catch new clock-ins/outs
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoRefreshKey(prev => prev + 1);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch currently clocked-in staff
  useEffect(() => {
    if (!hotelSlug) return;

    const fetchClockedInStaff = async () => {
      // Only show loading on initial load or manual refresh, not auto-refresh
      if (refreshKey === 0 && autoRefreshKey === 0) {
        setLoading(true);
      }
      setError(null);
      
      try {
        // Get today's clock logs and filter for currently clocked-in staff
        const today = new Date().toISOString().split('T')[0];
        const response = await api.get(`/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/clock-logs/`, {
          params: { date: today }
        });
        
        // Handle response format
        let allLogs = response.data?.results || response.data || [];
        
        // Ensure we have an array
        if (!Array.isArray(allLogs)) {
          console.warn('API response is not an array:', allLogs);
          setClockedInLogs([]);
          return;
        }
        
        // Filter to only currently clocked-in staff (no time_out)
        const clockedInData = allLogs.filter(log => log && !log.time_out);
        setClockedInLogs(clockedInData);
      } catch (err) {
        console.error("Error fetching clocked-in staff:", err);
        setError("Failed to load clocked-in staff data");
      } finally {
        setLoading(false);
      }
    };

    fetchClockedInStaff();
  }, [hotelSlug, refreshKey, autoRefreshKey]);

  // Get all unique departments for filter
  const allDepartments = React.useMemo(() => {
    const depts = new Set();
    clockedInLogs.forEach(log => {
      const deptName = log.department?.name || "No Department";
      depts.add(deptName);
    });
    return Array.from(depts).sort((a, b) => {
      if (a === "No Department") return 1;
      if (b === "No Department") return -1;
      return a.localeCompare(b);
    });
  }, [clockedInLogs]);

  // Group staff by department and apply filter
  const staffByDepartment = React.useMemo(() => {
    const grouped = {};
    
    clockedInLogs.forEach(log => {
      const deptName = log.department?.name || "No Department";
      if (!grouped[deptName]) {
        grouped[deptName] = [];
      }
      grouped[deptName].push(log);
    });

    // Filter by selected department if not "all"
    const departmentsToShow = selectedDepartment === "all" 
      ? Object.keys(grouped) 
      : [selectedDepartment].filter(dept => grouped[dept]);

    // Sort departments alphabetically, but put "No Department" last
    const sortedDepts = departmentsToShow.sort((a, b) => {
      if (a === "No Department") return 1;
      if (b === "No Department") return -1;
      return a.localeCompare(b);
    });

    return sortedDepts.map(deptName => ({
      department: deptName,
      staff: grouped[deptName]
    }));
  }, [clockedInLogs, selectedDepartment]);

  if (loading) {
    return (
      <div className="cid-root">
        <div className="cid-panel">
          <div className="cid-panel-body text-center py-4">
            <Spinner animation="border" className="mb-3" />
            <div>Loading currently clocked-in staff...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Data</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  if (clockedInLogs.length === 0) {
    return (
      <div className="cid-root">
        <div className="cid-panel">
          <div className="cid-panel-body cid-empty">
            <i className="bi bi-clock cid-empty-icon"></i>
            <h5 className="mt-2 mb-1" style={{ color: "#1e3a8a" }}>
              No Staff Currently Clocked In
            </h5>
            <p className="mb-0 text-muted">All staff have clocked out for today.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalClockedIn = clockedInLogs.length;
  const filteredCount = staffByDepartment.reduce((sum, dept) => sum + dept.staff.length, 0);

  return (
    <div className="cid-root clocked-in-by-department">
      {/* Department Filter — glass panel */}
      <div className="cid-panel mb-3">
        <div className="cid-panel-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <span className="cid-tab">Currently Clocked In</span>
              <small className="cid-subtitle">Real-time view</small>
            </div>
            <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <label className="cid-label mb-0 text-nowrap">
                  Filter by Department:
                </label>
                <select
                  className="form-select form-select-sm"
                  style={{ minWidth: "180px" }}
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  {allDepartments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="cid-badge cid-badge--success">
                  {selectedDepartment === "all"
                    ? `${totalClockedIn} Total Working`
                    : `${filteredCount} Working`
                  }
                </span>
                <small className="text-muted">
                  <i className="bi bi-arrow-clockwise"></i> Auto-refresh: 30s
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff by Department — glass section cards */}
      {staffByDepartment.map(({ department, staff }) => (
        <div key={department} className="cid-section">
          <div className="cid-section-header">
            <h6 className="mb-0 d-flex align-items-center" style={{ color: "#1e3a8a" }}>
              <i className="bi bi-building me-2"></i>
              {department}
            </h6>
            <span className="cid-badge">{staff.length} staff</span>
          </div>
          <div className="cid-section-body">
            <ClockedInStaffList staffList={staff} />
          </div>
        </div>
      ))}
    </div>
  );
}