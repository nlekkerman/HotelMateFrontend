import { useState } from 'react';
import { editMessage } from '../services/staffChatApi';

/**
 * Custom hook for editing messages
 * @param {string} hotelSlug - Hotel slug
 * @param {Function} onMessageEdited - Callback when message is edited
 * @returns {Object} Edit message state and functions
 */
const useEditMessage = (hotelSlug, onMessageEdited) => {
  const [editing, setEditing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState(null);

  /**
   * Start editing a message
   * @param {Object} message - Message to edit
   */
  const startEdit = (message) => {
    setEditingMessageId(message.id);
    setEditText(message.message || message.content || '');
    setError(null);
  };

  /**
   * Cancel editing
   */
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
    setError(null);
  };

  /**
   * Save edited message
   * @returns {Promise<Object|null>} Edited message or null
   */
  const saveEdit = async () => {
    if (!editText.trim() || !editingMessageId || editing) {
      return null;
    }

    setEditing(true);
    setError(null);

    try {
      const updatedMessage = await editMessage(
        hotelSlug,
        editingMessageId,
        editText.trim()
      );

      // Reset editing state
      setEditingMessageId(null);
      setEditText('');

      // Notify parent
      if (onMessageEdited) {
        onMessageEdited(updatedMessage);
      }

      return updatedMessage;
    } catch (err) {
      setError(err.message || 'Failed to edit message');
      console.error('Error editing message:', err);
      return null;
    } finally {
      setEditing(false);
    }
  };

  /**
   * Check if a message is being edited
   * @param {number} messageId - Message ID to check
   * @returns {boolean}
   */
  const isEditing = (messageId) => {
    return editingMessageId === messageId;
  };

  return {
    startEdit,
    cancelEdit,
    saveEdit,
    isEditing,
    editing,
    editingMessageId,
    editText,
    setEditText,
    error,
  };
};

export default useEditMessage;
