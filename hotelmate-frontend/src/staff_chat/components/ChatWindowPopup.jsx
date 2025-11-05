import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { fetchMessages, sendMessage } from '../services/staffChatApi';

/**
 * ChatWindowPopup Component
 * Individual chat window that can be minimized/closed
 * Multiple windows can be open at once, stacked horizontally
 */
const ChatWindowPopup = ({ 
  hotelSlug, 
  conversation, 
  staff, 
  isMinimized, 
  onMinimize, 
  onClose,
  position = 'bottom-right',
  stackIndex = 0
}) => {
  console.log('💬 ChatWindowPopup rendering with:', {
    hotelSlug,
    conversationId: conversation?.id,
    staff: staff?.full_name,
    isMinimized,
    stackIndex
  });

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMinimized) {
      loadMessages();
    }
  }, [conversation?.id, isMinimized]);

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [messages, isMinimized]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

  const loadMessages = async () => {
    if (!conversation?.id) return;

    setLoading(true);

    try {
      const data = await fetchMessages(hotelSlug, conversation.id);
      // Handle the response format: { messages: [], count: number, has_more: boolean }
      setMessages(Array.isArray(data) ? data : (data.messages || data.results || []));
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    setSending(true);
    
    try {
      const message = await sendMessage(hotelSlug, conversation.id, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Calculate position based on stack index
  const rightOffset = position === 'bottom-right' 
    ? 24 + (stackIndex * 340) // 340px = chat width (320px) + gap (20px)
    : 'auto';
  
  const leftOffset = position === 'bottom-left'
    ? 24 + (stackIndex * 340)
    : 'auto';

  return (
    <div 
      className={`chat-window-popup ${isMinimized ? 'chat-window-popup--minimized' : ''}`}
      style={{
        right: rightOffset !== 'auto' ? `${rightOffset}px` : 'auto',
        left: leftOffset !== 'auto' ? `${leftOffset}px` : 'auto'
      }}
    >
      {/* Header */}
      <div className="chat-window-popup__header" onClick={onMinimize}>
        <div className="chat-window-popup__header-content">
          <div className="chat-window-popup__avatar">
            {staff?.profile_image_url ? (
              <img src={staff.profile_image_url} alt={staff.full_name} />
            ) : (
              <div className="chat-window-popup__avatar-placeholder">
                {staff?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            {staff?.is_on_duty && (
              <span className="chat-window-popup__online-dot" />
            )}
          </div>
          
          <div className="chat-window-popup__staff-info">
            <h4 className="chat-window-popup__staff-name">
              {staff?.full_name || 'Chat'}
            </h4>
            {staff?.role && (
              <p className="chat-window-popup__staff-role">
                {staff.role.name}
              </p>
            )}
          </div>
        </div>

        <div className="chat-window-popup__actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="chat-window-popup__action-btn"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 8h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="chat-window-popup__action-btn"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages (only show when not minimized) */}
      {!isMinimized && (
        <>
          <div className="chat-window-popup__messages">
            {loading ? (
              <div className="chat-window-popup__loading">
                <div className="spinner-small" />
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-window-popup__empty">
                <p>No messages yet</p>
                <p className="text-muted-small">Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-message ${message.is_own_message ? 'chat-message--own' : 'chat-message--other'}`}
                  >
                    <div className="chat-message__bubble">
                      <p className="chat-message__text">{message.content}</p>
                      <span className="chat-message__time">
                        {new Date(message.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="chat-window-popup__input-form">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="chat-window-popup__input"
              rows="1"
              disabled={sending}
            />
            <button
              type="submit"
              className="chat-window-popup__send-btn"
              disabled={!newMessage.trim() || sending}
              aria-label="Send"
            >
              {sending ? (
                <span className="spinner-tiny" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M1 9l15-7-7 15-2-6-6-2z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

ChatWindowPopup.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  conversation: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  staff: PropTypes.shape({
    full_name: PropTypes.string,
    profile_image_url: PropTypes.string,
    is_on_duty: PropTypes.bool,
    role: PropTypes.shape({
      name: PropTypes.string
    })
  }),
  isMinimized: PropTypes.bool.isRequired,
  onMinimize: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  position: PropTypes.oneOf(['bottom-right', 'bottom-left']),
  stackIndex: PropTypes.number
};

export default ChatWindowPopup;
