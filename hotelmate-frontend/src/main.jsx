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
import { getAuthUser } from "@/lib/authStore";


// Helper to pull hotel_slug — authStore primary, localStorage fallback (runs before React)
function getHotelSlug() {
  const user = getAuthUser();
  if (user?.hotel_slug) return user.hotel_slug;
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored).hotel_slug : null;
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

      // Handle foreground FCM messages  
      const unsubscribe = listenForFirebaseMessages((payload) => {
        
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
          showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicons/favicon.svg",
          }).catch(console.error);

        } else if (notificationType === "staff_chat_message" && payload?.notification) {
          // ✅ NEW: show staff chat push notification
          showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicons/favicon.svg",
          }).catch(console.error);

        } else if (hasOrderId && payload?.notification) {
          showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicons/favicon.svg",
          }).catch(console.error);
        }
      });
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