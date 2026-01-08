/**
 * Guest Chat Widget Component
 * 
 * REQUIREMENTS:
 * - Disabled states based on context.disabled_reason
 * - Sorting contract: messages sorted by created_at then id
 * - Pagination cursor using before=oldest_message_id
 * - Connection status indicators
 * - System message rendering (centered)
 * - Optimistic sending with retry functionality
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGuestChat } from '../../hooks/useGuestChat';
import './GuestChatWidget.css'; // We'll need to create this

/**
 * Message Bubble Component
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object
 * @param {Function} props.onRetry - Retry callback for failed messages
 */
/**
 * Message Bubble Component
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object
 * @param {Object} props.context - Guest chat context with current guest info
 * @param {Function} props.onRetry - Retry callback for failed messages
 */
const MessageBubble = ({ message, context, onRetry }) => {
  // Debug: log message properties to understand the structure
  console.log('[MessageBubble] Message debug:', {
    id: message.id,
    sender_type: message.sender_type,
    sender_role: message.sender_role,
    staff: message.staff,
    guest_id: message.guest_id,
    staff_id: message.staff_id,
    staff_display_name: message.staff_display_name,
    message: message.message,
    allFields: Object.keys(message)
  });

  // Improved guest identification logic using multiple methods
  let isGuest = false;
  
  // Method 1: Check sender_type/sender_role fields
  if (message.sender_type === 'guest' || message.sender_role === 'guest') {
    isGuest = true;
  }
  // Method 2: If we have guest context, check if the message guest_id matches current guest
  else if (context?.guest_id && message.guest_id) {
    isGuest = message.guest_id === context.guest_id;
  }
  // Method 3: If message has guest_id but no staff_id, it's likely from a guest
  else if (message.guest_id && !message.staff_id && !message.staff) {
    isGuest = true;
  }
  // Method 4: If message has staff_id or staff field, it's from staff
  else if (message.staff_id || message.staff || message.staff_display_name) {
    isGuest = false;
  }
  // Method 5: Default fallback - if no clear indicators, assume based on sender_type
  else {
    isGuest = message.sender_type === 'guest';
  }

  const isSystem = message.sender_type === 'system';
  const isPending = message.status === 'pending';
  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';
  
  console.log('[MessageBubble] Classification result:', {
    isGuest,
    isSystem,
    messageId: message.id,
    appliedClass: isGuest ? 'guest-message' : 'staff-message',
    contextGuestId: context?.guest_id,
    messageGuestId: message.guest_id
  });
  
  // System messages: centered small text
  if (isSystem) {
    return (
      <div className="message-bubble system-message">
        <div className="system-message-content">
          {message.message}
        </div>
        <div className="message-timestamp">
          {new Date(message.timestamp || message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`message-bubble ${isGuest ? 'guest-message' : 'staff-message'}`}>
      <div className="message-content">
        <div className="message-text">
          {message.message}
          {isPending && (
            <span className="message-status pending">
              <i className="bi bi-clock" title="Sending..."></i>
            </span>
          )}
          {isFailed && (
            <span className="message-status failed">
              <i className="bi bi-exclamation-triangle" title="Failed to send"></i>
              <button 
                className="retry-button"
                onClick={() => onRetry(message)}
                title="Retry sending"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </span>
          )}
        </div>
        
        <div className="message-info">
          {!isGuest && message.staff_display_name && (
            <span className="sender-name">{message.staff_display_name}</span>
          )}
          <span className="message-timestamp">
            {new Date(message.timestamp || message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
      
      {/* Sending indicator - appears below message bubble */}
      {isSending && (
        <div className="sending-indicator">
          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
          <small className="text-muted">Sending message...</small>
        </div>
      )}
    </div>
  );
};

/**
 * Connection Status Indicator
 * @param {Object} props - Component props
 * @param {string} props.connectionState - Current connection state
 */
const ConnectionStatus = ({ connectionState }) => {
  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
        return {
          className: 'status-connected',
          icon: 'bi-wifi',
          text: 'Connected',
          color: '#28a745'
        };
      case 'connecting':
        return {
          className: 'status-connecting',
          icon: 'bi-arrow-repeat',
          text: 'Connecting...',
          color: '#ffc107'
        };
      case 'disconnected':
        return {
          className: 'status-disconnected',
          icon: 'bi-wifi-off',
          text: 'Reconnecting...',
          color: '#dc3545'
        };
      case 'failed':
        return {
          className: 'status-failed',
          icon: 'bi-exclamation-triangle',
          text: 'Connection failed',
          color: '#dc3545'
        };
      default:
        return {
          className: 'status-unknown',
          icon: 'bi-question-circle',
          text: 'Unknown',
          color: '#6c757d'
        };
    }
  };
  
  const status = getStatusConfig();
  
  return (
    <div className={`connection-status ${status.className}`}>
      <i 
        className={`bi ${status.icon}`} 
        style={{ color: status.color }}
        title={status.text}
      ></i>
      <span style={{ color: status.color }}>{status.text}</span>
    </div>
  );
};

/**
 * Message Input Component
 * @param {Object} props - Component props
 * @param {Function} props.onSend - Send message callback
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {string} props.disabledReason - Reason for being disabled
 * @param {boolean} props.isSending - Whether currently sending
 */
const MessageInput = ({ onSend, disabled, disabledReason, isSending }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || isSending) return;
    
    onSend(message.trim());
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const handleTextareaResize = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  };
  
  return (
    <div className="message-input-container">
      {disabled && disabledReason && (
        <div className="disabled-message">
          <i className="bi bi-info-circle"></i>
          <span>{disabledReason}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="message-input-form d-flex vw-100">
        <div className="input-group ">
          <textarea
            ref={textareaRef}
            className="form-control message-textarea"
            placeholder={disabled ? "Chat is disabled" : "Type your message..."}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTextareaResize(e);
            }}
            onKeyPress={handleKeyPress}
            disabled={disabled || isSending}
            rows="1"
            style={{ 
              resize: 'none',
              minHeight: '40px',
              maxHeight: '150px'
            }}
          />
          <button
            type="submit"
            className="btn btn-primary send-button"
            disabled={disabled || isSending || !message.trim()}
            title="Send message"
          >
            {isSending ? (
              <span className="spinner-border spinner-border-sm" role="status"></span>
            ) : (
              <i className="bi bi-send"></i>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * Messages List Component with Pagination
 * @param {Object} props - Component props
 * @param {Array} props.messages - Messages array
 * @param {Array} props.sendingMessages - Currently sending messages array
 * @param {Object} props.context - Guest chat context for message classification
 * @param {Function} props.onLoadOlder - Load older messages callback
 * @param {Function} props.onRetry - Retry failed message callback
 */
const MessagesList = ({ messages, sendingMessages = [], context, onLoadOlder, onRetry }) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(true);
  
  // Combine regular messages with sending messages
  const allMessages = [...messages, ...sendingMessages].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.created_at).getTime();
    const timeB = new Date(b.timestamp || b.created_at).getTime();
    return timeA !== timeB ? timeA - timeB : ((a.id || 0) - (b.id || 0));
  });
  
  // Auto-scroll to bottom for new messages (including sending messages)
  useEffect(() => {
    if (hasScrolledToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages, hasScrolledToBottom]);
  
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setHasScrolledToBottom(isAtBottom);
  };
  
  const handleLoadOlder = async () => {
    if (isLoadingOlder || messages.length === 0) return;
    
    // Use oldest message ID as pagination cursor
    const oldestMessage = messages[0];
    if (!oldestMessage?.id || oldestMessage.id.startsWith('local:')) return;
    
    setIsLoadingOlder(true);
    
    try {
      const loadedCount = await onLoadOlder(oldestMessage.id);
      console.log('[GuestChatWidget] Loaded older messages:', loadedCount);
    } catch (error) {
      console.error('[GuestChatWidget] Failed to load older messages:', error);
    } finally {
      setIsLoadingOlder(false);
    }
  };
  
  return (
    <div 
      className="messages-list"
      ref={messagesContainerRef}
      onScroll={handleScroll}
    >
      {messages.length > 0 && (
        <div className="load-older-container">
          <button
            className="btn btn-outline-secondary btn-sm load-older-button"
            onClick={handleLoadOlder}
            disabled={isLoadingOlder}
          >
            {isLoadingOlder ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Loading...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-up me-2"></i>
                Load older messages
              </>
            )}
          </button>
        </div>
      )}
      
      <div className="messages-container">
        {allMessages.map((message, index) => (
          <MessageBubble
            key={message.id || `temp-${index}`}
            message={message}
            context={context}
            onRetry={onRetry}
          />
        ))}
      </div>
      
      <div ref={messagesEndRef} />
    </div>
  );
};

