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

  // Get staff ID and hotel slug from user
  const staffId = user?.staff_id || user?.id;
  const hotelSlug = user?.hotel_slug;

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

    console.log('🔌 [STAFF CHAT] Initializing Pusher for staff-to-staff chat');
    console.log('🔌 [STAFF CHAT] Hotel:', hotelSlug, 'Staff ID:', staffId);

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      forceTLS: true,
    });
    pusherRef.current = pusher;

    pusher.connection.bind("connected", () => {
      console.log("✅ [STAFF CHAT] Pusher connected for staff-to-staff chat");
    });

    pusher.connection.bind("error", (err) => {
      console.error("❌ [STAFF CHAT] Pusher connection error:", err);
    });

    // Subscribe to personal staff notifications channel
    // Format: {hotel_slug}-staff-{staff_id}-notifications
    const staffNotificationsChannel = `${hotelSlug}-staff-${staffId}-notifications`;
    console.log('📡 [STAFF CHAT] Subscribing to personal notifications:', staffNotificationsChannel);
    
    const notifChannel = pusher.subscribe(staffNotificationsChannel);
    
    notifChannel.bind('pusher:subscription_succeeded', () => {
      console.log(`✅ [STAFF CHAT] Successfully subscribed to: ${staffNotificationsChannel}`);
    });

    notifChannel.bind('pusher:subscription_error', (error) => {
      console.error(`❌ [STAFF CHAT] Subscription error for ${staffNotificationsChannel}:`, error);
    });
    
    // Listen for new messages from other staff
    notifChannel.bind("new-message", (data) => {
      console.log("💬 [STAFF CHAT] New message notification received:", data);
      
      // Refresh conversations to get updated last message and unread counts
      fetchStaffConversations();

      // Show browser notification if not the current conversation
      if (
        data.conversation_id !== currentConversationId &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const notification = new Notification(`New Message from ${data.sender_name}`, {
          body: data.message || 'New message',
          icon: data.sender_profile_image || "/favicon-32x32.png",
          tag: `staff-chat-${data.message_id}`,
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/${hotelSlug}/staff-chat`;
        };
      }
    });

    // Listen for mentions
    notifChannel.bind("message-mention", (data) => {
      console.log("🔔 [STAFF CHAT] Mention notification received:", data);
      
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

      // Format: {hotel_slug}-staff-conversation-{conversation_id}
      const channelName = `${hotelSlug}-staff-conversation-${conv.id}`;
      console.log('📡 [STAFF CHAT] Subscribing to conversation channel:', channelName);
      
      const channel = pusherRef.current.subscribe(channelName);

      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`✅ [STAFF CHAT] Successfully subscribed to conversation: ${channelName}`);
      });

      channel.bind('pusher:subscription_error', (error) => {
        console.error(`❌ [STAFF CHAT] Subscription error for ${channelName}:`, error);
      });

      channel.bind("new-message", (msg) => {
        console.log(`📨 [STAFF CHAT] New message in conversation ${conv.id}:`, msg);
        
        setConversations((prev) =>
          prev.map((c) =>
            c.id === msg.conversation_id || c.id === conv.id
              ? {
                  ...c,
                  last_message: {
                    message: msg.message || msg.content,
                    has_attachments: msg.attachments?.length > 0 || false,
                    attachments: msg.attachments || []
                  },
                  // Don't increment unread if this is the current conversation
                  unread_count:
                    c.id === currentConversationId
                      ? c.unread_count
                      : (c.unread_count || 0) + 1,
                }
              : c
          )
        );

        // Show desktop notification if not current conversation
        if (
          msg.conversation_id !== currentConversationId &&
          msg.sender?.id !== staffId &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const senderName = msg.sender?.full_name || msg.sender_name || 'Staff member';
          new Notification(`New message from ${senderName}`, {
            body: msg.message || msg.content || 'New message',
            icon: msg.sender?.profile_image_url || "/favicon-32x32.png",
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
      setCurrentConversationId
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
