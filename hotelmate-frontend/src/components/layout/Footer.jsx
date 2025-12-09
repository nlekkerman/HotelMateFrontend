import React from 'react';
import { useAuth } from '@/context/AuthContext';
import './Footer.css';

const Footer = () => {
  const { user } = useAuth();

  // Don't render if no user
  if (!user) return null;

  return (
    <footer className="app-footer">
      <div className="app-footer__content">
        {/* MessengerWidget moved to Navbar.jsx to prevent duplicate rendering */}
        {/* Footer can contain other content if needed */}
      </div>
    </footer>
  );
};

export default Footer;
