import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import MessengerWidget from '@/staff_chat/components/MessengerWidget';
import './Footer.css';

const Footer = () => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no user
  if (!user) return null;

  return (
    <footer className={`app-footer ${isExpanded ? 'app-footer--expanded' : ''}`}>
      <div className="app-footer__content">
        <MessengerWidget 
          position="bottom-right"
          onExpandChange={setIsExpanded}
        />
      </div>
    </footer>
  );
};

export default Footer;
