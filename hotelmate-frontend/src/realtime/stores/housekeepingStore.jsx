// src/realtime/stores/housekeepingStore.jsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import api from '@/services/api';

// State contexts
const HousekeepingStateContext = createContext(null);
const HousekeepingDispatchContext = createContext(null);

// Initial state
const initialState = {
  roomsById: {}, // { [roomId]: roomObject } - Normalized room objects by ID
  counts: {}, // Dashboard counts by status
  loading: false,
  error: null,
  lastUpdatedAt: null,
};

// Actions
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOAD_DASHBOARD: 'LOAD_DASHBOARD',
  UPDATE_ROOM_STATUS: 'UPDATE_ROOM_STATUS',
  CLEAR_DATA: 'CLEAR_DATA'
};

// Status display mapping
const STATUS_DISPLAY_MAP = {
  'OCCUPIED': 'Occupied',
  'CHECKOUT_DIRTY': 'Checkout Dirty',
  'CLEANING_IN_PROGRESS': 'Cleaning in Progress',
  'CLEANED_UNINSPECTED': 'Cleaned Uninspected',
  'MAINTENANCE_REQUIRED': 'Maintenance Required',
  'OUT_OF_ORDER': 'Out of Order',
  'READY_FOR_GUEST': 'Ready for Guest'
};

// Helper function to normalize dashboard data
const normalizeDashboardData = (dashboardResponse) => {
  const roomsById = {};
  const { rooms_by_status = {}, counts = {} } = dashboardResponse;

  // Iterate through all status categories and normalize rooms
  Object.entries(rooms_by_status).forEach(([status, rooms]) => {
    if (Array.isArray(rooms)) {
      rooms.forEach(room => {
        // Ensure room has status fields
        if (!room.room_status) {
          room.room_status = status;
        }
        if (!room.room_status_display) {
          room.room_status_display = STATUS_DISPLAY_MAP[status] || status;
        }
        roomsById[room.id] = room;
      });
    }
  });

  return { roomsById, counts };
};

// Helper function to recompute counts from current rooms
const recomputeCounts = (roomsById) => {
  const counts = {};
  
  Object.values(roomsById).forEach(room => {
    const status = room.room_status;
    if (status) {
      counts[status] = (counts[status] || 0) + 1;
    }
  });

  return counts;
};

// Reducer function
function housekeepingReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING: {
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error
      };
    }

    case ACTIONS.SET_ERROR: {
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    }

    case ACTIONS.LOAD_DASHBOARD: {
      const { dashboardData } = action.payload;
      const { roomsById, counts } = normalizeDashboardData(dashboardData);
      
      return {
        ...state,
        roomsById,
        counts,
        loading: false,
        error: null,
        lastUpdatedAt: new Date().toISOString()
      };
    }

    case ACTIONS.UPDATE_ROOM_STATUS: {
      const { roomId, statusUpdate } = action.payload;
      
      if (!state.roomsById[roomId]) {
        console.warn('[housekeepingStore] Room not found for status update:', roomId);
        return state;
      }

      // Update room with new status
      const updatedRoom = {
        ...state.roomsById[roomId],
        ...statusUpdate,
        room_status_display: STATUS_DISPLAY_MAP[statusUpdate.room_status] || statusUpdate.room_status
      };

      const updatedRoomsById = {
        ...state.roomsById,
        [roomId]: updatedRoom
      };

      // Recompute counts after room update
      const updatedCounts = recomputeCounts(updatedRoomsById);

      return {
        ...state,
        roomsById: updatedRoomsById,
        counts: updatedCounts,
        lastUpdatedAt: new Date().toISOString()
      };
    }

    case ACTIONS.CLEAR_DATA: {
      return initialState;
    }

    default:
      return state;
  }
}

// Provider component
export function HousekeepingProvider({ children }) {
  const [state, dispatch] = useReducer(housekeepingReducer, initialState);

  // Action creators
  const actions = {
    setLoading: useCallback((loading) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error });
    }, []),

    loadDashboard: useCallback(async (hotelSlug) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      try {
        const response = await api.get(`/staff/hotel/${hotelSlug}/housekeeping/dashboard/`);
        dispatch({ 
          type: ACTIONS.LOAD_DASHBOARD, 
          payload: { dashboardData: response.data } 
        });
        return response.data;
      } catch (error) {
        console.error('[housekeepingStore] Failed to load dashboard:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load housekeeping dashboard';
        dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
        throw error;
      }
    }, []),

    updateRoomStatus: useCallback(async (hotelSlug, roomId, toStatus, note = '') => {
      try {
        // Check if this is a "Back in Service" action (OUT_OF_ORDER → READY_FOR_GUEST)
        const currentRoom = state.roomsById[roomId];
        const isBackInService = currentRoom?.room_status === 'OUT_OF_ORDER' && toStatus === 'READY_FOR_GUEST';
        
        const requestBody = {
          to_status: toStatus,
          source: isBackInService ? 'MANAGER_OVERRIDE' : 'HOUSEKEEPING',
          note: isBackInService && !note ? 'Room maintenance completed - back in service' : note
        };

        const response = await api.post(
          `/staff/hotel/${hotelSlug}/housekeeping/rooms/${roomId}/status/`,
          requestBody
        );

        // Update will come via Pusher, but we can optimistically update
        dispatch({
          type: ACTIONS.UPDATE_ROOM_STATUS,
          payload: {
            roomId,
            statusUpdate: {
              room_status: toStatus,
              last_status_change: new Date().toISOString()
            }
          }
        });

        return response.data;
      } catch (error) {
        console.error('[housekeepingStore] Failed to update room status:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update room status';
        dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
        throw error;
      }
    }, [state.roomsById]),

    handleRealtimeEvent: useCallback((event) => {
      // Handle Pusher room-status-changed events
      if (event.event === 'room-status-changed' && event.data) {
        const { room_id, to_status, ...otherFields } = event.data;
        
        if (room_id && to_status) {
          dispatch({
            type: ACTIONS.UPDATE_ROOM_STATUS,
            payload: {
              roomId: room_id,
              statusUpdate: {
                room_status: to_status,
                ...otherFields,
                last_status_change: new Date().toISOString()
              }
            }
          });
        }
      }
    }, []),

    clearData: useCallback(() => {
      dispatch({ type: ACTIONS.CLEAR_DATA });
    }, [])
  };

  return (
    <HousekeepingStateContext.Provider value={state}>
      <HousekeepingDispatchContext.Provider value={actions}>
        {children}
      </HousekeepingDispatchContext.Provider>
    </HousekeepingStateContext.Provider>
  );
}

// Hooks for consuming the context
export function useHousekeepingState() {
  const context = useContext(HousekeepingStateContext);
  if (!context) {
    throw new Error('useHousekeepingState must be used within a HousekeepingProvider');
  }
  return context;
}

export function useHousekeepingActions() {
  const context = useContext(HousekeepingDispatchContext);
  if (!context) {
    throw new Error('useHousekeepingActions must be used within a HousekeepingProvider');
  }
  return context;
}

// Combined hook for convenience
export function useHousekeeping() {
  return {
    ...useHousekeepingState(),
    ...useHousekeepingActions()
  };
}