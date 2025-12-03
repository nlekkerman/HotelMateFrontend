import React from 'react';
import ActionRequiredBadge from './ActionRequiredBadge';
import { safeString } from '../utils/safeUtils';

/**
 * Staff Attendance Card Component
 * Displays staff attendance information in a card format
 * Used in the cards view of the attendance dashboard
 */
export default function StaffAttendanceCard({ 
  staffSummary, 
  onViewDetails,
  className = '' 
}) {
  if (!staffSummary) {
    return null;
  }

  const handleCardClick = () => {
    if (typeof onViewDetails === 'function') {
      onViewDetails(staffSummary);
    }
  };

  // Calculate issues count from staffSummary data
  const issuesCount = staffSummary.issues_count || 0;

  // Get badge colors and labels from API data
  const dutyBadge = staffSummary.duty_status_badge || {};
  const attendanceBadge = staffSummary.attendance_status_badge || {};

  // Format worked time
  const formatWorkedTime = (minutes) => {
    if (!minutes || minutes === 0) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const workedTime = formatWorkedTime(staffSummary.total_worked_minutes);

  return (
    <div 
      className={`attendance-card-item ${className}`}
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="attendance-card-header">
        <div className="d-flex justify-content-between align-items-start">
          <div className="d-flex align-items-center gap-2">
            {staffSummary.avatar_url && (
              <img 
                src={staffSummary.avatar_url} 
                alt={staffSummary.full_name}
                className="rounded-circle"
                style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div>
              <h6 className="attendance-card-title">
                {safeString(staffSummary.full_name) || 'Unknown Staff'}
              </h6>
              <small className="text-muted">
                {safeString(staffSummary.department_name) || 'No Department'}
              </small>
            </div>
          </div>
          
          {issuesCount > 0 && (
            <ActionRequiredBadge count={issuesCount} />
          )}
        </div>
      </div>

      <div className="attendance-card-body">
        <div className="row g-3">
          <div className="col-6">
            <div className="text-center">
              <div className="h5 mb-1">{staffSummary.planned_shifts || 0}</div>
              <small className="text-muted">Planned</small>
            </div>
          </div>
          <div className="col-6">
            <div className="text-center">
              <div className="h5 mb-1">{staffSummary.worked_shifts || 0}</div>
              <small className="text-muted">Worked</small>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted small">Total Time:</span>
            <span className="attendance-time-display">{workedTime}</span>
          </div>
        </div>
      </div>

      <div className="attendance-card-footer">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex gap-2">
            {dutyBadge.label && (
              <span 
                className="attendance-status-indicator"
                style={{ 
                  backgroundColor: dutyBadge.bg_color || '#6c757d',
                  color: dutyBadge.color || '#ffffff'
                }}
              >
                {dutyBadge.label}
              </span>
            )}
            
            {attendanceBadge.label && (
              <span 
                className="attendance-status-indicator"
                style={{ 
                  backgroundColor: attendanceBadge.bg_color || '#6c757d',
                  color: attendanceBadge.color || '#ffffff'
                }}
              >
                {attendanceBadge.label}
              </span>
            )}
          </div>

          <small className="text-muted">
            <i className="bi bi-eye"></i> View Details
          </small>
        </div>
      </div>
    </div>
  );
}