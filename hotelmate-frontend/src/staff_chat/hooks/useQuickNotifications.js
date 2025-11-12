import { useState, useEffect, useCallback } from 'react';
import { usePusherContext } from '../context/PusherProvider';

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
  const { bind, unbind, subscribe, unsubscribe, isReady, enabled } = usePusherContext();
  
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
   * Handle incoming notification from Pusher
   */
  const handlePusherNotification = useCallback((data) => {
    console.log('Quick notification received:', data);
    addNotification(data);
  }, [addNotification]);

  /**
   * Subscribe to personal notification channel
   */
  useEffect(() => {
    if (!enabled || !isReady || !staffId || !hotelSlug) {
      return;
    }

    // Personal notification channel: {hotel_slug}-staff-{staff_id}-notifications
    const personalChannel = `${hotelSlug}-staff-${staffId}-notifications`;

    console.log(`[QuickNotifications] Subscribing to: ${personalChannel}`);
    subscribe(personalChannel);

    // Bind to notification events
    bind(personalChannel, 'new-message', handlePusherNotification);
    bind(personalChannel, 'mention', handlePusherNotification);
    bind(personalChannel, 'file-uploaded', handlePusherNotification);

    // Cleanup
    return () => {
      console.log(`[QuickNotifications] Unsubscribing from: ${personalChannel}`);
      unbind(personalChannel, 'new-message', handlePusherNotification);
      unbind(personalChannel, 'mention', handlePusherNotification);
      unbind(personalChannel, 'file-uploaded', handlePusherNotification);
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
    handlePusherNotification
  ]);

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
