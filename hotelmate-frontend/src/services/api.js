import axios from "axios";

// Determine the baseURL dynamically
const baseURL =
  window.location.hostname === "localhost"
    ? "http://localhost:8000/api/" // Local dev
    : import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL,
  timeout: 30000,
});

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
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

export default api;
