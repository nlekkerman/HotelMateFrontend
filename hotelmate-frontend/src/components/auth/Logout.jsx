import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const Logout = () => {
  const { logout } = useAuth();

  useEffect(() => {
    // Clear user session
    logout();
    
    // Redirect to login page
    window.location.href = '/login';
  }, [logout]);

  return (
    <div className="container mt-5 text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Logging out...</span>
      </div>
      <p className="mt-3">Logging out...</p>
    </div>
  );
};

export default Logout;
