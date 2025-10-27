import axios from "axios";

// Determine the baseURL dynamically
const baseURL = (() => {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const isDev = import.meta.env.DEV;
  
  if (isLocal && isDev) {
    // For development, try local backend first
    // If local backend is not available, the interceptor will handle fallback
    return "http://localhost:8000/api/";
  }
  
  // Production or when VITE_API_URL is explicitly set
  const prodUrl = import.meta.env.VITE_API_URL || "https://hotel-porter-d25ad83b12cf.herokuapp.com/api";
  return prodUrl;
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

export default api;
