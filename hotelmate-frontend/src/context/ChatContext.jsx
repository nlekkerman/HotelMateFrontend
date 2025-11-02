// src/context/ChatContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import Pusher from "pusher-js";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const pusherRef = useRef(null);
  const channelsRef = useRef(new Map());

  // Fetch conversations + unread counts
  const fetchConversations = useCallback(async () => {
    if (!user?.hotel_slug) return;

    try {
      const res = await api.get(`/chat/${user.hotel_slug}/conversations/`);
      const countsRes = await api.get(
        `/chat/hotels/${user.hotel_slug}/conversations/unread-count/`
      );

      const countsMap = {};
      (countsRes.data.rooms || []).forEach((room) => {
        countsMap[room.conversation_id] = room.unread_count;
      });

      const convs = res.data.map((c) => ({
        ...c,
        unread_count: countsMap[c.conversation_id] || 0,
        last_message: c.last_message || "",
      }));

      setConversations(convs);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      toast.error("Failed to load conversations. Please refresh the page.");
    }
  }, [user?.hotel_slug]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Initialize Pusher
  useEffect(() => {
    if (!user?.hotel_slug || !user?.id) return;

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      forceTLS: true,
    });
    pusherRef.current = pusher;

    pusher.connection.bind("connected", () => {
      console.log("✅ Pusher connected for chat");
    });

    pusher.connection.bind("error", (err) => {
      console.error("❌ Pusher chat connection error:", err);
    });

    // Subscribe to global new-conversation channel
    const globalChannel = pusher.subscribe(`${user.hotel_slug}-new-conversation`);
    globalChannel.bind("new-conversation", fetchConversations);

    // Subscribe to staff-specific chat channel for new guest messages
    const staffChatChannel = pusher.subscribe(`${user.hotel_slug}-staff-${user.id}-chat`);
    
    staffChatChannel.bind("new-guest-message", (data) => {
      console.log("💬 New guest message received:", data);
      
      // Refresh conversations to get updated unread counts
      fetchConversations();

      // Show browser notification if not the current conversation
      if (
        data.conversation_id !== currentConversationId &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const notification = new Notification(`New Message from Room ${data.room_number}`, {
          body: data.message,
          icon: "/favicon-32x32.png",
          tag: `chat-${data.message_id}`,
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/${user.hotel_slug}/chat`;
        };
      }

      // Show toast notification
      if (data.conversation_id !== currentConversationId) {
        toast.info(`New message from Room ${data.room_number}`, {
          autoClose: 4000,
          onClick: () => {
            window.location.href = `/${user.hotel_slug}/chat`;
          },
        });
      }
    });

    return () => {
      globalChannel.unbind_all();
      pusher.unsubscribe(`${user.hotel_slug}-new-conversation`);
      
      staffChatChannel.unbind_all();
      pusher.unsubscribe(`${user.hotel_slug}-staff-${user.id}-chat`);
      
      channelsRef.current.forEach((ch) => {
        ch.unbind_all();
        pusher.unsubscribe(ch.name);
      });
      channelsRef.current.clear();
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [user?.hotel_slug, user?.id, fetchConversations, currentConversationId]);

  // Subscribe to individual conversation channels dynamically
  useEffect(() => {
    if (!pusherRef.current) return;

    conversations.forEach((conv) => {
      if (channelsRef.current.has(conv.conversation_id)) return;

      const channelName = `${user.hotel_slug}-conversation-${conv.conversation_id}-chat`;
      const channel = pusherRef.current.subscribe(channelName);

      channel.bind("new-message", (msg) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === msg.conversation
              ? {
                  ...c,
                  last_message: msg.message,
                  // Don't increment unread if this is the current conversation
                  unread_count:
                    c.conversation_id === currentConversationId
                      ? c.unread_count
                      : (c.unread_count || 0) + 1,
                }
              : c
          )
        );

        // Show desktop notifications for guest messages
        if (
          msg.sender_type === "guest" &&
          msg.conversation !== currentConversationId &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(`New message from ${msg.guest_name}`, {
            body: msg.message,
            icon: "/favicon-32x32.png",
          });
        }
      });

      channelsRef.current.set(conv.conversation_id, channel);
    });
  }, [conversations, user?.hotel_slug, currentConversationId]);

  const markConversationRead = async (conversationId) => {
    try {
      await api.post(`/chat/conversations/${conversationId}/mark-read/`);
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conversationId
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
      // Don't show toast for this - it's not critical if it fails
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <ChatContext.Provider value={{
      conversations,
      fetchConversations,
      markConversationRead,
      totalUnread,
      pusherInstance: pusherRef.current,
      currentConversationId,
      setCurrentConversationId
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
