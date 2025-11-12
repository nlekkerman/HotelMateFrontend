import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PropTypes from 'prop-types';
import useUnreadCount from '../hooks/useUnreadCount';

/**
 * StaffChatFloatingButton Component
 * Floating action button to open staff chat with unread count badge
 */
const StaffChatFloatingButton = ({ position = 'bottom-right' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  
  // Get unread count with 30-second auto-refresh
  const { totalUnread, loading } = useUnreadCount(hotelSlug, 30000);

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

  // Format badge count (show 99+ for counts over 99)
  const badgeCount = totalUnread > 99 ? '99+' : totalUnread;
  const showBadge = totalUnread > 0 && !loading;

  return (
    <button
      onClick={handleClick}
      className={`staff-chat-fab ${positionClasses[position]}`}
      aria-label={`Staff Chat${showBadge ? ` (${totalUnread} unread)` : ''}`}
      title={`Staff Chat${showBadge ? ` - ${totalUnread} unread messages` : ''}`}
      style={{ position: 'relative' }}
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
      
      {/* Unread badge */}
      {showBadge && (
        <span
          className="staff-chat-fab__badge"
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#dc3545',
            color: 'white',
            borderRadius: '10px',
            padding: '2px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            lineHeight: '1',
            minWidth: '18px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            border: '2px solid white'
          }}
        >
          {badgeCount}
        </span>
      )}
    </button>
  );
};

StaffChatFloatingButton.propTypes = {
  position: PropTypes.oneOf(['bottom-right', 'bottom-left', 'top-right', 'top-left'])
};

export default StaffChatFloatingButton;
