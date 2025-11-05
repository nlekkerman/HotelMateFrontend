import { useState, useEffect, useCallback } from 'react';
import { fetchConversations } from '../services/staffChatApi';

/**
 * Custom hook to fetch and manage conversations list
 * @param {string} hotelSlug - The hotel's slug identifier
 * @returns {Object} Conversations data and state
 */
const useConversations = (hotelSlug) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConversations = useCallback(async () => {
    if (!hotelSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchConversations(hotelSlug);
      // Handle both paginated and non-paginated responses
      const conversationsData = data?.results || data || [];
      setConversations(conversationsData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [hotelSlug]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const refetch = useCallback(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    loading,
    error,
    refetch
  };
};

export default useConversations;
