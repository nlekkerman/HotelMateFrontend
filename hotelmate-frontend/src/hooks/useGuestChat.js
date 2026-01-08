/**
 * Guest Chat Hook - React Query Integration with Canonical Endpoints
 * 
 * Core guest chat functionality using:
 * - Single Pusher client policy (no new instances)
 * - Optimistic send with client_message_id deduplication
 * - Reconnection sync on subscription success
 * - Canonical guest endpoints ONLY
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { getGuestRealtimeClient } from '../realtime/guestRealtimeClient';
import * as guestChatAPI from '../services/guestChatAPI';
import { useGuestChatDispatch, guestChatActions } from '../realtime/stores/guestChatStore';

// Debug flag for realtime events
const DEBUG_REALTIME = true;

/**
 * Generate client message ID for optimistic updates and deduplication
 * @returns {string} UUID for client message identification
 */
const generateClientMessageId = () => uuidv4();

/**
 * Create optimistic message object for immediate UI display
 * @param {string} message - Message content
 * @param {string} clientMessageId - Generated UUID
 * @param {string} [replyTo] - Optional reply message ID
 * @returns {Object} Optimistic message object
 */
const createOptimisticMessage = (message, clientMessageId, replyTo = null) => ({
  id: `local:${clientMessageId}`,
  client_message_id: clientMessageId,
  message,
  sender_type: 'guest',
  status: 'pending',
  timestamp: new Date().toISOString(), // Use 'timestamp' to match API format
  created_at: new Date().toISOString(), // Also include for compatibility
  reply_to: replyTo,
  // Mark as optimistic for UI identification
  __optimistic: true
});

/**
 * Main Guest Chat Hook
 * @param {Object} params - Hook parameters
 * @param {string} params.hotelSlug - Hotel slug
 * @param {string} params.token - Guest authentication token
 * @returns {Object} Chat state and actions
 */
