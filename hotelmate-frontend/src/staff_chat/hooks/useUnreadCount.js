import { useState, useEffect, useCallback } from 'react';
import { fetchUnreadCount } from '../services/staffChatApi';

/**
 * Custom hook for tracking global unread message count
 * Provides total unread count and per-conversation breakdown
 * Auto-refreshes periodically and on-demand
 * 
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} refreshInterval - Auto-refresh interval in milliseconds (default: 30000 = 30s)
 * @returns {Object} Unread count data and refresh function
 */
const useUnreadCount = (hotelSlug, refreshInterval = 30000) => {
  const [unreadData, setUnreadData] = useState({
    total_unread: 0,
    conversations_with_unread: 0,
    breakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch unread count from backend
   */
  const fetchCount = useCallback(async () => {
    if (!hotelSlug) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchUnreadCount(hotelSlug);
      
      setUnreadData({
        total_unread: data.total_unread || 0,
        conversations_with_unread: data.conversations_with_unread || 0,
        breakdown: data.breakdown || []
      });
    } catch (err) {
      console.error('Error fetching unread count:', err);
      setError(err.message || 'Failed to fetch unread count');
    } finally {
      setLoading(false);
    }
  }, [hotelSlug]);

  /**
   * Refresh unread count (can be called manually)
   */
  const refresh = useCallback(() => {
    fetchCount();
  }, [fetchCount]);

  /**
   * Increment total unread count (for real-time updates)
   * @param {number} amount - Amount to increment by (default: 1)
   */
  const incrementUnread = useCallback((amount = 1) => {
    setUnreadData(prev => ({
      ...prev,
      total_unread: prev.total_unread + amount
    }));
  }, []);

  /**
   * Decrement total unread count (for real-time updates)
   * @param {number} amount - Amount to decrement by (default: 1)
   */
  const decrementUnread = useCallback((amount = 1) => {
    setUnreadData(prev => ({
      ...prev,
      total_unread: Math.max(0, prev.total_unread - amount)
    }));
  }, []);

  /**
   * Reset unread count for a specific conversation
   * @param {number} conversationId - The conversation ID
   */
  const resetConversationUnread = useCallback((conversationId) => {
    setUnreadData(prev => {
      const updatedBreakdown = prev.breakdown.map(conv => {
        if (conv.conversation_id === conversationId) {
          const previousUnread = conv.unread_count;
          return { ...conv, unread_count: 0 };
        }
        return conv;
      }).filter(conv => conv.unread_count > 0); // Remove conversations with 0 unread

      const totalDecrement = prev.breakdown.find(
        conv => conv.conversation_id === conversationId
      )?.unread_count || 0;

      return {
        total_unread: Math.max(0, prev.total_unread - totalDecrement),
        conversations_with_unread: updatedBreakdown.length,
        breakdown: updatedBreakdown
      };
    });
  }, []);

  /**
   * Get unread count for a specific conversation
   * @param {number} conversationId - The conversation ID
   * @returns {number} Unread count for that conversation
   */
  const getConversationUnread = useCallback((conversationId) => {
    const conv = unreadData.breakdown.find(
      c => c.conversation_id === conversationId
    );
    return conv?.unread_count || 0;
  }, [unreadData.breakdown]);

  // Initial fetch on mount
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Set up periodic refresh
  useEffect(() => {
    if (!hotelSlug || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchCount();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [hotelSlug, refreshInterval, fetchCount]);

  return {
    totalUnread: unreadData.total_unread,
    conversationsWithUnread: unreadData.conversations_with_unread,
    breakdown: unreadData.breakdown,
    loading,
    error,
    refresh,
    incrementUnread,
    decrementUnread,
    resetConversationUnread,
    getConversationUnread
  };
};

export default useUnreadCount;
