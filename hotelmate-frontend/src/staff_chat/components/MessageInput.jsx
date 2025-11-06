import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import EmojiPicker from 'emoji-picker-react';

/**
 * MessageInput Component
 * Input field for sending messages with reply support, @mentions, emoji picker, and file attachments
 */
const MessageInput = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  replyTo = null,
  onCancelReply = null,
  showMentionSuggestions = false,
  onFileSelect = null,
  selectedFiles = [],
  onRemoveFile = null,
}) => {
  const [value, setValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const fileInputRef = useRef(null);

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
    
    // Allow sending if there's text OR files
    if ((!value.trim() && selectedFiles.length === 0) || disabled) return;
    
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

  // Get file icon based on file type
  const getFileIcon = (fileType, fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (fileType.startsWith('image/')) return 'bi-file-image';
    if (ext === 'pdf') return 'bi-file-pdf';
    if (['doc', 'docx'].includes(ext)) return 'bi-file-word';
    if (['xls', 'xlsx'].includes(ext)) return 'bi-file-excel';
    if (ext === 'txt') return 'bi-file-text';
    if (ext === 'csv') return 'bi-file-spreadsheet';
    return 'bi-file-earmark';
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData) => {
    setValue(prevValue => prevValue + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Handle file selection
  const handleFileChange = (e) => {
    if (onFileSelect && e.target.files.length > 0) {
      onFileSelect(Array.from(e.target.files));
    }
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  return (
    <div className="message-input-wrapper">
      {/* Reply Preview */}
      {replyTo && (
        <div className="message-input__reply-preview">
          <div className="message-input__reply-content">
            <div>
              <div className="message-input__reply-label text-muted">
                Replied to {replyTo.sender_name || replyTo.sender_info?.full_name || 'User'}
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
        {/* Hidden File Input */}
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />

        {/* Attach Button */}
        {onFileSelect && (
          <button
            type="button"
            className="message-input__attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach files"
          >
            <i className="bi bi-paperclip"></i>
          </button>
        )}

        {/* Textarea with Emoji Button Inside */}
        <div className="message-input__textarea-wrapper">
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
          
          {/* Emoji Button with Picker Inside Textarea */}
          <div className="message-input__emoji-container">
            <button
              ref={emojiButtonRef}
              type="button"
              className="message-input__emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={disabled}
              title="Add emoji"
            >
              <i className="bi bi-emoji-smile"></i>
            </button>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="message-input__emoji-picker">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
          </div>
        </div>

        {/* Send Button */}
        <button
          type="button"
          className="message-input__send-btn"
          onClick={handleSend}
          disabled={disabled || (!value.trim() && selectedFiles.length === 0)}
          title="Send message"
        >
          <i className="bi bi-send-fill"></i>
        </button>

        {/* File Preview */}
        {selectedFiles.length > 0 && (
          <div className="chat-window-popup__file-previews">
            {selectedFiles.map((file, index) => {
              const isImage = file.type.startsWith('image/');
              const fileIcon = getFileIcon(file.type, file.name);
              
              return (
                <div key={index} className="file-preview-item">
                  {isImage ? (
                    <>
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={file.name}
                        className="file-preview-thumbnail"
                      />
                      {onRemoveFile && (
                        <button
                          type="button"
                          className="file-preview-remove"
                          onClick={() => onRemoveFile(index)}
                          title="Remove file"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="file-preview-file">
                        <i className={`bi ${fileIcon} file-preview-icon`}></i>
                        <div className="file-preview-info">
                          <div className="file-preview-name">{file.name}</div>
                          <div className="file-preview-size">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>
                      {onRemoveFile && (
                        <button
                          type="button"
                          className="file-preview-remove"
                          onClick={() => onRemoveFile(index)}
                          title="Remove file"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
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
  showMentionSuggestions: PropTypes.bool,
  /** Callback when files are selected */
  onFileSelect: PropTypes.func,
  /** Selected files array */
  selectedFiles: PropTypes.array,
  /** Callback to remove a file */
  onRemoveFile: PropTypes.func
};

export default MessageInput;
