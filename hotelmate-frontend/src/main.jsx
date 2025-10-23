// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
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

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <OrderCountProvider>
        <App />
      </OrderCountProvider>
    </React.StrictMode>
  );
}

bootstrap();
