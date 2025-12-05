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
   * IMPORTANT: This updates the backend AND triggers Pusher event
   * The UI will update via Pusher event (updateFromRealtimeEvent)
   */
  const markConversationRead = useCallback(async () => {
    if (!conversationId || !hotelSlug) {
      console.log('⚠️ [useReadReceipts] markConversationRead - missing data:', {
        conversationId,
        hotelSlug
      });
      return null;
    }

    try {
      console.log('📮 [useReadReceipts] Calling markConversationAsRead API...');
      setLoading(true);
      const response = await markConversationAsRead(hotelSlug, conversationId);
      
      console.log('✅ [useReadReceipts] API response:', response);
      console.log('✅ [useReadReceipts] Message IDs marked:', response.message_ids);
      
      // IMMEDIATELY update local state (don't wait for Pusher)
      if (response.message_ids && response.message_ids.length > 0) {
        console.log('🔄 [READ] Updating readReceipts for message IDs:', response.message_ids);
        
        setReadReceipts(prev => {
          const next = { ...prev };
          response.message_ids.forEach(msgId => {
            const existing = next[msgId] || {};
            const existingReadBy = existing.read_by || [];
            
            // Check if current user is already in the read_by list
            const currentUserExists = existingReadBy.some(reader => 
              reader.id === currentUserId || reader === currentUserId
            );
            
            // Add current user to read_by if not already there
            const updatedReadBy = currentUserExists ? existingReadBy : [
              ...existingReadBy,
              { 
                id: currentUserId, 
                name: 'You',
                timestamp: new Date().toISOString()
              }
            ];
            
            next[msgId] = {
              ...existing,
              read_count: Math.max(existing.read_count || 0, updatedReadBy.length),
              read_by: updatedReadBy,
              is_read_by_current_user: true
            };
          });
          
          console.log('✅ [READ] markConversationRead updated readReceipts for', response.message_ids.length, 'messages');
          return next;
        });
      }
      
      return response;
    } catch (err) {
      console.error('❌ [useReadReceipts] Error marking conversation as read:', err);
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
    console.log('🎯 [useReadReceipts] updateFromRealtimeEvent called:', data);
    
    // Handle both legacy format (data.message_ids) and new format (data.messageIds)
    const messageIds = data.messageIds || data.message_ids;
    const staffId = data.staffId || data.staff_id;
    const staffName = data.staffName || data.staff_name;
    const timestamp = data.timestamp;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      console.warn('❌ [useReadReceipts] Invalid read receipt event - no message IDs:', data);
      return;
    }

    console.log('📖 [useReadReceipts] Updating read receipts:', {
      messageIds,
      staffId,
      staffName,
      timestamp
    });

    setReadReceipts(prev => {
      const next = { ...prev };
      
      messageIds.forEach(messageId => {
        const key = Number(messageId);
        const current = next[key] || { read_count: 0, read_by: [] };
        
        // Check if this staff member already marked as read
        const alreadyThere = current.read_by.some(
          reader => Number(reader.id || reader.staff_id) === Number(staffId)
        );
        
        if (!alreadyThere) {
          const updatedReadBy = [
            ...current.read_by,
            {
              id: staffId,
              staff_id: staffId,
              name: staffName,
              staff_name: staffName,
              read_at: timestamp,
            },
          ];
          
          next[key] = {
            ...current,
            read_by: updatedReadBy,
            read_count: updatedReadBy.length,
          };
          
          console.log(`✅ [useReadReceipts] Updated message ${key} read receipts:`, next[key]);
        }
      });
      
      return next;
    });
  }, []);

  /**
   * Load read receipts from message objects
   * (Messages from backend already include read_by_list and read_by_count)
   * @param {Array<Object>} messages - Array of message objects
   */
  const loadReadReceipts = useCallback((messages) => {
    if (!messages || messages.length === 0) return;

    console.log('📋 [LOAD RECEIPTS] Processing', messages.length, 'messages');
    const updates = {};
    messages.forEach(msg => {
      if (msg.id) {
        const readReceipt = {
          read_by: msg.read_by_list || [],
          read_count: msg.read_by_count || 0,
          is_read_by_current_user: msg.is_read_by_current_user || false
        };
        updates[msg.id] = readReceipt;
        console.log(`📋 [LOAD RECEIPTS] Message ${msg.id}:`, readReceipt);
      }
    });
    
    console.log('📋 [LOAD RECEIPTS] Final updates:', updates);
    setReadReceipts(prev => {
      const newState = {
        ...prev,
        ...updates
      };
      console.log('📋 [LOAD RECEIPTS] New readReceipts state:', newState);
      return newState;
    });
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
