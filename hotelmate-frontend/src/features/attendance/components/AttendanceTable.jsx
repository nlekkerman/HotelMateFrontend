import React, { useState } from "react";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import AttendanceRowActions from "./AttendanceRowActions";
import AttendanceClockActions from "./AttendanceClockActions";
import ActionRequiredBadge from "./ActionRequiredBadge";
import StaffAttendanceCard from "./StaffAttendanceCard";
import { safeTimeSlice, safeString } from "../utils/safeUtils";

export default function AttendanceTable({ 
  rows, 
  hotelSlug, 
  onRowAction, 
  onRowClick, 
  staffSummaries = [], 
  viewMode = 'table' 
}) {
  // Defensive checks for props
  const safeRows = Array.isArray(rows) ? rows : [];
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  
  if (safeRows.length === 0 && staffSummaries.length === 0) {
    return (
      <p className="text-muted mb-0">
        No roster or attendance data for this date/department.
      </p>
    );
  }

  // Card view rendering
  if (currentViewMode === 'cards' && staffSummaries.length > 0) {
    return (
      <div>
        {/* View Toggle */}
        <div className="d-flex justify-content-end mb-3">
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`hm-btn ${currentViewMode === 'table' ? 'hm-btn-confirm' : 'hm-btn-outline'}`}
              onClick={() => setCurrentViewMode('table')}
            >
              <i className="bi bi-table me-1"></i>Table
            </button>
            <button
              type="button"
              className={`hm-btn ${currentViewMode === 'cards' ? 'hm-btn-confirm' : 'hm-btn-outline'}`}
              onClick={() => setCurrentViewMode('cards')}
            >
              <i className="bi bi-grid-3x3-gap me-1"></i>Cards
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="attendance-cards-grid">
          {staffSummaries.map((staffSummary) => (
            <StaffAttendanceCard
              key={staffSummary.id}
              staffSummary={staffSummary}
              onViewDetails={(summary) => onRowClick && onRowClick(summary)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* View Toggle - only show if we have staff summaries for card view */}
      {staffSummaries.length > 0 && (
        <div className="d-flex justify-content-end mb-3">
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`hm-btn ${currentViewMode === 'table' ? 'hm-btn-confirm' : 'hm-btn-outline'}`}
              onClick={() => setCurrentViewMode('table')}
            >
              <i className="bi bi-table me-1"></i>Table
            </button>
            <button
              type="button"
              className={`hm-btn ${currentViewMode === 'cards' ? 'hm-btn-confirm' : 'hm-btn-outline'}`}
              onClick={() => setCurrentViewMode('cards')}
            >
              <i className="bi bi-grid-3x3-gap me-1"></i>Cards
            </button>
          </div>
        </div>
      )}
      
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0 table-hover attendance-table">
        <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th>Staff Member</th>
            <th>Weekly Shifts & Planned Hours</th>
            <th>Actual Attendance & Total Hours</th>
            <th>Current Status</th>
            <th style={{ width: "1%" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => {
            // Safety checks for row
            if (!row || !row.staffId) {
              console.warn("Invalid row data:", row);
              return null;
            }

            const safeRoster = Array.isArray(row.roster) ? row.roster : [];
            const safeLogs = Array.isArray(row.logs) ? row.logs : [];

            // Calculate shift summary
            const totalShifts = safeRoster.length;
            const plannedHours = safeRoster.reduce((total, shift) => {
              if (!shift || !shift.shift_start || !shift.shift_end) return total;
              
              const startTime = new Date(`1970-01-01T${shift.shift_start}`);
              const endTime = new Date(`1970-01-01T${shift.shift_end}`);
              const diffMs = endTime - startTime;
              const hours = diffMs / (1000 * 60 * 60);
              
              return total + (hours > 0 ? hours : 0);
            }, 0);

            const rosterSummary = totalShifts > 0
              ? `${totalShifts} shift${totalShifts !== 1 ? 's' : ''} (${plannedHours.toFixed(1)}h planned)`
              : "No shifts scheduled";

            // Calculate actual hours worked
            const totalWorkedHours = safeLogs.reduce((total, log) => {
              if (!log || !log.hours_worked) return total;
              return total + parseFloat(log.hours_worked);
            }, 0);

            const completedLogs = safeLogs.filter(log => log && log.time_out).length;
            const openLogs = safeLogs.filter(log => log && log.time_in && !log.time_out).length;

            const logSummary = safeLogs.length > 0
              ? `${completedLogs} completed, ${openLogs} open (${totalWorkedHours.toFixed(1)}h total)`
              : "No attendance logs";

            const derivedStatus = safeString(row._status);

            const handleRowClick = (e) => {
              console.log('[AttendanceTable] Row clicked:', row);
              // Prevent row click if clicking on action buttons
              if (e.target.closest('button') || e.target.closest('.btn')) {
                console.log('[AttendanceTable] Click prevented - button/btn detected');
                return;
              }
              if (typeof onRowClick === 'function') {
                console.log('[AttendanceTable] Calling onRowClick with row:', row);
                onRowClick(row);
              } else {
                console.log('[AttendanceTable] onRowClick is not a function:', typeof onRowClick);
              }
            };

            return (
              <tr 
                key={row.staffId || `row-${index}`}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
                onClick={handleRowClick}
              >
                <td>
                  {safeString(row.staffName) || row.staffId}
                  <ActionRequiredBadge 
                    count={safeLogs.filter(log => 
                      log && log.is_unrostered && !log.is_approved && !log.is_rejected
                    ).length}
                  />
                </td>
                <td>{rosterSummary}</td>
                <td>{logSummary}</td>
                <td>
                  <AttendanceStatusBadge 
                    status={derivedStatus} 
                    staffId={row.staffId}
                    enhancedStatus={row.current_status}
                  />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="d-flex flex-column gap-2">
                    {/* Unrostered approval actions */}
                    <AttendanceRowActions
                      row={row}
                      hotelSlug={hotelSlug}
                      onAction={onRowAction}
                    />
                    
                    {/* Clock in/out actions */}
                    <AttendanceClockActions
                      staff={{
                        id: row.staffId,
                        first_name: row.staffName?.split(' ')[0] || 'Unknown',
                        last_name: row.staffName?.split(' ').slice(1).join(' ') || '',
                        current_status: row.current_status
                      }}
                      hotelSlug={hotelSlug}
                      onAction={(result) => {
                        console.log('[AttendanceTable] Clock action completed:', result);
                        if (typeof onRowAction === 'function') {
                          onRowAction(result);
                        }
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          }).filter(Boolean)} {/* Filter out null entries */}
        </tbody>
      </table>
      </div>
    </div>
  );
}
