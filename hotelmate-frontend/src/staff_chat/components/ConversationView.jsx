import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { fetchMessages, sendMessage } from '../services/staffChatApi';

/**
 * ConversationView Component
 * Displays messages and allows sending new messages in a conversation
 */
const ConversationView = ({ hotelSlug, conversation, staff }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Get current user ID from localStorage
  const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUserData?.staff_id || currentUserData?.id || null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, [conversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!conversation?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchMessages(hotelSlug, conversation.id);
      setMessages(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message);
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
      alert('Failed to send message. Please try again.');
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

  if (loading) {
    return (
      <div className="conversation-view__loading">
        <div className="spinner" />
        <p>Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversation-view__error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to load messages</h3>
        <p>{error}</p>
        <button onClick={loadMessages} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="conversation-view__content">
      <div className="conversation-view__messages">
        {messages.length === 0 ? (
          <div className="conversation-view__empty">
            <div className="empty-icon">💬</div>
            <h3>No messages yet</h3>
            <p>Start the conversation with {staff?.full_name}</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              // Use 'sender' field (not 'sender_id') - convert to number for comparison
              const senderId = Number(message.sender);
              const userId = Number(currentUserId);
              const isOwn = senderId === userId;
              
              return (
                <div
                  key={message.id}
                  className={`message ${isOwn ? 'message--own' : 'message--other'}`}
                >
                  <div className="message__content">
                    <p className="message__text">{message.content}</p>
                    <span className="message__time">
                      {new Date(message.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="conversation-view__input-form">
        <div className="message-input-container">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${staff?.full_name || 'staff member'}...`}
            className="message-input"
            rows="1"
            disabled={sending}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!newMessage.trim() || sending}
            aria-label="Send message"
          >
            {sending ? (
              <span className="spinner-small" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M2 10l16-8-8 16-2-6-6-2z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

ConversationView.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  conversation: PropTypes.shape({
    id: PropTypes.number.isRequired,
    participants: PropTypes.array
  }).isRequired,
  staff: PropTypes.shape({
    id: PropTypes.number,
    full_name: PropTypes.string,
    profile_image_url: PropTypes.string
  })
};

export default ConversationView;
