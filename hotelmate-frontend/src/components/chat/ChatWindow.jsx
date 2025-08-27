import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Pusher from "pusher-js";
import api from "@/services/api";
import { FaPaperPlane } from "react-icons/fa";
import { useChat } from "@/context/ChatContext";
import HotelLogo from "@/components/layout/HotelLogo";

const MESSAGE_LIMIT = 10;

const ChatWindow = ({ userId: propUserId, conversationId: propConversationId, hotelSlug: propHotelSlug, onNewMessage }) => {
  const { hotelSlug: paramHotelSlug, conversationId: paramConversationIdFromURL } = useParams();
  const hotelSlug = propHotelSlug || paramHotelSlug;
  const conversationId = propConversationId || paramConversationIdFromURL;

  const storedUser = localStorage.getItem("user");
  const userId = propUserId || (storedUser ? JSON.parse(storedUser).id : undefined);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { markConversationRead } = useChat();

  // Scroll to bottom only on initial load or when sending a new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages
const fetchMessages = async (beforeId = null) => {
  if (!hasMore && beforeId) return;

  try {
    if (beforeId) setLoadingMore(true);
    else setLoading(true);

    const res = await api.get(
      `/chat/${hotelSlug}/conversations/${conversationId}/messages/`,
      { params: { limit: MESSAGE_LIMIT, before_id: beforeId } }
    );

    const newMessages = res.data;
    const container = messagesContainerRef.current;

    if (beforeId && container) {
      // Save current scroll position relative to the bottom
      const scrollOffsetFromBottom = container.scrollHeight - container.scrollTop;

      setMessages(prev => [...newMessages, ...prev]);
      setLoadingMore(false);

      // Wait for DOM to update, then restore scroll
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - scrollOffsetFromBottom;
      });
    } else {
      setMessages(newMessages);
      setLoading(false);
      scrollToBottom(); // only scroll on initial load
    }

    if (newMessages.length < MESSAGE_LIMIT) setHasMore(false);
  } catch (err) {
    console.error("Error fetching messages:", err);
    setLoading(false);
    setLoadingMore(false);
  }
};


  // Initial fetch
  useEffect(() => {
    if (!conversationId) return;
    fetchMessages();
  }, [conversationId]);

  // Pusher real-time updates
  useEffect(() => {
    if (!conversationId) return;

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, { cluster: import.meta.env.VITE_PUSHER_CLUSTER });
    const channel = pusher.subscribe(`${hotelSlug}-conversation-${conversationId}-chat`);

    channel.bind("new-message", (message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      scrollToBottom(); // scroll when new message is sent
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [hotelSlug, conversationId]);

  // Infinite scroll
 const handleScroll = () => {
  const container = messagesContainerRef.current;
  if (!container || loadingMore || !hasMore) return;

  // Trigger fetch when scrollTop < 50
  if (container.scrollTop < 50) {
    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    fetchMessages(oldestId);
  }
};

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      await api.post(`/chat/${hotelSlug}/conversations/${conversationId}/messages/send/`, {
        message: newMessage,
        sender_type: userId ? "staff" : "guest",
        staff_id: userId || undefined,
      });
      setNewMessage("");
      scrollToBottom(); // scroll when sending message
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div className="chat-window d-flex flex-column">
      {!userId && (
        <div className="chat-logo-container rounded-pill shadow-lg">
          <div className={`chat-logo-inner ${newMessage.trim() ? "shake" : ""}`}>
            <HotelLogo />
          </div>
        </div>
      )}

      <div
        className="chat-messages flex-grow-1 overflow-auto"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {loading && (
          <div className="loading text-center">
            <div className="spinner"></div>
          </div>
        )}

        {loadingMore && (
          <div className="loading-more text-center">
            <div className="spinner-in-chat small"></div>
          </div>
        )}

        {messages.map(msg => {
          const isMine = (msg.sender_type === "staff" && msg.staff === userId) || (msg.sender_type === "guest" && !userId);
          const senderName = msg.sender_type === "guest" ? msg.guest_name : "Reception";
          return (
            <div key={msg.id} className={`mb-2 ${isMine ? "text-end" : "text-start"}`}>
              <div className="small text-muted mb-1"><strong>{senderName}</strong></div>
              <div className={`d-inline-block p-2 rounded ${isMine ? "my-message" : "receiver-message"}`}>
                {msg.message}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-vertical d-flex p-2 border-start">
        <input
          type="text"
          className="message-form-control me-2"
          placeholder="Type a message..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onFocus={() => { if (conversationId) markConversationRead(conversationId); }}
          onKeyDown={e => { if (e.key === "Enter") handleSendMessage(); }}
          disabled={!conversationId}
        />
        <button className="btn text-white d-flex align-items-center justify-content-center" onClick={handleSendMessage} disabled={!conversationId}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
