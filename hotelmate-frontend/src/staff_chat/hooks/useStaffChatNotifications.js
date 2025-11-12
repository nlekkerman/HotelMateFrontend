import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { usePusherContext } from '../context/PusherProvider';

/**
 * Custom hook for global staff chat notifications
 * Shows toast notifications when receiving new messages
 * Updates unread count badge in sidebar/navigation
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.hotelSlug - Hotel slug for channel subscription
 * @param {number} params.staffId - Current staff ID
 * @param {number} params.currentConversationId - ID of currently open conversation (to avoid duplicate notifications)
 * @param {Function} params.onNewMessage - Callback when new message received
 * @param {Function} params.onUnreadCountChange - Callback when unread count changes
 * @returns {Object} Notification state and methods
 */
const useStaffChatNotifications = ({
  hotelSlug,
  staffId,
  currentConversationId = null,
  onNewMessage,
  onUnreadCountChange
}) => {
  const { bind, unbind, subscribe, unsubscribe, isReady, enabled } = usePusherContext();
  const audioRef = useRef(null);
  const lastNotificationTime = useRef({});

  // Initialize notification sound (optional)
  useEffect(() => {
    // You can add a notification sound file to public/sounds/
    // audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

  /**
   * Play notification sound
   */
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  }, []);

  /**
   * Show toast notification for new message
   */
  const showMessageNotification = useCallback((messageData) => {
    const { conversation_id, sender, content, message_type } = messageData;

    // Don't show notification if user is viewing this conversation
    if (conversation_id === currentConversationId) {
      return;
    }

    // Throttle notifications - max one per conversation per 3 seconds
    const now = Date.now();
    const lastTime = lastNotificationTime.current[conversation_id] || 0;
    if (now - lastTime < 3000) {
      return;
    }
    lastNotificationTime.current[conversation_id] = now;

    // Format message preview
    let messagePreview = content;
    if (message_type === 'file') {
      messagePreview = '📎 Sent a file';
    } else if (message_type === 'image') {
      messagePreview = '🖼️ Sent an image';
    } else if (content && content.length > 50) {
      messagePreview = content.substring(0, 50) + '...';
    }

    const senderName = sender 
      ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.username || 'Someone'
      : 'Someone';

    // Show toast with custom styling
    toast.info(
      <div 
        style={{ 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}
        onClick={() => {
          // Navigate to conversation when clicked
          const event = new CustomEvent('openStaffChatConversation', {
            detail: { conversationId: conversation_id }
          });
          window.dispatchEvent(event);
          toast.dismiss();
        }}
      >
        {/* Sender Avatar */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#3498db',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            flexShrink: 0
          }}
        >
          {sender?.profile_image_url ? (
            <img
              src={sender.profile_image_url}
              alt={senderName}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerText = senderName.charAt(0).toUpperCase();
              }}
            />
          ) : (
            senderName.charAt(0).toUpperCase()
          )}
        </div>

        {/* Message Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '4px',
            fontSize: '14px',
            color: '#2c3e50'
          }}>
            {senderName}
          </div>
          <div style={{ 
            fontSize: '13px',
            color: '#555',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {messagePreview}
          </div>
        </div>
      </div>,
      {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        icon: '💬',
        style: {
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '12px'
        }
      }
    );

    // Play sound (if enabled)
    playNotificationSound();

  }, [currentConversationId, playNotificationSound]);

  /**
   * Show toast for @mention notification
   */
  const showMentionNotification = useCallback((mentionData) => {
    const { conversation_id, sender, content } = mentionData;

    // Don't show if viewing this conversation
    if (conversation_id === currentConversationId) {
      return;
    }

    const senderName = sender 
      ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.username || 'Someone'
      : 'Someone';

    const messagePreview = content && content.length > 50
      ? content.substring(0, 50) + '...'
      : content;

    toast.warning(
      <div 
        style={{ 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}
        onClick={() => {
          const event = new CustomEvent('openStaffChatConversation', {
            detail: { conversationId: conversation_id }
          });
          window.dispatchEvent(event);
          toast.dismiss();
        }}
      >
        {/* Sender Avatar */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#f39c12',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            flexShrink: 0
          }}
        >
          @
        </div>

        {/* Message Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '4px',
            fontSize: '14px',
            color: '#2c3e50'
          }}>
            {senderName} mentioned you
          </div>
          <div style={{ 
            fontSize: '13px',
            color: '#555',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {messagePreview}
          </div>
        </div>
      </div>,
      {
        position: 'top-right',
        autoClose: 7000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        icon: '🔔',
        style: {
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '12px',
          border: '2px solid #f39c12'
        }
      }
    );

    playNotificationSound();
  }, [currentConversationId, playNotificationSound]);

  /**
   * Handle new message from personal notification channel
   */
  const handlePersonalNotification = useCallback((data) => {
    console.log('Personal notification received:', data);

    // Call callback if provided
    if (onNewMessage) {
      onNewMessage(data);
    }

    // Update unread count
    if (onUnreadCountChange) {
      onUnreadCountChange((prev) => prev + 1);
    }

    // Show appropriate notification
    if (data.notification_type === 'mention' || data.type === 'mention') {
      showMentionNotification(data);
    } else {
      showMessageNotification(data);
    }
  }, [onNewMessage, onUnreadCountChange, showMentionNotification, showMessageNotification]);

  /**
   * Subscribe to personal notification channel
   */
  useEffect(() => {
    if (!enabled || !isReady || !staffId || !hotelSlug) {
      console.log('Skipping notification subscription:', { enabled, isReady, staffId, hotelSlug });
      return;
    }

    // Personal notification channel: {hotel_slug}-staff-{staff_id}-notifications
    const personalChannel = `${hotelSlug}-staff-${staffId}-notifications`;

    console.log(`Subscribing to personal notifications: ${personalChannel}`);
    subscribe(personalChannel);

    // Bind to new-message event (sent when user receives a message in any conversation)
    bind(personalChannel, 'new-message', handlePersonalNotification);
    
    // Bind to mention event (sent when user is @mentioned)
    bind(personalChannel, 'mention', handlePersonalNotification);

    // Cleanup
    return () => {
      console.log(`Unsubscribing from personal notifications: ${personalChannel}`);
      unbind(personalChannel, 'new-message', handlePersonalNotification);
      unbind(personalChannel, 'mention', handlePersonalNotification);
      unsubscribe(personalChannel);
    };
  }, [
    enabled,
    isReady,
    staffId,
    hotelSlug,
    subscribe,
    unsubscribe,
    bind,
    unbind,
    handlePersonalNotification
  ]);

  /**
   * Listen for custom event to open conversation
   */
  useEffect(() => {
    const handleOpenConversation = (event) => {
      const { conversationId } = event.detail;
      // Navigate to staff chat with conversation
      window.location.href = `/${hotelSlug}/staff-chat?conversation=${conversationId}`;
    };

    window.addEventListener('openStaffChatConversation', handleOpenConversation);

    return () => {
      window.removeEventListener('openStaffChatConversation', handleOpenConversation);
    };
  }, [hotelSlug]);

  return {
    showMessageNotification,
    showMentionNotification
  };
};

export default useStaffChatNotifications;
