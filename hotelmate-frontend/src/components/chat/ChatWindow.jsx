import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Pusher from "pusher-js";
import api from "@/services/api";

const ChatWindow = ({ userId: propUserId, conversationId: propConversationId, hotelSlug: propHotelSlug }) => {
  // Grab params from URL
  const { hotelSlug: paramHotelSlug, conversationId: paramConversationIdFromURL, room_number } = useParams();
  
  // Determine hotelSlug
  const hotelSlug = propHotelSlug || paramHotelSlug;

  // Determine conversationId
  const conversationId = propConversationId || paramConversationIdFromURL;

  // Determine userId from localStorage (staff) or undefined (guest)
  const storedUser = localStorage.getItem("user");
  const userId = propUserId || (storedUser ? JSON.parse(storedUser).id : undefined);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  // Fetch messages
  useEffect(() => {
    if (!conversationId) return;

    api
      .get(`/chat/${hotelSlug}/conversations/${conversationId}/messages/`)
      .then(res => setMessages(res.data))
      .catch(err => console.error("Error fetching messages:", err));

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });
    const channel = pusher.subscribe(`${hotelSlug}-conversation-${conversationId}-chat`);
    channel.bind("new-message", message => setMessages(prev => [...prev, message]));

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [hotelSlug, conversationId]);

  // Send message
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

  // Debug logs
  useEffect(() => {
    console.log("ChatWindow mounted");
    console.log("userId:", userId);
    console.log("conversationId:", conversationId);
    console.log("room_number:", room_number);
    console.log("hotelSlug:", hotelSlug);
    console.log(userId ? "User type: STAFF" : "User type: GUEST");
  }, [userId, conversationId, room_number, hotelSlug]);

  return (
    <div className="d-flex flex-column h-100 border-start">
      <div className="flex-grow-1 overflow-auto p-3">
        {messages.map(msg => {
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

      <div className="p-3 border-top">
        <form
          className="input-group"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            className="form-control"
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            autoFocus
            disabled={!conversationId}
          />
          <button type="submit" className="btn btn-primary" disabled={!conversationId}>
            {conversationId ? "Send" : "Loading..."}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
