import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  timeout: 30000,
});

// Request interceptor to add token dynamically on every request
api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('user');
  const token = storedUser ? JSON.parse(storedUser).token : null;
 console.log('API fetch token from localStorage:', token);

  if (token) {
    config.headers['Authorization'] = `Token ${token}`; // or 'Bearer ' if JWT
  }
  return config;
}, (error) => Promise.reject(error));

export default api;
