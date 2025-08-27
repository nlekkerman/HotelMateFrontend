// src/context/BookingNotificationContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { useAuth } from "@/context/AuthContext";

const BookingNotificationContext = createContext();

export const BookingNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [bookingNotifications, setBookingNotifications] = useState([]);
  const [hasNewBooking, setHasNewBooking] = useState(false);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user?.hotel_slug || !user?.id) return;

    // Initialize Pusher
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });
    pusherRef.current = pusher;

    const channelName = `${user.hotel_slug}-staff-${user.id}-bookings`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("new-dinner-booking", (booking) => {
      console.log("🍽️ Booking received:", booking);
      setBookingNotifications((prev) => [booking, ...prev]);
      setHasNewBooking(true);

      // Optional browser notification
      if (Notification.permission === "granted") {
        new Notification("New Booking!", {
          body: `Room ${booking.room_number} at ${booking.restaurant}`,
        });
      }
    });

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelName);
      }
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [user?.hotel_slug, user?.id]);

  const markAllBookingRead = async () => {
    if (!user?.hotel_slug) return;

    try {
      await fetch(`/api/bookings/mark-seen/${user.hotel_slug}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setHasNewBooking(false); // update local state after successful server call
    } catch (err) {
      console.error("Failed to mark bookings as seen:", err);
    }
  };

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
