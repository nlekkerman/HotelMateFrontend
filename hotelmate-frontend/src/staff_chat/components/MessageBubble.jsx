import React from 'react';
import PropTypes from 'prop-types';
import MessageEditor from './MessageEditor';
import MessageAttachments from './MessageAttachments';

/**
 * MessageBubble Component
 * Displays a single message with reply preview and editing support
 */
const MessageBubble = ({
  message,
  timestamp,
  isOwn = false,
  senderName = null,
  replyTo = null,
  isEdited = false,
  attachments = [],
  isEditing = false,
  onSaveEdit = null,
  onCancelEdit = null,
}) => {
  const messageText = message || '';
  const messageTime = timestamp;
  const displayName = isOwn ? 'You' : senderName;

  // If in editing mode, show the editor
  if (isEditing) {
    return (
      <MessageEditor
        initialText={messageText}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <>
      {/* Reply Preview (if replying to another message) */}
      {replyTo && (
        <div className="staff-chat-message__reply-preview">
          <i className="bi bi-reply me-1"></i>
          <div className="staff-chat-message__reply-content">
            <span className="staff-chat-message__reply-sender">
              {replyTo.sender_name || replyTo.sender_info?.full_name || 'User'}
            </span>
            <span className="staff-chat-message__reply-text">
              {(replyTo.message || replyTo.content || '').substring(0, 30)}
              {(replyTo.message || replyTo.content || '').length > 30 ? '...' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Message Bubble */}
      <div className="staff-chat-message__bubble">
        {/* Sender Name */}
        {displayName && (
          <div className="staff-chat-message__sender-name">
            {displayName}
          </div>
        )}
        
        {/* Message Text */}
        <p className="staff-chat-message__text">
          {messageText}
          {isEdited && (
            <span className="staff-chat-message__edited-badge"> (edited)</span>
          )}
        </p>

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <MessageAttachments
            attachments={attachments}
            canDelete={isOwn}
          />
        )}

        {/* Timestamp */}
        {messageTime && (
          <span className="staff-chat-message__time">
            {new Date(messageTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </>
  );
};

MessageBubble.propTypes = {
  /** Message text content */
  message: PropTypes.string.isRequired,
  /** Message timestamp */
  timestamp: PropTypes.string,
  /** Whether this is the current user's message */
  isOwn: PropTypes.bool,
  /** Sender's name to display */
  senderName: PropTypes.string,
  /** Reply information if this is a reply */
  replyTo: PropTypes.shape({
    id: PropTypes.number,
    message: PropTypes.string,
    content: PropTypes.string,
    sender_name: PropTypes.string,
    sender_info: PropTypes.shape({
      full_name: PropTypes.string
    })
  }),
  /** Whether the message has been edited */
  isEdited: PropTypes.bool,
  /** Array of file attachments */
  attachments: PropTypes.array,
  /** Whether currently editing this message */
  isEditing: PropTypes.bool,
  /** Callback to save edited message */
  onSaveEdit: PropTypes.func,
  /** Callback to cancel editing */
  onCancelEdit: PropTypes.func
};

export default MessageBubble;
