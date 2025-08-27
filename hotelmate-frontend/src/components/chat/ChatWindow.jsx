import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Pusher from "pusher-js";
import api from "@/services/api";
import { FaPaperPlane } from "react-icons/fa";
import { useChat } from "@/context/ChatContext";
import HotelLogo from "@/components/layout/HotelLogo"; // ⬅️ import logo

const ChatWindow = ({
  userId: propUserId,
  conversationId: propConversationId,
  hotelSlug: propHotelSlug,
  onNewMessage, // callback to update sidebar
}) => {
  const {
    hotelSlug: paramHotelSlug,
    conversationId: paramConversationIdFromURL,
  } = useParams();
  const hotelSlug = propHotelSlug || paramHotelSlug;
  const conversationId = propConversationId || paramConversationIdFromURL;
  const storedUser = localStorage.getItem("user");
  const userId =
    propUserId || (storedUser ? JSON.parse(storedUser).id : undefined);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const { markConversationRead } = useChat();

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  // Fetch messages + subscribe to Pusher
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(
          `/chat/${hotelSlug}/conversations/${conversationId}/messages/`
        );
        setMessages(res.data);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    fetchMessages();

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });
    const channel = pusher.subscribe(
      `${hotelSlug}-conversation-${conversationId}-chat`
    );
    channel.bind("new-message", (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

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
      await api.post(
        `/chat/${hotelSlug}/conversations/${conversationId}/messages/send/`,
        {
          message: newMessage,
          sender_type: userId ? "staff" : "guest",
          staff_id: userId || undefined,
        }
      );
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div className="chat-window d-flex flex-column">
      {/* Hotel logo container */}
      <div className="chat-logo-container rounded-pill shadow-lg">
  <div className={`chat-logo-inner ${newMessage.trim() ? "shake" : ""}`}>
    <HotelLogo />
  </div>
</div>


      {/* Messages area */}
      <div className="chat-messages flex-grow-1 overflow-auto">
        {messages.map((msg) => {
          const isMine =
            (msg.sender_type === "staff" && msg.staff === userId) ||
            (msg.sender_type === "guest" && !userId);

          const senderName =
            msg.sender_type === "guest" ? msg.guest_name : "Reception";

          return (
            <div
              key={msg.id}
              className={`mb-2 ${isMine ? "text-end" : "text-start"}`}
            >
              <div className="small text-muted mb-1">
                <strong>{senderName}</strong>
              </div>

              <div
                className={`d-inline-block p-2 rounded ${
                  isMine ? "my-message" : "receiver-message"
                }`}
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  maxWidth: "100%",
                }}
              >
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
          onFocus={() => {
            if (conversationId) markConversationRead(conversationId);
          }}
          disabled={!conversationId}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
        />

        <button
          className="btn text-white d-flex align-items-center justify-content-center"
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
