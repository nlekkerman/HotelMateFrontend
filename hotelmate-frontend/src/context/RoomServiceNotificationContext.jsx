// src/context/RoomServiceNotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { useRoomServiceState } from "@/realtime/stores/roomServiceStore";
import { showNotification, canShowNotifications } from "@/utils/notificationUtils";

const RoomServiceNotificationContext = createContext();

export const RoomServiceNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const roomServiceState = useRoomServiceState();
  const [hasNewRoomService, setHasNewRoomService] = useState(false);
  const [hasNewBreakfast, setHasNewBreakfast] = useState(false);
  const [lastSeenOrderCount, setLastSeenOrderCount] = useState(0);
  
  // Get all orders from store
  const allOrders = Object.values(roomServiceState.ordersById);
  const roomServiceOrders = allOrders.filter(order => order.type !== 'breakfast');
  const breakfastOrders = allOrders.filter(order => order.type === 'breakfast');
  
  // Check if user is eligible for room service notifications based on department/role
  const isEligibleForNotifications = useCallback(() => {
    if (!user?.department && !user?.role) return false;
    
    const deptSlug = user.department?.toLowerCase().replace(/ /g, '-').replace(/&/g, 'and');
    const roleSlug = user.role?.toLowerCase().replace(/ /g, '_');
    
    // Kitchen department receives room service and breakfast orders
    if (deptSlug === "kitchen" || deptSlug === "food-and-beverage") {
      return true;
    }
    
    // Porter and room service waiters receive delivery notifications
    if (roleSlug === "porter" || roleSlug === "room_service_waiter") {
      return true;
    }
    
    return false;
  }, [user?.department, user?.role]);
  
  // Monitor store for new orders and trigger notifications
  useEffect(() => {
    if (!isEligibleForNotifications()) return;
    
    const currentOrderCount = allOrders.length;
    
    // If we have more orders than before, check for new ones
    if (currentOrderCount > lastSeenOrderCount && lastSeenOrderCount > 0) {
      // Get orders created recently (within last 30 seconds)
      const recentThreshold = new Date(Date.now() - 30000);
      const newOrders = allOrders.filter(order => {
        const createdAt = new Date(order.created_at || order.timestamp);
        return createdAt > recentThreshold;
      });
      
      newOrders.forEach(order => {
        if (order.type === 'breakfast') {
          handleNewBreakfastOrder(order);
        } else {
          handleNewRoomServiceOrder(order);
        }
      });
    }
    
    setLastSeenOrderCount(currentOrderCount);
  }, [allOrders.length, isEligibleForNotifications, lastSeenOrderCount]);

  // Handler for new room service orders
  const handleNewRoomServiceOrder = async (data) => {
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
    if (canShowNotifications()) {
      const notification = await showNotification("New Room Service Order", {
        body: `Room ${data.room_number} - €${data.total_price}`,
        icon: "/favicons/favicon.svg",
        tag: `room-service-${data.order_id}`,
        data: {
          url: `/${user.hotel_slug}/room-service-orders`
        }
      });

      if (notification && notification.onclick !== undefined) {
        notification.onclick = () => {
          window.focus();
          window.location.href = `/${user.hotel_slug}/room-service-orders`;
        };
      }
    }
    }

    // Play notification sound (optional)
    playNotificationSound();
  };

  // Handler for new breakfast orders
  const handleNewBreakfastOrder = (data) => {
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
      });
    } catch (err) {
      // Error playing notification sound
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
      Notification.requestPermission();
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
