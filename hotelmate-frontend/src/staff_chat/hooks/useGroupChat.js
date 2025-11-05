import { useState, useCallback } from 'react';
import { createConversation } from '../services/staffChatApi';

/**
 * Custom hook for managing group chat creation
 * @param {string} hotelSlug - The hotel's slug identifier
 * @returns {Object} Group chat creation state and functions
 */
const useGroupChat = (hotelSlug) => {
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Toggle staff member selection
   * @param {number} staffId - Staff member ID to toggle
   */
  const toggleStaffSelection = useCallback((staffId) => {
    setSelectedStaff((prev) => {
      if (prev.includes(staffId)) {
        return prev.filter((id) => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  }, []);

  /**
   * Clear a specific staff member from selection
   * @param {number} staffId - Staff member ID to remove
   */
  const removeStaff = useCallback((staffId) => {
    setSelectedStaff((prev) => prev.filter((id) => id !== staffId));
  }, []);

  /**
   * Check if a staff member is selected
   * @param {number} staffId - Staff member ID to check
   * @returns {boolean}
   */
  const isStaffSelected = useCallback(
    (staffId) => {
      return selectedStaff.includes(staffId);
    },
    [selectedStaff]
  );

  /**
   * Create a group chat
   * @returns {Promise<Object|null>} Created conversation or null on error
   */
  const createGroup = useCallback(async () => {
    if (selectedStaff.length < 2) {
      setError('Please select at least 2 staff members for a group chat');
      return null;
    }

    if (!groupTitle.trim()) {
      setError('Please enter a group name');
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      const conversation = await createConversation(
        hotelSlug,
        selectedStaff,
        groupTitle
      );

      // Reset form after successful creation
      setSelectedStaff([]);
      setGroupTitle('');

      return conversation;
    } catch (err) {
      setError(err.message || 'Failed to create group chat');
      console.error('Error creating group chat:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [hotelSlug, selectedStaff, groupTitle]);

  /**
   * Reset all form state
   */
  const reset = useCallback(() => {
    setSelectedStaff([]);
    setGroupTitle('');
    setError(null);
    setIsCreating(false);
  }, []);

  /**
   * Validate if form is ready to submit
   * @returns {boolean}
   */
  const isValid = useCallback(() => {
    return selectedStaff.length >= 2 && groupTitle.trim().length > 0;
  }, [selectedStaff, groupTitle]);

  return {
    // State
    selectedStaff,
    groupTitle,
    isCreating,
    error,

    // Setters
    setGroupTitle,

    // Functions
    toggleStaffSelection,
    removeStaff,
    isStaffSelected,
    createGroup,
    reset,
    isValid,
  };
};

export default useGroupChat;
