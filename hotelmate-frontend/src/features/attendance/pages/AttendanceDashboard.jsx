import React, { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useRosterForDate,
  useClockLogsForDate,
} from "../hooks/useAttendanceData";
import { useAttendanceRealtime } from "../hooks/useAttendanceRealtime";
import { usePeriodExport } from "../hooks/usePeriodExport";
import AttendanceTable from "../components/AttendanceTable";
import AttendanceAlertCenter from "../components/AttendanceAlertCenter";
import RosterPeriodSummary from "../components/RosterPeriodSummary";
import PeriodStaffSummary from "../components/PeriodStaffSummary";
import api from "@/services/api";

function mergeRosterAndLogs(rosterItems, logItems) {
  const byStaff = new Map();

  // Seed from roster
  for (const shift of rosterItems) {
    const key = shift.staff_id || shift.staff;
    if (!byStaff.has(key)) {
      byStaff.set(key, {
        staffId: key,
        staffName: shift.staff_name || "",
        roster: [],
        logs: [],
      });
    }
    byStaff.get(key).roster.push(shift);
  }

  // Add logs
  for (const log of logItems) {
    const key = log.staff || log.staff_id;
    if (!byStaff.has(key)) {
      byStaff.set(key, {
        staffId: key,
        staffName: log.staff_name || "",
        roster: [],
        logs: [],
      });
    }
    byStaff.get(key).logs.push(log);
  }

  return Array.from(byStaff.values());
}

function deriveStatus(row) {
  const hasRoster = row.roster.length > 0;
  const hasLog = row.logs.length > 0;
  const openLog = row.logs.find((l) => !l.time_out);
  const anyUnrosteredPending = row.logs.some(
    (l) => l.is_unrostered && !l.is_approved && !l.is_rejected
  );
  const anyRejected = row.logs.some((l) => l.is_rejected);
  const anyApproved = row.logs.some((l) => l.is_approved);

  if (openLog) {
    return "On duty (open log)";
  }
  if (anyUnrosteredPending) {
    return "Unrostered – pending approval";
  }
  if (anyRejected) {
    return "Rejected";
  }
  if (hasRoster && anyApproved) {
    return "Completed (approved)";
  }
  if (hasRoster && !hasLog) {
    return "No clock log";
  }
  if (!hasRoster && anyApproved) {
    return "Unrostered but approved";
  }
  return "No data";
}

