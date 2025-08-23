import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Pusher from "pusher-js";
import api from "@/services/api";
import { FaPaperPlane } from "react-icons/fa";

const ChatWindow = ({
  userId: propUserId,
  conversationId: propConversationId,
  hotelSlug: propHotelSlug,
  onNewMessage, // callback to update sidebar
}) => {
  const { hotelSlug: paramHotelSlug, conversationId: paramConversationIdFromURL } = useParams();
  const hotelSlug = propHotelSlug || paramHotelSlug;
  const conversationId = propConversationId || paramConversationIdFromURL;
  const storedUser = localStorage.getItem("user");
  const userId = propUserId || (storedUser ? JSON.parse(storedUser).id : undefined);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  // Fetch messages and subscribe to Pusher
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/${hotelSlug}/conversations/${conversationId}/messages/`);
        setMessages(res.data);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    fetchMessages();

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });
    const channel = pusher.subscribe(`${hotelSlug}-conversation-${conversationId}-chat`);
    channel.bind("new-message", (message) => {
      setMessages((prev) => [...prev, message]);

      // Notify sidebar immediately
      if (onNewMessage) {
        onNewMessage({
          conversation_id: conversationId,
          message: message.message,
        });
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [hotelSlug, conversationId, onNewMessage]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      const res = await api.post(
        `/chat/${hotelSlug}/conversations/${conversationId}/messages/send/`,
        {
          message: newMessage,
          sender_type: userId ? "staff" : "guest",
          staff_id: userId || undefined,
        }
      );

      const sentMessage = res.data.message;
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage("");

      // Update sidebar instantly
      if (onNewMessage) {
        onNewMessage({
          conversation_id: conversationId,
          message: sentMessage.message,
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div className="chat-window d-flex flex-column">
      {/* Messages area */}
      <div className="chat-messages flex-grow-1 overflow-auto">
        {messages.map((msg) => {
          const isMine =
            (msg.sender_type === "staff" && msg.staff === userId) ||
            (msg.sender_type === "guest" && !userId);

          return (
            <div key={msg.id} className={`mb-2 ${isMine ? "text-end" : "text-start"}`}>
              <div className={`d-inline-block p-2 rounded ${isMine ? "bg-primary text-white" : "bg-light"}`}>
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input + Send button */}
      <div className="chat-input-vertical d-flex p-2 border-start">
        <input
          type="text"
          className="message-form-control me-2"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!conversationId}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
        />
        <button
          className="btn custom-button d-flex align-items-center justify-content-center"
          onClick={handleSendMessage}
          disabled={!conversationId}
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
