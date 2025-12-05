import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useStaffChat } from '../context/StaffChatContext';
import { useChatState } from '@/realtime/stores/chatStore.jsx';
import QuickNotificationButtons from './QuickNotificationButtons';

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

  // New chatStore + legacy context
  const chatState = useChatState();
  const { conversations, totalUnread } = useStaffChat();

  // Local notification state
  const [notifications, setNotifications] = useState([]);

  // ❗ Use ref instead of state to avoid infinite loop
  const previousMessagesRef = useRef({});

  // Monitor chatStore for new messages and generate notifications
  useEffect(() => {
    if (!hotelSlug || !staffId) return;

    console.log('🔔 [GlobalQuickNotifications] Monitoring chatStore for new messages');

    const conversationsArray = Object.values(chatState.conversationsById || {});

    conversationsArray.forEach((conversation) => {
      const conversationId = conversation.id;
      if (!conversationId) return;

      const currentMessages = conversation.messages || [];
      const previousMessages = previousMessagesRef.current[conversationId] || [];

      // Find new messages compared to last snapshot
      const newMessages = currentMessages.filter(
        (msg) => !previousMessages.some((prevMsg) => prevMsg.id === msg.id)
      );

      if (newMessages.length > 0) {
        newMessages.forEach((message) => {
          const senderId =
            message.sender_info?.id || message.sender_id || message.sender;

          // Ignore my own messages
          if (senderId === staffId) {
            console.log('⏭️ [GlobalQuickNotifications] Skipping my own message');
            return;
          }

          console.log(
            '🔔 [GlobalQuickNotifications] New message detected! Adding notification button'
          );

          const senderName =
            message.sender_info?.full_name ||
            message.sender_name ||
            'Someone';

          setNotifications((prev) => {
            const existing = prev.find(
              (n) => n.conversationId === conversationId
            );

            if (existing) {
              // Update count + timestamp
              return prev.map((n) =>
                n.conversationId === conversationId
                  ? {
                      ...n,
                      count: n.count + 1,
                      lastUpdate: new Date(),
                      data: message,
                    }
                  : n
              );
            } else {
              // New notification entry
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
                  data: message,
                },
              ];
            }
          });
        });
      }
    });

    // 🔁 Update snapshot AFTER processing — does NOT trigger re-render
    const newSnapshot = {};
    Object.values(chatState.conversationsById || {}).forEach((conversation) => {
      if (conversation.id) {
        newSnapshot[conversation.id] = conversation.messages || [];
      }
    });
    previousMessagesRef.current = newSnapshot;
  }, [chatState.conversationsById, hotelSlug, staffId]);

  // Remove notifications when messages are read
  useEffect(() => {
    if (totalUnread === 0 && notifications.length > 0) {
      console.log(
        '🧹 [GlobalQuickNotifications] All messages read, clearing notifications'
      );
      setNotifications([]);
      return;
    }

    if (conversations.length > 0 && notifications.length > 0) {
      setNotifications((prev) =>
        prev.filter((notification) => {
          const conversation = conversations.find(
            (c) => c.id === notification.conversationId
          );
          const hasUnread =
            conversation &&
            (conversation.unread_count > 0 || conversation.unreadCount > 0);
          return hasUnread;
        })
      );
    }
  }, [totalUnread, conversations, notifications.length]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const removeNotificationsByConversation = useCallback((conversationId) => {
    setNotifications((prev) =>
      prev.filter((n) => n.conversationId !== conversationId)
    );
  }, []);

  if (!user || !hotelSlug || !staffId) return null;
  if (notifications.length === 0) return null;

  const handleNotificationDismiss = (notificationId) => {
    removeNotification(notificationId);
  };

  const handleNotificationClick = (notification) => {
    if (notification.conversationId) {
      removeNotificationsByConversation(notification.conversationId);
    } else {
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
