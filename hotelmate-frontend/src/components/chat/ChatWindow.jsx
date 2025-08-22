import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Pusher from "pusher-js";
import api from "@/services/api"; // your api.js instance

const ChatWindow = ({ userId }) => {
  const { hotelSlug, conversationId } = useParams(); // updated URL params
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  const pusherKey = import.meta.env.VITE_PUSHER_KEY;
  const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER;

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!hotelSlug || !conversationId) return;

    // Fetch messages for this conversation
    api.get(`/chat/${hotelSlug}/conversations/${conversationId}/messages/`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err));

    // Subscribe to Pusher for real-time messages
    const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
    const channel = pusher.subscribe(`${hotelSlug}-conversation-${conversationId}-chat`);
    channel.bind("new-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [hotelSlug, conversationId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !hotelSlug || !conversationId) return;

    try {
      const payload = { message: newMessage };

      if (userId) {
        payload.staff_id = userId;
        payload.sender_type = "staff";
      } else {
        payload.sender_type = "guest";
      }

      await api.post(
        `/chat/${hotelSlug}/conversations/${conversationId}/messages/send/`,
        payload
      );
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div className="d-flex flex-column h-100 border-start">
      <div className="flex-grow-1 overflow-auto p-3">
        {messages.map((msg) => {
          const isMine =
            (msg.sender_type === "staff" && msg.staff === userId) ||
            (msg.sender_type === "guest" && !userId);

          return (
            <div key={msg.id} className={`mb-2 ${isMine ? "text-end" : "text-start"}`}>
              <div
                className={`d-inline-block p-2 rounded ${
                  isMine ? "bg-primary text-white" : "bg-light"
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-top">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button className="btn btn-primary" onClick={handleSendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
