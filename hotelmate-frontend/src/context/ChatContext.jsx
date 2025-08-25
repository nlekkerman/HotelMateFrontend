// src/context/ChatContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import Pusher from "pusher-js";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
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
    }
  }, [user?.hotel_slug]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Initialize Pusher
  useEffect(() => {
    if (!user?.hotel_slug) return;

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });
    pusherRef.current = pusher;

    const globalChannel = pusher.subscribe(`${user.hotel_slug}-new-conversation`);
    globalChannel.bind("new-conversation", fetchConversations);

    return () => {
      globalChannel.unbind_all();
      pusher.unsubscribe(`${user.hotel_slug}-new-conversation`);
      channelsRef.current.forEach((ch) => {
        ch.unbind_all();
        pusher.unsubscribe(ch.name);
      });
      channelsRef.current.clear();
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [user?.hotel_slug, fetchConversations]);

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
                  unread_count: (c.unread_count || 0) + 1,
                }
              : c
          )
        );
      });

      channelsRef.current.set(conv.conversation_id, channel);
    });
  }, [conversations, user?.hotel_slug]);

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
    }
  };

  const totalUnread = conversations.filter(c => c.unread_count > 0).length;

  return (
    <ChatContext.Provider value={{
      conversations,
      fetchConversations,
      markConversationRead,
      totalUnread
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
