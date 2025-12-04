import { useState, useEffect, useCallback } from 'react';
import { useChatState } from '@/realtime/stores/chatStore.jsx';

/**
 * Custom hook for managing quick action notifications
 * Tracks individual notifications by type and displays them in the quick actions bar
 * Each notification type gets its own blinking button
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.hotelSlug - Hotel slug for channel subscription
 * @param {number} params.staffId - Current staff ID
 * @returns {Object} Notification state and methods
 */
const useQuickNotifications = ({ hotelSlug, staffId }) => {
  const chatState = useChatState();
  
  // Store notifications by type
  // Format: { type: 'staff_chat_message', count: 5, from: 'John Doe', conversationId: 123, lastUpdate: Date }
  const [notifications, setNotifications] = useState([]);

  /**
   * Add or update a notification
   */
  const addNotification = useCallback((notificationData) => {
    const {
      type,
      conversation_id,
      sender,
      message_type,
      notification_type
    } = notificationData;

    // Determine notification category
    let category = 'staff_chat';
    let from = 'Staff Chat';
    let icon = 'chat-dots-fill';
    let color = '#3498db';

    if (type === 'mention' || notification_type === 'mention') {
      category = 'staff_chat_mention';
      from = sender 
        ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.username || 'Someone'
        : 'Someone';
      icon = 'at';
      color = '#f39c12';
    } else if (type === 'staff_chat_message' || notification_type === 'staff_chat_message') {
      category = 'staff_chat_message';
      from = sender 
        ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.username || 'Someone'
        : 'Someone';
      icon = 'chat-left-text-fill';
      color = '#3498db';
    } else if (message_type === 'file' || type === 'staff_chat_file') {
      category = 'staff_chat_file';
      from = sender 
        ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.username || 'Someone'
        : 'Someone';
      icon = 'paperclip';
      color = '#9b59b6';
    }

    setNotifications(prev => {
      const existing = prev.find(n => 
        n.category === category && n.conversationId === conversation_id
      );

      if (existing) {
        // Update existing notification - increment count
        return prev.map(n => 
          n.category === category && n.conversationId === conversation_id
            ? {
                ...n,
                count: n.count + 1,
                from,
                lastUpdate: new Date(),
                data: notificationData
              }
            : n
        );
      } else {
        // Add new notification
        return [
          ...prev,
          {
            id: `${category}-${conversation_id}-${Date.now()}`,
            category,
            conversationId: conversation_id,
            count: 1,
            from,
            icon,
            color,
            lastUpdate: new Date(),
            data: notificationData
          }
        ];
      }
    });
  }, []);

  /**
   * Remove a notification by ID
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  /**
   * Remove all notifications of a specific category
   */
  const removeNotificationsByCategory = useCallback((category) => {
    setNotifications(prev => prev.filter(n => n.category !== category));
  }, []);

  /**
   * Remove notifications for a specific conversation
   */
  const removeNotificationsByConversation = useCallback((conversationId) => {
    setNotifications(prev => prev.filter(n => n.conversationId !== conversationId));
  }, []);

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Monitor chatStore for new messages and create notifications
   */
  useEffect(() => {
    if (!chatState || !staffId || !hotelSlug) {
      return;
    }

    // Process conversations for unread messages and create notifications
    Object.values(chatState.conversationsById || {}).forEach(conversation => {
      if (conversation.unreadCount > 0 && conversation.messages) {
        // Get recent unread messages
        const recentMessages = conversation.messages
          .filter(msg => !msg.read_by_staff)
          .slice(-conversation.unreadCount);

        recentMessages.forEach(message => {
          if (message.sender_id !== staffId) {
            // Create notification for each unread message
            const notificationData = {
              type: 'staff_chat_message',
              conversation_id: conversation.id,
              sender: {
                first_name: message.sender_first_name,
                last_name: message.sender_last_name,
                username: message.sender_username
              },
              message_type: message.message_type || 'text',
              notification_type: message.is_mention ? 'mention' : 'staff_chat_message'
            };

            // Only add if we haven't already processed this message
            const notificationId = `${notificationData.type}-${conversation.id}-${message.id}`;
            const exists = notifications.find(n => n.id === notificationId);
            
            if (!exists) {
              addNotification(notificationData);
            }
          }
        });
      }
    });
  }, [chatState, staffId, hotelSlug, notifications, addNotification]);

  /**
   * Auto-remove old notifications after 5 minutes
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      setNotifications(prev => 
        prev.filter(n => new Date(n.lastUpdate) > fiveMinutesAgo)
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    removeNotificationsByCategory,
    removeNotificationsByConversation,
    clearAllNotifications,
    hasNotifications: notifications.length > 0,
    totalCount: notifications.reduce((sum, n) => sum + n.count, 0)
  };
};

export default useQuickNotifications;
