import { useEffect } from "react";
import Pusher from "pusher-js";

export function useBookingNotifications(staffId, hotelSlug, onNewBooking) {
  useEffect(() => {
    if (!staffId || !hotelSlug) return;

    const pusher = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
      cluster: process.env.REACT_APP_PUSHER_CLUSTER,
      forceTLS: true,
    });

    const channelName = `${hotelSlug}-staff-${staffId}-bookings`;
    const channel = pusher.subscribe(channelName);

    channel.bind("new-dinner-booking", (data) => {
      console.log("🍽️ New booking notification:", data);

      // Fire callback so consuming component can react
      if (onNewBooking) {
        onNewBooking(data);
      }
    });

    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [staffId, hotelSlug, onNewBooking]);
}
