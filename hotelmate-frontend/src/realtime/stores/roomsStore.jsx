// src/realtime/stores/roomsStore.jsx
import React, { createContext, useContext, useReducer } from 'react';

// State contexts
const RoomsStateContext = createContext(null);
const RoomsDispatchContext = createContext(null);

// Initial state
const initialState = {
  byRoomNumber: {}, // { [room_number]: roomSnapshot } - Room objects indexed by room_number
  list: [], // [room_number, ...] - Sorted numerically for display
  lastEventIds: {}, // { [eventId]: true } - Deduplication via meta.event_id
  lastUpdatedAt: null, // ISO timestamp
};

// Actions
const ACTIONS = {
  ROOM_UPSERT: 'ROOM_UPSERT',
  ROOM_BULK_REPLACE: 'ROOM_BULK_REPLACE', 
  ROOM_REMOVE: 'ROOM_REMOVE',
  ROOM_RESET: 'ROOM_RESET' // Clear all rooms (hotel switch/logout)
};

// Helper function to extract room number from event
const extractRoomNumber = (event) => {
  // Priority: meta.scope.room_number → payload.room_number
  return event.meta?.scope?.room_number || 
         event.payload?.room_number;
};

// Helper function to sort room list numerically
const sortRoomList = (list) => {
  return [...list].sort((a, b) => Number(a) - Number(b));
};

