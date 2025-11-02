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
      {conversations.length === 0 ? (
        <div className="text-center text-muted p-4">
          <p>No active conversations</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <div
            key={conv.conversation_id}
            className={`shadow chat-room ${selectedRoom === conv.room_number ? "selected" : ""}`}
            onClick={() => handleConversationClick(conv)}
            style={{
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {/* ASESHeader at the very top - full width */}
            <div className="conversation-header" style={{
              backgroundColor: selectedRoom === conv.room_number 
                ? 'rgba(var(--main-color-rgb), 0.95)' 
                : 'rgba(var(--main-color-rgb), 0.85)',
              padding: '0.5rem 1rem',
              margin: 0,
              width: '100%'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  {conv.guest_name && (
                    <strong style={{ 
                      fontSize: isMobile ? '1.1rem' : '1rem',
                      lineHeight: 1.2,
                      color: '#fff'
                    }}>
                      {conv.guest_name} <span style={{ fontWeight: 'normal', fontSize: '0.9em' }}>(Room {conv.room_number})</span>
                    </strong>
                  )}
                  {!conv.guest_name && (
                    <strong style={{ 
                      fontSize: isMobile ? '1.1rem' : '1rem',
                      lineHeight: 1.2,
                      color: '#fff'
                    }}>
                      Room {conv.room_number}
                    </strong>
                  )}
                </div>
                {conv.unread_count > 0 && (
                  <span className="badge bg-danger">{conv.unread_count}</span>
                )}
              </div>
            </div>
            
            {/* Message content below header */}
            <div className="d-flex justify-content-between align-items-center" style={{
              padding: '0.75rem 1rem'
            }}>
              <div 
                className="last-message" 
                style={{ 
                  wordBreak: "break-word", 
                  overflowWrap: "break-word", 
                  maxWidth: "75%",
                  fontSize: isMobile ? '0.9rem' : '0.85rem',
                  color: selectedRoom === conv.room_number ? "#fff" : "#6c757d"
                }}
              >
                {conv.last_message || <em>No messages yet</em>}
              </div>
              {conv.last_message_time && (
                <div
                  className="last-message-time small"
                  style={{
                    color: selectedRoom === conv.room_number ? "#fff" : "#6c757d",
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </aside>
  );
};

export default ChatSidebar;
