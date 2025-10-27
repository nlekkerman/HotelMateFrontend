import axios from 'axios';

// Determine the baseURL dynamically
const baseURL = window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api/'  // Local dev
  : import.meta.env.VITE_API_URL;  // Production from .env

const api = axios.create({
  baseURL,
  timeout: 30000,
});


// Store the current hotelIdentifier here (default null)
let currentHotelIdentifier = null;

// Function to update hotelIdentifier from outside
export function setHotelIdentifier(id) {
  currentHotelIdentifier = id;
}

// Request interceptor to add token + hotel_id + hotelIdentifier header
api.interceptors.request.use(
  (config) => {
    const storedUser = localStorage.getItem('user');
    const userData = storedUser ? JSON.parse(storedUser) : null;

    const token = userData?.token || null;
    const hotelId = userData?.hotel_id || null;
    const hotelName = userData?.hotel_name || null;



    if (token) {
      config.headers['Authorization'] = `Token ${token}`;
      
    } else {
    }

    if (hotelId) {
      config.headers['X-Hotel-ID'] = hotelId.toString();
    } else {
    }

    if (hotelName) {
    } else {
    }

    // Add the hotelIdentifier header dynamically if set
    if (currentHotelIdentifier) {
      config.headers['X-Hotel-Identifier'] = currentHotelIdentifier;
    } else {
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
