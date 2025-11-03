// src/context/RoomServiceNotificationContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import Pusher from "pusher-js";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import api from "@/services/api";

const RoomServiceNotificationContext = createContext();

export const RoomServiceNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [roomServiceOrders, setRoomServiceOrders] = useState([]);
  const [breakfastOrders, setBreakfastOrders] = useState([]);
  const [hasNewRoomService, setHasNewRoomService] = useState(false);
  const [hasNewBreakfast, setHasNewBreakfast] = useState(false);
  
  const pusherRef = useRef(null);
  const channelsRef = useRef(new Set());

  // Initialize Pusher and subscribe to channels
  useEffect(() => {
    if (!user?.hotel_slug || !user?.id) {
      console.log("⚠️ No user or hotel slug - skipping Pusher setup");
      return;
    }

    console.log("� User Data:", user);
    console.log("� Department:", user.department);
    console.log("🔍 Role:", user.role);
    
    // Check if user is on duty (you may need to add this field to your user object)
    // For now, we'll subscribe regardless since we don't have is_on_duty in the user object
    
    console.log("✅ Initializing Room Service Pusher notifications...");

    // Initialize Pusher
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      forceTLS: true,
    });
    pusherRef.current = pusher;

    pusher.connection.bind("connected", () => {
      console.log("✅ Pusher connected for room service notifications");
    });

    pusher.connection.bind("error", (err) => {
      console.error("❌ Pusher connection error:", err);
    });

    const hotelSlug = user.hotel_slug;
    const staffId = user.staff_id || user.id;

    console.log("🔍 Hotel Slug:", hotelSlug);
    console.log("🔍 Staff ID:", staffId);

    // Convert department string to slug format
    const deptSlug = user.department?.toLowerCase().replace(/ /g, '-').replace(/&/g, 'and');
    const roleSlug = user.role?.toLowerCase().replace(/ /g, '_');

    console.log("🔍 Department Slug:", deptSlug);
    console.log("🔍 Role Slug:", roleSlug);

    // Subscribe to department-based channel
    if (deptSlug) {
      const deptChannelName = `${hotelSlug}-staff-${staffId}-${deptSlug}`;
      
      console.log(`📡 Subscribing to department channel: ${deptChannelName}`);
      const deptChannel = pusher.subscribe(deptChannelName);
      channelsRef.current.add(deptChannelName);

      // Kitchen department receives room service and breakfast orders
      if (deptSlug === "kitchen") {
        console.log("🍳 Binding to kitchen events: new-room-service-order, new-breakfast-order");
        deptChannel.bind("new-room-service-order", handleNewRoomServiceOrder);
        deptChannel.bind("new-breakfast-order", handleNewBreakfastOrder);
      }
      
      // Food and Beverage might also get orders in some cases
      if (deptSlug === "food-and-beverage") {
        console.log("🍽️ Binding to F&B events (if configured)");
        deptChannel.bind("new-room-service-order", handleNewRoomServiceOrder);
        deptChannel.bind("new-breakfast-order", handleNewBreakfastOrder);
      }
    }

    // Subscribe to role-based channel
    if (roleSlug) {
      const roleChannelName = `${hotelSlug}-staff-${staffId}-${roleSlug}`;
      
      console.log(`📡 Subscribing to role channel: ${roleChannelName}`);
      const roleChannel = pusher.subscribe(roleChannelName);
      channelsRef.current.add(roleChannelName);

      // Porter and room service waiters receive delivery notifications
      if (roleSlug === "porter" || roleSlug === "room_service_waiter") {
        console.log(`👔 Binding to ${roleSlug} events: new-room-service-order, new-breakfast-order`);
        roleChannel.bind("new-room-service-order", handleNewRoomServiceOrder);
        roleChannel.bind("new-breakfast-order", handleNewBreakfastOrder);
      }
    }

    return () => {
      console.log("🧹 Cleaning up Room Service Pusher subscriptions...");
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

  // Handler for new room service orders
  const handleNewRoomServiceOrder = (data) => {
    console.log("📦 New room service order received:", data);
    
    setRoomServiceOrders((prev) => [data, ...prev]);
    setHasNewRoomService(true);

    // Show toast notification
    toast.info(
      `New Room Service Order - Room ${data.room_number}`,
      {
        autoClose: 5000,
        onClick: () => {
          // Navigate to room service orders page
          window.location.href = `/${user.hotel_slug}/room-service-orders`;
        },
      }
    );

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      // Use service worker registration if available
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification("New Room Service Order", {
            body: `Room ${data.room_number} - €${data.total_price}`,
            icon: "/favicon-32x32.png",
            tag: `room-service-${data.order_id}`,
            data: {
              url: `/${user.hotel_slug}/room-service-orders`
            }
          });
        });
      } else {
        // Fallback for browsers without service worker
        const notification = new Notification("New Room Service Order", {
          body: `Room ${data.room_number} - €${data.total_price}`,
          icon: "/favicon-32x32.png",
          tag: `room-service-${data.order_id}`,
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/${user.hotel_slug}/room-service-orders`;
        };
      }
    }

    // Play notification sound (optional)
    playNotificationSound();
  };

  // Handler for new breakfast orders
  const handleNewBreakfastOrder = (data) => {
    console.log("🍳 New breakfast order received:", data);
    
    setBreakfastOrders((prev) => [data, ...prev]);
    setHasNewBreakfast(true);

    // Show toast notification
    toast.info(
      `New Breakfast Order - Room ${data.room_number} at ${data.delivery_time}`,
      {
        autoClose: 5000,
        onClick: () => {
          window.location.href = `/${user.hotel_slug}/breakfast-orders`;
        },
      }
    );

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      // Use service worker registration if available
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification("New Breakfast Order", {
            body: `Room ${data.room_number} - Delivery: ${data.delivery_time}`,
            icon: "/favicon-32x32.png",
            tag: `breakfast-${data.order_id}`,
            data: {
              url: `/${user.hotel_slug}/breakfast-orders`
            }
          });
        });
      } else {
        // Fallback for browsers without service worker
        const notification = new Notification("New Breakfast Order", {
          body: `Room ${data.room_number} - Delivery: ${data.delivery_time}`,
          icon: "/favicon-32x32.png",
          tag: `breakfast-${data.order_id}`,
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/${user.hotel_slug}/breakfast-orders`;
        };
      }
    }

    // Play notification sound
    playNotificationSound();
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch((err) => {
        // Autoplay might be blocked by browser
        console.log("Could not play notification sound:", err);
      });
    } catch (err) {
      console.error("Error playing notification sound:", err);
    }
  };

  // Mark room service notifications as read
  const markRoomServiceRead = () => {
    setHasNewRoomService(false);
  };

  // Mark breakfast notifications as read
  const markBreakfastRead = () => {
    setHasNewBreakfast(false);
  };

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  const value = {
    roomServiceOrders,
    breakfastOrders,
    hasNewRoomService,
    hasNewBreakfast,
    markRoomServiceRead,
    markBreakfastRead,
  };

  return (
    <RoomServiceNotificationContext.Provider value={value}>
      {children}
    </RoomServiceNotificationContext.Provider>
  );
};

export const useRoomServiceNotifications = () => {
  const context = useContext(RoomServiceNotificationContext);
  if (!context) {
    throw new Error(
      "useRoomServiceNotifications must be used within RoomServiceNotificationProvider"
    );
  }
  return context;
};
