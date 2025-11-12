import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import '@/staff_chat/styles/QuickNotifications.css';

/**
 * QuickNotificationButtons Component
 * Displays real-time notification buttons in the quick actions bar
 * Each notification type gets its own blinking button with count
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.notifications - Array of notification objects
 * @param {Function} props.onNotificationClick - Callback when notification is clicked
 * @param {Function} props.onNotificationDismiss - Callback to dismiss notification
 * @param {string} props.hotelSlug - Hotel slug for navigation
 * @param {string} props.mainColor - Theme color
 */
const QuickNotificationButtons = ({
  notifications,
  onNotificationClick,
  onNotificationDismiss,
  hotelSlug,
  mainColor
}) => {
  const navigate = useNavigate();

  if (!notifications || notifications.length === 0) {
    return null;
  }

  const handleNotificationClick = (notification) => {
    // Navigate based on notification type
    if (notification.category.startsWith('staff_chat')) {
      const conversationId = notification.conversationId || notification.data?.conversation_id;
      if (conversationId) {
        navigate(`/${hotelSlug}/staff-chat?conversation=${conversationId}`);
      } else {
        navigate(`/${hotelSlug}/staff-chat`);
      }
      
      // Dismiss this notification
      if (onNotificationDismiss) {
        onNotificationDismiss(notification.id);
      }
    }

    // Call additional callback if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const handleDismiss = (e, notificationId) => {
    e.stopPropagation();
    if (onNotificationDismiss) {
      onNotificationDismiss(notificationId);
    }
  };

  return (
    <div className="quick-notifications-container">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          className="quick-notification-btn blink-animation new"
          data-type={notification.category.replace('staff_chat_', '')}
          onClick={() => handleNotificationClick(notification)}
          style={{
            backgroundColor: notification.color || mainColor || '#e74c3c',
            borderColor: notification.color || mainColor || '#e74c3c',
          }}
          title={`${notification.count} new from ${notification.from}`}
        >
          {/* Icon */}
          <i 
            className={`bi bi-${notification.icon}`} 
            style={{ fontSize: '16px' }}
          />
          
          {/* From label */}
          <span className="notification-from">
            {notification.from}
          </span>
          
          {/* Count badge */}
          <span className="notification-count-badge">
            {notification.count > 99 ? '99+' : notification.count}
          </span>

          {/* Dismiss button */}
          <button
            className="notification-dismiss-btn"
            onClick={(e) => handleDismiss(e, notification.id)}
            title="Dismiss"
          >
            <i className="bi bi-x" />
          </button>
        </button>
      ))}
    </div>
  );
};

QuickNotificationButtons.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      conversationId: PropTypes.number,
      count: PropTypes.number.isRequired,
      from: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired,
      lastUpdate: PropTypes.instanceOf(Date).isRequired,
      data: PropTypes.object
    })
  ).isRequired,
  onNotificationClick: PropTypes.func,
  onNotificationDismiss: PropTypes.func.isRequired,
  hotelSlug: PropTypes.string.isRequired,
  mainColor: PropTypes.string
};

export default QuickNotificationButtons;
