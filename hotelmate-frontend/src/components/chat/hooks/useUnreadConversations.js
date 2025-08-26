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

    console.log("Fetching conversations for hotel:", user.hotel_slug);

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
      console.log("Conversations fetched:", convs);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [user?.hotel_slug]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user?.hotel_slug) return;

    console.log("Initializing Pusher client for hotel:", user.hotel_slug);
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      forceTLS: true,
    });
    pusherRef.current = pusher;

    const globalChannelName = `${user.hotel_slug}-new-conversation`;
    console.log("Subscribing to global channel:", globalChannelName);
    const globalChannel = pusher.subscribe(globalChannelName);
    globalChannel.bind("new-conversation", () => {
      console.log("Received new-conversation event");
      fetchConversations();
    });

    return () => {
      console.log("Cleaning up Pusher subscriptions...");
      globalChannel.unbind_all();
      pusher.unsubscribe(globalChannelName);
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
      console.log("Subscribing to conversation channel:", channelName);
      const channel = pusherRef.current.subscribe(channelName);

      const handleNewMessage = (msg) => {
        console.log("Received new-message event:", msg);
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === msg.conversation
              ? {
                  ...c,
                  last_message: msg.message,
                  unread_count:
                    c.conversation_id === currentConversationId
                      ? c.unread_count
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

  useEffect(() => {
    if (!pusherRef.current || !user?.id) return;

    const staffChannelName = `${user.hotel_slug}-staff-${user.id}-chat`;
    console.log("Subscribing to staff channel:", staffChannelName);
    if (!channelsRef.current.has(staffChannelName)) {
      const staffChannel = pusherRef.current.subscribe(staffChannelName);

      staffChannel.bind("new-guest-message", (msg) => {
        console.log("Received new-guest-message event:", msg);

        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === msg.conversation
              ? { ...c, last_message: msg.message, unread_count: (c.unread_count || 0) + 1 }
              : c
          )
        );

        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(`New message from ${msg.guest_name}`, {
              body: msg.message,
              icon: "/favicon-32x32.png",
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                new Notification(`New message from ${msg.guest_name}`, {
                  body: msg.message,
                  icon: "/favicon-32x32.png",
                });
              }
            });
          }
        }
      });

      channelsRef.current.set(staffChannelName, staffChannel);
    }

    return () => {
      if (channelsRef.current.has(staffChannelName)) {
        const ch = channelsRef.current.get(staffChannelName);
        ch.unbind_all();
        pusherRef.current.unsubscribe(staffChannelName);
        channelsRef.current.delete(staffChannelName);
      }
    };
  }, [user?.id, user?.hotel_slug]);

  const markConversationRead = async (conversationId) => {
    console.log("Marking conversation as read:", conversationId);
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
