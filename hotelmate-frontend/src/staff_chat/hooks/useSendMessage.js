import { useState } from 'react';
import { sendMessage } from '../services/staffChatApi';

/**
 * Custom hook for sending messages with reply support
 * @param {string} hotelSlug - Hotel slug
 * @param {number} conversationId - Conversation ID
 * @param {Function} onMessageSent - Callback when message is sent
 * @returns {Object} Send message state and functions
 */
const useSendMessage = (hotelSlug, conversationId, onMessageSent) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);

  /**
   * Send a message
   * @param {string} messageText - Message content
   * @returns {Promise<Object|null>} Sent message or null
   */
  const send = async (messageText) => {
    if (!messageText.trim() || sending) {
      return null;
    }

    setSending(true);
    setError(null);

    try {
      const message = await sendMessage(
        hotelSlug,
        conversationId,
        messageText.trim(),
        replyToMessage?.id || null
      );

      // Clear reply after sending
      setReplyToMessage(null);

      // Notify parent
      if (onMessageSent) {
        onMessageSent(message);
      }

      return message;
    } catch (err) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
      return null;
    } finally {
      setSending(false);
    }
  };

  /**
   * Set message to reply to
   * @param {Object} message - Message object to reply to
   */
  const setReply = (message) => {
    // console.log('🔄 useSendMessage - setReply called with:', message);
    // console.log('🔄 Message structure:', {
    //   id: message?.id,
    //   message: message?.message,
    //   content: message?.content,
    //   sender_name: message?.sender_name,
    //   sender_info: message?.sender_info
    // });
    setReplyToMessage(message);
  };

  /**
   * Cancel reply
   */
  const cancelReply = () => {
    setReplyToMessage(null);
  };

  /**
   * Extract @mentions from message text
   * @param {string} text - Message text
   * @returns {Array<string>} Array of mentioned names
   */
  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  };

  return {
    send,
    sending,
    error,
    replyTo: replyToMessage,  // Export as 'replyTo' for consistency
    replyToMessage,           // Keep backward compatibility
    setReply,
    cancelReply,
    extractMentions,
  };
};

export default useSendMessage;
