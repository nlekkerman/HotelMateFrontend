// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css"; // Import base styles including publicPages.css
import "./styles/presets.css"; // Import preset styles (variants 1-5)
import App from "./App";
import { OrderCountProvider } from "@/hooks/useOrderCount.jsx";
import { PresetsProvider } from "@/context/PresetsContext";
import { listenForFirebaseMessages } from "@/utils/firebaseNotifications";
import { showNotification } from "@/utils/notificationUtils";
import { handleIncomingRealtimeEvent } from "@/realtime/eventBus";


// Helper to pull hotel_slug out of localStorage
function getHotelSlug() {
  const stored = localStorage.getItem("user");
  if (!stored) return null;
  try {
    return JSON.parse(stored).hotel_slug;
  } catch {
    return null;
  }
}

// Theme loading is now handled by ThemeContext with React Query
// No need for manual theme loading here

async function bootstrap() {
  // Removed redundant applySavedTheme() call

  // Register Firebase service worker for push notifications
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      console.log("🚀 Firebase SW registered:", registration);
      console.log("🚀 SW registration state:", registration.installing ? 'installing' : registration.waiting ? 'waiting' : registration.active ? 'active' : 'none');

      // Handle foreground FCM messages  
      console.log("🔥 [FCM] Setting up foreground message listener...");
      const unsubscribe = listenForFirebaseMessages((payload) => {
        console.log("🚨🚨🚨 [FCM] FOREGROUND MESSAGE RECEIVED! 🚨🚨🚨");
        console.log("🔥 [FCM] Full payload:", JSON.stringify(payload, null, 2));
        console.log("🔥 [FCM] Payload data:", payload?.data);
        console.log("🔥 [FCM] Payload notification:", payload?.notification);
        console.log("🔥 [FCM] Message type:", payload?.data?.type);
        
        // Route through centralized event bus
        handleIncomingRealtimeEvent({
          source: 'fcm',
          payload
        });
        
        // Keep existing notification display logic as fallback
        // (This will be gradually replaced by the notification center)
        const notificationType = payload?.data?.type;
        const hasOrderId = payload?.data?.order_id;
        
        if (
          ["room_service", "room_service_order", "breakfast", "stock_movement"].includes(notificationType) &&
          payload?.notification
        ) {
          console.log("🔔 [FCM] Legacy notification display for type:", notificationType);
          showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicons/favicon.svg",
          }).catch(console.error);

        } else if (notificationType === "staff_chat_message" && payload?.notification) {
          // ✅ NEW: show staff chat push notification
          console.log("🔔 [FCM] Staff chat notification");
          console.log("🔔 [FCM] Calling showNotification with:", {
            title: payload.notification.title,
            body: payload.notification.body,
            icon: "/favicons/favicon.svg"
          });
          showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicons/favicon.svg",
          }).then(result => {
            console.log("✅ [FCM] showNotification SUCCESS:", result);
          }).catch(error => {
            console.error("❌ [FCM] showNotification FAILED:", error);
          });

        } else if (hasOrderId && payload?.notification) {
          console.log("🔔 [FCM] Legacy order status notification for order:", payload.data.order_id);
          showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicons/favicon.svg",
          }).catch(console.error);
        }
      });
      console.log("✅ [FCM] Foreground message listener set up successfully, unsubscribe function:", typeof unsubscribe);
    } catch (err) {
      console.error("❌ SW registration failed:", err);
    }
  } else {
    console.error("❌ Service Worker not supported in this browser");
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <PresetsProvider>
        <OrderCountProvider>
         
          <App />
       
        </OrderCountProvider>
      </PresetsProvider>
    </React.StrictMode>
  );
}

bootstrap();