import { useState, useEffect, useRef, useCallback } from "react";
import Pusher from "pusher-js";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export function useUnreadConversations(currentConversationId = null) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const pusherRef = useRef(null);
  const channelsRef = useRef(new Map());

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

  useEffect(() => {
    if (!pusherRef.current) return;

    conversations.forEach((conv) => {
      if (channelsRef.current.has(conv.conversation_id)) return;

      const channelName = `${user.hotel_slug}-conversation-${conv.conversation_id}-chat`;
      const channel = pusherRef.current.subscribe(channelName);

      const handleNewMessage = (msg) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === msg.conversation
              ? {
                  ...c,
                  last_message: msg.message,
                  unread_count:
                    c.conversation_id === currentConversationId
                      ? c.unread_count // don’t increment if user is viewing
                      : (c.unread_count || 0) + 1,
                }
              : c
          )
        );
      };

      channel.bind("new-message", handleNewMessage);
      channelsRef.current.set(conv.conversation_id, channel);
    });
  }, [conversations, user?.hotel_slug, currentConversationId]);

  const markConversationRead = async (conversationId) => {
    try {
      await api.post(`/chat/conversations/${conversationId}/mark-read/`);
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
    }
  };

  const totalUnread = conversations.filter((c) => c.unread_count > 0).length;

  return {
    conversations,
    fetchConversations,
    markConversationRead,
    totalUnread,
  };
}

