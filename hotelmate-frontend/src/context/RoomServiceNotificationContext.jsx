// src/context/RoomServiceNotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "react-toastify";
import { useRoomServiceState } from "@/realtime/stores/roomServiceStore";
import { showNotification, canShowNotifications } from "@/utils/notificationUtils";

const RoomServiceNotificationContext = createContext();

export const RoomServiceNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { hasNavAccess, isSuperUser } = usePermissions();
  const roomServiceState = useRoomServiceState();
  const [hasNewRoomService, setHasNewRoomService] = useState(false);
  const [hasNewBreakfast, setHasNewBreakfast] = useState(false);
  const [lastSeenOrderCount, setLastSeenOrderCount] = useState(0);
  
  // Get all orders from store
  const allOrders = Object.values(roomServiceState.ordersById);
  const roomServiceOrders = allOrders.filter(order => order.type !== 'breakfast');
  const breakfastOrders = allOrders.filter(order => order.type === 'breakfast');

  // Eligibility is backend-driven: any user granted the room_services module gets
  // order notifications. No hardcoded department / role-name strings.
  const isEligibleForNotifications = useCallback(() => {
    if (!user) return false;
    if (isSuperUser) return true;
    return hasNavAccess('room_services');
  }, [user, isSuperUser, hasNavAccess]);
  
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
  const handleNewRoomServiceOrder = (data) => {
    setHasNewRoomService(true);

    // Enhanced notification messages based on order status
    const getOrderMessage = (orderData) => {
      if (orderData.status === 'pending') {
        return `New Room Service Order - Room ${orderData.room_number} (€${orderData.total_price})`;
      } else if (orderData.status === 'accepted') {
        return `Room Service Order Accepted - Room ${orderData.room_number}`;
      } else if (orderData.status === 'completed') {
        return `Room Service Order Ready - Room ${orderData.room_number}`;
      }
      return `Room Service Order Update - Room ${orderData.room_number}`;
    };

    // Show toast notification
    toast.info(
      getOrderMessage(data),
      {
        autoClose: 5000,
        onClick: () => {
          // Navigate to the canonical Room Services hub (orders tab)
          window.location.href = `/room_services/${user.hotel_slug}`;
        },
      }
    );

    // Browser notification
    if (canShowNotifications()) {
      showNotification("New Room Service Order", {
        body: `Room ${data.room_number} - €${data.total_price}`,
        icon: "/favicons/favicon.svg",
        tag: `room-service-${data.order_id}`,
        data: {
          url: `/room_services/${user.hotel_slug}`
        }
      }).then(notification => {
        if (notification && notification.onclick !== undefined) {
          notification.onclick = () => {
            window.focus();
            window.location.href = `/room_services/${user.hotel_slug}`;
          };
        }
      }).catch(console.error);
    }

    // Play notification sound (optional)
    playNotificationSound();
  };

  // Handler for new breakfast orders
  const handleNewBreakfastOrder = (data) => {
    setHasNewBreakfast(true);

    // Enhanced breakfast notification messages
    const getBreakfastMessage = (orderData) => {
      if (orderData.status === 'pending') {
        return `New Breakfast Order - Room ${orderData.room_number} (${orderData.delivery_time})`;
      } else if (orderData.status === 'accepted') {
        return `Breakfast Order Accepted - Room ${orderData.room_number}`;
      } else if (orderData.status === 'completed') {
        return `Breakfast Order Ready - Room ${orderData.room_number}`;
      }
      return `Breakfast Order Update - Room ${orderData.room_number}`;
    };

    // Show toast notification
    toast.info(
      getBreakfastMessage(data),
      {
        autoClose: 5000,
        onClick: () => {
          window.location.href = `/room_services/${user.hotel_slug}?tab=breakfast`;
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
              url: `/room_services/${user.hotel_slug}?tab=breakfast`
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
          window.location.href = `/room_services/${user.hotel_slug}?tab=breakfast`;
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
