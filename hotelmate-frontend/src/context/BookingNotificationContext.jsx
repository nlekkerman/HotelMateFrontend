import { createContext, useContext, useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import { useAuth } from "@/context/AuthContext";

const BookingNotificationContext = createContext(null);

export const BookingNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [bookingNotifications, setBookingNotifications] = useState([]);
  const [bookingUnreadCount, setBookingUnreadCount] = useState(0);
  const pusherRef = useRef(null);

  useEffect(() => {
    if (!user?.hotel_slug) return;

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });
    pusherRef.current = pusher;

    const channel = pusher.subscribe(`${user.hotel_slug}-bookings`);
    channel.bind("new-booking", (booking) => {
      setBookingNotifications((prev) => [booking, ...prev]);
      setBookingUnreadCount((prev) => prev + 1);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`${user.hotel_slug}-bookings`);
      pusher.disconnect();
    };
  }, [user?.hotel_slug]);

  const markAllBookingRead = () => setBookingUnreadCount(0);

  const contextValue = {
    bookingNotifications,
    bookingUnreadCount,
    markAllBookingRead,
  };

  return (
    <BookingNotificationContext.Provider value={contextValue}>
      {children}
    </BookingNotificationContext.Provider>
  );
};

// Separate hook function declaration (avoid inline export)
function useBookingNotificationsHook() {
  return useContext(BookingNotificationContext);
}

// Export separately to make HMR happy
export { useBookingNotificationsHook as useBookingNotifications };
