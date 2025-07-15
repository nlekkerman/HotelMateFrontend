// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { listenForFirebaseMessages } from "@/utils/firebaseNotifications";
import { OrderCountProvider } from "@/hooks/useOrderCount.jsx";

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
    console.warn("Could not load theme:", e);
  }
}

async function bootstrap() {
  await applySavedTheme();

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      console.log("🚀 SW registered:", registration);

      // Handle foreground FCM messages (room_service notifications only)
      listenForFirebaseMessages((payload) => {
        console.log("🔥 [FG FCM] Payload received:", payload);

        if (
          ["room_service", "stock_movement"].includes(payload?.data?.type) &&
          payload?.notification
        ) {
          console.log(
            "🔔 [FG FCM] Displaying notification for type:",
            payload.data.type
          );
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/firebase-logo.png",
          });
        } else {
          console.log(
            "ℹ️ [FG FCM] Ignored notification with unknown type:",
            payload?.data?.type
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
