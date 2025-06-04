import axios from "axios";

// Determine the baseURL dynamically
const baseURL =
  window.location.hostname === "localhost"
    ? "http://localhost:8000/api/" // Local dev
    : import.meta.env.VITE_API_URL; // Production from .env

const api = axios.create({
  baseURL,
  timeout: 30000,
});

console.log("[API] Using API URL:", baseURL);

// Request interceptor to add token + hotel_id
api.interceptors.request.use(
  (config) => {
    const storedUser = localStorage.getItem("user");
    const userData = storedUser ? JSON.parse(storedUser) : null;

    const token = userData?.token || null;
    const hotelId = userData?.hotel_id || null;
    const hotelName = userData?.hotel_name || null;
    const hotelSlug = userData?.hotel_slug || null;

    console.log("[API] Intercepting request to:", config.url);
    console.log("[API] Retrieved user data:", userData);

    if (token) {
      config.headers["Authorization"] = `Token ${token}`;
      console.log("[API] Attached token:", token);
    } else {
      console.warn("[API] No token found in localStorage.");
    }

    if (hotelId) {
      config.headers["X-Hotel-ID"] = hotelId.toString();
      console.log("[API] Attached hotel ID:", hotelId);
    } else {
      console.warn("[API] No hotel ID found in localStorage.");
    }

    if (hotelName) {
      console.log("[API] Hotel name:", hotelName);
    } else {
      console.warn("[API] No hotel name found in localStorage.");
    }
    if (hotelSlug) {
      config.headers["X-Hotel-Slug"] = hotelSlug;
      console.log("[API] Attached hotel slug:", hotelSlug);
    } else {
      console.warn("[API] No hotel slug found in localStorage.");
    }
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

export default api;
