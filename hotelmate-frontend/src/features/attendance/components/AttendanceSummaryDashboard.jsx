import React, { useState, useEffect } from 'react';
import EnhancedAttendanceStatusBadge from './EnhancedAttendanceStatusBadge';
import { updateAttendanceCounts } from '../utils/statusUpdates';

/**
 * Attendance Summary Dashboard Component
 * Shows real-time attendance counters and staff list with enhanced status
 * @param {Array} staffList - Array of staff objects with current_status
 * @param {boolean} showStaffList - Whether to show the staff list
 */
const AttendanceSummaryDashboard = ({ staffList = [], showStaffList = true }) => {
  const [statusCounts, setStatusCounts] = useState({
    on_duty: 0,
    on_break: 0,
    off_duty: 0
  });

  // Update counters when staff list changes
  useEffect(() => {
    const counts = {
      on_duty: staffList.filter(s => s.current_status?.status === 'on_duty').length,
      on_break: staffList.filter(s => s.current_status?.status === 'on_break').length,
      off_duty: staffList.filter(s => s.current_status?.status === 'off_duty').length
    };
    
    setStatusCounts(counts);
    
    // Also update global attendance counters
    updateAttendanceCounts();
  }, [staffList]);

  // Listen for real-time updates
  useEffect(() => {
    const handleStatusUpdate = () => {
      // Recalculate counts after a short delay to allow DOM updates
      setTimeout(() => {
        updateAttendanceCounts();
      }, 100);
    };

    window.addEventListener('pusherClockStatusUpdate', handleStatusUpdate);
    window.addEventListener('clockStatusChanged', handleStatusUpdate);

    return () => {
      window.removeEventListener('pusherClockStatusUpdate', handleStatusUpdate);
      window.removeEventListener('clockStatusChanged', handleStatusUpdate);
    };
  }, []);

  return (
    <div className="attendance-summary-dashboard">
      {/* Status Summary Cards */}
      <div className="status-summary mb-4">
        <div className="row">
          <div className="col-md-4">
            <div className="status-card on-duty card h-100">
              <div className="card-body text-center">
                <h3 className="text-success">🟢 On Duty</h3>
                <span className="count display-4 fw-bold" id="on-duty-count">
                  {statusCounts.on_duty}
                </span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="status-card on-break card h-100">
              <div className="card-body text-center">
                <h3 className="text-warning">🟡 On Break</h3>
                <span className="count display-4 fw-bold" id="on-break-count">
                  {statusCounts.on_break}
                </span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="status-card off-duty card h-100">
              <div className="card-body text-center">
                <h3 className="text-danger">🔴 Off Duty</h3>
                <span className="count display-4 fw-bold" id="off-duty-count">
                  {statusCounts.off_duty}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Total Active Staff */}
        <div className="row mt-3">
          <div className="col-12">
            <div className="card bg-primary text-white">
              <div className="card-body text-center">
                <h5>Total Active Staff</h5>
                <span className="display-6 fw-bold" id="total-on-duty">
                  {statusCounts.on_duty + statusCounts.on_break}
                </span>
                <small className="d-block">On Duty + On Break</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff List */}
      {showStaffList && (
        <div className="staff-list">
          <h5>Staff Status Overview</h5>
          {staffList.length === 0 ? (
            <div className="alert alert-info">No staff data available</div>
          ) : (
            <div className="row">
              {staffList.map((staff) => (
                <div key={staff.id} className="col-md-6 col-lg-4 mb-3">
                  <div 
                    className={`staff-item card h-100 ${staff.current_status?.status || ''}`}
                    id={`staff-card-${staff.id}`}
                  >
                    <div className="card-body">
                      {staff.profile_image_url && (
                        <img 
                          src={staff.profile_image_url} 
                          alt={`${staff.first_name} ${staff.last_name}`}
                          className="rounded-circle mb-2"
                          style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      
                      <div className="staff-info">
                        <h6 className="staff-name mb-1">
                          {staff.first_name} {staff.last_name}
                        </h6>
                        
                        {staff.department?.name && (
                          <span className="department text-muted small d-block mb-2">
                            {staff.department.name}
                          </span>
                        )}
                        
                        <EnhancedAttendanceStatusBadge 
                          staff={staff} 
                          showBreakTime={true}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceSummaryDashboard;