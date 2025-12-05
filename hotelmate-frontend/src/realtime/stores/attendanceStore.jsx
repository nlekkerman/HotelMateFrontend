// src/realtime/stores/attendanceStore.jsx
import React, { createContext, useContext, useReducer } from 'react';

// State contexts
const AttendanceStateContext = createContext(null);
const AttendanceDispatchContext = createContext(null);

// Initial state
const initialState = {
  staffById: {}, // { [staffId]: { status, duty_status, last_clock_action, department, ... } }
  currentUserStatus: null, // Current staff member's attendance status
  byDepartment: {}, // { [departmentSlug]: { on_duty_count, on_break_count, off_duty_count, ... } }
  lastEventTimestamps: {}, // for deduplication: { [key]: timestamp }
};

// Actions
const ACTIONS = {
  INIT_FROM_API: 'INIT_FROM_API',
  INIT_DEPARTMENT_SUMMARY: 'INIT_DEPARTMENT_SUMMARY', 
  UPDATE_CLOCK_STATUS: 'UPDATE_CLOCK_STATUS',
  UPDATE_PERSONAL_STATUS: 'UPDATE_PERSONAL_STATUS',
};

// Reducer function
function attendanceReducer(state, action) {
  switch (action.type) {
    case ACTIONS.INIT_FROM_API: {
      const { staffData, currentUser } = action.payload;
      
      // Convert staff array to staffById map if needed
      let staffById = {};
      if (Array.isArray(staffData)) {
        staffById = staffData.reduce((acc, staff) => {
          if (staff && staff.id) {
            acc[staff.id] = staff;
          }
          return acc;
        }, {});
      } else if (staffData && typeof staffData === 'object') {
        staffById = staffData;
      }

      return {
        ...state,
        staffById: { ...state.staffById, ...staffById },
        currentUserStatus: currentUser || state.currentUserStatus,
      };
    }

    case ACTIONS.INIT_DEPARTMENT_SUMMARY: {
      const { departmentData } = action.payload;
      return {
        ...state,
        byDepartment: { ...state.byDepartment, ...departmentData },
      };
    }

    case ACTIONS.UPDATE_CLOCK_STATUS: {
      const eventData = action.payload;
      const staffId = eventData.staff_id || eventData.user_id;
      
      if (!staffId) {
        console.warn('[AttendanceStore] UPDATE_CLOCK_STATUS: No staff_id found:', eventData);
        return state;
      }

      // Update staff data
      const updatedStaff = {
        ...state.staffById[staffId],
        ...eventData,
        id: staffId,
        last_updated: new Date().toISOString(),
      };

      // Update department aggregates if department info is available
      let newByDepartment = { ...state.byDepartment };
      if (eventData.department) {
        const dept = eventData.department;
        if (!newByDepartment[dept]) {
          newByDepartment[dept] = {
            on_duty_count: 0,
            on_break_count: 0,
            off_duty_count: 0,
            total: 0,
          };
        }
        
        // Recalculate department totals (simplified - in real app you'd need more logic)
        // This is a basic implementation - adjust based on your exact needs
        const deptStaff = Object.values({...state.staffById, [staffId]: updatedStaff})
          .filter(s => s.department === dept);
        
        newByDepartment[dept] = {
          on_duty_count: deptStaff.filter(s => s.duty_status === 'on_duty').length,
          on_break_count: deptStaff.filter(s => s.duty_status === 'on_break').length, 
          off_duty_count: deptStaff.filter(s => s.duty_status === 'off_duty' || !s.duty_status).length,
          total: deptStaff.length,
        };
      }

      return {
        ...state,
        staffById: {
          ...state.staffById,
          [staffId]: updatedStaff,
        },
        byDepartment: newByDepartment,
      };
    }

    case ACTIONS.UPDATE_PERSONAL_STATUS: {
      const eventData = action.payload;
      return {
        ...state,
        currentUserStatus: {
          ...state.currentUserStatus,
          ...eventData,
          last_updated: new Date().toISOString(),
        },
      };
    }

    default:
      return state;
  }
}

// Ref to store dispatch for non-hook usage
let dispatchRef = null;

// Provider component
export function AttendanceProvider({ children }) {
  const [state, dispatch] = useReducer(attendanceReducer, initialState);

  // Save dispatch reference for attendanceActions
  dispatchRef = dispatch;

  return (
    <AttendanceStateContext.Provider value={state}>
      <AttendanceDispatchContext.Provider value={dispatch}>
        {children}
      </AttendanceDispatchContext.Provider>
    </AttendanceStateContext.Provider>
  );
}

// Hook to access state
export function useAttendanceState() {
  const context = useContext(AttendanceStateContext);
  if (!context) {
    throw new Error('useAttendanceState must be used within AttendanceProvider');
  }
  return context;
}

// Hook to access dispatch
export function useAttendanceDispatch() {
  const context = useContext(AttendanceDispatchContext);
  if (!context) {
    throw new Error('useAttendanceDispatch must be used within AttendanceProvider');
  }
  return context;
}

// Non-hook interface for eventBus
export const attendanceActions = {
  handleEvent(event) {
    if (!dispatchRef) {
      if (import.meta.env && !import.meta.env.PROD) {
        console.warn("[attendanceStore] handleEvent called before dispatchRef is ready", event);
      }
      return;
    }

    // ✅ NEW: Handle unified backend event format {category, type, payload, meta}
    let eventType, payload, eventId;
    
    if (event.category && event.type && event.payload) {
      // New format from backend
      eventType = event.type;
      payload = event.payload;
      eventId = event.meta?.event_id;
    } else {
      // Legacy format for backward compatibility
      eventType = event.eventType;
      payload = event.data;
      eventId = null;
    }

    // ✅ Event deduplication using event.meta.event_id (preferred) or timestamp window
    let deduplicationKey;
    if (eventId) {
      // Use backend-provided event ID for perfect deduplication
      deduplicationKey = eventId;
    } else {
      // Fallback to timestamp-based deduplication
      deduplicationKey = `${eventType}:${payload?.staff_id || payload?.user_id || 'global'}:${Date.now().toString().slice(0, -3)}`;
    }

    if (attendanceActions._processedEventIds?.has(deduplicationKey)) {
      if (import.meta.env && !import.meta.env.PROD) {
        console.log("[attendanceStore] Duplicate event detected, skipping:", deduplicationKey, event);
      }
      return;
    }

    // Store event ID to prevent duplicates
    if (!attendanceActions._processedEventIds) {
      attendanceActions._processedEventIds = new Set();
    }
    attendanceActions._processedEventIds.add(deduplicationKey);

    // Clean up old event IDs (keep only last 1000 to prevent memory leak)
    if (attendanceActions._processedEventIds.size > 1000) {
      const eventIds = Array.from(attendanceActions._processedEventIds);
      const toDelete = eventIds.slice(0, 500); // Remove oldest half
      toDelete.forEach(id => attendanceActions._processedEventIds.delete(id));
    }

    console.log("[attendanceStore] Processing event:", eventType, payload);

    // ✅ Handle events from the guide
    switch (eventType) {
      // New backend event names
      case "clock_status_updated":
        dispatchRef({
          type: ACTIONS.UPDATE_CLOCK_STATUS,
          payload,
        });
        break;

      // Legacy event names (for backward compatibility)
      case "clock-status-updated":
      case "clock-status-changed":
      case "attendance_update":
        dispatchRef({
          type: ACTIONS.UPDATE_CLOCK_STATUS,
          payload,
        });
        break;

      case "timesheet-approved":
      case "timesheet-rejected":
      case "personal-attendance-update":
      case "log-approved":
      case "log-rejected":
        dispatchRef({
          type: ACTIONS.UPDATE_PERSONAL_STATUS,
          payload,
        });
        break;

      default:
        if (import.meta.env && !import.meta.env.PROD) {
          console.log("[attendanceStore] Ignoring eventType:", eventType, event);
        }
        break;
    }
  },

  // Helper to initialize from API data
  initFromAPI(staffData, currentUser = null) {
    if (!dispatchRef) {
      console.warn("[attendanceStore] initFromAPI called before store is ready");
      return;
    }
    
    dispatchRef({
      type: ACTIONS.INIT_FROM_API,
      payload: { staffData, currentUser }
    });
  },

  // Helper to initialize department data
  initDepartmentSummary(departmentData) {
    if (!dispatchRef) {
      console.warn("[attendanceStore] initDepartmentSummary called before store is ready");
      return;
    }
    
    dispatchRef({
      type: ACTIONS.INIT_DEPARTMENT_SUMMARY,
      payload: { departmentData }
    });
  }
};