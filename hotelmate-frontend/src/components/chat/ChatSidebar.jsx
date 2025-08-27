import React from "react";
import { FaTimes } from "react-icons/fa";
import { useChat } from "@/context/ChatContext"; // ✅ use your context

const ChatSidebar = ({
  hotelSlug,
  selectedRoom,
  onSelectRoom,
  onUnreadChange,
  isMobile,
  toggleSidebar,
}) => {
  const { conversations, markConversationRead } = useChat();

  // Update total unread count whenever conversations change
  React.useEffect(() => {
    if (onUnreadChange) {
      const totalUnread = conversations.reduce(
        (acc, c) => acc + (c.unread_count || 0),
        0
      );
      onUnreadChange(totalUnread);
    }
  }, [conversations, onUnreadChange]);

  const handleConversationClick = (conv) => {
    onSelectRoom(conv.room_number, conv.conversation_id);
    markConversationRead(conv.conversation_id); // updates the shared context
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
    className={`shadow chat-room ${selectedRoom === conv.room_number ? "selected" : ""}`}
    onClick={() => handleConversationClick(conv)}
  >
    <div className="room-header d-flex justify-content-between">
      <strong>Room {conv.room_number}</strong>
      {conv.unread_count > 0 && (
        <span className="badge bg-danger">{conv.unread_count}</span>
      )}
    </div>
    
    <div className="d-flex justify-content-between align-items-center">
      <div className="last-message" style={{ wordBreak: "break-word", overflowWrap: "break-word", maxWidth: "80%" }}>
        {conv.last_message || <em>No messages yet</em>}
      </div>
      {conv.last_message_time && (
  <div
    className="last-message-time small"
    style={{
      color: selectedRoom === conv.room_number ? "#fff" : "#6c757d" // white if selected, muted otherwise
    }}
  >
    {new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </div>
)}
    </div>
  </div>
))}

    </aside>
  );
};

export default ChatSidebar;
