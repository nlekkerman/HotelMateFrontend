import { useState, useCallback } from 'react';
import { addReaction, removeReaction } from '../services/staffChatApi';

/**
 * Custom hook for managing message reactions
 * Handles adding/removing reactions and grouping them by emoji
 * 
 * @param {string} hotelSlug - The hotel slug
 * @param {number} conversationId - The conversation ID
 * @param {Function} onReactionUpdate - Callback when reactions change
 * @returns {Object} Reaction management functions and state
 */
const useReactions = (hotelSlug, conversationId, onReactionUpdate) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Add a reaction to a message
   * @param {number} messageId - The message ID
   * @param {string} emoji - The emoji to add
   */
  const addReactionToMessage = useCallback(async (messageId, emoji) => {
    if (!messageId || !emoji) {
      setError('Message ID and emoji are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await addReaction(hotelSlug, messageId, emoji);
      
      if (response.success) {
        // Call the update callback to refresh messages
        if (onReactionUpdate) {
          onReactionUpdate(messageId, response.data);
        }
      } else {
        setError(response.error || 'Failed to add reaction');
      }
    } catch (err) {
      console.error('Error adding reaction:', err);
      setError(err.message || 'Failed to add reaction');
    } finally {
      setLoading(false);
    }
  }, [hotelSlug, conversationId, onReactionUpdate]);

  /**
   * Remove a reaction from a message
   * @param {number} messageId - The message ID
   * @param {string} emoji - The emoji to remove
   */
  const removeReactionFromMessage = useCallback(async (messageId, emoji) => {
    if (!messageId || !emoji) {
      setError('Message ID and emoji are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await removeReaction(hotelSlug, messageId, emoji);
      
      if (response.success) {
        // Call the update callback to refresh messages
        if (onReactionUpdate) {
          onReactionUpdate(messageId, response.data);
        }
      } else {
        setError(response.error || 'Failed to remove reaction');
      }
    } catch (err) {
      console.error('Error removing reaction:', err);
      setError(err.message || 'Failed to remove reaction');
    } finally {
      setLoading(false);
    }
  }, [hotelSlug, conversationId, onReactionUpdate]);

  /**
   * Toggle a reaction (add if not present, remove if present)
   * One reaction per user - if user clicks different emoji, replace previous one
   * @param {number} messageId - The message ID
   * @param {string} emoji - The emoji to toggle
   * @param {Array} currentReactions - Current reactions on the message
   * @param {number} currentUserId - Current user's ID
   */
  const toggleReaction = useCallback(async (messageId, emoji, currentReactions = [], currentUserId) => {
    if (!currentUserId) {
      setError('User ID is required');
      return;
    }

    // Find user's existing reaction (any emoji)
    const userExistingReaction = currentReactions.find(
      r => r.staff_id === currentUserId
    );

    // Check if user already reacted with THIS specific emoji
    const userReactedWithThisEmoji = userExistingReaction && userExistingReaction.emoji === emoji;

    // Optimistic update - immediately update UI
    if (onReactionUpdate) {
      let optimisticReactions;
      
      if (userReactedWithThisEmoji) {
        // Remove reaction if clicking same emoji
        optimisticReactions = currentReactions.filter(
          r => r.staff_id !== currentUserId
        );
      } else {
        // Remove any previous reaction from this user and add new one
        optimisticReactions = [
          ...currentReactions.filter(r => r.staff_id !== currentUserId),
          {
            emoji,
            staff_id: currentUserId,
            staff_name: 'You'
          }
        ];
      }
      onReactionUpdate(messageId, { reactions: optimisticReactions });
    }

    // Then perform the actual API call
    // If user had a different reaction, remove it first
    if (userExistingReaction && !userReactedWithThisEmoji) {
      await removeReactionFromMessage(messageId, userExistingReaction.emoji);
    }
    
    if (userReactedWithThisEmoji) {
      // Remove if clicking same emoji
      await removeReactionFromMessage(messageId, emoji);
    } else {
      // Add new reaction
      await addReactionToMessage(messageId, emoji);
    }
  }, [addReactionToMessage, removeReactionFromMessage, onReactionUpdate]);

  /**
   * Group reactions by emoji
   * @param {Array} reactions - Array of reaction objects
   * @returns {Array} Grouped reactions with counts and staff info
   */
  const groupReactions = useCallback((reactions = []) => {
    const grouped = {};

    reactions.forEach(reaction => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          staff: [],
          userReacted: false
        };
      }

      grouped[reaction.emoji].count++;
      grouped[reaction.emoji].staff.push({
        id: reaction.staff_id,
        name: reaction.staff_name || 'Unknown User'
      });
    });

    return Object.values(grouped);
  }, []);

  /**
   * Check if current user has reacted with specific emoji
   * @param {Array} reactions - Array of reaction objects
   * @param {string} emoji - The emoji to check
   * @param {number} currentUserId - Current user's ID
   * @returns {boolean} True if user has reacted
   */
  const hasUserReacted = useCallback((reactions = [], emoji, currentUserId) => {
    return reactions.some(r => r.emoji === emoji && r.staff_id === currentUserId);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    addReaction: addReactionToMessage,
    removeReaction: removeReactionFromMessage,
    toggleReaction,
    groupReactions,
    hasUserReacted,
    clearError
  };
};

export default useReactions;
