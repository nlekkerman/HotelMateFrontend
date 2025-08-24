import { useState, useEffect } from "react";
import Pusher from "pusher-js";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export function useUnreadConversations() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial count
  const fetchUnreadCount = async () => {
    if (!user?.hotel_slug) return;
    try {
      const res = await api.get(
        `/chat/hotels/${user.hotel_slug}/conversations/unread-count/`
      );
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch unread conversations:", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [user?.hotel_slug]);

  // Pusher subscription
  useEffect(() => {
    if (!user?.hotel_slug) return;

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe(`${user.hotel_slug}-new-conversation`);
    channel.bind("new-conversation", fetchUnreadCount);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`${user.hotel_slug}-new-conversation`);
      pusher.disconnect();
    };
  }, [user?.hotel_slug]);

  // Optional: function to mark a conversation read
  const markConversationRead = async (conversationId) => {
    try {
      await api.post(`/chat/conversations/${conversationId}/mark-read/`);
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to mark conversation read:", err);
    }
  };

  return { unreadCount, markConversationRead };
}