/**
 * Main Guest Chat Widget Component
 * @param {Object} props - Component props
 * @param {string} props.hotelSlug - Hotel slug
 * @param {string} props.token - Guest authentication token
 * @param {string} [props.className] - Additional CSS class
 * @param {Object} [props.style] - Inline styles
 */
export const GuestChatWidget = ({ 
  hotelSlug, 
  token, 
  className = '',
  style = {}
}) => {
  const {
    context,
    messages,
    sendingMessages,
    loading,
    error,
    connectionState,
    sendMessage,
    loadOlder,
    retryMessage,
    isSending,
    isDisabled,
    disabledReason
  } = useGuestChat({ hotelSlug, token });
  
  // Loading state
  if (loading) {
    return (
      <div className={`guest-chat-widget loading ${className}`} style={style}>
        <div className="chat-header">
          <h5>Chat</h5>
          <ConnectionStatus connectionState="connecting" />
        </div>
        <div className="chat-body">
          <div className="loading-container">
            <div className="spinner-border text-primary" role="status"></div>
            <div className="mt-2">Loading chat...</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`guest-chat-widget error ${className}`} style={style}>
        <div className="chat-header">
          <h5>Chat</h5>
          <ConnectionStatus connectionState="failed" />
        </div>
        <div className="chat-body">
          <div className="error-container">
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Chat Error:</strong> {error.message || 'Failed to load chat'}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`guest-chat-widget ${className}`} style={style}>
      <div className="chat-header">
        <div className="chat-title">
          <h5>Chat with {context?.hotel?.name || 'Hotel'}</h5>
          {context?.booking && (
            <small className="text-muted">
              Booking: {context.booking.booking_reference || context.booking.id}
            </small>
          )}
        </div>
        <ConnectionStatus connectionState={connectionState} />
      </div>
      
      <div className="chat-body">
        {messages.length === 0 && sendingMessages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">
              <i className="bi bi-chat-dots"></i>
            </div>
            <div className="empty-chat-message">
              <p>Welcome! Send a message to start the conversation.</p>
            </div>
          </div>
        ) : (
          <MessagesList 
            messages={messages}
            sendingMessages={sendingMessages}
            context={context}
            onLoadOlder={loadOlder}
            onRetry={retryMessage}
          />
        )}
      </div>
      
      <div className="chat-footer">
        <MessageInput
          onSend={sendMessage}
          disabled={isDisabled}
          disabledReason={disabledReason}
          isSending={isSending}
        />
      </div>
    </div>
  );
};

export default GuestChatWidget;