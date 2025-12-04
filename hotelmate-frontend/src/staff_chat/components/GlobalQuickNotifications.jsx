import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useStaffChat } from '../context/StaffChatContext';
import { useChatState } from '@/realtime/stores/chatStore.jsx';
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
  
  // Get data from both contexts - new chatStore and legacy for compatibility
  const chatState = useChatState();
  const { conversations, totalUnread } = useStaffChat();
  
  // Store notifications state locally
  const [notifications, setNotifications] = useState([]);
  const [previousConversationMessages, setPreviousConversationMessages] = useState({});

  // Monitor chatStore for new messages and generate notifications
  useEffect(() => {
    if (!hotelSlug || !staffId) return;

    console.log('🔔 [GlobalQuickNotifications] Monitoring chatStore for new messages');

    // Check each conversation for new messages
    Object.values(chatState.conversationsById).forEach(conversation => {
      const conversationId = conversation.id;
      const currentMessages = conversation.messages;
      const previousMessages = previousConversationMessages[conversationId] || [];
      
      // Find new messages (messages that weren't in previous state)
      const newMessages = currentMessages.filter(msg => 
        !previousMessages.some(prevMsg => prevMsg.id === msg.id)
      );
      
      if (newMessages.length > 0) {
        newMessages.forEach(message => {
          // Check if message is from someone else (not me)
          const senderId = message.sender_info?.id || message.sender_id || message.sender;
          if (senderId === staffId) {
            console.log('⏭️ [GlobalQuickNotifications] Skipping my own message');
            return;
          }

          console.log('🔔 [GlobalQuickNotifications] New message detected! Adding notification button');
          
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
      }
    });

    // Update previous messages state
    const newPreviousMessages = {};
    Object.values(chatState.conversationsById).forEach(conversation => {
      newPreviousMessages[conversation.id] = [...conversation.messages];
    });
    setPreviousConversationMessages(newPreviousMessages);

  }, [chatState.conversationsById, hotelSlug, staffId, previousConversationMessages]);

  // Remove notifications when messages are read
  useEffect(() => {
    if (totalUnread === 0 && notifications.length > 0) {
      // All messages are read, clear all staff chat notifications
      console.log('🧹 [GlobalQuickNotifications] All messages read, clearing notifications');
      setNotifications([]);
    } else if (conversations.length > 0) {
      // Check each notification and remove if conversation has no unread
      setNotifications(prev => 
        prev.filter(notification => {
          const conversation = conversations.find(c => c.id === notification.conversationId);
          const hasUnread = conversation && (conversation.unread_count > 0 || conversation.unreadCount > 0);
          return hasUnread;
        })
      );
    }
  }, [totalUnread, conversations, notifications.length]);

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
