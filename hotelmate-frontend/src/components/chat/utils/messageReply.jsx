/**
 * Message Reply Utilities
 * 
 * Handles all reply-related functionality for chat messages including:
 * - Reply state management
 * - Reply preview rendering
 * - Reply data formatting for sending
 * - Reply message display in chat bubbles
 */

/**
 * Formats reply data to be sent with a new message
 * @param {Object} replyingToMessage - The message being replied to
 * @returns {number|null} - The ID of the message being replied to, or null
 */
export const formatReplyData = (replyingToMessage) => {
  if (!replyingToMessage) return null;
  return replyingToMessage.id;
};

/**
 * Gets the sender name for a replied-to message
 * @param {Object} replyToMessage - The message object with reply_to_message data
 * @param {Array} messages - All messages in the conversation (to find original message)
 * @returns {string} - The formatted sender name
 */
export const getReplySenderName = (replyToMessage, messages) => {
  // For staff messages, show staff name
  if (replyToMessage.sender_type === 'staff') {
    return replyToMessage.sender_name || 
           replyToMessage.staff_name || 
           'Staff';
  }
  
  // For guest messages, try to get guest name from original message or backend
  // Check if we can find the original message in our messages array
  const originalMsg = messages.find(m => m.id === replyToMessage.id);
  if (originalMsg?.guest_name) {
    return originalMsg.guest_name;
  }
  
  // Fall back to backend data
  return replyToMessage.sender_name || 
         replyToMessage.guest_name || 
         'Guest';
};

/**
 * Scrolls to and highlights the original message when clicking on a reply preview
 * @param {number} originalMessageId - The ID of the original message to scroll to
 */
export const scrollToOriginalMessage = (originalMessageId) => {
  const originalElement = document.querySelector(`[data-message-id="${originalMessageId}"]`);
  if (originalElement) {
    originalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Briefly highlight the message
    originalElement.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
    setTimeout(() => {
      originalElement.style.backgroundColor = '';
    }, 1500);
  }
};

/**
 * React component for rendering reply preview in chat bubble
 */
export const ReplyPreview = ({ replyToMessage, messages, isMine, onClickReply }) => {
  if (!replyToMessage) return null;

  const senderName = getReplySenderName(replyToMessage, messages);
  
  return (
    <div 
      className="replied-message d-flex gap-2 p-2 mb-3 rounded"
      style={{
        backgroundColor: isMine ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 123, 255, 0.15)',
        borderLeft: '4px solid #007bff',
        fontSize: '0.8rem',
        cursor: 'pointer',
        maxHeight: '120px',
        overflowY: 'auto',
        border: '1px solid rgba(0, 123, 255, 0.3)'
      }}
      onClick={() => onClickReply && onClickReply(replyToMessage.id)}
      title="Click to jump to original message"
    >
      <span style={{ fontSize: '1rem', color: '#007bff', flexShrink: 0 }}>↩️</span>
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#333', marginBottom: '6px', fontSize: '0.75rem' }}>
          {senderName}
        </div>
        <div 
          style={{ 
            fontSize: '0.8rem', 
            opacity: 0.95,
            maxWidth: '100%',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}
        >
          {replyToMessage.message || '📎 Attachment'}
        </div>
      </div>
    </div>
  );
};

/**
 * React component for reply input preview (shown above message input)
 */
export const ReplyInputPreview = ({ replyingTo, onCancel }) => {
  if (!replyingTo) return null;

  // Determine original sender name
  const senderName = replyingTo.sender_type === 'staff' 
    ? (replyingTo.staff_name || 'Staff') 
    : (replyingTo.guest_name || 'Guest');

  // Determine recipient (who will receive this reply)
  // If replying to staff, reply goes to staff; if replying to guest, reply goes to guest
  const recipientName = replyingTo.sender_type === 'staff'
    ? (replyingTo.staff_name || 'Staff')
    : (replyingTo.guest_name || 'Guest');

  return (
    <div 
      className="reply-preview d-flex align-items-start gap-2 p-3 mb-2" 
      style={{ 
        backgroundColor: '#e3f2fd', 
        borderLeft: '4px solid #007bff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,123,255,0.2)',
        maxHeight: '150px',
        overflowY: 'auto',
        border: '1px solid rgba(0, 123, 255, 0.3)'
      }}
    >
      <span style={{ fontSize: '1.2rem', color: '#007bff', flexShrink: 0, marginTop: '2px' }}>↩️</span>
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex flex-column" style={{ gap: '4px' }}>
            <span 
              style={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: '#007bff' 
              }}
            >
              Replying to {senderName}
            </span>
            <span 
              style={{ 
                fontSize: '0.7rem', 
                fontWeight: 500, 
                color: '#28a745',
                fontStyle: 'italic'
              }}
            >
              → Sending to {recipientName}
            </span>
          </div>
          <button
            className="btn btn-sm p-0"
            onClick={onCancel}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.2rem',
              color: '#6c757d',
              cursor: 'pointer',
              lineHeight: 1
            }}
            title="Cancel reply"
          >
            ×
          </button>
        </div>
        {replyingTo.message && (
          <div 
            style={{ 
              fontSize: '0.85rem', 
              color: '#333',
              maxWidth: '100%',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              marginBottom: replyingTo.attachments?.length > 0 ? '8px' : '0'
            }}
          >
            {replyingTo.message}
          </div>
        )}
        {replyingTo.attachments?.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
            📎 {replyingTo.attachments.length} attachment{replyingTo.attachments.length > 1 ? 's' : ''}
            {replyingTo.attachments.map((att, idx) => (
              <span key={idx} style={{ display: 'block', marginLeft: '1.2rem', marginTop: '2px' }}>
                • {att.file_name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hook-like utility for managing reply state
 * Returns helper functions for reply management
 */
export const createReplyHandlers = (setReplyingTo, messageInputRef) => {
  const startReply = (message) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 [REPLY BUTTON CLICKED]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Setting replyingTo:', {
      id: message.id,
      message: message.message?.substring(0, 50) + '...',
      sender_type: message.sender_type,
      sender_name: message.sender_type === 'staff' ? message.staff_name : message.guest_name
    });
    
    setReplyingTo(message);
    
    console.log('✅ replyingTo state updated - reply preview should appear');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Focus on message input
    if (messageInputRef?.current) {
      messageInputRef.current.focus();
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const clearReplyAfterSend = () => {
    setReplyingTo(null);
  };

  return {
    startReply,
    cancelReply,
    clearReplyAfterSend
  };
};
