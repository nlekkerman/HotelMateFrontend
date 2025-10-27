import axios from "axios";

// Public API service for tournament QR code access - no authentication required
const baseURL =
  window.location.hostname === "localhost"
    ? "http://localhost:8000/api/" // Local dev
    : import.meta.env.VITE_API_URL;

const publicApi = axios.create({
  baseURL,
  timeout: 30000,
});

// No authentication interceptor for public endpoints
publicApi.interceptors.request.use(
  (config) => {
    // Only add hotel context if available, but don't require authentication
    const storedUser = localStorage.getItem("user");
    const userData = storedUser ? JSON.parse(storedUser) : null;

    const hotelId = userData?.hotel_id || null;
    const hotelSlug = userData?.hotel_slug || null;

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

export default publicApi;
