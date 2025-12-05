// src/context/BookingNotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import api from "@/services/api";
import { useBookingState } from "@/realtime/stores/bookingStore";
import { showNotification, canShowNotifications } from "@/utils/notificationUtils";

const BookingNotificationContext = createContext();

export const BookingNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const bookingState = useBookingState();
  const [hasNewBooking, setHasNewBooking] = useState(false);
  const [lastSeenBookingCount, setLastSeenBookingCount] = useState(0);
  
  // Get all bookings from store
  const allBookings = Object.values(bookingState.bookingsById);
  const bookingNotifications = allBookings.slice(0, 10); // Show latest 10 for notifications
  
  // Check if user is eligible for booking notifications based on department/role
  const isEligibleForNotifications = useCallback(() => {
    if (!user?.department && !user?.role) return false;
    
    const deptSlug = user.department?.toLowerCase().replace(/ /g, '-').replace(/&/g, 'and');
    const roleSlug = user.role?.toLowerCase().replace(/ /g, '_');
    
    // Food & Beverage department receives booking notifications
    if (deptSlug === "food-and-beverage") {
      return true;
    }
    
    // Roles that should receive booking notifications
    const bookingRoles = ["receptionist", "manager", "food_and_beverage_manager"];
    if (roleSlug && bookingRoles.includes(roleSlug)) {
      return true;
    }
    
    return false;
  }, [user?.department, user?.role]);
  
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

  const handleNewDinnerBooking = async (booking) => {
    console.log("🍽️ New dinner booking received:", booking);
    
    setHasNewBooking(true);

    // Show toast notification
    toast.info(
      `New Dinner Booking - ${booking.total_guests} guests at ${booking.start_time}`,
      {
        autoClose: 5000,
        onClick: () => {
          window.location.href = `/${user.hotel_slug}/bookings`;
        },
      }
    );

    // Browser notification
    if (canShowNotifications()) {
      const notification = await showNotification("New Dinner Booking!", {
        body: `Room ${booking.room_number} - ${booking.total_guests} guests at ${booking.start_time}`,
        icon: "/favicons/favicon.svg",
        tag: `booking-${booking.booking_id}`,
      });

      if (notification && notification.onclick !== undefined) {
        notification.onclick = () => {
          window.focus();
          window.location.href = `/${user.hotel_slug}/bookings`;
        };
      }
    }
  };

  const markAllBookingRead = async () => {
    if (!user?.hotel_slug) return;

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
      Notification.requestPermission().then((permission) => {
        console.log("Booking notification permission:", permission);
      });
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
