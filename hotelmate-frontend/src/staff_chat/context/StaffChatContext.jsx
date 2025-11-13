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
    console.log('📢 [StaffChatContext] Message listener registered. Total:', messageListenersRef.current.size);
    
    // Return unsubscribe function
    return () => {
      messageListenersRef.current.delete(callback);
      console.log('📢 [StaffChatContext] Message listener removed. Total:', messageListenersRef.current.size);
    };
  }, []);
  
  /**
   * Subscribe to conversation update events
   * Components can register callbacks to receive conversation updates
   */
  const subscribeToConversationUpdates = useCallback((callback) => {
    conversationUpdateListenersRef.current.add(callback);
    console.log('📢 [StaffChatContext] Conversation update listener registered. Total:', conversationUpdateListenersRef.current.size);
    
    // Return unsubscribe function
    return () => {
      conversationUpdateListenersRef.current.delete(callback);
      console.log('📢 [StaffChatContext] Conversation update listener removed. Total:', conversationUpdateListenersRef.current.size);
    };
  }, []);
  
  /**
   * Broadcast new message to all listeners
   */
  const broadcastMessage = useCallback((message) => {
    console.log('📣 [StaffChatContext] Broadcasting message to', messageListenersRef.current.size, 'listeners');
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

    console.log('🔌 [STAFF-TO-STAFF CHAT] Initializing Pusher for STAFF-TO-STAFF chat');
    console.log('🔌 [STAFF-TO-STAFF CHAT] Hotel:', hotelSlug, 'Staff ID:', staffId);
    console.log('🔌 [STAFF-TO-STAFF CHAT] ⚠️ Channel format: {hotel}-staff-conversation-{id} (NO -chat suffix!)');
    console.log('🔌 [STAFF-TO-STAFF CHAT] ⚠️ Notification channel: {hotel}-staff-{id}-notifications (NOT -chat!)');

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      forceTLS: true,
    });
    pusherRef.current = pusher;

    pusher.connection.bind("connected", () => {
      console.log("✅ [STAFF-TO-STAFF] Pusher connected for staff-to-staff chat");
      console.log("✅ [STAFF-TO-STAFF] Connection state:", pusher.connection.state);
    });

    pusher.connection.bind("error", (err) => {
      console.error("❌ [STAFF-TO-STAFF] Pusher connection error:", err);
    });

    // Subscribe to personal staff notifications channel
    // Format for staff-to-STAFF: {hotel_slug}-staff-{staff_id}-notifications (NOT -chat!)
    const staffNotificationsChannel = `${hotelSlug}-staff-${staffId}-notifications`;
    console.log('📡 [STAFF-TO-STAFF CHAT] Subscribing to personal notifications:', staffNotificationsChannel);
    console.log('📡 [STAFF-TO-STAFF CHAT] NOTE: This is staff-to-staff, not staff-to-guest!');
    
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
      console.log("🔔 [STAFF-TO-STAFF] ==================== MENTION NOTIFICATION ====================");
      console.log("🔔 [STAFF-TO-STAFF] Channel:", staffNotificationsChannel);
      console.log("🔔 [STAFF-TO-STAFF] Event: message-mention");
      console.log("🔔 [STAFF-TO-STAFF] Data:", JSON.stringify(data, null, 2));
      
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
      console.log("📬 [STAFF-TO-STAFF] ==================== NEW CONVERSATION ====================");
      console.log("📬 [STAFF-TO-STAFF] Channel:", staffNotificationsChannel);
      console.log("📬 [STAFF-TO-STAFF] Event: new-conversation");
      console.log("📬 [STAFF-TO-STAFF] Data:", JSON.stringify(data, null, 2));
      
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
      console.log('📡 [STAFF-TO-STAFF CHAT] Subscribing to conversation channel:', channelName);
      console.log('📡 [STAFF-TO-STAFF CHAT] Conv ID:', conv.id, 'Title:', conv.title);
      
      const channel = pusherRef.current.subscribe(channelName);

      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`✅ [STAFF CHAT] Successfully subscribed to conversation: ${channelName}`);
      });

      channel.bind('pusher:subscription_error', (error) => {
        console.error(`❌ [STAFF CHAT] Subscription error for ${channelName}:`, error);
      });

      // ✅ THIS IS WHERE ALL "new-message" EVENTS COME FROM
      // Backend calls broadcast_new_message() which triggers this event
      channel.bind("new-message", (msg) => {
        console.log("📨 [STAFF-TO-STAFF] ==================== NEW MESSAGE IN CONVERSATION ====================");
        console.log("📨 [STAFF-TO-STAFF] Channel:", channelName);
        console.log("📨 [STAFF-TO-STAFF] Conversation ID:", conv.id);
        console.log("📨 [STAFF-TO-STAFF] Message ID:", msg.id);
        // Backend sends sender as plain number, not nested object
        const senderId = msg.sender_info?.id || msg.sender;
        console.log("📨 [STAFF-TO-STAFF] Sender ID:", senderId, "(from msg.sender)");
        console.log("📨 [STAFF-TO-STAFF] My ID:", staffId);
        console.log("📨 [STAFF-TO-STAFF] Current conversation:", currentConversationId);
        console.log("📨 [STAFF-TO-STAFF] Full message data:", JSON.stringify(msg, null, 2));
        console.log("=================================================================");
        
        // 🔥 BROADCAST MESSAGE TO ALL LISTENERS (ChatWindowPopup, QuickNotifications, etc.)
        broadcastMessage(msg);
        
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === msg.conversation_id || c.id === conv.id) {
              const isMyMessage = senderId === staffId;
              const isCurrentConv = c.id === currentConversationId;
              
              console.log("📨 [STAFF-TO-STAFF] Updating conversation:", {
                convId: c.id,
                isMyMessage,
                isCurrentConv,
                oldUnread: c.unread_count,
                willIncrement: !isCurrentConv && !isMyMessage
              });
              
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
