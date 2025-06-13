// src/main.jsx (or index.js)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// 1) Helper to pull hotel_slug out of localStorage
function getHotelSlug() {
  const stored = localStorage.getItem("user");
  if (!stored) return null;
  try {
    return JSON.parse(stored).hotel_slug;
  } catch {
    return null;
  }
}

// 2) Fetch theme from your API and set CSS vars
async function applySavedTheme() {
  const hotel_slug = getHotelSlug();
  if (!hotel_slug) return;

  try {
    const res = await fetch(`/api/common/${hotel_slug}/theme/`, {
      credentials: "include",      // if you’re using session/cookie auth
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error("Non-OK response");
    const { main_color, secondary_color } = await res.json();

    document.documentElement.style.setProperty("--main-color", main_color);
    document.documentElement.style.setProperty("--secondary-color", secondary_color);
  } catch (e) {
    console.warn("Could not load theme:", e);
    // you’ll fall back to the defaults in :root
  }
}

// 3) Bootstrap: apply theme, then mount React
async function bootstrap() {
  await applySavedTheme();

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
