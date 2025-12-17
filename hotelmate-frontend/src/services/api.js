import axios from "axios";
import { Capacitor } from "@capacitor/core";

// Detect if we're in a native Capacitor runtime (Android/iOS)
// Detect if we're in a native Capacitor runtime (Android/iOS)
const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'
const isNative = platform === "ios" || platform === "android";
// Determine the baseURL dynamically
const baseURL = (() => {
  if (isNative) {
    return "https://hotel-porter-d25ad83b12cf.herokuapp.com/api/";
  }

  // If VITE_API_URL is set in .env, always use it (for both dev and prod)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const isDev = import.meta.env.DEV;

  if (isLocal && isDev) {
    // For development with local backend
    return "http://localhost:8000/api/";
  }

  // Fallback to production URL
  return "https://hotel-porter-d25ad83b12cf.herokuapp.com/api";
})();
console.log("[API INIT]", {
  platform,
  isNative,
  origin: window.location.origin,
  baseURL,
});
const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Add response interceptor to handle CORS and connection errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle CORS and connection errors
    if (error.code === "ERR_NETWORK" || error.message.includes("CORS")) {
    }

    return Promise.reject(error);
  }
);

// Request interceptor to add token + hotel_id + slug
api.interceptors.request.use(
  (config) => {
    const storedUser = localStorage.getItem("user");
    const userData = storedUser ? JSON.parse(storedUser) : null;

    const token = userData?.token || null;
    const hotelId = userData?.hotel_id || null;
    const hotelName = userData?.hotel_name || null;
    const hotelSlug = userData?.hotel_slug || null;

    if (token) {
      config.headers["Authorization"] = `Token ${token}`;
    }

    if (hotelId) {
      config.headers["X-Hotel-ID"] = hotelId.toString();
    }

    if (hotelSlug) {
      config.headers["X-Hotel-Slug"] = hotelSlug;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Public API instance (no authentication headers)
export const publicAPI = axios.create({
  baseURL: `${baseURL.replace(/\/$/, "")}/public`,
  timeout: 30000,
});

publicAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ERR_NETWORK" || error.message.includes("CORS")) {
      console.error("Network error:", error);
    }
    return Promise.reject(error);
  }
);

/**STAFF API */
export const staffAuthAPI = axios.create({
  baseURL: `${baseURL.replace(/\/$/, "")}`, // <- /api (no /public)
  timeout: 30000,
});

/** GUEST API (guest zone, no auth headers) */
export const guestAPI = axios.create({
  baseURL: `${baseURL.replace(/\/$/, "")}/guest`, // /api
  timeout: 30000,
});
/**
 * Helper function to build staff API URLs with new pattern
 * /api/staff/hotel/<hotel_slug>/<app>/
 * @param {string} hotelSlug - The hotel slug
 * @param {string} app - The app name (e.g., 'room_services', 'staff', 'bookings')
 * @param {string} path - Additional path after app (optional)
 * @returns {string} - Formatted URL path
 */
export function buildStaffURL(hotelSlug, app, path = "") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const appPath = app ? `/${app}` : "";
  return `/staff/hotel/${hotelSlug}${appPath}${cleanPath}`;
}

/**
 * Helper to get hotel slug from stored user data
 * @returns {string|null}
 */
export function getHotelSlug() {
  const storedUser = localStorage.getItem("user");
  const userData = storedUser ? JSON.parse(storedUser) : null;
  return userData?.hotel_slug || null;
}

/**
 * Helper function to build guest API URLs with canonical pattern
 * /guest/hotels/<hotel_slug>/<path>
 * @param {string} hotelSlug - The hotel slug
 * @param {string} path - Additional path after hotels/<slug> (optional)
 * @returns {string} - Formatted URL path
 */
export function buildGuestURL(hotelSlug, path = "") {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `/guest/hotels/${hotelSlug}/${cleanPath}`;
}

/**
 * Fetch public hotel page data (includes settings and hotel details)
 * @param {string} hotelSlug - The hotel slug
 * @returns {Promise} - Axios response with hotel data including settings
 */
export async function getHotelPublicPage(hotelSlug) {
  return publicAPI.get(`/hotel/${hotelSlug}/page/`);
}

export default api;
