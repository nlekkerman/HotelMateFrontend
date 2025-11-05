import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchMessages } from '../services/staffChatApi';

/**
 * Custom hook for message pagination with infinite scroll
 * Loads messages in chunks and supports loading older messages
 * 
 * @param {string} hotelSlug - The hotel slug
 * @param {number} conversationId - The conversation ID
 * @param {number} pageSize - Number of messages per page (default: 20)
 * @returns {Object} Pagination functions and state
 */
const useMessagePagination = (hotelSlug, conversationId, pageSize = 20) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  
  const observerRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  /**
   * Load initial messages
   */
  const loadInitialMessages = useCallback(async () => {
    if (!conversationId) {
      setError('Conversation ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    isInitialLoadRef.current = true;

    try {
      const response = await fetchMessages(hotelSlug, conversationId, pageSize, null);

      // Response format: { messages: [], count: number, has_more: boolean }
      const fetchedMessages = response.messages || response.results || response || [];
      setMessages(fetchedMessages);
      setPage(1);
      setHasMore(response.has_more !== undefined ? response.has_more : fetchedMessages.length === pageSize);
      
      // Store the oldest message ID for pagination
      if (fetchedMessages.length > 0) {
        lastMessageIdRef.current = fetchedMessages[0].id;
      }
    } catch (err) {
      console.error('Error loading initial messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [hotelSlug, conversationId, pageSize]);

  /**
   * Load more messages (older messages)
   * Uses before_id to fetch messages before the oldest loaded message
   */
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const response = await fetchMessages(
        hotelSlug, 
        conversationId, 
        pageSize, 
        lastMessageIdRef.current // Load messages before this ID
      );

      const fetchedMessages = response.messages || response.results || response || [];
      
      if (fetchedMessages.length > 0) {
        // Prepend older messages to the beginning
        setMessages(prev => [...fetchedMessages, ...prev]);
        setPage(prev => prev + 1);
        setHasMore(response.has_more !== undefined ? response.has_more : fetchedMessages.length === pageSize);
        
        // Update the oldest message ID
        lastMessageIdRef.current = fetchedMessages[0].id;
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
      setError(err.message || 'Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  }, [hotelSlug, conversationId, hasMore, loadingMore, page, pageSize]);

  /**
   * Add a new message to the list (for real-time updates)
   * @param {Object} message - The new message object
   */
  const addMessage = useCallback((message) => {
    if (!message) return;

    setMessages(prev => {
      // Check if message already exists
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      
      // Add to the end (newest message)
      return [...prev, message];
    });
  }, []);

  /**
   * Update an existing message
   * @param {number} messageId - The message ID to update
   * @param {Object} updates - Partial message object with updates
   */
  const updateMessage = useCallback((messageId, updates) => {
    if (!messageId || !updates) return;

    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, ...updates }
        : msg
    ));
  }, []);

  /**
   * Remove a message from the list
   * @param {number} messageId - The message ID to remove
   */
  const removeMessage = useCallback((messageId) => {
    if (!messageId) return;

    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  /**
   * Refresh messages (reload from server)
   */
  const refreshMessages = useCallback(async () => {
    await loadInitialMessages();
  }, [loadInitialMessages]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setPage(1);
    setHasMore(true);
    lastMessageIdRef.current = null;
  }, []);

  /**
   * Get total message count
   */
  const getMessageCount = useCallback(() => {
    return messages.length;
  }, [messages]);

  /**
   * Scroll to bottom helper
   * Returns function that should be called to scroll to bottom
   */
  const createScrollToBottom = useCallback((containerRef) => {
    return () => {
      if (containerRef?.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    };
  }, []);

  /**
   * Setup intersection observer for infinite scroll
   * @param {RefObject} targetRef - Ref to the sentinel element at the top of the list
   */
  const setupInfiniteScroll = useCallback((targetRef) => {
    if (!targetRef?.current) return;

    // Cleanup existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        
        // Load more when sentinel is visible and we're not already loading
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreMessages();
        }
      },
      {
        root: null,
        rootMargin: '100px', // Start loading 100px before reaching the top
        threshold: 0.1
      }
    );

    observerRef.current.observe(targetRef.current);

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loading, loadMoreMessages]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load initial messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadInitialMessages();
    }

    return () => {
      clearMessages();
    };
  }, [hotelSlug, conversationId, loadInitialMessages]); // Only re-run when these change

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    page,
    loadInitialMessages,
    loadMoreMessages,
    addMessage,
    updateMessage,
    removeMessage,
    refreshMessages,
    clearMessages,
    getMessageCount,
    setupInfiniteScroll,
    createScrollToBottom,
    clearError
  };
};

export default useMessagePagination;
