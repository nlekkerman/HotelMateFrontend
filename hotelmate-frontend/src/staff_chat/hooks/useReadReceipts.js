import { useState, useCallback } from 'react';
import { markMessageAsRead, markConversationAsRead } from '../services/staffChatApi';

/**
 * Custom hook for managing message read receipts
 * Tracks which messages have been read and by whom
 * 
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} conversationId - The conversation ID
 * @param {number} currentUserId - Current user's staff ID
 * @returns {Object} Read receipt management functions and state
 */
const useReadReceipts = (hotelSlug, conversationId, currentUserId) => {
  const [readReceipts, setReadReceipts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Mark a message as read
   * @param {number} messageId - The message ID to mark as read
   */
  const markAsRead = useCallback(async (messageId) => {
    if (!messageId || !conversationId || !hotelSlug) {
      setError('Message ID, conversation ID, and hotel slug are required');
      return;
    }

    try {
      setLoading(true);
      const response = await markMessageAsRead(hotelSlug, messageId);
      
      // Update local state with read receipt info
      if (response.message) {
        setReadReceipts(prev => ({
          ...prev,
          [messageId]: {
            read_by: response.message.read_by_list || [],
            read_count: response.message.read_by_count || 0,
            is_read_by_current_user: response.message.is_read_by_current_user || true
          }
        }));
      }
      
      return response;
    } catch (err) {
      console.error('Error marking message as read:', err);
      setError(err.message || 'Failed to mark message as read');
      return null;
    } finally {
      setLoading(false);
    }
  }, [hotelSlug, conversationId]);

  /**
   * Mark entire conversation as read (all unread messages)
   */
  const markConversationRead = useCallback(async () => {
    if (!conversationId || !hotelSlug) {
      return null;
    }

    try {
      setLoading(true);
      const response = await markConversationAsRead(hotelSlug, conversationId);
      
      // Update local state for all marked messages
      if (response.message_ids && response.message_ids.length > 0) {
        const updates = {};
        response.message_ids.forEach(msgId => {
          updates[msgId] = {
            read_by: [{ id: currentUserId }],
            read_count: 1,
            is_read_by_current_user: true
          };
        });
        
        setReadReceipts(prev => ({
          ...prev,
          ...updates
        }));
      }
      
      return response;
    } catch (err) {
      console.error('Error marking conversation as read:', err);
      setError(err.message || 'Failed to mark conversation as read');
      return null;
    } finally {
      setLoading(false);
    }
  }, [hotelSlug, conversationId, currentUserId]);

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
   * Update read receipts from real-time Pusher event (messages-read)
   * @param {Object} data - Read receipt data from Pusher
   * Format: { staff_id, staff_name, message_ids: [], timestamp }
   */
  const updateFromRealtimeEvent = useCallback((data) => {
    if (!data || !data.message_ids || !Array.isArray(data.message_ids)) {
      console.warn('Invalid read receipt event data:', data);
      return;
    }

    console.log('📖 Updating read receipts from Pusher event:', data);

    // Update read receipts for all affected messages
    setReadReceipts(prev => {
      const updates = { ...prev };
      
      data.message_ids.forEach(messageId => {
        const existing = updates[messageId] || { read_by: [], read_count: 0 };
        
        // Check if this staff member already marked as read
        const alreadyRead = existing.read_by.some(
          reader => reader.id === data.staff_id
        );
        
        if (!alreadyRead) {
          updates[messageId] = {
            ...existing,
            read_by: [
              ...existing.read_by,
              {
                id: data.staff_id,
                name: data.staff_name,
                timestamp: data.timestamp
              }
            ],
            read_count: existing.read_count + 1
          };
        }
      });
      
      return updates;
    });
  }, []);

  /**
   * Load read receipts from message objects
   * (Messages from backend already include read_by_list and read_by_count)
   * @param {Array<Object>} messages - Array of message objects
   */
  const loadReadReceipts = useCallback((messages) => {
    if (!messages || messages.length === 0) return;

    const updates = {};
    messages.forEach(msg => {
      if (msg.id) {
        updates[msg.id] = {
          read_by: msg.read_by_list || [],
          read_count: msg.read_by_count || 0,
          is_read_by_current_user: msg.is_read_by_current_user || false
        };
      }
    });
    
    setReadReceipts(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

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
    markConversationRead,
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
