import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PropTypes from 'prop-types';

/**
 * StaffChatFloatingButton Component
 * Floating action button to open staff chat
 */
const StaffChatFloatingButton = ({ position = 'bottom-right' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;

  if (!hotelSlug) return null;

  const handleClick = () => {
    navigate(`/${hotelSlug}/staff-chat`);
  };

  const positionClasses = {
    'bottom-right': 'staff-chat-fab--bottom-right',
    'bottom-left': 'staff-chat-fab--bottom-left',
    'top-right': 'staff-chat-fab--top-right',
    'top-left': 'staff-chat-fab--top-left'
  };

  return (
    <button
      onClick={handleClick}
      className={`staff-chat-fab ${positionClasses[position]}`}
      aria-label="Staff Chat"
      title="Staff Chat"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
          fill="currentColor"
        />
        <circle cx="12" cy="10" r="1.5" fill="currentColor" />
        <circle cx="8" cy="10" r="1.5" fill="currentColor" />
        <circle cx="16" cy="10" r="1.5" fill="currentColor" />
      </svg>
    </button>
  );
};

StaffChatFloatingButton.propTypes = {
  position: PropTypes.oneOf(['bottom-right', 'bottom-left', 'top-right', 'top-left'])
};

export default StaffChatFloatingButton;
