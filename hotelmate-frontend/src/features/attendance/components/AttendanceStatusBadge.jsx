import React, { useEffect, useState } from "react";
import { getStatusVariant } from "../utils/attendanceStatus";

export default function AttendanceStatusBadge({ status, staffId, enhancedStatus }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  
  // Listen for real-time status updates
  useEffect(() => {
    const handleStatusUpdate = (event) => {
      const { staff_id, action, is_on_duty } = event.detail || {};
      
      // Update if this is for the current staff member
      if (staffId && staff_id === staffId) {
        console.log(`[AttendanceStatusBadge] Updating status for staff ${staffId}:`, action);
        
        // Add visual feedback for the update
        const badgeElement = document.getElementById(`staff-${staffId}-status`);
        if (badgeElement) {
          badgeElement.classList.add('updating');
          setTimeout(() => {
            badgeElement.classList.remove('updating');
          }, 600);
        }
        
        // Map Pusher actions to status text
        const actionToStatus = {
          clock_in: 'On duty (open log)',
          clock_out: 'Completed (approved)', 
          break_start: 'On break',
          break_end: 'On duty (open log)'
        };
        
        if (actionToStatus[action]) {
          setCurrentStatus(actionToStatus[action]);
        }
      }
    };

    const handleFaceClockAction = (event) => {
      const { action, data } = event.detail || {};
      
      console.log(`[AttendanceStatusBadge] Face clock action detected:`, { action, data });
      
      // If this affects the current staff (face actions usually affect the acting user)
      // We could potentially identify by comparing user data, but for now, refresh all badges
      if (data && (data.staff_id === staffId || data.user_id === staffId)) {
        console.log(`[AttendanceStatusBadge] Refreshing status for face action`);
        
        // Add visual feedback
        const badgeElement = document.getElementById(`staff-${staffId}-status`);
        if (badgeElement) {
          badgeElement.classList.add('updating');
          setTimeout(() => {
            badgeElement.classList.remove('updating');
          }, 800);
        }
        
        // Update status based on face action result
        if (data.action === 'clock_in_success') {
          setCurrentStatus('On duty (open log)');
        } else if (data.action === 'clock_out_success') {
          setCurrentStatus('Completed (approved)');
        }
      }
    };

    const handleBroadcastStatusUpdate = (event) => {
      const { staffId: eventStaffId, currentStatus, action } = event.detail;
      console.log(`[AttendanceStatusBadge] Broadcast status update:`, event.detail);
      
      if (eventStaffId === staffId) {
        console.log(`[AttendanceStatusBadge] Updating badge for staff ${staffId}`);
        
        // Add visual feedback
        const badgeElement = document.getElementById(`staff-${staffId}-status`);
        if (badgeElement) {
          badgeElement.classList.add('updating');
          setTimeout(() => {
            badgeElement.classList.remove('updating');
          }, 800);
        }
        
        // Update status based on current_status from backend
        if (currentStatus) {
          setCurrentStatus(currentStatus.label || 'Updated');
        }
      }
    };

    window.addEventListener('pusherClockStatusUpdate', handleStatusUpdate);
    window.addEventListener('face-clock-action-success', handleFaceClockAction);
    window.addEventListener('staffStatusUpdated', handleBroadcastStatusUpdate);
    
    return () => {
      window.removeEventListener('pusherClockStatusUpdate', handleStatusUpdate);
      window.removeEventListener('face-clock-action-success', handleFaceClockAction);
      window.removeEventListener('staffStatusUpdated', handleBroadcastStatusUpdate);
    };
  }, [staffId]);

  // Use enhanced status if available
  let displayStatus = currentStatus;
  if (enhancedStatus && enhancedStatus.status) {
    const statusMap = {
      off_duty: 'Completed (approved)',
      on_duty: 'On duty (open log)', 
      on_break: 'On break'
    };
    displayStatus = statusMap[enhancedStatus.status] || enhancedStatus.label;
  }
  
  if (!displayStatus) {
    displayStatus = "No data";
  }
  
  const variant = getStatusVariant(displayStatus);
  const className = `badge bg-${variant}`;
  
  return (
    <span 
      className={className}
      id={staffId ? `staff-${staffId}-status` : undefined}
      title={enhancedStatus?.is_on_break ? `Break time: ${enhancedStatus.total_break_minutes || 0} minutes` : undefined}
    >
      {displayStatus}
    </span>
  );
}
