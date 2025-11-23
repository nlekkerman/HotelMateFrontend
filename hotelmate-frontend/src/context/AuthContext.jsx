// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // View mode: 'guest' or 'staff'
  const [viewMode, setViewModeState] = useState(() => {
    const stored = localStorage.getItem('viewMode');
    return stored || 'guest';
  });

  // Selected hotel for multi-hotel browsing (optional for Phase 1)
  const [selectedHotel, setSelectedHotel] = useState(() => {
    const stored = localStorage.getItem('selectedHotel');
    return stored ? JSON.parse(stored) : null;
  });

  // Derived: check if user is staff
  const isStaff = user?.is_staff || false;

  // Set view mode with validation (non-staff can only be 'guest')
  const setViewMode = (mode) => {
    if (!isStaff && mode === 'staff') {
      console.warn('[AuthContext] Non-staff user cannot access staff view');
      return;
    }
    setViewModeState(mode);
    localStorage.setItem('viewMode', mode);
  };

  // Login function (keep existing behavior)
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    // If staff logs in, default to staff view
    if (userData?.is_staff) {
      setViewMode('staff');
    }
  };

  // Login as staff (convenience method)
  const loginAsStaff = (userData) => {
    const staffUserData = { ...userData, is_staff: true };
    login(staffUserData);
  };

  // Logout (clear everything)
  const logout = () => {
    setUser(null);
    setViewModeState('guest');
    setSelectedHotel(null);
    localStorage.removeItem('user');
    localStorage.removeItem('viewMode');
    localStorage.removeItem('selectedHotel');
    // Navigation handled by components calling logout
  };

  // Update selected hotel
  const selectHotel = (hotel) => {
    setSelectedHotel(hotel);
    if (hotel) {
      localStorage.setItem('selectedHotel', JSON.stringify(hotel));
    } else {
      localStorage.removeItem('selectedHotel');
    }
  };

  // If user is not staff, force guest view
  useEffect(() => {
    if (!isStaff && viewMode === 'staff') {
      setViewMode('guest');
    }
  }, [isStaff]);

  useEffect(() => {
    // Add token refresh logic or fetch profile if needed
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      loginAsStaff,
      logout,
      isStaff,
      viewMode,
      setViewMode,
      selectedHotel,
      selectHotel
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
