import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import useQuickNotifications from '../hooks/useQuickNotifications';
import QuickNotificationButtons from './QuickNotificationButtons';
import useUnreadCount from '../hooks/useUnreadCount';

/**
 * GlobalQuickNotifications Component
 * Displays quick notification buttons globally across the app
 * Automatically removes buttons when all messages are read
 */
const GlobalQuickNotifications = () => {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  const staffId = user?.staff_id || user?.id;

  // Get quick notifications from Pusher events
  const {
    notifications,
    removeNotification,
    removeNotificationsByConversation,
    clearAllNotifications
  } = useQuickNotifications({ hotelSlug, staffId });

  // Get actual unread count from API
  const { totalUnread, conversationsWithUnread } = useUnreadCount(hotelSlug, 10000); // Check every 10 seconds

  // Remove notifications when messages are read
  useEffect(() => {
    if (totalUnread === 0 && notifications.length > 0) {
      // All messages are read, clear all staff chat notifications
      clearAllNotifications();
    } else if (conversationsWithUnread.length > 0) {
      // Check each notification and remove if conversation has no unread
      notifications.forEach(notification => {
        if (notification.category.startsWith('staff_chat')) {
          const hasUnread = conversationsWithUnread.some(
            c => c.conversation_id === notification.conversationId && c.unread_count > 0
          );
          
          if (!hasUnread) {
            // This conversation has been read, remove the notification
            removeNotification(notification.id);
          }
        }
      });
    }
  }, [totalUnread, conversationsWithUnread, notifications, clearAllNotifications, removeNotification]);

  // Don't show anything if user is not logged in
  if (!user || !hotelSlug || !staffId) {
    return null;
  }

  // Don't show anything if no notifications
  if (notifications.length === 0) {
    return null;
  }

  const handleNotificationDismiss = (notificationId) => {
    removeNotification(notificationId);
  };

  const handleNotificationClick = (notification) => {
    // When clicked, remove notification for that conversation
    if (notification.conversationId) {
      removeNotificationsByConversation(notification.conversationId);
    } else {
      // If no specific conversation, just remove this notification
      removeNotification(notification.id);
    }
  };

  return (
    <QuickNotificationButtons
      notifications={notifications}
      onNotificationClick={handleNotificationClick}
      onNotificationDismiss={handleNotificationDismiss}
      hotelSlug={hotelSlug}
      mainColor={user?.theme?.main_color || '#3498db'}
    />
  );
};

export default GlobalQuickNotifications;
