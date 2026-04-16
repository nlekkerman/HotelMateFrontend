/**
 * Reply Utility Functions (Non-React)
 * 
 * Pure JavaScript functions for reply handling that don't involve React components
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
 * Hook-like utility for managing reply state
 * Returns helper functions for reply management
 */
export const createReplyHandlers = (setReplyingTo, messageInputRef) => {
  const startReply = (message) => {
    setReplyingTo(message);
    
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