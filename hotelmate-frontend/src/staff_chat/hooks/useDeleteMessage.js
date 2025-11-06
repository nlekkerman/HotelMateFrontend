import { useState } from 'react';
import { deleteMessage } from '../services/staffChatApi';

/**
 * Custom hook for deleting messages
 * @param {string} hotelSlug - Hotel slug
 * @param {number} conversationId - Conversation ID (optional, for logging)
 * @param {Function} onMessageDeleted - Callback when message is deleted
 * @returns {Object} Delete message state and functions
 */
const useDeleteMessage = (hotelSlug, conversationId, onMessageDeleted) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  console.log('🗑️ useDeleteMessage initialized:', { 
    hotelSlug, 
    conversationId,
    hasCallback: !!onMessageDeleted 
  });

  /**
   * Delete a message
   * @param {number} messageId - Message ID to delete
   * @param {boolean} hardDelete - If true, permanently delete (managers only)
   * @returns {Promise<Object>} Result with success status and data
   */
  const deleteMsg = async (messageId, hardDelete = false) => {
    console.log('🗑️ Starting deleteMsg:', { messageId, hardDelete, deleting });
    
    if (deleting) {
      console.warn('⚠️ Already deleting a message');
      return { success: false, error: 'Already deleting' };
    }

    setDeleting(true);
    setError(null);

    try {
      console.log('🗑️ Calling deleteMessage API:', { hotelSlug, messageId, hardDelete });
      const result = await deleteMessage(hotelSlug, messageId, hardDelete);
      console.log('✅ Delete API response:', result);

      // Notify parent callback
      if (typeof onMessageDeleted === 'function') {
        console.log('📢 Calling onMessageDeleted callback');
        onMessageDeleted(messageId, hardDelete, result);
      } else {
        console.warn('⚠️ onMessageDeleted is not a function:', typeof onMessageDeleted);
      }

      return { success: true, data: result };
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete message';
      setError(errorMsg);
      console.error('❌ Error deleting message:', err);
      console.error('Error details:', err.response?.data || err);
      return { success: false, error: errorMsg };
    } finally {
      setDeleting(false);
      console.log('🗑️ deleteMsg completed');
    }
  };

  /**
   * Confirm and delete message
   * @param {number} messageId - Message ID to delete
   * @param {boolean} hardDelete - If true, permanently delete
   * @param {string} confirmMessage - Custom confirmation message
   * @returns {Promise<boolean>} Success status
   */
  const confirmDelete = async (
    messageId,
    hardDelete = false,
    confirmMessage = 'Are you sure you want to delete this message?'
  ) => {
    const confirmed = window.confirm(confirmMessage);
    
    if (!confirmed) {
      return false;
    }

    return await deleteMsg(messageId, hardDelete);
  };

  return {
    deleteMsg,
    confirmDelete,
    deleting,
    error,
  };
};

export default useDeleteMessage;
