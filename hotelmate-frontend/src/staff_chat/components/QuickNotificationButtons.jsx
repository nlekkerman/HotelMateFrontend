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
  mainColor,
  conversations // NEW: Pass conversations from StaffChatContext
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
      
      console.log('🔍 [QuickNotificationButtons] DEBUGGING CONVERSATION ID EXTRACTION:');
      console.log('   - notification.conversationId:', notification.conversationId);
      console.log('   - notification.data?.conversation_id:', notification.data?.conversation_id);
      console.log('   - Final conversationId:', conversationId);
      console.log('   - Notification data:', notification.data);
      console.log('   - Full notification object:', notification);
      
      if (!conversationId) {
        console.error('❌ [QuickNotificationButtons] CRITICAL: No conversation ID found!');
        console.error('   - This is why navigation fails!');
        console.error('   - Notification object:', JSON.stringify(notification, null, 2));
      }
      
      if (messengerReady && conversationId) {
        // Always open chat popup window (both desktop and mobile)
        console.log('🪟 [QuickNotificationButtons] Opening chat popup window for conversation:', conversationId);
        console.log('   - Device type:', isDesktop ? 'Desktop' : 'Mobile');
        console.log('   - messengerReady:', messengerReady);
        
        // Find the ACTUAL conversation from StaffChatContext
        console.log('🔍 [QuickNotificationButtons] Searching conversations:', conversations?.length || 0);
        console.log('🔍 [QuickNotificationButtons] Available conversation IDs:', conversations?.map(c => c.id));
        
        const actualConversation = conversations?.find(c => c.id === conversationId);
        
        if (actualConversation) {
          console.log('✅ [QuickNotificationButtons] Found actual conversation:', actualConversation);
          openChat(actualConversation, null);
        } else {
          console.warn('⚠️ [QuickNotificationButtons] Conversation not found in context, creating minimal object');
          console.warn('   - ConversationId:', conversationId, 'Type:', typeof conversationId);
          console.warn('   - Available conversations:', conversations?.map(c => ({ id: c.id, type: typeof c.id })));
          // Fallback: Create minimal conversation object
          const conversation = {
            id: conversationId,
            ...(notification.data || {})
          };
          console.log('🔧 [QuickNotificationButtons] Created fallback conversation:', conversation);
          openChat(conversation, null);
        }
      } else {
        // Messenger not ready or no conversation ID - just log and do nothing (no redirect)
        console.log('⚠️ [QuickNotificationButtons] Cannot open chat popup - conditions not met');
        console.log('   - isDesktop:', isDesktop);
        console.log('   - messengerReady:', messengerReady);
        console.log('   - conversationId:', conversationId);
        console.log('   - Action: Staying on current page, no redirect');
        
        // Don't redirect anywhere - just stay on the current page
        return;
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
  mainColor: PropTypes.string,
  conversations: PropTypes.array // Array of conversation objects from StaffChatContext
};

export default QuickNotificationButtons;
