import { useState, useCallback } from 'react';
// import API functions when backend adds read receipt endpoints

/**
 * Custom hook for managing message read receipts
 * Tracks which messages have been read and by whom
 * 
 * @param {number} conversationId - The conversation ID
 * @param {number} currentUserId - Current user's staff ID
 * @returns {Object} Read receipt management functions and state
 */
const useReadReceipts = (conversationId, currentUserId) => {
  const [readReceipts, setReadReceipts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Mark a message as read
   * @param {number} messageId - The message ID to mark as read
   */
  const markAsRead = useCallback(async (messageId) => {
    if (!messageId || !conversationId) {
      setError('Message ID and conversation ID are required');
      return;
    }

    // TODO: Implement when backend adds read receipt endpoint
    console.log('markAsRead called for message:', messageId);
    
    // Placeholder implementation
    setReadReceipts(prev => ({
      ...prev,
      [messageId]: {
        ...(prev[messageId] || {}),
        read_by: [],
        read_count: 0
      }
    }));
  }, [conversationId]);

  /**
   * Mark multiple messages as read (bulk operation)
   * @param {Array<number>} messageIds - Array of message IDs
   */
  const markMultipleAsRead = useCallback(async (messageIds) => {
    if (!messageIds || messageIds.length === 0) {
      return;
    }

    // TODO: Implement when backend adds bulk read receipt endpoint
    console.log('markMultipleAsRead called for messages:', messageIds);
  }, [conversationId]);

  /**
   * Get read status for a specific message
   * @param {number} messageId - The message ID
   * @returns {Object} Read receipt info
   */
  const getReadStatus = useCallback((messageId) => {
    return readReceipts[messageId] || {
      read_by: [],
      read_count: 0
    };
  }, [readReceipts]);

  /**
   * Check if a message has been read by the current user
   * @param {number} messageId - The message ID
   * @returns {boolean} True if read by current user
   */
  const isReadByCurrentUser = useCallback((messageId) => {
    const status = readReceipts[messageId];
    if (!status || !status.read_by) return false;
    
    return status.read_by.some(reader => reader.staff_id === currentUserId);
  }, [readReceipts, currentUserId]);

  /**
   * Check if a message has been read by anyone
   * @param {number} messageId - The message ID
   * @returns {boolean} True if read by at least one person
   */
  const isRead = useCallback((messageId) => {
    const status = readReceipts[messageId];
    return status && status.read_count > 0;
  }, [readReceipts]);

  /**
   * Get list of users who read a message
   * @param {number} messageId - The message ID
   * @returns {Array} Array of staff who read the message
   */
  const getReadBy = useCallback((messageId) => {
    const status = readReceipts[messageId];
    return status?.read_by || [];
  }, [readReceipts]);

  /**
   * Update read receipts from real-time event
   * @param {Object} data - Read receipt data from Pusher
   */
  const updateFromRealtimeEvent = useCallback((data) => {
    if (!data || !data.message_id) return;

    setReadReceipts(prev => ({
      ...prev,
      [data.message_id]: {
        read_by: data.read_by || [],
        read_count: data.read_count || 0
      }
    }));
  }, []);

  /**
   * Load read receipts for messages
   * @param {Array<number>} messageIds - Array of message IDs
   */
  const loadReadReceipts = useCallback(async (messageIds) => {
    if (!messageIds || messageIds.length === 0) return;

    // TODO: Implement when backend adds read receipts endpoint
    console.log('loadReadReceipts called for messages:', messageIds);
  }, [conversationId]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear all read receipts (reset state)
   */
  const clearReadReceipts = useCallback(() => {
    setReadReceipts({});
  }, []);

  return {
    readReceipts,
    loading,
    error,
    markAsRead,
    markMultipleAsRead,
    getReadStatus,
    isReadByCurrentUser,
    isRead,
    getReadBy,
    updateFromRealtimeEvent,
    loadReadReceipts,
    clearError,
    clearReadReceipts
  };
};

export default useReadReceipts;