export default function AttendanceDashboard() {
  const { hotelSlug } = useParams();
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [department, setDepartment] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);

  // Export hook
  const { downloadExport } = usePeriodExport(hotelSlug);

  function handleRealtimeEvent(evt) {
    // evt: { type, payload }
    // For any attendance-related event, refresh table:
    setRefreshKey((prev) => prev + 1);

    // Build an alert for specific types:
    const { type, payload } = evt;

    if (type === "unrostered-request") {
      const alert = {
        id: `unr-${payload.id}-${Date.now()}`,
        type: "unrostered-request",
        staffName: payload.staff_name,
        logId: payload.id,
        message: "clocked in unrostered – pending approval.",
        createdAt: new Date().toISOString(),
        data: payload,
      };
      setAlerts((prev) => [alert, ...prev]);
    }

    if (type === "break-warning") {
      const alert = {
        id: `brk-${payload.id}-${Date.now()}`,
        type: "break-warning",
        staffName: payload.staff_name,
        logId: payload.clock_log_id,
        message: "has reached their break threshold.",
        createdAt: new Date().toISOString(),
        data: payload,
      };
      setAlerts((prev) => [alert, ...prev]);
    }

    if (type === "overtime-warning") {
      const alert = {
        id: `ovt-${payload.id}-${Date.now()}`,
        type: "overtime-warning",
        staffName: payload.staff_name,
        logId: payload.clock_log_id,
        message: "is in overtime – please review.",
        createdAt: new Date().toISOString(),
        data: payload,
      };
      setAlerts((prev) => [alert, ...prev]);
    }

    if (type === "hard-limit") {
      const alert = {
        id: `hlt-${payload.id}-${Date.now()}`,
        type: "hard-limit",
        staffName: payload.staff_name,
        logId: payload.clock_log_id,
        message: "reached the hard limit – stay clocked in or clock out now?",
        createdAt: new Date().toISOString(),
        data: payload,
      };
      setAlerts((prev) => [alert, ...prev]);
    }

    // clocklog-approved / clocklog-rejected can also create small alerts if desired
  }

  function handleDismissAlert(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleAlertAction(alert, action) {
    if (!hotelSlug || !alert.logId) return;

    const logId = alert.logId;
    let endpoint = "";

    if (action === "stay") {
      endpoint = `/attendance/${hotelSlug}/clock-logs/${logId}/stay-clocked-in/`;
    } else if (action === "clockout") {
      endpoint = `/attendance/${hotelSlug}/clock-logs/${logId}/force-clock-out/`;
    }

    if (!endpoint) return;

    try {
      await api.post(endpoint);

      // After successful action:
      setRefreshKey((prev) => prev + 1);
      handleDismissAlert(alert.id);
    } catch (err) {
      console.error("Failed to perform alert action", action, "for log", logId, err);
    }
  }

  function handleExportCsv() {
    if (!selectedPeriod) return;
    downloadExport(selectedPeriod.id, "csv");
  }

  function handleExportXlsx() {
    if (!selectedPeriod) return;
    downloadExport(selectedPeriod.id, "xlsx");
  }

  async function handleFinalizePeriod() {
    if (!selectedPeriod || !hotelSlug) return;
    
    setFinalizing(true);
    setFinalizeError(null);
    
    try {
      await api.post(`/attendance/${hotelSlug}/periods/${selectedPeriod.id}/finalize/`);
      // Update period state to show as finalized
      setSelectedPeriod(prev => ({ ...prev, finalized: true }));
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setFinalizeError("Failed to finalize period. Please try again.");
      console.error("Failed to finalize period:", err);
    } finally {
      setFinalizing(false);
    }
  }

  function handleRowAction(actionType, log) {
    console.log("Row action:", actionType, log);
    setRefreshKey((prev) => prev + 1);
  }

  const roster = useRosterForDate(hotelSlug, selectedDate, department, refreshKey);
  const logs = useClockLogsForDate(hotelSlug, selectedDate, department, refreshKey);

  // Wire the realtime hook
  useAttendanceRealtime(hotelSlug, handleRealtimeEvent);

  // Compute period stats and filtered logs
  let periodStats = null;
  let logsInPeriod = [];

  if (selectedPeriod && logs.items && logs.items.length > 0) {
    logsInPeriod = logs.items.filter((log) => {
      if (!log.time_in) return false;
      const d = log.time_in.slice(0, 10);
      return (
        d >= selectedPeriod.start_date && d <= selectedPeriod.end_date
      );
    });

    const totalLogs = logsInPeriod.length;
    const openLogs = logsInPeriod.filter((l) => !l.time_out).length;
    const unapprovedLogs = logsInPeriod.filter(
      (l) => !l.is_approved && !l.is_rejected
    ).length;
    const approvedHours = logsInPeriod
      .filter((l) => l.is_approved && !l.is_rejected && l.hours_worked)
      .reduce((sum, l) => sum + parseFloat(l.hours_worked), 0);

    periodStats = {
      totalLogs,
      openLogs,
      unapprovedLogs,
      approvedHours,
    };
  }

  const mergedRows = mergeRosterAndLogs(roster.items, logs.items);
  const rowsWithStatus = mergedRows.map((row) => ({
    ...row,
    _status: deriveStatus(row),
  }));

  console.log("ROSTER", roster.items);
  console.log("LOGS", logs.items);
  console.log("MERGED", mergedRows);

  return (
    <div className="container py-4">
      <header className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1">Attendance Dashboard</h2>
          <small className="text-muted">
            Hotel: <strong>{hotelSlug}</strong>
          </small>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <select
            className="form-select"
            value={selectedPeriod?.id || ""}
            onChange={(e) => {
              if (e.target.value) {
                // Mock period selection - in real app, this would come from API
                const periodId = e.target.value;
                setSelectedPeriod({
                  id: periodId,
                  name: `Period ${periodId}`,
                  start_date: "2025-11-01",
                  end_date: "2025-11-30",
                  finalized: periodId === "1" // Mock: period 1 is finalized
                });
              } else {
                setSelectedPeriod(null);
              }
            }}
          >
            <option value="">Select Period</option>
            <option value="1">November 2025 (Finalized)</option>
            <option value="2">December 2025 (Open)</option>
          </select>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <select
            className="form-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="all">All departments</option>
            {/* TODO: later replace with real department list from API */}
            <option value="restaurant">Restaurant</option>
            <option value="bar">Bar</option>
          </select>
        </div>
      </header>

      {selectedPeriod && (
        <RosterPeriodSummary
          period={selectedPeriod}
          stats={periodStats}
          onFinalize={handleFinalizePeriod}
          finalizing={finalizing}
          error={finalizeError}
          onExportCsv={handleExportCsv}
          onExportXlsx={handleExportXlsx}
        />
      )}

      {selectedPeriod && (
        <PeriodStaffSummary logsInPeriod={logsInPeriod} />
      )}

      <AttendanceAlertCenter
        alerts={alerts}
        onDismiss={handleDismissAlert}
        onAction={handleAlertAction}
      />

      <div className="card">
        <div className="card-body">
          {roster.loading || logs.loading ? (
            <p>Loading...</p>
          ) : roster.error || logs.error ? (
            <p className="text-danger mb-0">
              {roster.error || logs.error}
            </p>
          ) : (
            <AttendanceTable
              rows={rowsWithStatus}
              hotelSlug={hotelSlug}
              onRowAction={handleRowAction}
            />
          )}
        </div>
      </div>
    </div>
  );
}