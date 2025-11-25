// src/staff_chat/context/StaffChatContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import Pusher from "pusher-js";
import { fetchConversations } from "../services/staffChatApi";
import { useAuth } from "@/context/AuthContext";

const StaffChatContext = createContext(undefined);

export const StaffChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const pusherRef = useRef(null);
  const channelsRef = useRef(new Map());
  
  // Event listeners for broadcasting messages to all components
  const messageListenersRef = useRef(new Set());
  const conversationUpdateListenersRef = useRef(new Set());

  // Get staff ID and hotel slug from user
  const staffId = user?.staff_id || user?.id;
  const hotelSlug = user?.hotel_slug;
  
  /**
   * Subscribe to new message events
   * Components can register callbacks to receive all new messages
   */
  const subscribeToMessages = useCallback((callback) => {
    messageListenersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);
  
  /**
   * Subscribe to conversation update events
   * Components can register callbacks to receive conversation updates
   */
  const subscribeToConversationUpdates = useCallback((callback) => {
    conversationUpdateListenersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      conversationUpdateListenersRef.current.delete(callback);
    };
  }, []);
  
  /**
   * Broadcast new message to all listeners
   */
  const broadcastMessage = useCallback((message) => {
    messageListenersRef.current.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('❌ [StaffChatContext] Error in message listener:', error);
      }
    });
  }, []);
  
  /**
   * Broadcast conversation update to all listeners
   */
  const broadcastConversationUpdate = useCallback((conversationId, updates) => {
    console.log('📣 [StaffChatContext] Broadcasting conversation update to', conversationUpdateListenersRef.current.size, 'listeners');
    conversationUpdateListenersRef.current.forEach(callback => {
      try {
        callback(conversationId, updates);
      } catch (error) {
        console.error('❌ [StaffChatContext] Error in conversation update listener:', error);
      }
    });
  }, []);

  // Fetch staff conversations
  const fetchStaffConversations = useCallback(async () => {
    if (!hotelSlug) return;

    try {
      const res = await fetchConversations(hotelSlug);
      const convs = res?.results || res || [];
      setConversations(convs);
    } catch (err) {
      console.error("Failed to fetch staff conversations:", err);
    }
  }, [hotelSlug]);

  useEffect(() => {
    fetchStaffConversations();
  }, [fetchStaffConversations]);

  // Initialize Pusher for staff-to-staff chat
  useEffect(() => {
    if (!hotelSlug || !staffId) return;

   

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      forceTLS: true,
    });
    pusherRef.current = pusher;

   

   

    // Subscribe to personal staff notifications channel
    // Format for staff-to-STAFF: {hotel_slug}-staff-{staff_id}-notifications (NOT -chat!)
    const staffNotificationsChannel = `${hotelSlug}-staff-${staffId}-notifications`;
    
    const notifChannel = pusher.subscribe(staffNotificationsChannel);
    
    notifChannel.bind('pusher:subscription_succeeded', () => {
      console.log(`✅ [STAFF CHAT] Successfully subscribed to: ${staffNotificationsChannel}`);
    });

    notifChannel.bind('pusher:subscription_error', (error) => {
      console.error(`❌ [STAFF CHAT] Subscription error for ${staffNotificationsChannel}:`, error);
    });
    
    // ⚠️ IMPORTANT: Backend does NOT send "new-message" to notification channel!
    // Notification channel ONLY receives: message-mention, new-conversation
    // All "new-message" events come through conversation channels below

    // Listen for mentions (this IS sent to notification channel)
    notifChannel.bind("message-mention", (data) => {
     
      // Refresh conversations
      fetchStaffConversations();

      // Show notification
      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(`${data.sender_name} mentioned you`, {
          body: data.message || 'You were mentioned in a message',
          icon: data.sender_profile_image || "/favicon-32x32.png",
          tag: `staff-mention-${data.message_id}`,
        });
      }
    });

    // Listen for new conversation invites (this IS sent to notification channel)
    notifChannel.bind("new-conversation", (data) => {
      
      
      // Refresh to show new conversation
      fetchStaffConversations();

      // Show notification
      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Added to new conversation", {
          body: data.title || 'You were added to a conversation',
          icon: "/favicon-32x32.png",
          tag: `new-conv-${data.conversation_id}`,
        });
      }
    });

    return () => {
      notifChannel.unbind_all();
      pusher.unsubscribe(staffNotificationsChannel);
      
      channelsRef.current.forEach((ch) => {
        ch.unbind_all();
        pusher.unsubscribe(ch.name);
      });
      channelsRef.current.clear();
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [hotelSlug, staffId, fetchStaffConversations, currentConversationId]);

  // Subscribe to individual conversation channels dynamically
  useEffect(() => {
    if (!pusherRef.current || !hotelSlug) return;

    conversations.forEach((conv) => {
      if (channelsRef.current.has(conv.id)) return;

      // Format for staff-to-STAFF: {hotel_slug}-staff-conversation-{conversation_id} (NO -chat suffix!)
      const channelName = `${hotelSlug}-staff-conversation-${conv.id}`;
     
      
      const channel = pusherRef.current.subscribe(channelName);

    

      channel.bind('pusher:subscription_error', (error) => {
        console.error(`❌ [STAFF CHAT] Subscription error for ${channelName}:`, error);
      });

      // ✅ THIS IS WHERE ALL "new-message" EVENTS COME FROM
      // Backend calls broadcast_new_message() which triggers this event
      channel.bind("new-message", (msg) => {
      
        // 🔥 BROADCAST MESSAGE TO ALL LISTENERS (ChatWindowPopup, QuickNotifications, etc.)
        broadcastMessage(msg);
        
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === msg.conversation_id || c.id === conv.id) {
              const isMyMessage = senderId === staffId;
              const isCurrentConv = c.id === currentConversationId;
              
             
              
              const updatedConv = {
                ...c,
                last_message: {
                  message: msg.message || msg.content,
                  has_attachments: msg.attachments?.length > 0 || false,
                  attachments: msg.attachments || [],
                  timestamp: msg.timestamp || msg.created_at
                },
                // Don't increment unread if:
                // 1. This is the current conversation (user is viewing it)
                // 2. I sent the message
                unread_count:
                  isCurrentConv || isMyMessage
                    ? c.unread_count
                    : (c.unread_count || 0) + 1,
                updated_at: msg.timestamp || msg.created_at
              };
              
              // 🔥 BROADCAST CONVERSATION UPDATE TO ALL LISTENERS (ConversationsList, etc.)
              broadcastConversationUpdate(c.id, updatedConv);
              
              return updatedConv;
            }
            return c;
          })
        );

        // Show desktop notification if not current conversation
        if (
          msg.conversation_id !== currentConversationId &&
          senderId !== staffId &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const senderName = msg.sender_info?.full_name || msg.sender_name || 'Staff member';
          new Notification(`New message from ${senderName}`, {
            body: msg.message || msg.content || 'New message',
            icon: msg.sender?.profile_image_url || "/favicon-32x32.png",
            tag: `staff-msg-${msg.id}`, // Prevent duplicate notifications for same message
          });
        }
      });

      channelsRef.current.set(conv.id, channel);
    });
  }, [conversations, hotelSlug, currentConversationId, staffId]);

  const markConversationRead = async (conversationId) => {
    try {
      // API call to mark as read will be handled by the component
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <StaffChatContext.Provider value={{
      conversations,
      fetchStaffConversations,
      markConversationRead,
      totalUnread,
      pusherInstance: pusherRef.current,
      currentConversationId,
      setCurrentConversationId,
      // 🔥 NEW: Event subscription methods for components
      subscribeToMessages,
      subscribeToConversationUpdates,
      hotelSlug,
      staffId
    }}>
      {children}
    </StaffChatContext.Provider>
  );
};

export const useStaffChat = () => {
  const context = useContext(StaffChatContext);
  if (context === undefined) {
    throw new Error('useStaffChat must be used within a StaffChatProvider');
  }
  return context;
};
