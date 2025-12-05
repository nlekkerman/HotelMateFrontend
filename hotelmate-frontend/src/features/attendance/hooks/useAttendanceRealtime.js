import { useEffect, useRef } from 'react';
import { useAttendanceState, useAttendanceDispatch } from '@/realtime/stores/attendanceStore.jsx';
import { attendanceActions } from '@/realtime/stores/attendanceStore.jsx';
import api from '@/services/api';

/**
 * Safe event handler that validates event structure and normalizes backend data
 * @param {Function} onEvent - Original event callback
 * @param {string} type - Event type
 * @param {*} data - Event data from backend
 */
function safeEventHandler(onEvent, type, data) {
  console.log(`[Attendance Store] 📨 safeEventHandler called for ${type}:`, {
    hasOnEvent: typeof onEvent === 'function',
    dataType: typeof data,
    data,
    timestamp: new Date().toISOString()
  });
  
  if (typeof onEvent !== 'function') {
    console.warn(`[Attendance Store] ⚠️ No onEvent callback provided for ${type}`);
    return;
  }
  
  try {
    // Normalize backend data into our expected payload structure
    const payload = data && typeof data === 'object' ? data : {};
    
    const normalizedEvent = { type, payload };
    
    console.log(`[Attendance Store] ✅ Normalized ${type} event, calling handler:`, {
      event: normalizedEvent,
      hasPayload: Object.keys(payload).length > 0,
      timestamp: new Date().toISOString()
    });
    
    // Call with normalized { type, payload } structure
    onEvent(normalizedEvent);
    
    console.log(`[Attendance Store] 🎯 Successfully dispatched ${type} event to handler`);
  } catch (error) {
    console.error(`[Attendance Store] ❌ Error handling event ${type}:`, error);
  }
}

/**
 * Hook for real-time attendance updates - now using centralized store
 * @param {string} hotelSlug - Hotel slug identifier  
 * @param {Function} onEvent - Callback for attendance events ({ type, payload })
 */
export function useAttendanceRealtime(hotelSlug, onEvent) {
  const attendanceState = useAttendanceState();
  const dispatch = useAttendanceDispatch();
  
  // Use ref to avoid dependency on onEvent changing
  const handlerRef = useRef(onEvent);
  const previousStaffByIdRef = useRef({});
  
  // Keep handler ref up to date
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  // Load initial attendance data from API if needed
  useEffect(() => {
    if (!hotelSlug) return;
    
    const loadInitialData = async () => {
      try {
        // Load current user attendance status if available
        const userResponse = await api.get(`/staff/hotel/${hotelSlug}/attendance/clock-logs/status/`);
        if (userResponse.data) {
          attendanceActions.initFromAPI(null, userResponse.data);
        }
      } catch (error) {
        // Silently handle error to avoid spam
      }
    };

    loadInitialData();
  }, [hotelSlug]);

  // Listen to store state changes and call the event handler when staff status changes
  useEffect(() => {
    if (!handlerRef.current) return;

    const currentStaffById = attendanceState.staffById;
    const previousStaffById = previousStaffByIdRef.current;

    // Check for changes in staff status
    for (const [staffId, currentData] of Object.entries(currentStaffById)) {
      const previousData = previousStaffById[staffId];
      
      // If this is new data or if the duty_status has changed, trigger the callback
      if (!previousData || previousData.duty_status !== currentData.duty_status || 
          previousData.last_updated !== currentData.last_updated) {
        
        // Convert store data back to the format expected by the components
        const eventData = {
          type: 'clock-status-updated',
          payload: {
            staff_id: staffId,
            user_id: currentData.user_id || staffId,
            duty_status: currentData.duty_status,
            current_status: currentData.current_status,
            first_name: currentData.first_name,
            last_name: currentData.last_name,
            action: currentData.action || currentData.last_clock_action,
            department: currentData.department,
            timestamp: currentData.last_updated || new Date().toISOString(),
            ...currentData // Include any other fields from the store
          }
        };

        console.log('[Attendance Store] 📡 Store change detected, calling handler:', eventData);
        safeEventHandler(handlerRef.current, 'clock-status-updated', eventData.payload);
      }
    }

    // Update the reference for next comparison
    previousStaffByIdRef.current = { ...currentStaffById };
  }, [attendanceState.staffById]);

  // Also listen to currentUserStatus changes for personal events
  useEffect(() => {
    if (!handlerRef.current || !attendanceState.currentUserStatus) return;

    const currentUser = attendanceState.currentUserStatus;
    
    // If there's a recent update, trigger personal events
    if (currentUser.last_updated) {
      const updateTime = new Date(currentUser.last_updated).getTime();
      const now = Date.now();
      
      // Only trigger if updated within last 10 seconds (fresh from realtime)
      if (now - updateTime < 10000) {
        let eventType = 'personal-attendance-update';
        
        // Determine event type based on status
        if (currentUser.status === 'approved') {
          eventType = 'log-approved';
        } else if (currentUser.status === 'rejected') {
          eventType = 'log-rejected';
        }

        const eventData = {
          type: eventType,
          payload: currentUser
        };

        console.log('[Attendance Store] 📡 Personal status change detected:', eventData);
        safeEventHandler(handlerRef.current, eventType, currentUser);
      }
    }
  }, [attendanceState.currentUserStatus]);

  // The hook doesn't return anything - it just manages the subscription and calls the callback
  // This maintains the exact same API as the original Pusher-based hook
}