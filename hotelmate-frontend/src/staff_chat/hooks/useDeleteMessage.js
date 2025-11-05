import { useState } from 'react';
import { deleteMessage } from '../services/staffChatApi';

/**
 * Custom hook for deleting messages
 * @param {string} hotelSlug - Hotel slug
 * @param {Function} onMessageDeleted - Callback when message is deleted
 * @returns {Object} Delete message state and functions
 */
const useDeleteMessage = (hotelSlug, onMessageDeleted) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Delete a message
   * @param {number} messageId - Message ID to delete
   * @param {boolean} hardDelete - If true, permanently delete (managers only)
   * @returns {Promise<boolean>} Success status
   */
  const deleteMsg = async (messageId, hardDelete = false) => {
    if (deleting) {
      return false;
    }

    setDeleting(true);
    setError(null);

    try {
      const result = await deleteMessage(hotelSlug, messageId, hardDelete);

      // Notify parent
      if (onMessageDeleted) {
        onMessageDeleted(messageId, hardDelete, result);
      }

      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete message');
      console.error('Error deleting message:', err);
      return false;
    } finally {
      setDeleting(false);
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
