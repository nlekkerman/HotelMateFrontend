// src/realtime/stores/roomBookingStore.jsx
import React, { createContext, useContext, useReducer } from 'react';

// State contexts
const RoomBookingStateContext = createContext(null);
const RoomBookingDispatchContext = createContext(null);

// Initial state
const initialState = {
  byBookingId: {}, // { [bookingId]: booking } - Room booking objects indexed by booking_id
  list: [], // [bookingId, ...] - Newest first ordering for display
  lastEventIds: {}, // { [eventId]: true } - Deduplication via meta.event_id
};

// Actions
const ACTIONS = {
  ROOM_BOOKING_CREATED: 'ROOM_BOOKING_CREATED',
  ROOM_BOOKING_UPDATED: 'ROOM_BOOKING_UPDATED', 
  ROOM_BOOKING_PARTY_UPDATED: 'ROOM_BOOKING_PARTY_UPDATED',
  ROOM_BOOKING_CANCELLED: 'ROOM_BOOKING_CANCELLED',
  ROOM_BOOKING_CHECKED_IN: 'ROOM_BOOKING_CHECKED_IN',
  ROOM_BOOKING_CHECKED_OUT: 'ROOM_BOOKING_CHECKED_OUT',
};

// Helper function to extract booking ID from event
const extractBookingId = (event) => {
  // Priority: meta.scope.booking_id → payload.booking_id → payload.id
  return event.meta?.scope?.booking_id || 
         event.payload?.booking_id || 
         event.payload?.id;
};

// Helper function to move booking to front of list
const moveToFrontOfList = (list, bookingId) => {
  const filtered = list.filter(id => id !== bookingId);
  return [bookingId, ...filtered];
};

// Reducer function
function roomBookingReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ROOM_BOOKING_CREATED:
    case ACTIONS.ROOM_BOOKING_UPDATED:
    case ACTIONS.ROOM_BOOKING_PARTY_UPDATED:
    case ACTIONS.ROOM_BOOKING_CHECKED_IN:
    case ACTIONS.ROOM_BOOKING_CHECKED_OUT:
    case ACTIONS.ROOM_BOOKING_CANCELLED: {
      const { booking, bookingId } = action.payload;
      
      if (!bookingId) {
        console.warn('[roomBookingStore] Missing booking ID in action:', action);
        return state;
      }

      // Upsert booking (merge with existing or create new)
      const existingBooking = state.byBookingId[bookingId] || {};
      const updatedBooking = { ...existingBooking, ...booking };

      const newByBookingId = {
        ...state.byBookingId,
        [bookingId]: updatedBooking,
      };

      // Move booking to front of list (newest first)
      const newList = moveToFrontOfList(state.list, bookingId);

      return {
        ...state,
        byBookingId: newByBookingId,
        list: newList,
      };
    }

    default:
      console.warn('[roomBookingStore] Unknown action type:', action.type);
      return state;
  }
}

// Action creators and handlers for external use
let dispatchRef = null;

// Provider component
export const RoomBookingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(roomBookingReducer, initialState);

  // Save dispatch reference for roomBookingActions
  dispatchRef = dispatch;

  return (
    <RoomBookingStateContext.Provider value={state}>
      <RoomBookingDispatchContext.Provider value={dispatch}>
        {children}
      </RoomBookingDispatchContext.Provider>
    </RoomBookingStateContext.Provider>
  );
};

// Hook to use room booking state
export const useRoomBookingState = () => {
  const state = useContext(RoomBookingStateContext);
  if (state === null) {
    throw new Error('useRoomBookingState must be used within a RoomBookingProvider');
  }
  return state;
};

// Hook to use room booking dispatch
export const useRoomBookingDispatch = () => {
  const dispatch = useContext(RoomBookingDispatchContext);
  if (dispatch === null) {
    throw new Error('useRoomBookingDispatch must be used within a RoomBookingProvider');
  }
  return dispatch;
};

// Actions object for handling events from eventBus
export const roomBookingActions = {
  _processedEventIds: new Set(), // Event ID-based deduplication

  // Main event handler called from eventBus
  handleEvent(event) {
    if (!event || !event.type || !event.payload) {
      console.warn('[roomBookingStore] Invalid event structure:', event);
      return;
    }

    // Event deduplication using meta.event_id
    const eventId = event.meta?.event_id;
    if (eventId) {
      if (roomBookingActions._processedEventIds.has(eventId)) {
        console.debug('[roomBookingStore] Skipping duplicate event:', eventId);
        return;
      }
      roomBookingActions._processedEventIds.add(eventId);

      // Clean up old event IDs when cache > 1000 entries
      if (roomBookingActions._processedEventIds.size > 1000) {
        const eventIds = Array.from(roomBookingActions._processedEventIds);
        const toDelete = eventIds.slice(0, 500); // Remove oldest 500
        toDelete.forEach(id => roomBookingActions._processedEventIds.delete(id));
      }
    }

    if (!dispatchRef) {
      console.warn('[roomBookingStore] Event received before store is ready:', event);
      return;
    }

    const eventType = event.type;
    const payload = event.payload;
    const bookingId = extractBookingId(event);

    if (!bookingId) {
      console.warn('[roomBookingStore] Could not extract booking ID from event:', event);
      return;
    }

    console.log(`[roomBookingStore] Processing ${eventType} for booking ${bookingId}`);

    switch (eventType) {
      case "booking_created":
        dispatchRef({
          type: ACTIONS.ROOM_BOOKING_CREATED,
          payload: { booking: payload, bookingId },
        });
        break;

      case "booking_updated":
        dispatchRef({
          type: ACTIONS.ROOM_BOOKING_UPDATED,
          payload: { booking: payload, bookingId },
        });
        break;

      case "booking_party_updated":
        dispatchRef({
          type: ACTIONS.ROOM_BOOKING_PARTY_UPDATED,
          payload: { booking: payload, bookingId },
        });
        break;

      case "booking_cancelled":
        dispatchRef({
          type: ACTIONS.ROOM_BOOKING_CANCELLED,
          payload: { booking: payload, bookingId },
        });
        break;

      case "booking_checked_in":
        dispatchRef({
          type: ACTIONS.ROOM_BOOKING_CHECKED_IN,
          payload: { booking: payload, bookingId },
        });
        break;

      case "booking_checked_out":
        dispatchRef({
          type: ACTIONS.ROOM_BOOKING_CHECKED_OUT,
          payload: { booking: payload, bookingId },
        });
        break;

      // Healing events - console.debug only per backend contract
      case "integrity_healed":
      case "party_healed":
      case "guests_healed":
        console.debug(`[roomBookingStore] Healing event received (ignored): ${eventType}`, event);
        break;

      default:
        if (import.meta.env && !import.meta.env.PROD) {
          console.log("[roomBookingStore] Ignoring eventType:", eventType, event);
        }
        break;
    }
  },
};

// Export the store actions and constants for use in eventBus
export { ACTIONS };