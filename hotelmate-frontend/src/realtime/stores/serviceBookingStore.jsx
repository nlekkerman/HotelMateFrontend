// src/realtime/stores/serviceBookingStore.jsx
// Service bookings for restaurant/porter/trips (NOT room bookings)
import React, { createContext, useContext, useReducer } from 'react';

// State contexts
const ServiceBookingStateContext = createContext(null);
const ServiceBookingDispatchContext = createContext(null);

// Initial state
const initialState = {
  bookingsById: {}, // { [bookingId]: { id, guest_name, table_number, status, time_slot, ... } }
  todaysBookings: [], // Array of today's booking IDs for quick access
  lastEventTimestamps: {}, // for deduplication: { [key]: timestamp }
};

// Actions
const ACTIONS = {
  INIT_BOOKINGS_FROM_API: 'INIT_BOOKINGS_FROM_API',
  SERVICE_BOOKING_CREATED: 'SERVICE_BOOKING_CREATED',
  SERVICE_BOOKING_UPDATED: 'SERVICE_BOOKING_UPDATED',
  SERVICE_BOOKING_CANCELLED: 'SERVICE_BOOKING_CANCELLED',
  SERVICE_BOOKING_SEATED: 'SERVICE_BOOKING_SEATED',
  SERVICE_BOOKING_TABLE_CHANGED: 'SERVICE_BOOKING_TABLE_CHANGED',
};

// Helper function to check if booking is for today
const isTodaysBooking = (booking) => {
  if (!booking.date && !booking.time_slot) return false;
  
  const today = new Date();
  const bookingDate = new Date(booking.date || booking.time_slot);
  
  return bookingDate.toDateString() === today.toDateString();
};

// Reducer function
function serviceBookingReducer(state, action) {
  switch (action.type) {
    case ACTIONS.INIT_BOOKINGS_FROM_API: {
      const { bookings } = action.payload;
      
      // Convert bookings array to bookingsById map
      let bookingsById = {};
      let todaysBookings = [];
      
      if (Array.isArray(bookings)) {
        bookings.forEach(booking => {
          if (booking && booking.id) {
            bookingsById[booking.id] = booking;
            
            // Track today's bookings for quick access
            if (isTodaysBooking(booking)) {
              todaysBookings.push(booking.id);
            }
          }
        });
      }

      return {
        ...state,
        bookingsById: { ...state.bookingsById, ...bookingsById },
        todaysBookings,
      };
    }

    case ACTIONS.SERVICE_BOOKING_CREATED: {
      const { booking } = action.payload;
      
      if (!booking || !booking.id) {
        console.warn('[serviceBookingStore] SERVICE_BOOKING_CREATED: Invalid booking data', booking);
        return state;
      }

      const newBookingsById = {
        ...state.bookingsById,
        [booking.id]: booking,
      };

      // Add to today's bookings if applicable
      const newTodaysBookings = [...state.todaysBookings];
      if (isTodaysBooking(booking) && !newTodaysBookings.includes(booking.id)) {
        newTodaysBookings.push(booking.id);
      }

      return {
        ...state,
        bookingsById: newBookingsById,
        todaysBookings: newTodaysBookings,
      };
    }

    case ACTIONS.SERVICE_BOOKING_UPDATED:
    case ACTIONS.SERVICE_BOOKING_SEATED:
    case ACTIONS.SERVICE_BOOKING_TABLE_CHANGED: {
      const { booking, bookingId } = action.payload;
      const targetBookingId = booking?.id || bookingId;
      
      if (!targetBookingId || !state.bookingsById[targetBookingId]) {
        console.warn('[serviceBookingStore] SERVICE_BOOKING_UPDATED: Booking not found', targetBookingId);
        return state;
      }

      const existingBooking = state.bookingsById[targetBookingId];
      const updatedBooking = booking ? { ...existingBooking, ...booking } : existingBooking;

      const newBookingsById = {
        ...state.bookingsById,
        [targetBookingId]: updatedBooking,
      };

      // Update today's bookings list based on updated date
      let newTodaysBookings = [...state.todaysBookings];
      const isTodaysBookingNow = isTodaysBooking(updatedBooking);
      const isCurrentlyTodays = newTodaysBookings.includes(targetBookingId);

      if (isTodaysBookingNow && !isCurrentlyTodays) {
        newTodaysBookings.push(targetBookingId);
      } else if (!isTodaysBookingNow && isCurrentlyTodays) {
        newTodaysBookings = newTodaysBookings.filter(id => id !== targetBookingId);
      }

      return {
        ...state,
        bookingsById: newBookingsById,
        todaysBookings: newTodaysBookings,
      };
    }

    case ACTIONS.SERVICE_BOOKING_CANCELLED: {
      const { bookingId } = action.payload;
      
      if (!bookingId || !state.bookingsById[bookingId]) {
        console.warn('[serviceBookingStore] SERVICE_BOOKING_CANCELLED: Booking not found', bookingId);
        return state;
      }

      // Mark as cancelled instead of deleting
      const cancelledBooking = {
        ...state.bookingsById[bookingId],
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      };

      const newBookingsById = {
        ...state.bookingsById,
        [bookingId]: cancelledBooking,
      };

      return {
        ...state,
        bookingsById: newBookingsById,
      };
    }

    default:
      console.warn('[serviceBookingStore] Unknown action type:', action.type);
      return state;
  }
}

