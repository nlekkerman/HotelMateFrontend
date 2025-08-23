import React, { useEffect, useState, useRef } from "react";
import api from "@/services/api";
import { FaTimes } from "react-icons/fa";
import Pusher from "pusher-js";

const ChatSidebar = ({
  hotelSlug,
  selectedRoom,
  onSelectRoom,
  onUnreadChange,
  isMobile,
  toggleSidebar,
}) => {
  const [conversations, setConversations] = useState([]);
  const pusherRef = useRef(null);
  const activeChannelsRef = useRef(new Map());

  // Initialize Pusher once
  useEffect(() => {
    pusherRef.current = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });

    return () => {
      activeChannelsRef.current.forEach((ch) => {
        ch.unbind_all();
        try {
          pusherRef.current.unsubscribe(ch.name);
        } catch {}
      });
      activeChannelsRef.current.clear();
      pusherRef.current.disconnect();
      pusherRef.current = null;
    };
  }, []);

  // Fetch conversations on mount, including unread counts
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get(`/chat/${hotelSlug}/conversations/`);
        const convs = await Promise.all(
          res.data.map(async (c) => {
            const countRes = await api.get(
              `/chat/conversations/${c.conversation_id}/unread-count/`
            );
            return { ...c, unread_count: countRes.data.unread_count };
          })
        );

        setConversations(convs);

        if (onUnreadChange) {
          const totalUnread = convs.reduce((acc, c) => acc + c.unread_count, 0);
          onUnreadChange(totalUnread);
        }
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      }
    };

    fetchConversations();
  }, [hotelSlug, onUnreadChange]);

  // Subscribe to Pusher for each conversation
  useEffect(() => {
    if (!pusherRef.current) return;

    conversations.forEach((conv) => {
      if (activeChannelsRef.current.has(conv.conversation_id)) return;

      const channelName = `${hotelSlug}-conversation-${conv.conversation_id}-chat`;
      const channel = pusherRef.current.subscribe(channelName);

      const handleNewMessage = (msg) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === msg.conversation
              ? {
                  ...c,
                  last_message: msg.message,
                  unread_count:
                    selectedRoom === c.room_number
                      ? 0
                      : (c.unread_count || 0) + 1,
                }
              : c
          )
        );
      };

      channel.bind("new-message", handleNewMessage);
      activeChannelsRef.current.set(conv.conversation_id, channel);
    });
  }, [conversations, hotelSlug, selectedRoom]);

  // Update total unread count when conversations change
  useEffect(() => {
    if (onUnreadChange) {
      const totalUnread = conversations.reduce(
        (acc, c) => acc + (c.unread_count || 0),
        0
      );
      onUnreadChange(totalUnread);
    }
  }, [conversations, onUnreadChange]);

  // Handle clicking a conversation
  const handleConversationClick = async (conv) => {
    onSelectRoom(conv.room_number, conv.conversation_id);

    try {
      // Mark conversation read on backend
      await api.post(`/chat/conversations/${conv.conversation_id}/mark-read/`);

      // Update local state
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conv.conversation_id
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
    }
  };

  return (
    <aside className={`chat-sidebar ${isMobile ? "mobile" : "desktop"}`}>
      {isMobile && (
        <button className="close-btn" onClick={toggleSidebar}>
          <FaTimes />
        </button>
      )}

      {conversations.map((conv) => (
        <div
          key={conv.conversation_id}
          className={`chat-room ${
            selectedRoom === conv.room_number ? "selected" : ""
          }`}
          onClick={() => handleConversationClick(conv)}
        >
          <div className="room-header d-flex justify-content-between">
            <strong>Room {conv.room_number}</strong>
            {conv.unread_count > 0 && (
              <span className="badge bg-danger">{conv.unread_count}</span>
            )}
          </div>
          <div className="last-message">
            {conv.last_message || <em>No messages yet</em>}
          </div>
        </div>
      ))}
    </aside>
  );
};

export default ChatSidebar;
