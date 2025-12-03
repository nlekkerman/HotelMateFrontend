import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "react-bootstrap";
import {
  useRosterForDate,
  useClockLogsForDate,
  useStaffAttendanceSummary,
} from "../hooks/useAttendanceData";
import ClockedInTicker from "@/components/analytics/ClockedInTicker.jsx";
import { useAttendanceRealtime } from "../hooks/useAttendanceRealtime";
import { usePeriodExport } from "../hooks/usePeriodExport";
import { useRosterPeriods } from "../hooks/useRosterPeriods";
import AttendanceAlertCenter from "../components/AttendanceAlertCenter";
import RosterPeriodSelector from "../components/RosterPeriodSelector";
import RosterPeriodSummary from "../components/RosterPeriodSummary";
import PeriodFinalizeModal from "../components/PeriodFinalizeModal";
import PeriodStaffSummary from "../components/PeriodStaffSummary";
import StaffDetailModal from "../components/StaffDetailModal";
import RosterManagementGrid from "../components/RosterManagementGrid";
import AttendanceErrorBoundary from "../components/AttendanceErrorBoundary";
import AttendanceToasts from "../components/AttendanceToasts";
import ClockedInByDepartment from "../components/ClockedInByDepartment";
import { AttendanceDashboardSkeleton, AttendanceTableSkeleton, PeriodSelectorSkeleton } from "../components/AttendanceSkeletons";
import { deriveStatus } from "../utils/attendanceStatus";
import useStaffMetadata from "@/hooks/useStaffMetadata";
import "../components/AttendanceCards.css";
import { handleRealTimeStatusUpdate, showStatusNotification } from "../utils/statusUpdates";
import { safeStaffId, safeStaffName, safeTimeSlice, safeNumber } from "../utils/safeUtils";
import { handleAttendanceError, showSuccessMessage, ERROR_TYPES } from "../utils/errorHandling";
import api from "@/services/api";
import "../styles/attendance.css";

// Add CSS for kiosk toggle button
const kioskStyles = `
  .kiosk-toggle-btn {
    white-space: nowrap;
    min-width: fit-content;
  }
  
  .kiosk-control-block {
    display: flex;
    align-items: center;
  }
  
  .kiosk-mode-indicator {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    white-space: nowrap;
  }
  
  @media (max-width: 768px) {
    .kiosk-toggle-btn .d-none.d-md-inline {
      display: none !important;
    }
  }
`;

// Inject styles
if (!document.head.querySelector('[data-component="KioskStyles"]')) {
  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-component', 'KioskStyles');
  styleElement.textContent = kioskStyles;
  document.head.appendChild(styleElement);
}

function mergeRosterAndLogs(rosterItems, logItems) {
  const byStaff = new Map();

  // Ensure inputs are arrays
  const safeRosterItems = Array.isArray(rosterItems) ? rosterItems : [];
  const safeLogItems = Array.isArray(logItems) ? logItems : [];

  // Seed from roster
  for (const shift of safeRosterItems) {
    if (!shift) continue;
    
    const key = safeStaffId(shift);
    if (!key) continue; // Skip if no valid staff ID
    
    if (!byStaff.has(key)) {
      byStaff.set(key, {
        staffId: key,
        staffName: safeStaffName(shift),
        roster: [],
        logs: [],
      });
    }
    byStaff.get(key).roster.push(shift);
  }

  // Add logs
  for (const log of safeLogItems) {
    if (!log) continue;
    
    const key = safeStaffId(log);
    if (!key) continue; // Skip if no valid staff ID
    
    if (!byStaff.has(key)) {
      byStaff.set(key, {
        staffId: key,
        staffName: safeStaffName(log),
        roster: [],
        logs: [],
      });
    }
    byStaff.get(key).logs.push(log);
  }

  return Array.from(byStaff.values());
}

