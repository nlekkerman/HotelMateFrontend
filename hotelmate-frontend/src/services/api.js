
import axios from "axios";

// Determine the baseURL dynamically
const baseURL = (() => {
  // If VITE_API_URL is set in .env, always use it (for both dev and prod)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const isDev = import.meta.env.DEV;
  
  if (isLocal && isDev) {
    // For development with local backend
    return "http://localhost:8000/api/";
  }
  
  // Fallback to production URL
  return "https://hotel-porter-d25ad83b12cf.herokuapp.com/api";
})();

const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Add response interceptor to handle CORS and connection errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle CORS and connection errors
    if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
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
  baseURL,
  timeout: 30000,
});

publicAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
      console.error('Network error:', error);
    }
    return Promise.reject(error);
  }
);

/**
 * Helper function to build staff API URLs with new pattern
 * /api/staff/hotels/<hotel_slug>/<app>/
 * @param {string} hotelSlug - The hotel slug
 * @param {string} app - The app name (e.g., 'room_services', 'staff', 'bookings')
 * @param {string} path - Additional path after app (optional)
 * @returns {string} - Formatted URL path
 */
export function buildStaffURL(hotelSlug, app, path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/staff/hotels/${hotelSlug}/${app}${cleanPath}`;
}

/**
 * Helper to get hotel slug from stored user data
 * @returns {string|null}
 */
export function getHotelSlug() {
  const storedUser = localStorage.getItem('user');
  const userData = storedUser ? JSON.parse(storedUser) : null;
  return userData?.hotel_slug || null;
}

export default api;
