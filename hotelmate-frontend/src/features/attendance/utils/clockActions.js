import api from '@/services/api';

/**
 * Clock Action Utilities
 * Handles clock in/out, break start/end actions via API
 */

/**
 * Perform clock in action
 * @param {string} hotelSlug - Hotel slug
 * @param {string} location - Clock in location (optional)
 * @returns {Promise} API response
 */
export async function performClockIn(hotelSlug, location = 'Manual') {
  try {
    const response = await api.post(`/staff/hotel/${hotelSlug}/attendance/clock-logs/`, {
      action: 'clock_in',
      location_name: location,
      notes: 'Manual clock in from navigation'
    });
    
    console.log('[ClockActions] Clock in successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('[ClockActions] Clock in failed:', error);
    throw error;
  }
}

/**
 * Perform clock out action  
 * @param {string} hotelSlug - Hotel slug
 * @param {string} reason - Clock out reason (optional)
 * @returns {Promise} API response
 */
export async function performClockOut(hotelSlug, reason = 'End of shift') {
  try {
    const response = await api.post(`/staff/hotel/${hotelSlug}/attendance/clock-logs/clock-out/`, {
      reason,
      location_name: 'Manual',
      notes: 'Manual clock out from navigation'
    });
    
    console.log('[ClockActions] Clock out successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('[ClockActions] Clock out failed:', error);
    throw error;
  }
}

/**
 * Start break action
 * @param {string} hotelSlug - Hotel slug
 * @returns {Promise} API response
 */
export async function startBreak(hotelSlug) {
  try {
    const response = await api.post(`/staff/hotel/${hotelSlug}/attendance/clock-logs/start-break/`, {
      location_name: 'Manual',
      notes: 'Break started from navigation'
    });
    
    console.log('[ClockActions] Break start successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('[ClockActions] Break start failed:', error);
    throw error;
  }
}

/**
 * End break action
 * @param {string} hotelSlug - Hotel slug
 * @returns {Promise} API response
 */
export async function endBreak(hotelSlug) {
  try {
    const response = await api.post(`/staff/hotel/${hotelSlug}/attendance/clock-logs/end-break/`, {
      location_name: 'Manual', 
      notes: 'Break ended from navigation'
    });
    
    console.log('[ClockActions] Break end successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('[ClockActions] Break end failed:', error);
    throw error;
  }
}

/**
 * Handle clock action based on current status
 * @param {Object} currentStatus - Current staff status object
 * @param {string} hotelSlug - Hotel slug
 * @returns {Promise} API response
 */
export async function handleClockAction(currentStatus, hotelSlug) {
  if (!currentStatus || !currentStatus.status) {
    throw new Error('Invalid current status');
  }

  switch (currentStatus.status) {
    case 'off_duty':
      return await performClockIn(hotelSlug);
      
    case 'on_duty':
      // When on duty, user can start break or clock out
      // For navigation button, we'll start break by default
      return await startBreak(hotelSlug);
      
    case 'on_break':
      // When on break, user can end break or clock out
      // For navigation button, we'll end break by default
      return await endBreak(hotelSlug);
      
    default:
      throw new Error(`Unknown status: ${currentStatus.status}`);
  }
}

/**
 * Get the appropriate action description based on status
 * @param {Object} currentStatus - Current staff status object
 * @returns {string} Action description
 */
export function getActionDescription(currentStatus) {
  if (!currentStatus || !currentStatus.status) {
    return 'Clock In';
  }

  switch (currentStatus.status) {
    case 'off_duty':
      return 'Clock In';
    case 'on_duty':
      return 'Start Break';
    case 'on_break':
      return 'End Break';
    default:
      return 'Clock Action';
  }
}

/**
 * Show clock action options modal
 * @param {Object} currentStatus - Current staff status object  
 * @param {string} hotelSlug - Hotel slug
 * @param {Function} onAction - Callback when action is selected
 */
export function showClockOptionsModal(currentStatus, hotelSlug, onAction) {
  if (!currentStatus) return;
  
  const actions = [];
  
  switch (currentStatus.status) {
    case 'on_duty':
      actions.push(
        { label: 'Start Break', action: () => startBreak(hotelSlug), primary: true },
        { label: 'Clock Out', action: () => performClockOut(hotelSlug), primary: false }
      );
      break;
      
    case 'on_break':
      actions.push(
        { label: 'End Break', action: () => endBreak(hotelSlug), primary: true },
        { label: 'Clock Out', action: () => performClockOut(hotelSlug), primary: false }
      );
      break;
      
    default:
      actions.push(
        { label: 'Clock In', action: () => performClockIn(hotelSlug), primary: true }
      );
  }
  
  // For now, just execute the primary action
  // In a real implementation, you might show a modal with options
  if (actions.length > 0 && actions[0].primary) {
    actions[0].action().then(onAction).catch(console.error);
  }
}