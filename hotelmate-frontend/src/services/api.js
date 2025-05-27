import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
});
console.log('Using API URL:', import.meta.env.VITE_API_URL);

// Request interceptor to add token dynamically on every request
api.interceptors.request.use(
  (config) => {
    const storedUser = localStorage.getItem('user');
    const token = storedUser ? JSON.parse(storedUser).token : null;
    console.log('API fetch token from localStorage:', token);

    if (token) {
      config.headers['Authorization'] = `Token ${token}`; // or 'Bearer ' if JWT
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
