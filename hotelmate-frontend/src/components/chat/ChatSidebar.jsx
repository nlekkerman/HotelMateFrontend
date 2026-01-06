import React from "react";
import { FaTimes } from "react-icons/fa";

const ChatSidebar = ({
  hotelSlug,
  selectedRoom,
  onSelectRoom,
  onUnreadChange,
  isMobile,
  toggleSidebar,
  conversations = [], // Accept conversations as prop
  markConversationRead, // Accept markConversationRead function as prop
}) => {
  // conversations and markConversationRead are now passed as props from parent

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
    // Handle both property naming conventions (API vs Store)
    const conversationId = conv?.conversation_id || conv?.id;
    const roomNumber = conv?.room_number || conv?.roomNumber;
    
    if (!conv || !conversationId) {
      console.warn("handleConversationClick called with invalid conversation:", conv);
      return;
    }
    
    onSelectRoom(roomNumber, conversationId);
    markConversationRead(conversationId);
  };

  return (
    <aside className={`chat-sidebar ${isMobile ? "mobile" : "desktop"}`}>
      {conversations.length === 0 ? (
        <div className="text-center text-muted p-4">
          <p>No active conversations</p>
        </div>
      ) : (
        conversations
          .filter(conv => conv && typeof conv === 'object' && !conv.message) // Filter out error objects
          .map((conv, index) => (
          <div
            key={conv.conversation_id || conv.id || `conv-${index}`}
            className={`shadow chat-room ${selectedRoom === (conv.room_number || conv.roomNumber) ? "selected" : ""}`}
            onClick={() => handleConversationClick(conv)}
            style={{
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {/* Conversation Header */}
            <div className="conversation-header" style={{
              backgroundColor: selectedRoom === (conv.room_number || conv.roomNumber) 
                ? 'rgba(var(--main-color-rgb), 0.95)' 
                : 'rgba(var(--main-color-rgb), 0.85)',
              padding: '0.5rem 1rem',
              margin: 0,
              width: '100%'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  {(conv.guest_name || conv.guestName) && (
                    <strong style={{ 
                      fontSize: isMobile ? '1.1rem' : '1rem',
                      lineHeight: 1.2,
                      color: '#fff'
                    }}>
                      {conv.guest_name || conv.guestName} <span style={{ fontWeight: 'normal', fontSize: '0.9em' }}>(Room {conv.room_number || conv.roomNumber})</span>
                    </strong>
                  )}
                  {!(conv.guest_name || conv.guestName) && (
                    <strong style={{ 
                      fontSize: isMobile ? '1.1rem' : '1rem',
                      lineHeight: 1.2,
                      color: '#fff'
                    }}>
                      Room {conv.room_number || conv.roomNumber}
                    </strong>
                  )}
                </div>
                {((conv.unread_count || conv.unreadCountForGuest) > 0) && (
                  <span className="badge bg-danger">{conv.unread_count || conv.unreadCountForGuest}</span>
                )}
              </div>
            </div>
            
            {/* Message content with white background */}
            <div className="d-flex justify-content-between align-items-center" style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fff'
            }}>
              <div style={{ maxWidth: "75%" }}>
                <div 
                  className="last-message" 
                  style={{ 
                    wordBreak: "break-word", 
                    overflowWrap: "break-word",
                    fontSize: isMobile ? '0.9rem' : '0.85rem',
                    color: '#333'
                  }}
                >
                  {conv.last_message || conv.lastMessage || <em>No messages yet</em>}
                </div>
                <small style={{ fontSize: '0.7rem', fontStyle: 'italic', color: '#6c757d' }}>
                  {((conv.unread_count || conv.unreadCountForGuest) > 0) ? 'Not seen' : 'Seen'}
                </small>
              </div>
              {(conv.last_message_time || conv.updatedAt) && (
                <div
                  className="last-message-time small"
                  style={{
                    color: '#6c757d',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {new Date(conv.last_message_time || conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
