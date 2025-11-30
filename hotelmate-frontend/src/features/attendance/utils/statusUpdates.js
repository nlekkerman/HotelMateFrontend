/**
 * Status Update Helper Functions
 * Real-time UI update functions for staff attendance status changes
 * Based on Staff Status Enhancement documentation
 */

/**
 * Update staff status display element with current status
 * @param {Object} staff - Staff object with current_status field
 */
export function updateStaffStatusDisplay(staff) {
  const statusElement = document.getElementById(`staff-${staff.id}-status`);
  if (!statusElement) return;
  
  const status = staff.current_status;
  if (!status) return;
  
  // Update status indicator
  statusElement.className = `status-indicator ${status.status}`;
  statusElement.textContent = status.label;
  
  // Update status colors and icons
  switch (status.status) {
    case 'off_duty':
      statusElement.innerHTML = '🔴 Off Duty';
      statusElement.className += ' status-off';
      break;
      
    case 'on_duty': 
      statusElement.innerHTML = '🟢 On Duty';
      statusElement.className += ' status-on';
      break;
      
    case 'on_break':
      const breakTime = Math.round((Date.now() - new Date(status.break_start)) / 60000);
      statusElement.innerHTML = `🟡 On Break (${breakTime}min)`;
      statusElement.className += ' status-break';
      break;
  }
}

/**
 * Update clock button based on staff current status
 * @param {Object} staff - Staff object with current_status field
 */
export function updateClockButton(staff) {
  const clockButton = document.getElementById('clock-action-btn');
  if (!clockButton) return;
  
  const status = staff.current_status;
  if (!status) return;
  
  switch (status.status) {
    case 'off_duty':
      clockButton.textContent = '🕐 Clock In';
      clockButton.className = 'btn-clock-in';
      clockButton.onclick = () => performClockIn();
      break;
      
    case 'on_duty':
      clockButton.textContent = 'Start Break (Clock Out)'; 
      clockButton.className = 'btn-clock-out';
      clockButton.onclick = () => showClockOutOptions();
      break;
      
    case 'on_break':
      clockButton.textContent = '▶️ End Break (Clock Out)';
      clockButton.className = 'btn-resume';
      clockButton.onclick = () => resumeFromBreak();
      break;
  }
}

/**
 * Update navigation badges with current status
 * @param {Object} staff - Staff object with current_status field
 */
export function updateNavigationBadges(staff) {
  const navBadge = document.getElementById('nav-status-badge');
  if (!navBadge) return;
  
  const status = staff.current_status;
  if (!status) return;
  
  navBadge.textContent = status.label;
  navBadge.className = `badge ${status.status}`;
}

/**
 * Update staff status card in real-time from Pusher event
 * @param {number} staffId - Staff ID 
 * @param {string} action - Action type (clock_in, clock_out, break_start, break_end)
 * @param {boolean} isOnDuty - Current duty status
 */
export function updateStaffStatusCard(staffId, action, isOnDuty) {
  const card = document.getElementById(`staff-card-${staffId}`);
  if (!card) return;
  
  const statusElement = card.querySelector('.status-indicator');
  const nameElement = card.querySelector('.staff-name');
  
  if (!statusElement || !nameElement) return;
  
  const staffName = nameElement.textContent;
  
  // Update status based on action
  switch (action) {
    case 'clock_in':
      statusElement.className = 'status-indicator on_duty';
      statusElement.textContent = '🟢 On Duty';
      showToast(`${staffName} clocked in`);
      break;
      
    case 'clock_out':
      statusElement.className = 'status-indicator off_duty';
      statusElement.textContent = '🔴 Off Duty';
      showToast(`${staffName} clocked out`);
      break;
      
    case 'break_start':
      statusElement.className = 'status-indicator on_break';
      statusElement.textContent = '🟡 On Break';
      showToast(`${staffName} started break`);
      break;
      
    case 'break_end':
      statusElement.className = 'status-indicator on_duty';
      statusElement.textContent = '🟢 On Duty';
      showToast(`${staffName} resumed work`);
      break;
  }
}

/**
 * Update real-time attendance counters
 */
export function updateAttendanceCounts() {
  // Count current status indicators on page
  const onDutyCount = document.querySelectorAll('.status-indicator.on_duty').length;
  const onBreakCount = document.querySelectorAll('.status-indicator.on_break').length;
  const offDutyCount = document.querySelectorAll('.status-indicator.off_duty').length;
  
  // Update dashboard counters
  const onDutyElement = document.getElementById('on-duty-count');
  const onBreakElement = document.getElementById('on-break-count');
  const offDutyElement = document.getElementById('off-duty-count');
  const totalOnDutyElement = document.getElementById('total-on-duty');
  
  if (onDutyElement) onDutyElement.textContent = onDutyCount;
  if (onBreakElement) onBreakElement.textContent = onBreakCount;
  if (offDutyElement) offDutyElement.textContent = offDutyCount;
  if (totalOnDutyElement) totalOnDutyElement.textContent = onDutyCount + onBreakCount;
}

/**
 * Show toast notification for status changes
 * @param {string} message - Message to display
 * @param {string} type - Toast type (info, success, warning, error)
 * @param {number} duration - Display duration in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Style the toast
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    zIndex: '9999',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    backgroundColor: type === 'success' ? '#28a745' : 
                     type === 'warning' ? '#ffc107' : 
                     type === 'error' ? '#dc3545' : '#17a2b8'
  });
  
  document.body.appendChild(toast);
  
  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 100);
  
  // Auto-remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, duration);
}

/**
 * Show status notification from Pusher data
 * @param {Object} data - Pusher event data
 */
export function showStatusNotification(data) {
  const { first_name, last_name, action, department } = data;
  const name = `${first_name} ${last_name || ''}`.trim();
  
  const messages = {
    clock_in: `🟢 ${name} (${department || 'Staff'}) clocked in`,
    clock_out: `🔴 ${name} (${department || 'Staff'}) clocked out`,
    break_start: `🟡 ${name} (${department || 'Staff'}) started break`,
    break_end: `🟢 ${name} (${department || 'Staff'}) resumed work`
  };
  
  const toastTypes = {
    clock_in: 'success',
    clock_out: 'info',
    break_start: 'warning',
    break_end: 'success'
  };
  
  if (messages[action]) {
    showToast(messages[action], toastTypes[action] || 'info', 4000);
  }
}

/**
 * Handle real-time status update from Pusher
 * @param {Object} data - Pusher event data
 */
export function handleRealTimeStatusUpdate(data) {
  const { staff_id, action, is_on_duty, user_id } = data;
  
  // Update staff status in dashboard
  updateStaffStatusCard(staff_id, action, is_on_duty);
  
  // Update attendance counters
  updateAttendanceCounts();
  
  // Show notification
  showStatusNotification(data);
  
  // Broadcast for navbar button updates
  window.dispatchEvent(new CustomEvent('pusherClockStatusUpdate', {
    detail: data
  }));
}