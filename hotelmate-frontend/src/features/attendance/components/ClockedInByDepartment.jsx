import React, { useState, useEffect } from "react";
import { Card, Spinner, Alert, Badge } from "react-bootstrap";
import { useClockLogsForDate } from "../hooks/useAttendanceData";
import ClockedInStaffRow from "./ClockedInStaffRow";
import api from "@/services/api";

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
      <div className="text-center text-muted py-4">
        <i className="bi bi-clock"></i>
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
      <Card>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" className="mb-3" />
          <div>Loading currently clocked-in staff...</div>
        </Card.Body>
      </Card>
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
      <Card>
        <Card.Body className="text-center py-5">
          <i className="bi bi-clock" style={{ fontSize: "3rem", color: "#6c757d" }}></i>
          <h5 className="mt-3 text-muted">No Staff Currently Clocked In</h5>
          <p className="text-muted">All staff have clocked out for today.</p>
        </Card.Body>
      </Card>
    );
  }

  const totalClockedIn = clockedInLogs.length;
  const filteredCount = staffByDepartment.reduce((sum, dept) => sum + dept.staff.length, 0);

  return (
    <div className="clocked-in-by-department">
      {/* Department Filter */}
      <Card className="mb-3">
        <Card.Body className="py-2">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
            <div>
              <h6 className="mb-0">Currently Clocked In</h6>
              <small className="text-muted">Real-time view</small>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 text-nowrap">Filter by Department:</label>
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
                <Badge bg="success" className="fs-6">
                  {selectedDepartment === "all" 
                    ? `${totalClockedIn} Total Working`
                    : `${filteredCount} Working`
                  }
                </Badge>
                <small className="text-muted">
                  <i className="bi bi-arrow-clockwise"></i> Auto-refresh: 30s
                </small>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Staff by Department */}
      {staffByDepartment.map(({ department, staff }) => (
        <Card key={department} className="mb-4">
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <i className="bi bi-building me-2"></i>
                {department}
              </h6>
              <Badge bg="primary">
                {staff.length} staff
              </Badge>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <ClockedInStaffList staffList={staff} />
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}