function AttendanceDashboardComponent() {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  
  console.log('[AttendanceDashboardComponent] Rendering with hotelSlug:', hotelSlug);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [department, setDepartment] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);
  const [finalizeCanForce, setFinalizeCanForce] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStaffRow, setSelectedStaffRow] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [periodsRefreshKey, setPeriodsRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState(() => {
    // Initialize view mode from URL parameter
    const urlView = searchParams.get('view');
    return urlView === 'roster' ? 'roster' : 'table';
  });
  const [selectedStaffSummary, setSelectedStaffSummary] = useState(null);
  
  // Update URL when view mode changes
  useEffect(() => {
    if (viewMode === 'roster') {
      setSearchParams({ view: 'roster' });
    } else {
      setSearchParams({});
    }
  }, [viewMode, setSearchParams]);
  
  function handleRowClick(row) {
    console.log('[AttendanceDashboard] handleRowClick called with:', row);
    // Handle both table rows and staff summaries
    if (row.id && row.full_name) {
      // This is a staff summary from card view
      console.log('[AttendanceDashboard] Setting staff summary:', row);
      setSelectedStaffSummary(row);
      setSelectedStaffRow(null);
    } else {
      // This is a table row
      console.log('[AttendanceDashboard] Setting staff row:', row);
      setSelectedStaffRow(row);
      setSelectedStaffSummary(null);
    }
    console.log('[AttendanceDashboard] Setting showStaffModal to true');
    setShowStaffModal(true);
  }

  function handleCloseStaffModal() {
    setShowStaffModal(false);
    setSelectedStaffRow(null);
    setSelectedStaffSummary(null);
  }

  // Fetch departments from API
  const { departments, isLoading: departmentsLoading } = useStaffMetadata(hotelSlug);
  
  // Calculate week range from selected date
  const getWeekRange = (date) => {
    const currentDate = new Date(date);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start of week (Monday)
    const startOfWeek = new Date(currentDate);
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days, else go back (dayOfWeek - 1) days
    startOfWeek.setDate(currentDate.getDate() - daysToSubtract);
    
    // Calculate end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      from: startOfWeek.toISOString().split('T')[0],
      to: endOfWeek.toISOString().split('T')[0]
    };
  };

  const weekRange = getWeekRange(selectedDate);

  // Fetch staff attendance summary for card view - WEEKLY DATA
  const staffSummary = useStaffAttendanceSummary(
    hotelSlug,
    weekRange.from,
    weekRange.to, // Week range instead of single day
    department,
    statusFilter === "all" ? null : statusFilter,
    refreshKey
  );

  // Export hook
  const { downloadExport } = usePeriodExport(hotelSlug);

  // Load roster periods
  const periods = useRosterPeriods(hotelSlug, periodsRefreshKey);
  
  // Find selected period with defensive checks
  const allPeriods = Array.isArray(periods.items) ? periods.items : [];
  const selectedPeriod = selectedPeriodId && allPeriods.length > 0 
    ? allPeriods.find((p) => p && p.id === safeNumber(selectedPeriodId)) || null 
    : null;

  function handleRealtimeEvent(evt) {
    // Defensive checks
    if (!evt || !evt.type) {
      console.warn("Invalid realtime event received:", evt);
      return;
    }

    const { type, payload = {} } = evt;

    // Handle real-time clock status updates
    if (type === 'clock-status-updated') {
      console.log('[AttendanceDashboard] Real-time clock status update:', payload);
      
      // Broadcast to navbar for button updates
      window.dispatchEvent(new CustomEvent('pusherClockStatusUpdate', {
        detail: payload
      }));
      
      // Show status notification
      if (payload.first_name && payload.action) {
        showStatusNotification(payload);
      }
      
      // Refresh table data immediately for real-time updates
      console.log('[AttendanceDashboard] Refreshing table data due to status change');
      setRefreshKey((prev) => prev + 1);
      return; // Early return to avoid double refresh
    }

    // For any other attendance-related event, refresh table:
    setRefreshKey((prev) => prev + 1);

    // Build an alert for specific types with safe data extraction:
    const staffName = safeStaffName(payload);
    const logId = payload.id || payload.clock_log_id;
    const timestamp = Date.now();

    if (type === "unrostered-request") {
      const alert = {
        id: `unr-${logId || timestamp}`,
        type: "unrostered-request",
        staffName,
        logId,
        message: "clocked in unrostered – pending approval.",
        createdAt: new Date().toISOString(),
        data: payload,
      };
      setAlerts((prev) => [alert, ...prev.slice(0, 19)]); // Limit to 20 alerts
    }

    if (type === "break-warning") {
      const alert = {
        id: `brk-${logId || timestamp}`,
        type: "break-warning",
        staffName,
        logId,
        message: "has reached their break threshold.",
        createdAt: new Date().toISOString(),
        data: payload,
      };
      setAlerts((prev) => [alert, ...prev.slice(0, 19)]);
    }

    if (type === "overtime-warning") {
      const alert = {
        id: `ovt-${logId || timestamp}`,
        type: "overtime-warning",
        staffName,
        logId,
        message: "is in overtime – please review.",
        createdAt: new Date().toISOString(),
        data: payload,
      };
      setAlerts((prev) => [alert, ...prev.slice(0, 19)]);
    }

    if (type === "hard-limit") {
      const alert = {
        id: `hlt-${logId || timestamp}`,
        type: "hard-limit",
        staffName,
        logId,
        message: "reached the hard limit – stay clocked in or clock out now?",
        createdAt: new Date().toISOString(),
        data: payload,
      };
      setAlerts((prev) => [alert, ...prev.slice(0, 19)]);
    }

    // Handle approved/rejected events
    if (type === "log-approved" || type === "log-rejected") {
      const action = type === "log-approved" ? "approved" : "rejected";
      console.log(`[Dashboard] Clock log ${action} for ${staffName}`);
    }

    // Handle unknown event types
    if (type === "unknown-event") {
      console.warn("Unknown attendance event received:", payload);
    }
  }

  function handleDismissAlert(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleAlertAction(alert, action) {
    // Defensive checks
    if (!hotelSlug || !alert || !alert.logId || !action) {
      console.warn("Invalid alert action parameters:", { hotelSlug, alert, action });
      return;
    }

    const logId = alert.logId;
    let endpoint = "";

    if (action === "stay") {
      endpoint = `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/clock-logs/${logId}/stay-clocked-in/`;
    } else if (action === "clockout") {
      endpoint = `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/clock-logs/${logId}/force-clock-out/`;
    }

    if (!endpoint) {
      console.warn("Unknown alert action:", action);
      return;
    }

    try {
      await api.post(endpoint);

      // After successful action:
      showSuccessMessage(action, { 
        staffName: alert.staffName || "Staff member" 
      });
      setRefreshKey((prev) => prev + 1);
      handleDismissAlert(alert.id);
    } catch (err) {
      handleAttendanceError(err, {
        type: ERROR_TYPES.NETWORK,
        component: 'alert-action',
        action: action,
        hotelSlug,
        data: { logId, alertId: alert.id }
      });
    }
  }

  async function handleExportCsv() {
    if (!selectedPeriodId) {
      console.warn("No period selected for CSV export");
      return;
    }
    
    const result = await downloadExport(selectedPeriodId, "csv");
    if (!result.success) {
      handleAttendanceError(new Error(result.error), {
        type: ERROR_TYPES.NETWORK,
        component: 'export',
        action: 'export-csv',
        hotelSlug
      });
    } else {
      showSuccessMessage('export');
    }
  }

  async function handleExportXlsx() {
    if (!selectedPeriodId) {
      console.warn("No period selected for XLSX export");
      return;
    }
    
    const result = await downloadExport(selectedPeriodId, "xlsx");
    if (!result.success) {
      handleAttendanceError(new Error(result.error), {
        type: ERROR_TYPES.NETWORK,
        component: 'export',
        action: 'export-xlsx',
        hotelSlug
      });
    } else {
      showSuccessMessage('export');
    }
  }

  const handleShowFinalizeModal = () => {
    setFinalizeError(null);
    setFinalizeCanForce(false);
    setShowFinalizeModal(true);
  };

  const handleFinalizePeriod = async (force = false) => {
    if (!selectedPeriodId || !hotelSlug) {
      console.warn("Cannot finalize: missing period ID or hotel slug");
      return;
    }
    
    setFinalizing(true);
    setFinalizeError(null);
    
    try {
      const endpoint = `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/periods/${safeNumber(selectedPeriodId)}/finalize/`;
      const payload = force ? { force: true } : {};
      await api.post(endpoint, payload);
      
      // Refresh both periods and attendance data
      setPeriodsRefreshKey((prev) => prev + 1);
      setRefreshKey((prev) => prev + 1);
      setShowFinalizeModal(false);
      
      showSuccessMessage('finalize');
    } catch (err) {
      console.log('Finalize error response:', err.response?.data);
      
      // Check if this is a validation error with force option
      if (err.response?.status === 400 && err.response?.data) {
        const errorData = err.response.data;
        setFinalizeError(errorData.error || errorData.message || 'Cannot finalize period');
        setFinalizeCanForce(errorData.can_force === true);
      } else {
        // Handle other errors normally
        const { userMessage } = handleAttendanceError(err, {
          type: ERROR_TYPES.NETWORK,
          component: 'period',
          action: 'finalize',
          hotelSlug,
          data: { periodId: selectedPeriodId }
        });
        setFinalizeError(userMessage);
        setFinalizeCanForce(false);
      }
    } finally {
      setFinalizing(false);
    }
  };

  function handleRowAction(actionType, log) {
    console.log("Row action:", actionType, log);
    setRefreshKey((prev) => prev + 1);
  }

  function handleToggleKioskMode() {
    const isCurrentlyKiosk = localStorage.getItem('kioskMode') === 'true';
    
    if (isCurrentlyKiosk) {
      // Disable kiosk mode
      if (confirm('Disable kiosk mode? This will return to personal device mode.')) {
        localStorage.removeItem('kioskMode');
        // Force re-render by updating state
        setRefreshKey(prev => prev + 1);
      }
    } else {
      // Enable kiosk mode
      if (confirm('Enable kiosk mode? This device will be shared for all staff to clock in/out.')) {
        localStorage.setItem('kioskMode', 'true');
        // Force re-render by updating state
        setRefreshKey(prev => prev + 1);
      }
    }
  }

  const roster = useRosterForDate(hotelSlug, selectedDate, department, refreshKey);
  const logs = useClockLogsForDate(hotelSlug, selectedDate, department, refreshKey);

  // Wire the realtime hook
  useAttendanceRealtime(hotelSlug, handleRealtimeEvent);

  // Show full loading skeleton on initial load
  const isInitialLoading = !hotelSlug || (roster.loading && logs.loading && periods.loading);
  
  if (isInitialLoading) {
    return <AttendanceDashboardSkeleton />;
  }

  // Compute period stats and filtered logs with defensive checks
  let periodStats = null;
  let logsInPeriod = [];

  if (selectedPeriod && Array.isArray(logs.items) && logs.items.length > 0) {
    logsInPeriod = logs.items.filter((log) => {
      if (!log || !log.time_in) return false;
      
      try {
        const logDate = safeTimeSlice(log.time_in, 0, 10);
        return (
          logDate >= selectedPeriod.start_date && 
          logDate <= selectedPeriod.end_date
        );
      } catch (error) {
        console.warn("Error filtering log by period:", error, log);
        return false;
      }
    });

    const totalLogs = logsInPeriod.length;
    const openLogs = logsInPeriod.filter((l) => l && !l.time_out).length;
    const unapprovedLogs = logsInPeriod.filter(
      (l) => l && !l.is_approved && !l.is_rejected
    ).length;
    
    const approvedHours = logsInPeriod
      .filter((l) => l && l.is_approved && !l.is_rejected && l.hours_worked)
      .reduce((sum, l) => {
        const hours = parseFloat(l.hours_worked);
        return sum + (isNaN(hours) ? 0 : hours);
      }, 0);

    periodStats = {
      totalLogs,
      openLogs,
      unapprovedLogs,
      approvedHours: Math.round(approvedHours * 100) / 100, // Round to 2 decimal places
    };
  }

  const mergedRows = mergeRosterAndLogs(roster.items, logs.items);
  const rowsWithStatus = mergedRows.map((row) => {
    try {
      return {
        ...row,
        _status: deriveStatus(row),
      };
    } catch (error) {
      console.warn("Error deriving status for row:", error, row);
      return {
        ...row,
        _status: "No data",
      };
    }
  });

  // Apply filters with safety checks
  const normalizedSearch = (staffSearch || "").trim().toLowerCase();
  const filteredRows = rowsWithStatus.filter((row) => {
    if (!row) return false;
    
    try {
      const name = (row.staffName || "").toLowerCase();
      const matchesSearch =
        !normalizedSearch || name.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        row._status === statusFilter;

      return matchesSearch && matchesStatus;
    } catch (error) {
      console.warn("Error filtering row:", error, row);
      return false;
    }
  });

  // Filter staff summaries for card view
  const filteredStaffSummaries = (staffSummary.results || []).filter((summary) => {
    if (!summary) return false;
    
    try {
      const name = (summary.full_name || "").toLowerCase();
      const matchesSearch = 
        !normalizedSearch || name.includes(normalizedSearch);

      return matchesSearch;
    } catch (error) {
      console.warn("Error filtering staff summary:", error, summary);
      return false;
    }
  });

  // Determine staff detail logs with safety checks
  let staffDetailLogs = [];
  if (selectedStaffRow && selectedStaffRow.staffId) {
    const staffId = selectedStaffRow.staffId;
    const sourceLogs = selectedPeriodId ? logsInPeriod : (Array.isArray(logs.items) ? logs.items : []);
    
    staffDetailLogs = sourceLogs.filter((log) => {
      if (!log) return false;
      const id = safeStaffId(log);
      return id === staffId;
    });
  }

  console.log("ROSTER", roster.items);
  console.log("LOGS", logs.items);
  console.log("MERGED", mergedRows);

  return (
    <div className="container py-4 attendance-dashboard d-flex flex-column vw-100 justify-content-center align-self-center align-items-center">

      <header className="attendance-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <h2 className="mb-1">Currently Clocked In Staff</h2>
            <small className="text-muted">
              Hotel: <strong>{hotelSlug}</strong> | 
              Real-time attendance view
            </small>
          </div>

          <div className="attendance-header-controls d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2">
            <div className="attendance-control-block">
              {periods.loading ? (
                <PeriodSelectorSkeleton />
              ) : periods.error ? (
                <div className="alert alert-warning py-1 px-2 mb-0">
                  <small>{periods.error}</small>
                </div>
              ) : (
                <RosterPeriodSelector
                  periods={periods.items}
                  selectedId={selectedPeriodId}
                  onChange={setSelectedPeriodId}
                />
              )}
            </div>
            
            {/* Enhanced Dashboard & Kiosk Mode Toggle - Only for Super Staff/Admin */}
            {(() => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              const isSuperStaff = user?.is_super_staff || user?.role === 'admin' || user?.access_level === 'super_admin' || user?.is_staff;
              const isKioskMode = localStorage.getItem('kioskMode') === 'true';
              
              console.log('[AttendanceDashboard] Kiosk button check:', { user, isSuperStaff, isKioskMode });
              
              // For now, show to all staff users for testing
              return user?.is_staff ? (
                <div className="kiosk-control-block d-flex gap-2">
                  
                  <button
                    className={`btn btn-sm ${isKioskMode ? 'btn-warning' : 'btn-info'} kiosk-toggle-btn`}
                    onClick={handleToggleKioskMode}
                    title={isKioskMode ? 'Disable Kiosk Mode' : 'Enable Kiosk Mode'}
                  >
                    <i className={`bi ${isKioskMode ? 'bi-laptop' : 'bi-display'}`}></i>
                    <span className="ms-2 d-none d-md-inline">
                      {isKioskMode ? 'Disable Kiosk' : 'Set as Kiosk'}
                    </span>
                  </button>
                </div>
              ) : null;
            })()}
            
            <div className="d-flex gap-2">
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ minWidth: "150px" }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <select
                className="form-select form-select-sm"
                style={{ minWidth: "160px" }}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={departmentsLoading}
              >
                <option value="all">All departments</option>
                {departments.map((dept) => (
                  <option key={dept.slug || dept.id} value={dept.slug || dept.id}>
                    {dept.name}
                  </option>
                ))}
                {departmentsLoading && (
                  <option disabled>Loading departments...</option>
                )}
              </select>
            </div>
          </div>
        </div>
      </header>

      {selectedPeriod && (
        <RosterPeriodSummary
          period={selectedPeriod}
          stats={periodStats}
          onFinalize={handleShowFinalizeModal}
          finalizing={finalizing}
          error={null}
          onExportCsv={handleExportCsv}
          onExportXlsx={handleExportXlsx}
        />
      )}

      {selectedPeriod && (
        <PeriodStaffSummary logsInPeriod={logsInPeriod} />
      )}

      {/* Roster Management Section - Only show when period is selected */}
      {selectedPeriod && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-0">Period Management</h5>
              <small className="text-muted">Create and manage shifts for the selected period</small>
            </div>
            <div className="btn-group view-mode-toggle" role="group">
              <input
                type="radio"
                className="btn-check"
                name="viewMode"
                id="attendanceView"
                checked={viewMode === 'table'}
                onChange={() => setViewMode('table')}
              />
              <label className="btn btn-outline-primary btn-sm" htmlFor="attendanceView">
                📊 Attendance View
              </label>
              
              <input
                type="radio"
                className="btn-check"
                name="viewMode"
                id="rosterView"
                checked={viewMode === 'roster'}
                onChange={() => setViewMode('roster')}
              />
              <label className="btn btn-outline-primary btn-sm" htmlFor="rosterView">
                📅 Roster View (Use Department Roster instead)
              </label>
            </div>
          </div>

          {viewMode === 'roster' && (
            <div>
              <div className="alert alert-info mb-3">
                <i className="fas fa-info-circle me-2"></i>
                <strong>New!</strong> For better roster management, use the dedicated{' '}
                <button 
                  className="btn btn-link p-0 mx-1" 
                  onClick={() => navigate(`/department-roster/${hotelSlug}`)}
                  style={{ textDecoration: 'underline' }}
                >
                  Department Roster Dashboard
                </button>
                which offers department-focused weekly planning.
              </div>
              <RosterManagementGrid 
                selectedPeriod={selectedPeriod}
                hotelSlug={hotelSlug}
                onRefresh={() => setRefreshKey(prev => prev + 1)}
              />
            </div>
          )}
        </div>
      )}

      <AttendanceAlertCenter
        alerts={alerts}
        onDismiss={handleDismissAlert}
        onAction={handleAlertAction}
      />





      {/* Currently Clocked In Staff Display */}
      {viewMode !== 'roster' && (
        <ClockedInByDepartment
          hotelSlug={hotelSlug}
          refreshKey={refreshKey}
        />
      )}

      <StaffDetailModal
        show={showStaffModal}
        onClose={handleCloseStaffModal}
        staffName={
          selectedStaffSummary?.full_name || 
          selectedStaffRow?.staffName || 
          `Staff #${selectedStaffRow?.staffId || selectedStaffSummary?.id}`
        }
        logs={staffDetailLogs}
        staffSummary={selectedStaffSummary}
        hotelSlug={hotelSlug}
        onAction={handleRowAction}
      />

      {/* Period Finalize Modal */}
      <PeriodFinalizeModal
        show={showFinalizeModal}
        onHide={() => setShowFinalizeModal(false)}
        onConfirm={handleFinalizePeriod}
        period={selectedPeriod}
        department="All Departments"
        finalizing={finalizing}
        error={finalizeError}
        canForce={finalizeCanForce}
      />

      {/* Toast notifications */}
      <AttendanceToasts />
    </div>
  );
}

// Wrap with error boundary
export default function AttendanceDashboard() {
  console.log('[AttendanceDashboard] Component is rendering');
  return (
    <AttendanceErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <AttendanceDashboardComponent />
    </AttendanceErrorBoundary>
  );
}