// Reducer function
function roomsReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ROOM_UPSERT: {
      const { roomSnapshot, roomNumber } = action.payload;
      
      if (!roomNumber) {
        console.warn('[roomsStore] Missing room number in ROOM_UPSERT action:', action);
        return state;
      }

      // Upsert room (merge with existing or create new)
      const existingRoom = state.byRoomNumber[roomNumber] || {};
      const updatedRoom = { ...existingRoom, ...roomSnapshot };

      const newByRoomNumber = {
        ...state.byRoomNumber,
        [roomNumber]: updatedRoom,
      };

      // Add to list if not already present, then sort
      let newList = [...state.list];
      if (!newList.includes(roomNumber)) {
        newList.push(roomNumber);
      }
      newList = sortRoomList(newList);

      return {
        ...state,
        byRoomNumber: newByRoomNumber,
        list: newList,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    case ACTIONS.ROOM_BULK_REPLACE: {
      const { rooms } = action.payload;
      
      if (!Array.isArray(rooms)) {
        console.warn('[roomsStore] ROOM_BULK_REPLACE expected array of rooms:', action);
        return state;
      }

      const newByRoomNumber = {};
      const newList = [];

      rooms.forEach(room => {
        const roomNumber = room.room_number || room.number;
        if (roomNumber) {
          newByRoomNumber[roomNumber] = room;
          newList.push(roomNumber);
        }
      });

      return {
        ...state,
        byRoomNumber: newByRoomNumber,
        list: sortRoomList(newList),
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    case ACTIONS.ROOM_REMOVE: {
      const { roomNumber } = action.payload;
      
      if (!roomNumber) {
        console.warn('[roomsStore] Missing room number in ROOM_REMOVE action:', action);
        return state;
      }

      const newByRoomNumber = { ...state.byRoomNumber };
      delete newByRoomNumber[roomNumber];

      const newList = state.list.filter(num => num !== roomNumber);

      return {
        ...state,
        byRoomNumber: newByRoomNumber,
        list: newList,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    case ACTIONS.ROOM_RESET: {
      return {
        ...initialState,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    default:
      console.warn('[roomsStore] Unknown action type:', action.type);
      return state;
  }
}

// Action creators and handlers for external use
let dispatchRef = null;

// Provider component
export const RoomsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(roomsReducer, initialState);

  // Save dispatch reference for roomsActions
  dispatchRef = dispatch;

  return (
    <RoomsStateContext.Provider value={state}>
      <RoomsDispatchContext.Provider value={dispatch}>
        {children}
      </RoomsDispatchContext.Provider>
    </RoomsStateContext.Provider>
  );
};

// Hook to use rooms state
export const useRoomsState = () => {
  const state = useContext(RoomsStateContext);
  if (state === null) {
    throw new Error('useRoomsState must be used within a RoomsProvider');
  }
  return state;
};

// Hook to use rooms dispatch
export const useRoomsDispatch = () => {
  const dispatch = useContext(RoomsDispatchContext);
  if (dispatch === null) {
    throw new Error('useRoomsDispatch must be used within a RoomsProvider');
  }
  return dispatch;
};

// Actions object for handling events from eventBus
export const roomsActions = {
  // Main event handler called from eventBus
  handleEvent(event) {
    if (!event || !event.type || !event.payload) {
      console.warn('[roomsStore] Invalid event structure:', event);
      return;
    }

    // Only process rooms category events
    if (event.category !== "rooms") {
      return;
    }

    // Event deduplication using meta.event_id and object map
    const eventId = event.meta?.event_id;
    if (eventId) {
      // Check if already processed using store state
      if (dispatchRef && roomsActions._lastEventIds && roomsActions._lastEventIds[eventId]) {
        if (!import.meta.env.PROD) {
          console.debug('[roomsStore] Skipping duplicate event:', eventId);
        }
        return;
      }
      
      // Mark as processed
      if (!roomsActions._lastEventIds) {
        roomsActions._lastEventIds = {};
      }
      roomsActions._lastEventIds[eventId] = true;

      // Clean up old event IDs when cache > 1000 entries
      const eventIds = Object.keys(roomsActions._lastEventIds);
      if (eventIds.length > 1000) {
        const toDelete = eventIds.slice(0, 500); // Remove oldest 500
        toDelete.forEach(id => delete roomsActions._lastEventIds[id]);
      }
    }

    if (!dispatchRef) {
      console.warn('[roomsStore] Event received before store is ready:', event);
      return;
    }

    const eventType = event.type;
    const payload = event.payload;
    const roomNumber = extractRoomNumber(event);

    if (!roomNumber) {
      console.warn('[roomsStore] Could not extract room number from event:', event);
      return;
    }

    if (!import.meta.env.PROD) {
      console.log(`[roomsStore] Processing ${eventType} for room ${roomNumber}`);
    }

    switch (eventType) {
      case "room_updated":
        dispatchRef({
          type: ACTIONS.ROOM_UPSERT,
          payload: { roomSnapshot: payload, roomNumber },
        });
        break;

      default:
        if (!import.meta.env.PROD) {
          console.log("[roomsStore] Ignoring eventType:", eventType, event);
        }
        break;
    }
  },

  // Helper for bulk replace from API fetch
  bulkReplace(rooms) {
    if (!dispatchRef) {
      console.warn('[roomsStore] bulkReplace called before store is ready');
      return;
    }

    if (!import.meta.env.PROD) {
      console.log('[roomsStore] Bulk replace with', rooms?.length || 0, 'rooms');
    }

    dispatchRef({
      type: ACTIONS.ROOM_BULK_REPLACE,
      payload: { rooms: rooms || [] },
    });
  },

  // Helper for hotel switch/logout reset
  reset() {
    if (!dispatchRef) {
      return;
    }

    if (!import.meta.env.PROD) {
      console.log('[roomsStore] Resetting rooms store');
    }

    dispatchRef({
      type: ACTIONS.ROOM_RESET,
      payload: {},
    });
  },
};

// Export the store actions and constants for use in eventBus
export { ACTIONS };

// Development debug helper
if (!import.meta.env.PROD) {
  window.debugRoomsStore = () => {
    console.log('[roomsStore] Current state:', dispatchRef ? 'Store ready' : 'Store not ready');
    if (dispatchRef) {
      console.log('Event IDs processed:', Object.keys(roomsActions._lastEventIds || {}).length);
    }
  };
}