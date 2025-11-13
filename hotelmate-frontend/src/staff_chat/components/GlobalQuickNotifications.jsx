import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useStaffChat } from '../context/StaffChatContext';
import QuickNotificationButtons from './QuickNotificationButtons';
import useUnreadCount from '../hooks/useUnreadCount';

/**
 * GlobalQuickNotifications Component
 * Displays quick notification buttons globally across the app
 * Automatically removes buttons when all messages are read
 * NOW USES StaffChatContext as single source of truth!
 */
const GlobalQuickNotifications = () => {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  const staffId = user?.staff_id || user?.id;
  
  // Get subscription methods and conversations from StaffChatContext (single source of truth!)
  const { subscribeToMessages, conversations } = useStaffChat();
  
  // Store notifications state locally
  const [notifications, setNotifications] = useState([]);

  // Get actual unread count from API
  const { totalUnread, conversationsWithUnread } = useUnreadCount(hotelSlug, 10000); // Check every 10 seconds

  // Subscribe to new messages from StaffChatContext
  useEffect(() => {
    if (!hotelSlug || !staffId) return;

    console.log('🔔 [GlobalQuickNotifications] Subscribing to StaffChatContext messages');

    const unsubscribe = subscribeToMessages((message) => {
      // Check if message is from someone else (not me)
      const senderId = message.sender_info?.id || message.sender;
      if (senderId === staffId) {
        console.log('⏭️ [GlobalQuickNotifications] Skipping my own message');
        return;
      }

      console.log('🔔 [GlobalQuickNotifications] New message received! Adding notification button');
      
      const conversationId = message.conversation || message.conversation_id;
      const senderName = message.sender_info?.full_name || message.sender_name || 'Someone';

      // Add or update notification
      setNotifications(prev => {
        const existing = prev.find(n => n.conversationId === conversationId);
        
        if (existing) {
          // Update count
          return prev.map(n => 
            n.conversationId === conversationId
              ? { ...n, count: n.count + 1, lastUpdate: new Date() }
              : n
          );
        } else {
          // Add new notification
          return [
            ...prev,
            {
              id: `msg-${conversationId}-${Date.now()}`,
              category: 'staff_chat_message',
              conversationId,
              count: 1,
              from: senderName,
              icon: 'chat-left-text-fill',
              color: '#3498db',
              lastUpdate: new Date(),
              data: message
            }
          ];
        }
      });
    });

    return () => {
      console.log('🧹 [GlobalQuickNotifications] Unsubscribing from StaffChatContext');
      unsubscribe();
    };
  }, [subscribeToMessages, hotelSlug, staffId]);

  // Remove notifications when messages are read
  useEffect(() => {
    if (totalUnread === 0 && notifications.length > 0) {
      // All messages are read, clear all staff chat notifications
      console.log('🧹 [GlobalQuickNotifications] All messages read, clearing notifications');
      setNotifications([]);
    } else if (conversationsWithUnread.length > 0) {
      // Check each notification and remove if conversation has no unread
      setNotifications(prev => 
        prev.filter(notification => {
          const hasUnread = conversationsWithUnread.some(
            c => c.conversation_id === notification.conversationId && c.unread_count > 0
          );
          return hasUnread;
        })
      );
    }
  }, [totalUnread, conversationsWithUnread, notifications.length]);

  // Handler to remove a notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Handler to remove notifications by conversation
  const removeNotificationsByConversation = useCallback((conversationId) => {
    setNotifications(prev => prev.filter(n => n.conversationId !== conversationId));
  }, []);

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
      conversations={conversations}
    />
  );
};

export default GlobalQuickNotifications;
