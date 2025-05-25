import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '@/services/api'; // adjust path if needed

// Create context object
const AuthContext = createContext(null);

// Provider component that wraps your app and provides auth state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Load user from localStorage on mount and set axios auth header if token exists
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser && storedUser.token) {
      setUser(storedUser);
      api.defaults.headers.common['Authorization'] = `Token ${storedUser.token}`;
    }
  }, []);

  // Login method updates user state, localStorage, and axios header
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.token) {
      api.defaults.headers.common['Authorization'] = `Token ${userData.token}`;
    }
  };

  // Logout method clears user, localStorage and removes axios header
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy usage inside components
export const useAuth = () => {
  return useContext(AuthContext);
};
