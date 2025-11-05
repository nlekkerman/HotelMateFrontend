import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * MessageInput Component
 * Input field for sending messages with reply support and @mentions
 */
const MessageInput = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  replyTo = null,
  onCancelReply = null,
  showMentionSuggestions = false,
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  // Focus on mount or when reply is set
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    
    if (!value.trim() || disabled) return;
    
    // Extract @mentions
    const mentions = extractMentions(value);
    
    // Call onSend callback
    if (onSend) {
      onSend(value, mentions);
    }
    
    // Clear input after sending
    setValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  // Detect @mentions
  const highlightMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    return text.replace(mentionRegex, '<span class="mention">@$1</span>');
  };

  return (
    <div className="message-input-wrapper">
      {/* Reply Preview */}
      {replyTo && (
        <div className="message-input__reply-preview">
          <div className="message-input__reply-content">
            <i className="bi bi-reply me-2"></i>
            <div>
              <div className="message-input__reply-sender">
                {replyTo.sender_name || replyTo.sender_info?.full_name || 'User'}
              </div>
              <div className="message-input__reply-text">
                {(replyTo.message || replyTo.content || '').substring(0, 50)}
                {(replyTo.message || replyTo.content || '').length > 50 ? '...' : ''}
              </div>
            </div>
          </div>
          {onCancelReply && (
            <button
              type="button"
              className="message-input__reply-cancel"
              onClick={onCancelReply}
              aria-label="Cancel reply"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="message-input__input-area">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="message-input__textarea"
          rows="1"
          disabled={disabled}
          maxLength={5000}
        />
        
        {/* Character Counter (optional, show when close to limit) */}
        {value.length > 4500 && (
          <div className="message-input__char-count">
            {value.length}/5000
          </div>
        )}
      </div>

      {/* @Mention Info Tooltip */}
      {showMentionSuggestions && value.includes('@') && (
        <div className="message-input__mention-hint">
          <i className="bi bi-info-circle me-1"></i>
          <small>Type @Name to mention someone</small>
        </div>
      )}
    </div>
  );
};

MessageInput.propTypes = {
  /** Callback when message is sent (messageText, mentions) */
  onSend: PropTypes.func.isRequired,
  /** Whether input is disabled */
  disabled: PropTypes.bool,
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Message being replied to */
  replyTo: PropTypes.shape({
    id: PropTypes.number,
    sender_name: PropTypes.string,
    sender_info: PropTypes.shape({
      full_name: PropTypes.string
    }),
    message: PropTypes.string,
    content: PropTypes.string
  }),
  /** Callback to cancel reply */
  onCancelReply: PropTypes.func,
  /** Show @mention suggestions */
  showMentionSuggestions: PropTypes.bool
};

export default MessageInput;
