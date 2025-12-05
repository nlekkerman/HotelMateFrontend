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
    if (!hotelSlug || !staffId) {
      console.log('🚫 [GlobalQuickNotifications] Missing required data:', { hotelSlug, staffId });
      return;
    }

    console.log('🔔 [GlobalQuickNotifications] Monitoring chatStore for new messages');
    console.log('📊 [GlobalQuickNotifications] Current chatState:', chatState);
    console.log('🗣️ [GlobalQuickNotifications] Current conversations from context:', conversations);
    console.log('📈 [GlobalQuickNotifications] Total unread count:', totalUnread);

    const conversationsArray = Object.values(chatState.conversationsById || {});
    console.log('💬 [GlobalQuickNotifications] Processing conversations:', conversationsArray.length);

    conversationsArray.forEach((conversation) => {
      const conversationId = conversation.id;
      if (!conversationId) {
        console.warn('⚠️ [GlobalQuickNotifications] Conversation missing ID:', conversation);
        return;
      }

      console.log(`🔍 [GlobalQuickNotifications] Processing conversation ${conversationId}:`, conversation);

      const currentMessages = conversation.messages || [];
      const previousMessages = previousMessagesRef.current[conversationId] || [];

      console.log(`📝 [GlobalQuickNotifications] Conversation ${conversationId} - Current messages: ${currentMessages.length}, Previous: ${previousMessages.length}`);

      // Find new messages compared to last snapshot
      const newMessages = currentMessages.filter(
        (msg) => !previousMessages.some((prevMsg) => prevMsg.id === msg.id)
      );

      console.log(`🆕 [GlobalQuickNotifications] Conversation ${conversationId} - New messages found: ${newMessages.length}`);
      console.log(`🔍 [GlobalQuickNotifications] Current messages IDs:`, currentMessages.map(m => m.id));
      console.log(`🔍 [GlobalQuickNotifications] Previous messages IDs:`, previousMessages.map(m => m.id));

      if (newMessages.length > 0) {
        console.log(`📨 [GlobalQuickNotifications] Processing ${newMessages.length} new messages for conversation ${conversationId}`);
        
        newMessages.forEach((message) => {
          const senderId =
            message.sender_info?.id || message.sender_id || message.sender;

          console.log(`👤 [GlobalQuickNotifications] Message from sender ${senderId} (my ID: ${staffId}):`, message);

          // Ignore my own messages
          if (senderId === staffId) {
            console.log('⏭️ [GlobalQuickNotifications] Skipping my own message');
            return;
          }

          console.log(
            '🔔 [GlobalQuickNotifications] New message from OTHER USER detected! Adding notification button'
          );

          const senderName =
            message.sender_info?.full_name ||
            message.sender_name ||
            'Someone';

          setNotifications((prev) => {
            const existing = prev.find(
              (n) => n.conversationId === conversationId
            );

            console.log(`🔔 [GlobalQuickNotifications] Existing notification for ${conversationId}:`, existing);

            if (existing) {
              // Update count + timestamp
              console.log(`🔄 [GlobalQuickNotifications] Updating notification count for ${conversationId}`);
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
              console.log(`✨ [GlobalQuickNotifications] Creating new notification for ${conversationId}`);
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
    console.log('📸 [GlobalQuickNotifications] Updated message snapshots:', Object.keys(newSnapshot));

    // 🚨 FALLBACK: Check for unread conversations that don't have notifications yet
    // This handles cases where message detection might miss something
    if (conversations.length > 0 && totalUnread > 0) {
      console.log('🔍 [GlobalQuickNotifications] FALLBACK CHECK - Looking for unread conversations without notifications');
      
      const unreadConversationsWithoutNotifications = conversations.filter(conv => {
        const hasUnread = (conv.unread_count > 0 || conv.unreadCount > 0);
        const hasNotification = notifications.some(n => n.conversationId === conv.id);
        const shouldHaveNotification = hasUnread && !hasNotification;
        
        if (shouldHaveNotification) {
          console.log(`🚨 [GlobalQuickNotifications] MISSING NOTIFICATION for conversation ${conv.id}:`, {
            unread_count: conv.unread_count,
            unreadCount: conv.unreadCount,
            hasNotification,
            existingNotifications: notifications.map(n => n.conversationId)
          });
        }
        
        return shouldHaveNotification;
      });

      if (unreadConversationsWithoutNotifications.length > 0) {
        console.log(`⚡ [GlobalQuickNotifications] CREATING MISSING NOTIFICATIONS for ${unreadConversationsWithoutNotifications.length} conversations`);
        
        unreadConversationsWithoutNotifications.forEach(conv => {
          const unreadCount = conv.unread_count || conv.unreadCount || 1;
          const lastMessage = conv.last_message || conv.lastMessage;
          
          // Better sender name extraction
          let senderName = 'Someone';
          if (lastMessage?.sender_info?.full_name) {
            senderName = lastMessage.sender_info.full_name;
          } else if (lastMessage?.sender_name) {
            senderName = lastMessage.sender_name;
          } else if (conv.participants) {
            const otherParticipant = conv.participants.find(p => p.id !== staffId);
            if (otherParticipant?.full_name) {
              senderName = otherParticipant.full_name;
            } else if (otherParticipant?.first_name || otherParticipant?.last_name) {
              senderName = `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim();
            }
          }
          
          console.log(`⚡ [GlobalQuickNotifications] Creating missing notification for conversation ${conv.id}: count=${unreadCount}, from=${senderName}`);
          
          setNotifications(prev => {
            // Double-check it doesn't already exist
            const existing = prev.find(n => n.conversationId === conv.id);
            if (existing) {
              console.log(`⚠️ [GlobalQuickNotifications] Notification already exists for ${conv.id}, skipping`);
              return prev;
            }
            
            return [
              ...prev,
              {
                id: `fallback-${conv.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                category: 'staff_chat_message',
                conversationId: conv.id,
                count: unreadCount,
                from: senderName,
                icon: 'chat-left-text-fill',
                color: '#e74c3c', // Different color to identify fallback notifications
                lastUpdate: new Date(),
                data: lastMessage || { conversation_id: conv.id }
              }
            ];
          });
        });
      }
    }
  }, [chatState.conversationsById, hotelSlug, staffId, conversations, totalUnread, notifications]);

  // Remove notifications when messages are read + RESTORE notifications on page refresh
  useEffect(() => {
    console.log('🔄 [GlobalQuickNotifications] Checking notification sync with unread status');
    console.log('📊 [GlobalQuickNotifications] Total unread:', totalUnread, 'Current notifications:', notifications.length);
    
    if (totalUnread === 0 && notifications.length > 0) {
      console.log(
        '🧹 [GlobalQuickNotifications] All messages read, clearing notifications'
      );
      setNotifications([]);
      return;
    }

    // 🆕 NEW: On page refresh, restore notifications for unread conversations
    // Check multiple conditions to detect page refresh or initial load
    const shouldRestoreNotifications = (
      conversations.length > 0 && 
      totalUnread > 0 && 
      notifications.length === 0 &&
      // Additional check: if chatState has conversations but no/few messages loaded yet
      (Object.keys(chatState.conversationsById || {}).length === 0 || 
       Object.values(chatState.conversationsById || {}).every(conv => (conv.messages || []).length === 0))
    );
    
    if (shouldRestoreNotifications) {
      console.log('🔄 [GlobalQuickNotifications] PAGE REFRESH DETECTED - Restoring notifications for unread conversations');
      console.log('🔍 [GlobalQuickNotifications] Restoration conditions:');
      console.log('   - conversations.length:', conversations.length);
      console.log('   - totalUnread:', totalUnread);
      console.log('   - notifications.length:', notifications.length);
      console.log('   - chatState conversations:', Object.keys(chatState.conversationsById || {}).length);
      console.log('   - chatState messages loaded:', Object.values(chatState.conversationsById || {}).map(c => (c.messages || []).length));
      
      const unreadConversations = conversations.filter(c => {
        const hasUnread = (c.unread_count > 0 || c.unreadCount > 0);
        console.log(`📋 [GlobalQuickNotifications] Conversation ${c.id}: unread_count=${c.unread_count}, unreadCount=${c.unreadCount}, hasUnread=${hasUnread}`);
        return hasUnread;
      });
      
      console.log('📝 [GlobalQuickNotifications] Found unread conversations to restore:', unreadConversations.length);
      
      if (unreadConversations.length > 0) {
        const restoredNotifications = unreadConversations.map(conv => {
          const unreadCount = conv.unread_count || conv.unreadCount || 1;
          const lastMessage = conv.last_message || conv.lastMessage;
          
          // Better sender name extraction
          let senderName = 'Someone';
          if (lastMessage?.sender_info?.full_name) {
            senderName = lastMessage.sender_info.full_name;
          } else if (lastMessage?.sender_name) {
            senderName = lastMessage.sender_name;
          } else if (conv.participants) {
            const otherParticipant = conv.participants.find(p => p.id !== staffId);
            if (otherParticipant?.full_name) {
              senderName = otherParticipant.full_name;
            } else if (otherParticipant?.first_name || otherParticipant?.last_name) {
              senderName = `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim();
            }
          }
          
          console.log(`✨ [GlobalQuickNotifications] Restoring notification for conversation ${conv.id}:`);
          console.log(`   - count: ${unreadCount}`);
          console.log(`   - from: ${senderName}`);
          console.log(`   - lastMessage:`, lastMessage);
          console.log(`   - participants:`, conv.participants);
          
          return {
            id: `restored-${conv.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category: 'staff_chat_message',
            conversationId: conv.id,
            count: unreadCount,
            from: senderName,
            icon: 'chat-left-text-fill',
            color: '#3498db',
            lastUpdate: new Date(),
            data: lastMessage || { conversation_id: conv.id }
          };
        });
        
        console.log('🔥 [GlobalQuickNotifications] Setting restored notifications:', restoredNotifications);
        setNotifications(restoredNotifications);
        return;
      }
    }

    // Clean up read notifications
    if (conversations.length > 0 && notifications.length > 0) {
      console.log('🧹 [GlobalQuickNotifications] Filtering out read notifications');
      setNotifications((prev) => {
        const filtered = prev.filter((notification) => {
          const conversation = conversations.find(
            (c) => c.id === notification.conversationId
          );
          const hasUnread =
            conversation &&
            (conversation.unread_count > 0 || conversation.unreadCount > 0);
          
          console.log(`🔍 [GlobalQuickNotifications] Notification ${notification.id} for conversation ${notification.conversationId}: hasUnread=${hasUnread}`);
          return hasUnread;
        });
        
        if (filtered.length !== prev.length) {
          console.log(`🗑️ [GlobalQuickNotifications] Removed ${prev.length - filtered.length} read notifications`);
        }
        
        return filtered;
      });
    }
  }, [totalUnread, conversations, notifications.length, staffId]);

  // 🆕 Additional effect: Handle case where StaffChatContext loads first, then chatState loads
  useEffect(() => {
    console.log('🎯 [GlobalQuickNotifications] Checking chatState load after context');
    
    // Only run if we have conversations but no notifications yet, and chatState just got populated
    const chatStateHasData = Object.keys(chatState.conversationsById || {}).length > 0;
    const someConversationsHaveMessages = Object.values(chatState.conversationsById || {}).some(conv => (conv.messages || []).length > 0);
    
    if (conversations.length > 0 && totalUnread > 0 && notifications.length === 0 && chatStateHasData && !someConversationsHaveMessages) {
      console.log('🎯 [GlobalQuickNotifications] ChatState populated but no messages yet - triggering restoration');
      console.log('   - chatState conversations:', Object.keys(chatState.conversationsById).length);
      console.log('   - conversations with messages:', Object.values(chatState.conversationsById).filter(c => (c.messages || []).length > 0).length);
      
      // Trigger the restoration logic by updating the dependency array
      // This will cause the previous useEffect to run and handle restoration
    }
  }, [chatState.conversationsById, conversations.length, totalUnread, notifications.length]);

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
