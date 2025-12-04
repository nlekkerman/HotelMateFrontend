// src/realtime/stores/bookingStore.jsx
import React, { createContext, useContext, useReducer } from 'react';

// State contexts
const BookingStateContext = createContext(null);
const BookingDispatchContext = createContext(null);

// Initial state
const initialState = {
  bookingsById: {}, // { [bookingId]: { id, guest_name, table_number, status, time_slot, ... } }
  todaysBookings: [], // Array of today's booking IDs for quick access
  lastEventTimestamps: {}, // for deduplication: { [key]: timestamp }
};

// Actions
const ACTIONS = {
  INIT_BOOKINGS_FROM_API: 'INIT_BOOKINGS_FROM_API',
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_UPDATED: 'BOOKING_UPDATED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_SEATED: 'BOOKING_SEATED',
  BOOKING_TABLE_CHANGED: 'BOOKING_TABLE_CHANGED',
};

// Helper function to check if booking is for today
const isTodaysBooking = (booking) => {
  if (!booking.date && !booking.time_slot) return false;
  
  const today = new Date();
  const bookingDate = new Date(booking.date || booking.time_slot);
  
  return bookingDate.toDateString() === today.toDateString();
};

// Reducer function
function bookingReducer(state, action) {
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

    case ACTIONS.BOOKING_CREATED: {
      const { booking } = action.payload;
      
      if (!booking || !booking.id) {
        console.warn('[bookingStore] BOOKING_CREATED: Invalid booking data', booking);
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

    case ACTIONS.BOOKING_UPDATED:
    case ACTIONS.BOOKING_SEATED:
    case ACTIONS.BOOKING_TABLE_CHANGED: {
      const { booking, bookingId } = action.payload;
      const targetBookingId = booking?.id || bookingId;
      
      if (!targetBookingId || !state.bookingsById[targetBookingId]) {
        console.warn('[bookingStore] BOOKING_UPDATED: Booking not found', targetBookingId);
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

    case ACTIONS.BOOKING_CANCELLED: {
      const { bookingId } = action.payload;
      
      if (!bookingId || !state.bookingsById[bookingId]) {
        console.warn('[bookingStore] BOOKING_CANCELLED: Booking not found', bookingId);
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
      console.warn('[bookingStore] Unknown action type:', action.type);
      return state;
  }
}

// Action creators and handlers for external use
let dispatchRef = null;

// Provider component
export const BookingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  // Save dispatch reference for bookingActions
  dispatchRef = dispatch;

  return (
    <BookingStateContext.Provider value={state}>
      <BookingDispatchContext.Provider value={dispatch}>
        {children}
      </BookingDispatchContext.Provider>
    </BookingStateContext.Provider>
  );
};

// Hook to use booking state
export const useBookingState = () => {
  const state = useContext(BookingStateContext);
  if (state === null) {
    throw new Error('useBookingState must be used within a BookingProvider');
  }
  return state;
};

// Hook to use booking dispatch
export const useBookingDispatch = () => {
  const dispatch = useContext(BookingDispatchContext);
  if (dispatch === null) {
    throw new Error('useBookingDispatch must be used within a BookingProvider');
  }
  return dispatch;
};

// Actions object for handling events from eventBus
export const bookingActions = {
  handleEvent(normalizedEvt) {
    if (!dispatchRef) {
      console.warn("[bookingStore] handleEvent called before store is ready");
      return;
    }

    const { eventType, data, timestamp, channelName } = normalizedEvt;

    // Deduplication logic
    const dedupeKey = `booking:${data?.id || data?.bookingId || 'unknown'}:${eventType}`;
    const lastTimestamp = bookingActions._lastEventTimestamps?.[dedupeKey];
    
    if (lastTimestamp && timestamp && timestamp <= lastTimestamp) {
      console.log("[bookingStore] Ignoring duplicate event:", dedupeKey, timestamp);
      return;
    }

    // Update timestamp (simple cleanup after 10 seconds)
    if (!bookingActions._lastEventTimestamps) {
      bookingActions._lastEventTimestamps = {};
    }
    bookingActions._lastEventTimestamps[dedupeKey] = timestamp;
    
    setTimeout(() => {
      if (bookingActions._lastEventTimestamps) {
        delete bookingActions._lastEventTimestamps[dedupeKey];
      }
    }, 10000);

    console.log("[bookingStore] Processing event:", eventType, data);

    switch (eventType) {
      case "booking_created":
      case "new_dinner_booking":
      case "new_booking":
        dispatchRef({
          type: ACTIONS.BOOKING_CREATED,
          payload: { booking: data },
        });
        break;

      case "booking_updated":
      case "booking_confirmed":
        dispatchRef({
          type: ACTIONS.BOOKING_UPDATED,
          payload: { booking: data, bookingId: data?.id || data?.bookingId },
        });
        break;

      case "booking_cancelled":
        dispatchRef({
          type: ACTIONS.BOOKING_CANCELLED,
          payload: { bookingId: data?.id || data?.bookingId },
        });
        break;

      case "booking_seated":
      case "table_assigned":
        dispatchRef({
          type: ACTIONS.BOOKING_SEATED,
          payload: { booking: data, bookingId: data?.id || data?.bookingId },
        });
        break;

      case "table_changed":
      case "booking_table_changed":
        dispatchRef({
          type: ACTIONS.BOOKING_TABLE_CHANGED,
          payload: { booking: data, bookingId: data?.id || data?.bookingId },
        });
        break;

      default:
        if (import.meta.env && !import.meta.env.PROD) {
          console.log("[bookingStore] Ignoring eventType:", eventType, normalizedEvt);
        }
        break;
    }
  },

  // Helper to initialize from API data
  initFromAPI(bookings) {
    if (!dispatchRef) {
      console.warn("[bookingStore] initFromAPI called before store is ready");
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