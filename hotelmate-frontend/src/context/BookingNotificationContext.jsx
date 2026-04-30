// src/context/BookingNotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useCan } from "@/rbac";
import { toast } from "react-toastify";
import api from "@/services/api";
import { useServiceBookingState } from "@/realtime/stores/serviceBookingStore";
import { showNotification, canShowNotifications } from "@/utils/notificationUtils";

const BookingNotificationContext = createContext();

export const BookingNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { hasNavAccess, isSuperUser } = usePermissions();
  // Backend RBAC: marking restaurant bookings seen is gated by
  // `restaurant_bookings.record_mark_seen`.
  const { can } = useCan();
  const canMarkSeen = can("restaurant_bookings", "record_mark_seen");
  const bookingState = useServiceBookingState();
  const [hasNewBooking, setHasNewBooking] = useState(false);
  const [lastSeenBookingCount, setLastSeenBookingCount] = useState(0);

  // Get all bookings from store
  const allBookings = Object.values(bookingState.bookingsById);
  const bookingNotifications = allBookings.slice(0, 10); // Show latest 10 for notifications

  // Eligibility is driven purely by canonical backend permission output — any user
  // whose effective_navs grants restaurant or room-bookings visibility receives
  // dinner-booking notifications. No role-name / department-string parsing.
  const isEligibleForNotifications = useCallback(() => {
    if (!user) return false;
    if (isSuperUser) return true;
    return hasNavAccess('restaurant_bookings') || hasNavAccess('room_bookings');
  }, [user, isSuperUser, hasNavAccess]);
  
  // Monitor store for new bookings and trigger notifications
  useEffect(() => {
    if (!isEligibleForNotifications()) return;
    
    const currentBookingCount = allBookings.length;
    
    // If we have more bookings than before, check for new ones
    if (currentBookingCount > lastSeenBookingCount && lastSeenBookingCount > 0) {
      // Get bookings created recently (within last 30 seconds)
      const recentThreshold = new Date(Date.now() - 30000);
      const newBookings = allBookings.filter(booking => {
        const createdAt = new Date(booking.created_at || booking.timestamp);
        return createdAt > recentThreshold;
      });
      
      newBookings.forEach(booking => {
        handleNewDinnerBooking(booking);
      });
    }
    
    setLastSeenBookingCount(currentBookingCount);
  }, [allBookings.length, isEligibleForNotifications, lastSeenBookingCount]);

  const handleNewDinnerBooking = (booking) => {
    setHasNewBooking(true);

    // Show toast notification
    toast.info(
      `New Dinner Booking - ${booking.total_guests} guests at ${booking.start_time}`,
      {
        autoClose: 5000,
        onClick: () => {
          window.location.href = `/staff/hotel/${user.hotel_slug}/room-bookings`;
        },
      }
    );

    // Browser notification
    if (canShowNotifications()) {
      showNotification("New Dinner Booking!", {
        body: `Room ${booking.room_number} - ${booking.total_guests} guests at ${booking.start_time}`,
        icon: "/favicons/favicon.svg",
        tag: `booking-${booking.booking_id}`,
      }).then(notification => {
        if (notification && notification.onclick !== undefined) {
          notification.onclick = () => {
            window.focus();
            window.location.href = `/staff/hotel/${user.hotel_slug}/room-bookings`;
          };
        }
      }).catch(console.error);
    }
  };

  const markAllBookingRead = async () => {
    if (!user?.hotel_slug) return;
    // RBAC short-circuit — backend will 403 anyway, but we avoid the round-trip
    // and keep the unread badge visible for users without `record_mark_seen`.
    if (!canMarkSeen) return;

    try {
      await api.post(`/bookings/mark-seen/${user.hotel_slug}/`);
      setHasNewBooking(false);
    } catch (err) {
      console.error("Failed to mark bookings as read:", err);
    }
  };

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <BookingNotificationContext.Provider
      value={{
        bookingNotifications,
        hasNewBooking,
        markAllBookingRead,
      }}
    >
      {children}
    </BookingNotificationContext.Provider>
  );
};

export const useBookingNotifications = () =>
  useContext(BookingNotificationContext);
