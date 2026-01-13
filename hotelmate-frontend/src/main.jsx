import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Import base styles including publicPages.css
import "./styles/presets.css"; // Import preset styles (variants 1-5)
import App from "./App";
import { OrderCountProvider } from "./hooks/useOrderCount";
import { PresetsProvider } from "./context/PresetsContext";
import { listenForFirebaseMessages } from "./utils/firebaseNotifications";
import { showNotification } from "./utils/notificationUtils";
import { handleIncomingRealtimeEvent } from "./realtime/eventBus";




async function bootstrap() {
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
          source: "fcm",
          payload,
        });

        // Normalize payload safely (NO optional chaining)
        const data = payload && payload.data ? payload.data : {};
        const notification =
          payload && payload.notification ? payload.notification : null;

        const notificationType = data.type || null;
        const hasOrderId = !!data.order_id;

        const isAllowedType =
          notificationType === "room_service" ||
          notificationType === "room_service_order" ||
          notificationType === "breakfast" ||
          notificationType === "stock_movement";

        // Show notifications (only if notification exists)
        if (isAllowedType && notification) {
          showNotification(notification.title, {
            body: notification.body,
            icon: "/favicons/favicon.svg",
          }).catch(console.error);
          return;
        }

        if (notificationType === "staff_chat_message" && notification) {
          showNotification(notification.title, {
            body: notification.body,
            icon: "/favicons/favicon.svg",
          }).catch(console.error);
          return;
        }

        if (hasOrderId && notification) {
          showNotification(notification.title, {
            body: notification.body,
            icon: "/favicons/favicon.svg",
          }).catch(console.error);
          return;
        }
      });

      console.log(
        "Foreground message listener set up successfully, unsubscribe function:",
        typeof unsubscribe
      );
    } catch (err) {
      console.error("SW registration failed:", err);
    }
  } else {
    console.error("Service Worker not supported in this browser");
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