// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Import base styles including publicPages.css
import "./styles/presets.css"; // Import preset styles (variants 1-5)
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
  const stored = localStorage.getItem("user");
  if (!stored) return; // No user logged in, skip theme
  
  const hotel_slug = getHotelSlug();
  if (!hotel_slug) return;

  try {
    const userData = JSON.parse(stored);
    const token = userData?.token;
    if (!token) return; // No token, skip theme
    
    const res = await fetch(`/api/common/${hotel_slug}/theme/`, {
      credentials: "include",
      headers: { 
        Accept: "application/json",
        Authorization: `Token ${token}`
      },
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
        console.log("🔥🔥🔥 [FCM] ==================== FCM MESSAGE RECEIVED ====================");
        console.log("🔥 [FCM] Full payload:", JSON.stringify(payload, null, 2));
        console.log("🔥 [FCM] Payload.data:", payload?.data);
        console.log("🔥 [FCM] Payload.notification:", payload?.notification);
        console.log("🔥 [FCM] Timestamp:", new Date().toISOString());

        // Show notification for room_service, breakfast, stock_movement, or order status updates
        const notificationType = payload?.data?.type;
        const hasOrderId = payload?.data?.order_id;
        const conversationId = payload?.data?.conversation_id;
        const messageId = payload?.data?.message_id;
        
        console.log("🔥 [FCM] Parsed data:", {
          notificationType,
          hasOrderId,
          conversationId,
          messageId,
          hasNotification: !!payload?.notification
        });

        // Check if this is a staff chat message
        if (messageId && conversationId) {
          console.log("💬 [FCM] STAFF CHAT MESSAGE DETECTED!", {
            messageId,
            conversationId,
            senderName: payload?.data?.sender_name,
            message: payload?.data?.message
          });
        }
        
        if (
          ["room_service", "room_service_order", "breakfast", "stock_movement"].includes(notificationType) &&
          payload?.notification
        ) {
          console.log(
            "🔔 [FCM] Displaying notification for type:",
            notificationType
          );
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicon.svg",
          });
        } else if (hasOrderId && payload?.notification) {
          // Guest order status update (no type field)
          console.log(
            "🔔 [FCM] Displaying order status update for order:",
            payload.data.order_id
          );
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/favicon.ico",
          });
        } else {
          console.log(
            "ℹ️ [FCM] Notification not displayed - type:",
            notificationType,
            "hasOrderId:",
            hasOrderId,
            "hasNotification:",
            !!payload?.notification
          );
        }
        
        console.log("🔥🔥🔥 [FCM] ==================== END FCM MESSAGE ====================");
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
