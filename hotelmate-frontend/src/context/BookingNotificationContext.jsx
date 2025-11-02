// src/context/BookingNotificationContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import Pusher from "pusher-js";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import api from "@/services/api";

const BookingNotificationContext = createContext();

export const BookingNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [bookingNotifications, setBookingNotifications] = useState([]);
  const [hasNewBooking, setHasNewBooking] = useState(false);
  const pusherRef = useRef(null);
  const channelsRef = useRef(new Set());

  useEffect(() => {
    if (!user?.hotel_slug || !user?.id) {
      console.log("⚠️ Bookings: No user or hotel slug - skipping Pusher setup");
      return;
    }

    console.log("✅ Initializing Booking Pusher notifications...");

    // Initialize Pusher
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      forceTLS: true,
    });
    pusherRef.current = pusher;

    pusher.connection.bind("connected", () => {
      console.log("✅ Pusher connected for booking notifications");
    });

    pusher.connection.bind("error", (err) => {
      console.error("❌ Pusher booking connection error:", err);
    });

    const hotelSlug = user.hotel_slug;
    const staffId = user.staff_id || user.id;

    // Convert department string to slug format
    const deptSlug = user.department?.toLowerCase().replace(/ /g, '-').replace(/&/g, 'and');
    const roleSlug = user.role?.toLowerCase().replace(/ /g, '_');

    console.log("🔍 Bookings - Department Slug:", deptSlug);
    console.log("🔍 Bookings - Role Slug:", roleSlug);

    // Subscribe to department-based channel for Food & Beverage staff
    if (deptSlug === "food-and-beverage") {
      const channelName = `${hotelSlug}-staff-${staffId}-food-and-beverage`;
      console.log(`📡 Subscribing to F&B department channel: ${channelName}`);
      
      const channel = pusher.subscribe(channelName);
      channelsRef.current.add(channelName);

      channel.bind("new-dinner-booking", handleNewDinnerBooking);
    }

    // Subscribe to role-based channel for specific roles
    if (roleSlug) {
      // Roles that should receive booking notifications
      const bookingRoles = ["receptionist", "manager", "food_and_beverage_manager"];
      
      if (bookingRoles.includes(roleSlug)) {
        const channelName = `${hotelSlug}-staff-${staffId}-${roleSlug}`;
        console.log(`📡 Subscribing to role channel: ${channelName}`);
        
        const channel = pusher.subscribe(channelName);
        channelsRef.current.add(channelName);

        channel.bind("new-dinner-booking", handleNewDinnerBooking);
      }
    }

    return () => {
      console.log("Cleaning up Booking Pusher subscriptions...");
      channelsRef.current.forEach((channelName) => {
        const channel = pusher.channel(channelName);
        if (channel) {
          channel.unbind_all();
          pusher.unsubscribe(channelName);
        }
      });
      channelsRef.current.clear();
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [user?.hotel_slug, user?.id, user?.department, user?.role]);

  const handleNewDinnerBooking = (booking) => {
    console.log("🍽️ New dinner booking received:", booking);
    
    setBookingNotifications((prev) => [booking, ...prev]);
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
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("New Dinner Booking!", {
        body: `Room ${booking.room_number} - ${booking.total_guests} guests at ${booking.start_time}`,
        icon: "/favicon-32x32.png",
        tag: `booking-${booking.booking_id}`,
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = `/${user.hotel_slug}/bookings`;
      };
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
