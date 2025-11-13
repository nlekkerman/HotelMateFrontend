// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { OrderCountProvider } from "@/hooks/useOrderCount.jsx";
import { listenForFirebaseMessages } from "@/utils/firebaseNotifications";


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

// Fetch theme from your API and set CSS vars
async function applySavedTheme() {
  const hotel_slug = getHotelSlug();
  if (!hotel_slug) return;

  try {
    const res = await fetch(`/api/common/${hotel_slug}/theme/`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Non-OK response");
    const { main_color, secondary_color } = await res.json();
    document.documentElement.style.setProperty("--main-color", main_color);
    document.documentElement.style.setProperty(
      "--secondary-color",
      secondary_color
    );
  } catch (e) {
    console.warn('Theme fetch failed, using defaults');
  }
}

async function bootstrap() {
  await applySavedTheme();

  // Register Firebase service worker for push notifications
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      console.log("🚀 Firebase SW registered:", registration);

      // Handle foreground FCM messages
      listenForFirebaseMessages((payload) => {
        console.log("🔥 [FG FCM] Payload received:", payload);

        // Show notification for room_service, breakfast, stock_movement, or order status updates
        const notificationType = payload?.data?.type;
        const hasOrderId = payload?.data?.order_id;
        
        if (
          ["room_service", "room_service_order", "breakfast", "stock_movement"].includes(notificationType) &&
          payload?.notification
        ) {
          console.log(
            "🔔 [FG FCM] Displaying notification for type:",
            notificationType
          );
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicon.ico",
          });
        } else if (hasOrderId && payload?.notification) {
          // Guest order status update (no type field)
          console.log(
            "🔔 [FG FCM] Displaying order status update for order:",
            payload.data.order_id
          );
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicon.ico",
          });
        } else {
          console.log(
            "ℹ️ [FG FCM] Ignored notification - type:",
            notificationType,
            "hasOrderId:",
            hasOrderId
          );
        }
      });
    } catch (err) {
      console.error("❌ SW registration failed:", err);
    }
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <OrderCountProvider>
        <App />
      </OrderCountProvider>
    </React.StrictMode>
  );
}

bootstrap();