// Action creators and handlers for external use
let dispatchRef = null;

// Provider component
export const ServiceBookingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(serviceBookingReducer, initialState);

  // Save dispatch reference for serviceBookingActions
  dispatchRef = dispatch;

  return (
    <ServiceBookingStateContext.Provider value={state}>
      <ServiceBookingDispatchContext.Provider value={dispatch}>
        {children}
      </ServiceBookingDispatchContext.Provider>
    </ServiceBookingStateContext.Provider>
  );
};

// Hook to use service booking state
export const useServiceBookingState = () => {
  const state = useContext(ServiceBookingStateContext);
  if (state === null) {
    throw new Error('useServiceBookingState must be used within a ServiceBookingProvider');
  }
  return state;
};

// Hook to use service booking dispatch
export const useServiceBookingDispatch = () => {
  const dispatch = useContext(ServiceBookingDispatchContext);
  if (dispatch === null) {
    throw new Error('useServiceBookingDispatch must be used within a ServiceBookingProvider');
  }
  return dispatch;
};

// Actions object for handling events from eventBus
export const serviceBookingActions = {
  _processedEventIds: new Set(), // Event ID-based deduplication

  handleEvent(event) {
    if (!dispatchRef) {
      console.warn("[serviceBookingStore] handleEvent called before store is ready");
      return;
    }

    // ✅ Handle unified backend event format {category, type, payload, meta}
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
      deduplicationKey = eventId;
    } else {
      deduplicationKey = `service_booking:${payload?.booking_id || payload?.id || 'unknown'}:${eventType}`;
    }

    if (serviceBookingActions._processedEventIds.has(deduplicationKey)) {
      console.log("[serviceBookingStore] Duplicate event detected, skipping:", deduplicationKey);
      return;
    }

    // Store event ID to prevent duplicates
    serviceBookingActions._processedEventIds.add(deduplicationKey);

    // Clean up old event IDs (keep only last 1000)
    if (serviceBookingActions._processedEventIds.size > 1000) {
      const eventIds = Array.from(serviceBookingActions._processedEventIds);
      const toDelete = eventIds.slice(0, 500);
      toDelete.forEach(id => serviceBookingActions._processedEventIds.delete(id));
    }

    console.log("[serviceBookingStore] Processing event:", eventType, payload);

    // ✅ Handle events from the guide
    switch (eventType) {
      case "booking_created":
        dispatchRef({
          type: ACTIONS.SERVICE_BOOKING_CREATED,
          payload: { booking: payload },
        });
        break;

      case "booking_updated":
        dispatchRef({
          type: ACTIONS.SERVICE_BOOKING_UPDATED,
          payload: { booking: payload, bookingId: payload?.booking_id || payload?.id },
        });
        break;

      case "booking_cancelled":
        dispatchRef({
          type: ACTIONS.SERVICE_BOOKING_CANCELLED,
          payload: { bookingId: payload?.booking_id || payload?.id },
        });
        break;

      // Legacy event types (for backward compatibility)
      case "new_dinner_booking":
      case "new_booking":
        dispatchRef({
          type: ACTIONS.SERVICE_BOOKING_CREATED,
          payload: { booking: payload },
        });
        break;

      case "booking_confirmed":
        dispatchRef({
          type: ACTIONS.SERVICE_BOOKING_UPDATED,
          payload: { booking: payload, bookingId: payload?.id || payload?.bookingId },
        });
        break;

      case "booking_seated":
      case "table_assigned":
        dispatchRef({
          type: ACTIONS.SERVICE_BOOKING_SEATED,
          payload: { booking: payload, bookingId: payload?.id || payload?.bookingId },
        });
        break;

      case "table_changed":
      case "booking_table_changed":
        dispatchRef({
          type: ACTIONS.SERVICE_BOOKING_TABLE_CHANGED,
          payload: { booking: payload, bookingId: payload?.id || payload?.bookingId },
        });
        break;

      default:
        if (import.meta.env && !import.meta.env.PROD) {
          console.log("[serviceBookingStore] Ignoring eventType:", eventType, event);
        }
        break;
    }
  },

  // Helper to initialize from API data
  initFromAPI(bookings) {
    if (!dispatchRef) {
      console.warn("[serviceBookingStore] initFromAPI called before store is ready");
      return;
    }
    
    dispatchRef({
      type: ACTIONS.INIT_BOOKINGS_FROM_API,
      payload: { bookings }
    });
  },
};

// Export the store actions for use in eventBus
export { ACTIONS };