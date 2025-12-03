/**
 * Duration formatting utilities for staff attendance
 */

export const formatDuration = {
  /**
   * Convert minutes to hours and minutes format
   * @param {number} minutes - Total minutes
   * @returns {string} Formatted duration (e.g., "8h 5m", "45m", "2h")
   */
  toHoursMinutes: (minutes) => {
    if (!minutes || minutes === 0) return "0m";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  },

  /**
   * Convert minutes to decimal hours
   * @param {number} minutes - Total minutes
   * @returns {string} Decimal hours (e.g., "8.08")
   */
  toDecimalHours: (minutes) => {
    if (!minutes) return "0.00";
    return (minutes / 60).toFixed(2);
  },

  /**
   * Get the smallest duration from an array of staff
   * @param {Array} staffList - Array of staff objects with total_worked_minutes
   * @returns {number} Smallest duration in minutes
   */
  getSmallestDuration: (staffList) => {
    if (!staffList || staffList.length === 0) return 0;
    
    const workingStaff = staffList.filter(staff => 
      staff.total_worked_minutes && staff.total_worked_minutes > 0
    );
    
    if (workingStaff.length === 0) return 0;
    
    return Math.min(...workingStaff.map(staff => staff.total_worked_minutes));
  },

  /**
   * Get duration statistics for dashboard
   * @param {Array} staffList - Array of staff objects with total_worked_minutes
   * @returns {Object} Duration statistics
   */
  getDurationStats: (staffList) => {
    const workingStaff = staffList.filter(staff => 
      staff.total_worked_minutes && staff.total_worked_minutes > 0
    );
    
    if (workingStaff.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        total: 0,
        count: 0
      };
    }
    
    const durations = workingStaff.map(staff => staff.total_worked_minutes);
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    
    return {
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: Math.round(total / durations.length),
      total: total,
      count: durations.length
    };
  },

  /**
   * Format staff member for display with duration information
   * @param {Object} staff - Staff object
   * @param {Object} durationStats - Duration statistics
   * @returns {Object} Enhanced staff object with formatting
   */
  formatStaffForDisplay: (staff, durationStats) => {
    const isSmallestDuration = durationStats && 
      staff.total_worked_minutes === durationStats.min && 
      durationStats.min > 0;
    
    return {
      ...staff,
      formattedDuration: formatDuration.toHoursMinutes(staff.total_worked_minutes),
      decimalHours: formatDuration.toDecimalHours(staff.total_worked_minutes),
      isSmallestDuration,
      efficiency: calculateStaffEfficiency(staff)
    };
  },

  /**
   * Get status badge for duty status
   * @param {string} status - Duty status
   * @returns {Object} Badge configuration
   */
  getStatusBadge: (status) => {
    const badges = {
      on_duty: {
        label: "On Duty",
        color: "success",
        bg_color: "#28a745",
        status_type: "active"
      },
      off_duty: {
        label: "Off Duty", 
        color: "secondary",
        bg_color: "#6c757d",
        status_type: "inactive"
      },
      on_break: {
        label: "On Break",
        color: "warning", 
        bg_color: "#ffc107",
        status_type: "break"
      }
    };
    
    return badges[status] || badges.off_duty;
  }
};

/**
 * Calculate staff efficiency percentage
 * @param {Object} staff - Staff object with planned_shifts and worked_shifts
 * @returns {number} Efficiency percentage
 */
export function calculateStaffEfficiency(staff) {
  if (!staff.planned_shifts || staff.planned_shifts === 0) return 0;
  return Math.round((staff.worked_shifts / staff.planned_shifts) * 100);
}

/**
 * Get department with smallest average shift
 * @param {Array} departmentAnalytics - Array of department analytics
 * @returns {Object|null} Department with smallest average shift
 */
export function getDepartmentWithSmallestAvg(departmentAnalytics) {
  if (!departmentAnalytics || departmentAnalytics.length === 0) return null;
  
  return departmentAnalytics.reduce((smallest, current) => {
    return current.avg_shift_length < smallest.avg_shift_length ? current : smallest;
  });
}

/**
 * Find staff with smallest average shift
 * @param {Array} staffSummaries - Array of staff summaries
 * @returns {Object|null} Staff with smallest average shift
 */
export function findStaffWithSmallestShifts(staffSummaries) {
  if (!staffSummaries || staffSummaries.length === 0) return null;
  
  return staffSummaries.reduce((smallest, current) => {
    return current.avg_shift_length < smallest.avg_shift_length ? current : smallest;
  });
}

/**
 * Get staff performance metrics
 * @param {Object} staff - Staff summary object
 * @param {Array} dailyData - Daily breakdown data
 * @returns {Object} Performance metrics
 */
export function getStaffPerformanceMetrics(staff, dailyData = []) {
  if (!staff) return null;

  return {
    name: `${staff.first_name} ${staff.last_name}`,
    department: staff.department_name,
    totalHours: staff.total_rostered_hours,
    shiftsCount: staff.shifts_count,
    avgShiftLength: formatDuration.toHoursMinutes(staff.avg_shift_length * 60),
    dailyBreakdown: dailyData
      .filter(day => day.staff_id === staff.staff_id)
      .map(day => ({
        date: day.date,
        hours: day.total_rostered_hours,
        shifts: day.shifts_count
      }))
  };
}

/**
 * Format department statistics for display
 * @param {Object} department - Department analytics object
 * @returns {Object} Formatted department statistics
 */
export function formatDepartmentStats(department) {
  return {
    name: department.department_name,
    slug: department.department_slug,
    totalHours: department.total_rostered_hours.toFixed(1),
    shiftsCount: department.shifts_count,
    avgShiftLength: formatDuration.toHoursMinutes(department.avg_shift_length * 60),
    staffCount: department.unique_staff,
    hoursPerStaff: (department.total_rostered_hours / department.unique_staff).toFixed(1)
  };
}