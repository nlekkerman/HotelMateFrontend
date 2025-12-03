import React from 'react';

/**
 * Enhanced Attendance Status Badge Component
 * Displays staff status with break information using current_status field
 * @param {Object} staff - Staff object with current_status field
 * @param {boolean} showBreakTime - Whether to show break duration
 * @param {string} size - Badge size (sm, md, lg)
 */
const EnhancedAttendanceStatusBadge = ({ 
  staff, 
  showBreakTime = false, 
  size = 'md',
  className = '' 
}) => {
  console.log('[EnhancedAttendanceStatusBadge] Rendering with props:', {
    hasStaff: !!staff,
    hasCurrentStatus: !!staff?.current_status,
    staff: staff,
    showBreakTime,
    size,
    className
  });

  if (!staff || !staff.current_status) {
    console.log('[EnhancedAttendanceStatusBadge] Using fallback status');
    // Fallback to basic status
    const basicStatus = staff?.is_on_duty ? 'on_duty' : 'off_duty';
    const basicLabel = staff?.is_on_duty ? 'On Duty' : 'Off Duty';
    
    return (
      <span className={`status-indicator ${basicStatus} ${className}`}>
        {basicStatus === 'on_duty' ? '🟢' : '🔴'} {basicLabel}
      </span>
    );
  }

  const { status, label, is_on_break, break_start, total_break_minutes } = staff.current_status;
  
  // Calculate break time if on break
  let breakTimeDisplay = '';
  if (is_on_break && showBreakTime) {
    if (total_break_minutes) {
      breakTimeDisplay = ` (${total_break_minutes}min total)`;
    } else if (break_start) {
      const breakMinutes = Math.round((Date.now() - new Date(break_start)) / 60000);
      breakTimeDisplay = ` (${breakMinutes}min)`;
    }
  }

  // Status icons
  const statusIcons = {
    off_duty: '🔴',
    on_duty: '🟢', 
    on_break: '🟡'
  };

  const sizeClasses = {
    sm: 'status-indicator-sm',
    md: '',
    lg: 'status-indicator-lg'
  };

  console.log('[EnhancedAttendanceStatusBadge] Rendering status badge:', {
    status,
    label,
    icon: statusIcons[status],
    breakTimeDisplay,
    finalClassName: `status-indicator ${status} ${sizeClasses[size]} ${className}`
  });

  return (
    <span 
      className={`status-indicator ${status} ${sizeClasses[size]} ${className}`}
      title={`${label}${breakTimeDisplay}`}
    >
      {statusIcons[status] || '⚪'} {label}{breakTimeDisplay}
    </span>
  );
};

export default EnhancedAttendanceStatusBadge;