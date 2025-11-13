import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useMessenger } from '../context/MessengerContext';
import '@/staff_chat/styles/QuickNotifications.css';

/**
 * QuickNotificationButtons Component
 * Displays real-time notification buttons in the quick actions bar
 * Each notification type gets its own blinking button with count
 * On PC: Opens pocket window (ChatWindowPopup)
 * On Mobile: Navigates to staff-chat page
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
  const { openChat, isReady: messengerReady } = useMessenger();
  
  // Detect if we're on desktop (PC)
  const isDesktop = window.innerWidth >= 992;

  if (!notifications || notifications.length === 0) {
    return null;
  }

  const handleNotificationClick = (notification) => {
    console.log('🔔 [QuickNotificationButtons] Notification clicked:', { 
      notification, 
      isDesktop, 
      messengerReady 
    });

    // Handle staff chat notifications
    if (notification.category.startsWith('staff_chat')) {
      const conversationId = notification.conversationId || notification.data?.conversation_id;
      
      if (isDesktop && messengerReady && conversationId) {
        // Desktop: Open pocket window (ChatWindowPopup)
        console.log('🪟 [QuickNotificationButtons] Opening pocket window for conversation:', conversationId);
        
        // Create conversation object for messenger
        const conversation = {
          id: conversationId,
          // Add any other conversation details from notification data if available
          ...(notification.data || {})
        };
        
        openChat(conversation, null);
      } else {
        // Mobile or messenger not ready: Navigate to staff-chat page
        console.log('📱 [QuickNotificationButtons] Navigating to staff-chat page');
        if (conversationId) {
          navigate(`/${hotelSlug}/staff-chat?conversation=${conversationId}`);
        } else {
          navigate(`/${hotelSlug}/staff-chat`);
        }
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
      {notifications.map((notification) => {
        // Group notifications by category and show total count
        const displayLabel = notification.count > 1 
          ? `New Messages (${notification.count})` 
          : 'New Message';
        
        return (
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
            
            {/* Label: "New Message" with count */}
            <span className="notification-from">
              {displayLabel}
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
        );
      })}
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