export const useGuestChat = ({ hotelSlug, token }) => {
  const queryClient = useQueryClient();
  
  // Guest chat store integration
  const guestChatDispatch = useGuestChatDispatch();
  
  // Local state for real-time operations
  const [messages, setMessages] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [pusherClient, setPusherClient] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);
  
  // Track processed event IDs for deduplication
  const processedEventIds = useRef(new Set());
  const processedMessageIds = useRef(new Set());
  
  // STEP 1: Fetch Context (required first)
  const { 
    data: context, 
    isLoading: contextLoading, 
    error: contextError,
    refetch: refetchContext
  } = useQuery({
    queryKey: ['guestChatContext', hotelSlug, token],
    queryFn: () => guestChatAPI.getContext(hotelSlug, token),
    enabled: !!(hotelSlug && token),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });

  // Store context in guest chat store and debug log
  useEffect(() => {
    if (context) {
      console.log('🔧 [useGuestChat] Context loaded:', {
        hasContext: !!context,
        conversationId: context.conversation_id,
        disabled_reason: context.disabled_reason,
        isDisabled: !!context?.disabled_reason,
        contextKeys: Object.keys(context)
      });
      
      // Store context in guest chat store so ChatContext can access it
      console.log('📦 [useGuestChat] Storing context in guest chat store...');
      guestChatActions.setContext(context, guestChatDispatch);
      
      // If we have messages and conversation_id, also store messages
      if (context.conversation_id && messages.length > 0) {
        console.log('[useGuestChat] Storing existing messages in guest chat store for conversation:', context.conversation_id);
        guestChatActions.initMessagesForConversation(context.conversation_id, messages, guestChatDispatch);
      }
    }
  }, [context, guestChatDispatch, messages]);
  
  // STEP 2: Fetch Messages (after context is available)
  const { 
    data: initialMessages, 
    isLoading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['guestChatMessages', hotelSlug, token],
    queryFn: () => guestChatAPI.getMessages(hotelSlug, token, { limit: 50 }),
    enabled: !!(context && hotelSlug && token),
    staleTime: 30 * 1000, // 30 seconds
  });
  
  // Update local messages when initial data loads
  useEffect(() => {
    if (initialMessages && Array.isArray(initialMessages)) {
      console.log('[useGuestChat] Setting initial messages:', initialMessages.length);
      
      // Sort messages by timestamp (API format) or created_at (fallback), then by id for consistency
      const sortedMessages = [...initialMessages].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at).getTime();
        const timeB = new Date(b.timestamp || b.created_at).getTime();
        return timeA !== timeB ? timeA - timeB : (a.id - b.id);
      });
      
      setMessages(sortedMessages);
      
      // Also store messages in guest chat store if we have context with conversation_id
      if (context?.conversation_id) {
        console.log('[useGuestChat] Storing messages in guest chat store for conversation:', context.conversation_id);
        guestChatActions.initMessagesForConversation(context.conversation_id, sortedMessages, guestChatDispatch);
      }
      
      // Track message IDs for deduplication
      sortedMessages.forEach(msg => {
        if (msg.id) processedMessageIds.current.add(msg.id);
      });
    }
  }, [initialMessages, context?.conversation_id, guestChatDispatch]);

  /**
   * Handle real-time message events with canonical envelope format ONLY
   * @param {Object} evt - Canonical event: {category, type, payload, meta}
   */
  const handleRealtimeMessage = useCallback((evt) => {
    console.log('[useGuestChat] 📨 Real-time event received:', evt);
    
    // REQUIREMENT: Only accept canonical envelope format
    if (!evt.category || !evt.type || !evt.payload) {
      console.warn('[useGuestChat] ⚠️  Non-canonical event shape ignored. Expected {category, type, payload, meta}:', evt);
      return;
    }
    
    // REQUIREMENT: Only process guest_chat category
    if (evt.category !== 'guest_chat') {
      console.log('[useGuestChat] 🔄 Non guest_chat event ignored:', evt.category);
      return;
    }
    
    // REQUIREMENT: Event deduplication using event_id
    const eventId = evt.meta?.event_id;
    if (eventId && processedEventIds.current.has(eventId)) {
      console.log('[useGuestChat] 🔄 Duplicate event ignored:', eventId);
      return;
    }
    
    if (eventId) {
      processedEventIds.current.add(eventId);
    }
    
    // REQUIREMENT: Message extraction from evt.payload (NOT evt.payload.message)
    const incomingMessage = evt.payload;
    
    // REQUIREMENT: Inject conversation_id if missing
    if (!incomingMessage.conversation_id && context?.conversation_id) {
      console.log('[useGuestChat] 🔧 Injecting conversation_id from context:', context.conversation_id);
      incomingMessage.conversation_id = context.conversation_id;
    }
    
    // REQUIREMENT: Message deduplication by message ID
    if (incomingMessage.id && processedMessageIds.current.has(incomingMessage.id)) {
      console.log('[useGuestChat] 🔄 Duplicate message ID ignored:', incomingMessage.id);
      return;
    }
    
    if (incomingMessage.id) {
      processedMessageIds.current.add(incomingMessage.id);
    }
    
    // REQUIREMENT: Update local React state
    setMessages(prevMessages => {
      console.log('[useGuestChat] 🔍 Processing realtime message for local state:', {
        incomingMessageId: incomingMessage.id,
        clientMessageId: incomingMessage.client_message_id,
        currentMessagesCount: prevMessages.length,
        senderType: incomingMessage.sender_type || incomingMessage.sender_role
      });
      
      // For guest messages, remove from sending messages if client_message_id matches
      if ((incomingMessage.sender_role === 'guest' || incomingMessage.sender_type === 'guest') && 
          incomingMessage.client_message_id) {
        setSendingMessages(prevSending => {
          const filtered = prevSending.filter(msg => msg.client_message_id !== incomingMessage.client_message_id);
          if (filtered.length !== prevSending.length) {
            console.log('[useGuestChat] 🔄 Removed sending message after server confirmation:', incomingMessage.client_message_id);
          }
          return filtered;
        });
      }
      
      // Check for duplicate by ID
      const existingById = prevMessages.find(msg => msg.id === incomingMessage.id);
      if (existingById) {
        console.log('[useGuestChat] 🔄 Duplicate message ID ignored:', incomingMessage.id);
        return prevMessages;
      }
      
      // Add new message
      console.log('[useGuestChat] ➕ Adding new realtime message:', incomingMessage.id);
      const newMessages = [...prevMessages, { ...incomingMessage, status: 'delivered' }];
      
      // REQUIREMENT: Sort by timestamp/created_at then id
      const sortedMessages = newMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at).getTime();
        const timeB = new Date(b.timestamp || b.created_at).getTime();
        return timeA !== timeB ? timeA - timeB : ((a.id || 0) - (b.id || 0));
      });
      
      console.log('[useGuestChat] ✅ Messages updated via realtime:', {
        previousCount: prevMessages.length,
        newCount: sortedMessages.length,
        lastMessageId: sortedMessages[sortedMessages.length - 1]?.id
      });
      
      return sortedMessages;
    });
    
    // REQUIREMENT: Route to guestChatStore with canonical event
    console.log('[useGuestChat] 📦 Routing canonical event to guestChatStore');
    guestChatActions.handleEvent(evt, guestChatDispatch);
  }, [context?.conversation_id, guestChatDispatch]);
  
  // STEP 3: Setup Pusher Connection (with private channel auth)
  useEffect(() => {
    if (!context?.pusher || !token) return;
    
    const setupPusher = async () => {
      try {
        console.log('[useGuestChat] Setting up Pusher connection:', {
          channel: context.pusher.channel,
          event: context.pusher.event
        });
        
        // Get guest realtime client with private channel support
        const client = await getGuestRealtimeClient(token, {
          authEndpoint: guestChatAPI.getPusherAuthEndpoint(hotelSlug, token)
        });
        
        if (!client) {
          console.error('[useGuestChat] Failed to get Pusher client');
          setConnectionState('failed');
          return;
        }
        
        setPusherClient(client);
        setConnectionState('connecting');
        
        // Subscribe to private channel from context
        const channel = client.subscribe(context.pusher.channel);
        setCurrentChannel(channel);
        
        // Handle connection state changes
        client.connection.bind('connected', () => {
          console.log('[useGuestChat] Pusher connected');
          setConnectionState('connected');
        });
        
        client.connection.bind('disconnected', () => {
          console.log('[useGuestChat] Pusher disconnected');
          setConnectionState('disconnected');
        });
        
        client.connection.bind('error', (err) => {
          console.error('[useGuestChat] Pusher error:', err);
          setConnectionState('failed');
        });
        
        // Add global event debugging if enabled
        if (DEBUG_REALTIME) {
          channel.bind_global((eventName, data) => {
            console.log('[useGuestChat] 🔄 Global event received:', {
              eventName,
              data,
              channel: context.pusher.channel,
              isRealtimeEvent: eventName === context.pusher.event
            });
          });
        }
        
        // REQUIREMENT: Reconnection sync trigger
        channel.bind('pusher:subscription_succeeded', () => {
          console.log('[useGuestChat] ✅ Subscription successful - triggering sync');
          setConnectionState('connected');
          // Sync missed messages on reconnection
          syncMessages();
        });
        
        channel.bind('pusher:subscription_error', (err) => {
          console.error('[useGuestChat] ❌ Subscription error:', err);
          setConnectionState('failed');
        });
        
        // Listen for real-time message events (canonical format only)
        channel.bind(context.pusher.event, handleRealtimeMessage);
        
      } catch (error) {
        console.error('[useGuestChat] Pusher setup error:', error);
        setConnectionState('failed');
      }
    };
    
    setupPusher();
    
    return () => {
      console.log('[useGuestChat] 🧹 Cleaning up Pusher connection');
      if (currentChannel) {
        // Unbind global events first
        if (DEBUG_REALTIME) {
          currentChannel.unbind_global();
        }
        // Unbind specific event
        currentChannel.unbind(context.pusher.event, handleRealtimeMessage);
        // Unbind all remaining events
        currentChannel.unbind_all();
        
        if (pusherClient) {
          pusherClient.unsubscribe(context.pusher.channel);
        }
      }
    };
  }, [context?.pusher, token, hotelSlug, handleRealtimeMessage]);
  
  /**
   * REQUIREMENT: Sync messages on reconnection
   * Fetches latest messages and merges with deduplication
   */
  const syncMessages = useCallback(async () => {
    if (!hotelSlug || !token) return;
    
    try {
      console.log('[useGuestChat] Syncing messages after reconnection');
      const latestMessages = await guestChatAPI.getMessages(hotelSlug, token, { limit: 50 });
      
      setMessages(prevMessages => {
        // Ensure latestMessages is an array
        const messagesArray = Array.isArray(latestMessages) ? latestMessages : [];
        
        // Merge with deduplication
        const messageMap = new Map();
        
        // Add existing messages
        prevMessages.forEach(msg => {
          if (msg.id && !msg.__optimistic) {
            messageMap.set(msg.id, msg);
          }
        });
        
        // Add/update with latest messages
        messagesArray.forEach(msg => {
          if (msg.id) {
            messageMap.set(msg.id, { ...msg, status: 'delivered' });
            processedMessageIds.current.add(msg.id);
          }
        });
        
        const mergedMessages = Array.from(messageMap.values());
        
        // Re-add optimistic messages that haven't been replaced
        const optimisticMessages = prevMessages.filter(msg => 
          msg.__optimistic && !mergedMessages.find(m => m.client_message_id === msg.client_message_id)
        );
        
        const finalMessages = [...mergedMessages, ...optimisticMessages];
        
        // REQUIREMENT: Sort by timestamp/created_at then id
        const sortedMessages = finalMessages.sort((a, b) => {
          const timeA = new Date(a.timestamp || a.created_at).getTime();
          const timeB = new Date(b.timestamp || b.created_at).getTime();
          return timeA !== timeB ? timeA - timeB : ((a.id || 0) - (b.id || 0));
        });
        
        // Also sync with guest chat store if we have context
        if (context?.conversation_id) {
          console.log('[useGuestChat] Sync - updating guest chat store for conversation:', context.conversation_id);
          guestChatActions.initMessagesForConversation(context.conversation_id, sortedMessages, guestChatDispatch);
        }
        
        return sortedMessages;
      });
    } catch (error) {
      console.error('[useGuestChat] Sync error:', error);
    }
  }, [hotelSlug, token]);
  
  // Track sending messages with their content and client ID
  const [sendingMessages, setSendingMessages] = useState([]);

  // Send message mutation without optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, replyTo }) => {
      const clientMessageId = generateClientMessageId();
      
      // Add to sending messages list for UI indicator
      const sendingMessage = {
        id: `sending-${clientMessageId}`,
        client_message_id: clientMessageId,
        message,
        sender_type: 'guest',
        status: 'sending',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        reply_to: replyTo
      };
      
      setSendingMessages(prev => [...prev, sendingMessage]);
      
      // Send to server
      const response = await guestChatAPI.sendMessage(hotelSlug, token, {
        message,
        client_message_id: clientMessageId,
        reply_to: replyTo
      });
      
      return { response, clientMessageId };
    },
    onSuccess: (data, variables) => {
      // Remove from sending messages when successfully sent
      setSendingMessages(prev => prev.filter(msg => msg.client_message_id !== data.clientMessageId));
    },
    onError: (error, variables, context) => {
      console.error('[useGuestChat] Send message error:', error);
      
      // Update sending message to failed state
      setSendingMessages(prev => prev.map(msg => 
        msg.client_message_id === context?.clientMessageId
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  });
  
  /**
   * Load older messages using pagination cursor
   * @param {string} beforeMessageId - Message ID to paginate from
   */
  const loadOlderMessages = useCallback(async (beforeMessageId) => {
    if (!hotelSlug || !token) return;
    
    try {
      console.log('[useGuestChat] Loading older messages before:', beforeMessageId);
      const olderMessages = await guestChatAPI.getMessages(hotelSlug, token, { 
        limit: 50, 
        before: beforeMessageId 
      });
      
      // Ensure olderMessages is an array
      const messagesArray = Array.isArray(olderMessages) ? olderMessages : [];
      
      if (messagesArray.length > 0) {
        setMessages(prev => {
          const combined = [...messagesArray, ...prev];
          
          // Deduplicate by ID
          const messageMap = new Map();
          combined.forEach(msg => {
            if (msg.id) messageMap.set(msg.id, msg);
          });
          
          const dedupedMessages = Array.from(messageMap.values());
          
          // Sort and return
          const sortedMessages = dedupedMessages.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at).getTime();
            const timeB = new Date(b.timestamp || b.created_at).getTime();
            return timeA !== timeB ? timeA - timeB : ((a.id || 0) - (b.id || 0));
          });
          
          // Also update guest chat store with all messages if we have context
          if (context?.conversation_id) {
            console.log('[useGuestChat] Load older - updating guest chat store with all messages for conversation:', context.conversation_id);
            guestChatActions.initMessagesForConversation(context.conversation_id, sortedMessages, guestChatDispatch);
          }
          
          return sortedMessages;
        });
      }
      
      return olderMessages.length;
    } catch (error) {
      console.error('[useGuestChat] Load older messages error:', error);
      throw error;
    }
  }, [hotelSlug, token]);
  
  /**
   * Retry failed sending message
   * @param {Object} failedMessage - The failed sending message to retry
   */
  const retryMessage = useCallback((failedMessage) => {
    if (failedMessage.status !== 'failed') return;
    
    // Remove from sending messages and retry
    setSendingMessages(prev => prev.filter(msg => msg.id !== failedMessage.id));
    sendMessageMutation.mutate({
      message: failedMessage.message,
      replyTo: failedMessage.reply_to
    });
  }, [sendMessageMutation]);
  
  // Public API
  return {
    // State
    context,
    messages,
    sendingMessages,
    loading: contextLoading || messagesLoading,
    error: contextError || messagesError,
    connectionState,
    
    // Actions
    sendMessage: (message, replyTo) => sendMessageMutation.mutate({ message, replyTo }),
    loadOlder: loadOlderMessages,
    retryMessage,
    syncMessages,
    
    // Loading states
    isSending: sendMessageMutation.isPending,
    sendError: sendMessageMutation.error,
    
    // Utility
    isDisabled: !!context?.disabled_reason,
    disabledReason: context?.disabled_reason
  };
};