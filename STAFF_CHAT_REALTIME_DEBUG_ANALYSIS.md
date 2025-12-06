# 🔥 Staff Chat Realtime Debug Analysis

## Issue Description
Notification button only appears AFTER opening the conversation list, which means realtime events are not populating chatStore with messages until the conversation list is accessed.

---

## 🔥 1. Staff Chat Realtime Listeners

### Main Realtime Event Entry Point (`eventBus.js`)

```javascript
// src/realtime/eventBus.js
import { addNotificationFromEvent } from './stores/notificationsStore.jsx';
import { attendanceActions } from './stores/attendanceStore.jsx';
import { chatActions } from './stores/chatStore.jsx';
import { guestChatActions } from './stores/guestChatStore.jsx';
import { roomServiceActions } from './stores/roomServiceStore.jsx';
import { bookingActions } from './stores/bookingStore.jsx';

/**
 * Main entry point for all realtime events from Pusher and FCM
 * @param {Object} evt - Event object
 * @param {string} evt.source - Event source: "pusher" | "fcm" | "local"
 * @param {string} evt.channel - Pusher channel name (if applicable)
 * @param {string} evt.eventName - Pusher event name (if applicable)
 * @param {Object} evt.payload - Raw event data
 */
export function handleIncomingRealtimeEvent({ source, channel, eventName, payload }) {
  try {
    console.log('📡 Incoming realtime event:', { source, channel, eventName, payload });
    
    // ✅ NEW: Check if payload is already in normalized format from backend
    if (payload && typeof payload === 'object' && payload.category && payload.type && payload.payload) {
      // Backend already sending normalized events - use directly
      console.log('📦 Using pre-normalized event from backend:', payload);
      routeToDomainStores(payload);
      maybeAddToNotificationCenter(payload);
      return;
    }
    
    // Legacy event handling for backward compatibility
    const normalized = normalizeEvent({ source, channel, eventName, payload });
    
    if (normalized) {
      routeToDomainStores(normalized);
      maybeAddToNotificationCenter(normalized);
    }
  } catch (error) {
    console.error('❌ Error handling realtime event:', error, { source, channel, eventName, payload });
  }
}

/**
 * Route events to appropriate domain stores
 * @param {Object} event - Event object (either new format with {category, type, payload, meta} or legacy)
 */
function routeToDomainStores(event) {
  // Handle new normalized format from backend
  if (event.category && event.type && event.payload) {
    if (!import.meta.env.PROD) {
      console.log('🚏 Routing NEW format event:', event.category, event.type);
    }

    switch (event.category) {
      case "attendance":
        attendanceActions.handleEvent(event);
        break;
      case "staff_chat":
        chatActions.handleEvent(event);
        break;
      case "guest_chat":
        guestChatActions.handleEvent(event);
        break;
      case "room_service":
        roomServiceActions.handleEvent(event);
        break;
      case "booking":
        bookingActions.handleEvent(event);
        break;
      default:
        if (!import.meta.env.PROD) {
          console.log('🚏 Unknown category:', event.category, event);
        }
        break;
    }
    return;
  }

  // Legacy format handling (for backward compatibility)
  if (event.eventType) {
    if (!import.meta.env.PROD) {
      console.log('🚏 Routing LEGACY format event:', event.category, event.eventType);
    }

    switch (event.category) {
      case "attendance":
        attendanceActions.handleEvent(event);
        break;
      case "staff_chat":
        chatActions.handleEvent(event);
        break;
      case "guest_chat":
        guestChatActions.handleEvent(event);
        break;
      case "room_service":
        roomServiceActions.handleEvent(event);
        break;
      case "booking":
        bookingActions.handleEvent(event);
        break;
      case "system":
        // Handle system events (FCM notifications, etc.)
        console.log('📢 System event received:', event.eventType, event.data);
        // Add to notification center for user awareness
        maybeAddToNotificationCenter(event);
        break;
      default:
        console.warn('🚫 Unhandled event category:', event.category, event);
        break;
    }
  }
}
```

### Staff Chat Event Normalization (`eventBus.js`)

```javascript
/**
 * Normalize Pusher events based on channel and event patterns
 */
function normalizePusherEvent(channel, eventName, payload, timestamp) {
  // Staff chat events - improved channel detection for staff chat
  if (channel.includes('staff-chat-hotel-') || 
      (channel.includes('-staff-') && channel.includes('-notifications')) ||
      (channel.includes('-staff-conversation-')) ||
      (channel.includes('.staff-chat.'))) {
    
    // Normalize event names to match chatStore expectations
    let normalizedEventType = eventName;
    if (eventName === 'new-message' || eventName === 'message') {
      normalizedEventType = 'new_message';
    } else if (eventName === 'message-created' || eventName === 'realtime_staff_chat_message_created') {
      normalizedEventType = 'message_created';
    } else if (eventName === 'message-updated' || eventName === 'message-edited' || eventName === 'realtime_staff_chat_message_edited') {
      normalizedEventType = 'message_edited';
    } else if (eventName === 'message-deleted' || eventName === 'realtime_staff_chat_message_deleted') {
      normalizedEventType = 'message_deleted';
    } else if (eventName === 'read-receipt' || eventName === 'messages-read' || eventName === 'message-read' || eventName === 'realtime_staff_chat_message_read') {
      normalizedEventType = 'read_receipt';
      // Extract conversationId from channel pattern: hotel-{slug}.staff-chat.{conversationId}
      const channelMatch = channel.match(/\.staff-chat\.(\d+)$/);
      if (channelMatch) {
        payload.conversationId = parseInt(channelMatch[1]);
      }
    } else if (eventName === 'message-delivered' || eventName === 'realtime_staff_chat_message_delivered') {
      normalizedEventType = 'message_delivered';
    } else if (eventName === 'conversation-updated') {
      normalizedEventType = 'conversation_update';
    } else if (eventName === 'typing' || eventName === 'realtime_staff_chat_typing_indicator') {
      normalizedEventType = 'typing_indicator';
    } else if (eventName === 'realtime_staff_chat_attachment_uploaded') {
      normalizedEventType = 'attachment_uploaded';
    } else if (eventName === 'realtime_staff_chat_attachment_deleted') {
      normalizedEventType = 'attachment_deleted';
    } else if (eventName === 'realtime_staff_chat_mention') {
      normalizedEventType = 'staff_mentioned';
    }
    
    return {
      category: 'staff_chat',
      eventType: normalizedEventType,
      data: payload,
      timestamp,
      source: 'pusher',
      title: 'Staff Chat',
      message: eventName === 'new-message' ? 'New message received' : `Message ${eventName}`,
      level: 'info'
    };
  }
}
```

### Staff Chat Channel Subscription (`channelRegistry.js`)

```javascript
// src/realtime/channelRegistry.js
import { getPusherClient } from './realtimeClient';
import { handleIncomingRealtimeEvent } from './eventBus';

let subscriptionsActive = false;
let currentChannels = [];

/**
 * Subscribe to specific staff chat conversation
 * @param {string} hotelSlug - Hotel slug
 * @param {string} conversationId - Staff chat conversation ID
 * @returns {Function} Cleanup function for this channel
 */
export function subscribeToStaffChatConversation(hotelSlug, conversationId) {
  if (!hotelSlug || !conversationId) {
    console.warn('⚠️ Missing hotelSlug or conversationId for staff chat subscription');
    return () => {};
  }

  const pusher = getPusherClient();
  const channelName = `hotel-${hotelSlug}.staff-chat.${conversationId}`;
  
  try {
    const channel = pusher.subscribe(channelName);
    
    channel.bind_global((eventName, payload) => {
      handleIncomingRealtimeEvent({
        source: 'pusher',
        channel: channel.name,
        eventName,
        payload
      });
    });

    console.log(`✅ Subscribed to staff chat: ${channelName}`);
    currentChannels.push(channel);

    return () => {
      try {
        channel.unbind_all();
        channel.unsubscribe();
        const index = currentChannels.indexOf(channel);
        if (index > -1) {
          currentChannels.splice(index, 1);
        }
        console.log(`🗑️ Unsubscribed from staff chat: ${channelName}`);
      } catch (error) {
        console.error('❌ Error unsubscribing from staff chat channel:', channelName, error);
      }
    };
  } catch (error) {
    console.error('❌ Error subscribing to staff chat channel:', channelName, error);
    return () => {};
  }
}

/**
 * Subscribe to all base hotel channels and route events to event bus
 * @param {Object} params - Subscription parameters
 * @param {string} params.hotelSlug - Hotel slug for channel names
 * @param {string} [params.staffId] - Staff ID for personal channels (optional)
 * @returns {Function} Cleanup function
 */
export function subscribeBaseHotelChannels({ hotelSlug, staffId }) {
  if (subscriptionsActive) {
    console.warn('🔄 Channels already subscribed, skipping duplicate subscription');
    return () => {}; // Return empty cleanup
  }

  if (!hotelSlug) {
    console.warn('⚠️ No hotelSlug provided, skipping channel subscriptions');
    return () => {};
  }

  const pusher = getPusherClient();
  const channels = [];

  console.log('🔗 Subscribing to base hotel channels:', { hotelSlug, staffId });

  try {
    // ✅ NEW STANDARDIZED CHANNEL FORMAT: hotel-{slug}.{domain}
    
    // Attendance (hotel-wide)
    const attendanceChannel = pusher.subscribe(`hotel-${hotelSlug}.attendance`);
    channels.push(attendanceChannel);

    // Room Service (hotel-wide) 
    const roomServiceChannel = pusher.subscribe(`hotel-${hotelSlug}.room-service`);
    channels.push(roomServiceChannel);

    // Booking (hotel-wide)
    const bookingChannel = pusher.subscribe(`hotel-${hotelSlug}.booking`);
    channels.push(bookingChannel);

    // Personal staff notifications (if staffId provided)
    if (staffId) {
      const personalNotifications = pusher.subscribe(`hotel-${hotelSlug}.staff-${staffId}-notifications`);
      channels.push(personalNotifications);
    }

    // Note: Staff chat and guest chat channels are conversation-specific and will be 
    // subscribed to dynamically when users enter specific conversations:
    // - hotel-{slug}.staff-chat.{conversation_id}
    // - hotel-{slug}.guest-chat.{room_pin}

    // Bind global event handlers to all channels
    channels.forEach(channel => {
      channel.bind_global((eventName, payload) => {
        handleIncomingRealtimeEvent({
          source: 'pusher',
          channel: channel.name,
          eventName,
          payload
        });
      });

      console.log(`✅ Subscribed to channel: ${channel.name}`);
    });

    subscriptionsActive = true;
    currentChannels = channels;

    // Return cleanup function
    return () => {
      console.log('🧹 Cleaning up channel subscriptions');
      
      channels.forEach(channel => {
        try {
          channel.unbind_all();
          channel.unsubscribe();
          console.log(`🗑️ Unsubscribed from: ${channel.name}`);
        } catch (error) {
          console.error('❌ Error unsubscribing from channel:', channel.name, error);
        }
      });

      subscriptionsActive = false;
      currentChannels = [];
    };

  } catch (error) {
    console.error('❌ Error subscribing to channels:', error);
    
    // Cleanup any successful subscriptions
    channels.forEach(channel => {
      try {
        channel.unbind_all();
        channel.unsubscribe();
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError);
      }
    });

    return () => {};
  }
}
```

### useStaffChatRealtime Hook

```javascript
// src/staff_chat/hooks/useStaffChatRealtime.js
import { useEffect, useCallback, useRef } from 'react';
import { useChatState, useChatDispatch } from '@/realtime/stores/chatStore.jsx';
import { sendMessage, uploadFiles, deleteMessage, deleteAttachment } from '../services/staffChatApi';

/**
 * Custom hook for real-time staff chat updates via centralized store
 * Provides interface for staff chat operations while reading from chatStore
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.hotelSlug - Hotel slug for channel subscription (compatibility)
 * @param {number} params.conversationId - Current conversation ID
 * @param {number} params.staffId - Staff ID for personal notifications
 * @param {Function} params.onNewMessage - Callback for new messages
 * @param {Function} params.onMessageEdited - Callback for edited messages
 * @param {Function} params.onMessageDeleted - Callback for deleted messages
 * @param {Function} params.onReaction - Callback for reactions
 * @param {Function} params.onAttachmentUploaded - Callback for new attachments
 * @param {Function} params.onAttachmentDeleted - Callback for deleted attachments
 * @param {Function} params.onTyping - Callback for typing indicators
 * @param {Function} params.onReadReceipt - Callback for read receipts
 * @returns {Object} Chat state and helper functions
 */
const useStaffChatRealtime = ({
  hotelSlug,
  conversationId,
  staffId,
  onNewMessage,
  onMessageEdited,
  onMessageDeleted,
  onReaction,
  onAttachmentUploaded,
  onAttachmentDeleted,
  onTyping,
  onReadReceipt
}) => {
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();

  // Get conversation data from store
  const conversation = conversationId ? chatState.conversationsById[conversationId] : null;
  const messages = conversation?.messages || [];
  const previousMessagesRef = useRef([]);
  const callbacksRef = useRef({
    onNewMessage,
    onMessageEdited, 
    onMessageDeleted,
    onReaction,
    onAttachmentUploaded,
    onAttachmentDeleted,
    onTyping,
    onReadReceipt
  });

  // Update callbacks ref when they change
  callbacksRef.current = {
    onNewMessage,
    onMessageEdited,
    onMessageDeleted, 
    onReaction,
    onAttachmentUploaded,
    onAttachmentDeleted,
    onTyping,
    onReadReceipt
  };

  // Detect changes in messages array and trigger appropriate callbacks
  useEffect(() => {
    if (!conversationId || !messages || messages.length === 0) {
      previousMessagesRef.current = [];
      return;
    }

    const previousMessages = previousMessagesRef.current;
    
    // Find new messages
    const newMessages = messages.filter(msg => 
      !previousMessages.find(prevMsg => prevMsg.id === msg.id)
    );

    // Find edited messages (same ID but different content/edited flag)
    const editedMessages = messages.filter(msg => {
      const prevMsg = previousMessages.find(prevMsg => prevMsg.id === msg.id);
      return prevMsg && (
        prevMsg.message !== msg.message || 
        prevMsg.content !== msg.content ||
        (!prevMsg.is_edited && msg.is_edited)
      );
    });

    // Find deleted messages (messages that exist in previous but not in current)
    const deletedMessageIds = previousMessages
      .filter(prevMsg => !messages.find(msg => msg.id === prevMsg.id))
      .map(msg => msg.id);

    // Trigger callbacks for new messages
    newMessages.forEach(message => {
      if (callbacksRef.current.onNewMessage) {
        console.log('🔔 [useStaffChatRealtime] Store-detected new message:', message.id);
        callbacksRef.current.onNewMessage(message);
      }
    });

    // Trigger callbacks for edited messages  
    editedMessages.forEach(message => {
      if (callbacksRef.current.onMessageEdited) {
        console.log('✏️ [useStaffChatRealtime] Store-detected edited message:', message.id);
        callbacksRef.current.onMessageEdited(message);
      }
    });

    // Trigger callbacks for deleted messages
    deletedMessageIds.forEach(messageId => {
      if (callbacksRef.current.onMessageDeleted) {
        console.log('🗑️ [useStaffChatRealtime] Store-detected deleted message:', messageId);
        callbacksRef.current.onMessageDeleted({ message_id: messageId });
      }
    });

    // Update the ref for next comparison
    previousMessagesRef.current = [...messages];
  }, [messages, conversationId]);

  // Set active conversation in store when conversationId changes
  useEffect(() => {
    if (conversationId && chatState.activeConversationId !== conversationId) {
      chatDispatch({
        type: 'SET_ACTIVE_CONVERSATION',
        payload: { conversationId }
      });
    }
  }, [conversationId, chatState.activeConversationId, chatDispatch]);

  // Helper functions for chat operations using existing HTTP APIs
  const sendMessageHelper = useCallback(async (messageData) => {
    try {
      const response = await sendMessage(conversationId, messageData);
      
      // Optimistically update store
      if (response && response.id) {
        chatDispatch({
          type: 'RECEIVE_MESSAGE',
          payload: {
            message: response,
            conversationId: conversationId
          }
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [conversationId, chatDispatch]);

  const deleteMessageHelper = useCallback(async (messageId) => {
    try {
      await deleteMessage(messageId);
      
      // Optimistically update store
      chatDispatch({
        type: 'MESSAGE_DELETED',
        payload: {
          messageId: messageId,
          conversationId: conversationId
        }
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [conversationId, chatDispatch]);

  const uploadFilesHelper = useCallback(async (files) => {
    try {
      const response = await uploadFiles(conversationId, files);
      return response;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }, [conversationId]);

  const markAsReadHelper = useCallback(() => {
    if (conversationId) {
      chatDispatch({
        type: 'MARK_CONVERSATION_READ',
        payload: { conversationId }
      });
    }
  }, [conversationId, chatDispatch]);

  return {
    // Store state
    conversation,
    messages,
    isConnected: true, // Always connected to store
    isReady: true,     // Always ready with store
    enabled: true,     // Always enabled with store
    
    // Helper functions for chat operations
    sendMessage: sendMessageHelper,
    deleteMessage: deleteMessageHelper,
    uploadFiles: uploadFilesHelper,
    markAsRead: markAsReadHelper,
    
    // Store access (for advanced usage)
    chatState,
    chatDispatch
  };
};

export default useStaffChatRealtime;
```

---

## 🔥 2. ChatStore (Realtime Store for Staff Chat)

### Initial State

```javascript
// src/realtime/stores/chatStore.jsx
const initialState = {
  conversationsById: {},
  activeConversationId: null,
  lastEventTimestamps: {} // for deduplication: "eventType:convId:messageId" -> timestamp
};
```

### Reducer (MESSAGE_RECEIVED action and storage structure)

```javascript
function chatReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.INIT_CONVERSATIONS_FROM_API: {
      const { conversations } = action.payload;
      const conversationsById = {};
      
      conversations.forEach(conv => {
        conversationsById[conv.id] = {
          id: conv.id,
          title: conv.title || '',
          participants: conv.participants || [],
          messages: [], // messages loaded separately
          unreadCount: conv.unread_count || 0,
          lastMessage: conv.last_message || null,
          updatedAt: conv.updated_at || new Date().toISOString()
        };
      });

      return {
        ...state,
        conversationsById: { ...state.conversationsById, ...conversationsById }
      };
    }

    case CHAT_ACTIONS.INIT_MESSAGES_FOR_CONVERSATION: {
      const { conversationId, messages } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      const sortedMessages = [...messages].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            messages: sortedMessages
          }
        }
      };
    }

    case CHAT_ACTIONS.RECEIVE_MESSAGE: {
      const { message, conversationId } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      // Check if message already exists (avoid duplicates)
      const messageExists = conversation.messages.some(m => m.id === message.id);
      if (messageExists) return state;

      const updatedMessages = [...conversation.messages, message].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      // Update unread count if not active conversation
      const isActive = state.activeConversationId === conversationId;
      const newUnreadCount = isActive ? 0 : conversation.unreadCount + 1;

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            messages: updatedMessages,
            unreadCount: newUnreadCount,
            lastMessage: {
              message: message.message || '',
              has_attachments: message.attachments && message.attachments.length > 0,
              timestamp: message.timestamp
            },
            updatedAt: message.timestamp || new Date().toISOString()
          }
        }
      };
    }

    case CHAT_ACTIONS.MESSAGE_UPDATED: {
      const { messageId, conversationId, updatedFields } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      const updatedMessages = conversation.messages.map(msg => 
        msg.id === messageId ? { ...msg, ...updatedFields } : msg
      );

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            messages: updatedMessages
          }
        }
      };
    }

    case CHAT_ACTIONS.MESSAGE_DELETED: {
      const { messageId, conversationId } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      const updatedMessages = conversation.messages.filter(msg => msg.id !== messageId);

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            messages: updatedMessages
          }
        }
      };
    }

    case CHAT_ACTIONS.MARK_CONVERSATION_READ: {
      const { conversationId } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            unreadCount: 0
          }
        }
      };
    }

    case CHAT_ACTIONS.RECEIVE_READ_RECEIPT: {
      const { conversationId, readByStaffId, messageId } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      // Mark conversation as read if current user's read receipt
      const currentUserId = parseInt(localStorage.getItem('staff_id'));
      if (readByStaffId === currentUserId) {
        return {
          ...state,
          conversationsById: {
            ...state.conversationsById,
            [conversationId]: {
              ...conversation,
              unreadCount: 0
            }
          }
        };
      }

      return state;
    }

    case CHAT_ACTIONS.STAFF_CHAT_READ_RECEIPT_RECEIVED: {
      const { conversationId, staffId, staffName, messageIds, timestamp } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      const updatedMessages = conversation.messages.map((msg) => {
        if (!messageIds.includes(msg.id)) return msg;

        // Ensure read_by_list exists
        const existingList = msg.read_by_list || [];
        const alreadyThere = existingList.some((r) => Number(r.id || r.staff_id) === Number(staffId));

        const nextList = alreadyThere
          ? existingList
          : [
              ...existingList,
              {
                id: staffId,
                staff_id: staffId,
                name: staffName,
                staff_name: staffName,
                read_at: timestamp,
              },
            ];

        return {
          ...msg,
          read_by_list: nextList,
          read_by_count: nextList.length,
          is_read: msg.is_read || false,
        };
      });

      // Emit event for useReadReceipts hook to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chatStoreEvent', {
          detail: {
            type: 'STAFF_CHAT_READ_RECEIPT_RECEIVED',
            payload: action.payload
          }
        }));
      }

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            messages: updatedMessages,
          },
        },
      };
    }

    case CHAT_ACTIONS.UPDATE_CONVERSATION_METADATA: {
      const { conversationId, metadata } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            ...metadata
          }
        }
      };
    }

    case 'UPDATE_EVENT_TIMESTAMPS': {
      return {
        ...state,
        lastEventTimestamps: action.payload.lastEventTimestamps
      };
    }

    default:
      return state;
  }
}
```

### Event Handler for ChatStore

```javascript
// Global event handlers registry
let globalChatDispatch = null;
let globalChatGetState = null;

// Register global handlers (called by ChatProvider)
export function registerChatHandlers(dispatch, getState) {
  globalChatDispatch = dispatch;
  globalChatGetState = getState;
}

// Domain handler for eventBus
export const chatActions = {
  _processedEventIds: new Set(), // Event ID-based deduplication

  handleEvent(event) {
    if (!globalChatDispatch || !globalChatGetState) {
      console.warn('💬 Chat store not initialized, skipping event:', event);
      return;
    }

    // ✅ Handle both legacy and new event formats
    if (event.category !== 'staff_chat') {
      console.log('💬 Chat store ignoring non-staff-chat event:', event.category);
      return;
    }

    // Handle both legacy format {eventType, data} and new format {type, payload}
    const eventType = event.eventType || event.type;  // ✅ support both formats
    const payload = event.data || event.payload;      // ✅ support both formats
    const eventId = event.meta?.event_id || null;
    const conversationId = payload?.conversation_id || payload?.conversationId;
    
    console.log('💬 Chat store handling staff chat event:', { eventType, conversationId, payload });

    // ✅ CRITICAL: Validate conversation_id exists
    if (!conversationId) {
      console.warn("💬 Chat event missing conversation_id, ignoring:", event);
      return;
    }

    // ✅ Event deduplication using event.meta.event_id (preferred) or timestamp window
    let deduplicationKey;
    if (eventId) {
      deduplicationKey = eventId;
    } else {
      deduplicationKey = `staff:${eventType}:${conversationId}:${payload?.message_id || Date.now()}`;
    }

    if (chatActions._processedEventIds.has(deduplicationKey)) {
      console.log("💬 Chat store duplicate event detected, skipping:", deduplicationKey);
      return;
    }

    // Store event ID to prevent duplicates
    chatActions._processedEventIds.add(deduplicationKey);

    // Clean up old event IDs (keep only last 1000)
    if (chatActions._processedEventIds.size > 1000) {
      const eventIds = Array.from(chatActions._processedEventIds);
      const toDelete = eventIds.slice(0, 500);
      toDelete.forEach(id => chatActions._processedEventIds.delete(id));
    }

    // ✅ Handle events from the guide
    switch (eventType) {
      case 'message_created': {
        // Check if payload is a full message object or just FCM metadata
        if (payload.id && payload.message) {
          // Full message object (from Pusher)
          globalChatDispatch({
            type: CHAT_ACTIONS.RECEIVE_MESSAGE,
            payload: {
              conversationId: parseInt(conversationId),
              message: payload
            }
          });
        } else if (payload.notification && payload.sender_id) {
          // FCM notification metadata - construct a temporary message
          console.log('📱 FCM message notification received - constructing message from metadata');
          const fcmMessage = {
            id: `fcm-${Date.now()}`, // Temporary ID
            message: payload.notification.body || 'New message',
            sender: parseInt(payload.sender_id),
            sender_name: payload.sender_name,
            timestamp: new Date().toISOString(),
            conversation: parseInt(conversationId),
            is_fcm_placeholder: true // Mark as placeholder for later replacement
          };
          
          globalChatDispatch({
            type: CHAT_ACTIONS.RECEIVE_MESSAGE,
            payload: {
              conversationId: parseInt(conversationId),
              message: fcmMessage
            }
          });
          
          // TODO: Optionally fetch the real message from API to replace placeholder
        }
        break;
      }

      case 'message_edited': {
        globalChatDispatch({
          type: CHAT_ACTIONS.MESSAGE_UPDATED,
          payload: {
            conversationId: parseInt(conversationId),
            messageId: parseInt(payload.message_id),
            updatedFields: payload
          }
        });
        break;
      }

      case 'message_deleted': {
        globalChatDispatch({
          type: CHAT_ACTIONS.MESSAGE_DELETED,
          payload: {
            conversationId: parseInt(conversationId),
            messageId: parseInt(payload.message_id)
          }
        });
        break;
      }

      case 'staff_mentioned': {
        // Handle staff mentions from personal notification channel
        globalChatDispatch({
          type: CHAT_ACTIONS.RECEIVE_MESSAGE,
          payload: {
            conversationId: parseInt(conversationId),
            message: payload
          }
        });
        break;
      }

      // Legacy event types (for backward compatibility)
      case 'new_message':
      case 'message_sent': {
        globalChatDispatch({
          type: CHAT_ACTIONS.RECEIVE_MESSAGE,
          payload: {
            conversationId: parseInt(conversationId),
            message: payload
          }
        });
        break;
      }

      case 'read_receipt':
      case 'message_read':
      case 'messages_read': {
        // Handle both old single-message format and new multi-message format
        const messageIds = payload.message_ids || (payload.message_id ? [payload.message_id] : []);
        
        if (messageIds.length > 0) {
          // Use new action for multi-message read receipts
          globalChatDispatch({
            type: CHAT_ACTIONS.STAFF_CHAT_READ_RECEIPT_RECEIVED,
            payload: {
              conversationId: parseInt(conversationId),
              staffId: parseInt(payload.staff_id || payload.readByStaffId),
              staffName: payload.staff_name || payload.readByStaffName || 'Unknown Staff',
              messageIds: messageIds.map(id => parseInt(id)),
              timestamp: payload.timestamp || new Date().toISOString()
            }
          });
        }
        
        // Also dispatch legacy action for backward compatibility
        globalChatDispatch({
          type: CHAT_ACTIONS.RECEIVE_READ_RECEIPT,
          payload: {
            conversationId: parseInt(conversationId),
            readByStaffId: payload.staff_id || payload.readByStaffId,
            messageId: payload.message_id || payload.messageId
          }
        });
        break;
      }

      case 'message_delivered': {
        // Handle message delivery status
        globalChatDispatch({
          type: CHAT_ACTIONS.MESSAGE_UPDATED,
          payload: {
            conversationId: parseInt(conversationId),
            messageId: parseInt(payload.message_id),
            updatedFields: { delivery_status: 'delivered' }
          }
        });
        break;
      }

      case 'typing_indicator': {
        // Handle typing indicators (can be added to state if needed)
        console.log('💬 Typing indicator received:', payload);
        break;
      }

      case 'attachment_uploaded':
      case 'attachment_deleted': {
        // Handle attachment events by refreshing the message
        globalChatDispatch({
          type: CHAT_ACTIONS.MESSAGE_UPDATED,
          payload: {
            conversationId: parseInt(conversationId),
            messageId: parseInt(payload.message_id),
            updatedFields: { attachments: payload.attachments || [] }
          }
        });
        break;
      }

      case 'conversation_update':
      case 'conversation_updated': {
        globalChatDispatch({
          type: CHAT_ACTIONS.UPDATE_CONVERSATION_METADATA,
          payload: {
            conversationId: parseInt(conversationId),
            metadata: payload
          }
        });
        break;
      }

      default:
        console.log('💬 Unknown staff chat event type:', eventType, event);
    }
  }
};
```

### Provider and Selector Hooks

```javascript
// Context providers and hooks
export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Register global handlers for eventBus integration
  React.useEffect(() => {
    registerChatHandlers(dispatch, () => state);
    
    return () => {
      // Cleanup on unmount
      registerChatHandlers(null, null);
    };
  }, [dispatch, state]);

  return (
    <ChatStateContext.Provider value={state}>
      <ChatDispatchContext.Provider value={dispatch}>
        {children}
      </ChatDispatchContext.Provider>
    </ChatStateContext.Provider>
  );
}

export function useChatState() {
  const context = useContext(ChatStateContext);
  if (!context) {
    throw new Error('useChatState must be used within ChatProvider');
  }
  return context;
}

export function useChatDispatch() {
  const context = useContext(ChatDispatchContext);
  if (!context) {
    throw new Error('useChatDispatch must be used within ChatProvider');
  }
  return context;
}

// Legacy compatibility - remove when migration is complete
export function ChatStoreProvider({ children }) {
  return <ChatProvider>{children}</ChatProvider>;
}

export function useChatStore() {
  const state = useChatState();
  const dispatch = useChatDispatch();
  
  return {
    chatData: {
      conversations: Object.values(state.conversationsById),
      messages: state.activeConversationId 
        ? state.conversationsById[state.activeConversationId]?.messages || []
        : [],
      activeConversation: state.activeConversationId 
        ? state.conversationsById[state.activeConversationId] 
        : null
    },
    handleEvent: (normalizedEvent) => {
      chatActions.handleEvent(normalizedEvent, dispatch, () => state);
    }
  };
}
```

---

## 🔥 3. StaffChatContext

### How conversations are fetched

```javascript
// src/staff_chat/context/StaffChatContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchConversations, sendMessage as apiSendMessage, markConversationAsRead } from "../services/staffChatApi";
import { useAuth } from "@/context/AuthContext";
import { useChatState, useChatDispatch } from "@/realtime/stores/chatStore.jsx";
import { CHAT_ACTIONS } from "@/realtime/stores/chatActions.js";
import { showNotification, canShowNotifications } from "@/utils/notificationUtils";

const StaffChatContext = createContext(undefined);

export const StaffChatProvider = ({ children }) => {
  const { user } = useAuth();
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();
  
  // Event listeners for broadcasting messages to all components (maintain compatibility)
  const messageListenersRef = useRef(new Set());
  const conversationUpdateListenersRef = useRef(new Set());

  // Get staff ID and hotel slug from user
  const staffId = user?.staff_id || user?.id;
  const hotelSlug = user?.hotel_slug;
  
  /**
   * Subscribe to new message events
   * Components can register callbacks to receive all new messages
   */
  const subscribeToMessages = useCallback((callback) => {
    messageListenersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);
  
  /**
   * Subscribe to conversation update events
   * Components can register callbacks to receive conversation updates
   */
  const subscribeToConversationUpdates = useCallback((callback) => {
    conversationUpdateListenersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      conversationUpdateListenersRef.current.delete(callback);
    };
  }, []);
  
  /**
   * Broadcast new message to all listeners
   */
  const broadcastMessage = useCallback((message) => {
    messageListenersRef.current.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('❌ [StaffChatContext] Error in message listener:', error);
      }
    });
  }, []);
  
  /**
   * Broadcast conversation update to all listeners
   */
  const broadcastConversationUpdate = useCallback((conversationId, updates) => {
    console.log('📣 [StaffChatContext] Broadcasting conversation update to', conversationUpdateListenersRef.current.size, 'listeners');
    conversationUpdateListenersRef.current.forEach(callback => {
      try {
        callback(conversationId, updates);
      } catch (error) {
        console.error('❌ [StaffChatContext] Error in conversation update listener:', error);
      }
    });
  }, []);

  // Fetch staff conversations and load into store
  const fetchStaffConversations = useCallback(async () => {
    if (!hotelSlug) return;

    try {
      const res = await fetchConversations(hotelSlug);
      const convs = res?.results || res || [];
      
      // Load conversations into chatStore
      chatDispatch({
        type: CHAT_ACTIONS.INIT_CONVERSATIONS_FROM_API,
        payload: { conversations: convs }
      });
    } catch (err) {
      console.error("Failed to fetch staff conversations:", err);
    }
  }, [hotelSlug, chatDispatch]);

  useEffect(() => {
    fetchStaffConversations();
  }, [fetchStaffConversations]);

  // Monitor chatStore for changes and broadcast to legacy listeners
  useEffect(() => {
    // Watch for new messages in any conversation and broadcast to legacy message listeners
    const conversations = Object.values(chatState.conversationsById);
    
    conversations.forEach(conversation => {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage) {
        // Broadcast to legacy message listeners for compatibility
        broadcastMessage(lastMessage);
        
        // Show desktop notification if not active conversation and not sent by current user
        const isActiveConv = chatState.activeConversationId === conversation.id;
        const isMyMessage = lastMessage.sender_info?.id === staffId || lastMessage.sender_id === staffId;
        
        if (!isActiveConv && !isMyMessage && canShowNotifications()) {
          const senderName = lastMessage.sender_info?.full_name || lastMessage.sender_name || 'Staff member';
          showNotification(`New message from ${senderName}`, {
            body: lastMessage.message || lastMessage.content || 'New message',
            icon: lastMessage.sender_info?.profile_image || "/favicons/favicon.svg",
            tag: `staff-msg-${lastMessage.id}`,
          }).catch(console.error);
        }
      }
      
      // Broadcast conversation updates to legacy listeners
      broadcastConversationUpdate(conversation.id, conversation);
    });
  }, [chatState.conversationsById, chatState.activeConversationId, staffId, broadcastMessage, broadcastConversationUpdate]);

  const markConversationRead = async (conversationId) => {
    try {
      // Call API to mark as read
      await markConversationAsRead(hotelSlug, conversationId);
      
      // Update local state immediately
      chatDispatch({
        type: CHAT_ACTIONS.MARK_CONVERSATION_READ,
        payload: { conversationId: parseInt(conversationId) }
      });
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
    }
  };

  // Send message function
  const sendMessage = async (conversationId, messageData) => {
    try {
      const response = await apiSendMessage(hotelSlug, conversationId, messageData);
      // Message will be received via realtime event, no need to update state here
      return response;
    } catch (err) {
      console.error("Failed to send message:", err);
      throw err;
    }
  };

  // Open/set active conversation
  const openConversation = useCallback((conversationId) => {
    chatDispatch({
      type: CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
      payload: { conversationId: conversationId }
    });
  }, [chatDispatch]);

  // Derived values from chatStore
  const conversations = Object.values(chatState.conversationsById);
  const activeConversation = chatState.activeConversationId 
    ? chatState.conversationsById[chatState.activeConversationId] 
    : null;
  const messagesForActiveConversation = activeConversation ? activeConversation.messages : [];
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <StaffChatContext.Provider value={{
      conversations,
      activeConversation,
      messagesForActiveConversation,
      fetchStaffConversations,
      markConversationRead,
      sendMessage,
      openConversation,
      totalUnread,
      currentConversationId: chatState.activeConversationId, // Legacy compatibility
      setCurrentConversationId: openConversation, // Legacy compatibility
      // 🔥 NEW: Event subscription methods for components (maintain compatibility)
      subscribeToMessages,
      subscribeToConversationUpdates,
      hotelSlug,
      staffId
    }}>
      {children}
    </StaffChatContext.Provider>
  );
};

export const useStaffChat = () => {
  const context = useContext(StaffChatContext);
  if (context === undefined) {
    throw new Error('useStaffChat must be used within a StaffChatProvider');
  }
  return context;
};
```

### How totalUnread is computed

```javascript
const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
```

### When the provider mounts

The StaffChatProvider mounts when the component is rendered and immediately fetches conversations:

```javascript
useEffect(() => {
  fetchStaffConversations();
}, [fetchStaffConversations]);
```

### Pusher listeners attached

**No direct Pusher listeners are attached in StaffChatContext.** Instead, it uses the centralized realtime system:

- Reads from `chatState` and `chatDispatch` from the centralized `chatStore`
- Actual Pusher subscriptions happen in `channelRegistry.js` via `subscribeToStaffChatConversation()`
- Events flow: `Pusher → channelRegistry → eventBus → chatStore → StaffChatContext`

---

## 🚨 CRITICAL ISSUE ANALYSIS

### Problem Symptoms
- Notification button only appears AFTER opening conversation list
- Realtime events not populating chatStore until conversation list is accessed
- Messages arrive via realtime but don't trigger notification count updates

### Potential Root Causes

#### 1. **Conversation Not Initialized in ChatStore**
The chatStore might not have conversation objects loaded until `fetchStaffConversations()` is called. If a conversation doesn't exist in `state.conversationsById`, the `RECEIVE_MESSAGE` action returns early:

```javascript
case CHAT_ACTIONS.RECEIVE_MESSAGE: {
  const { message, conversationId } = action.payload;
  const conversation = state.conversationsById[conversationId];
  
  if (!conversation) return state; // ❌ EXITS HERE IF CONVERSATION NOT LOADED
}
```

#### 2. **Channel Subscriptions Not Active**
The `subscribeToStaffChatConversation()` might only be called when user opens specific conversations, not for all conversations the user participates in.

#### 3. **ChatProvider Not Mounted Globally**
If `ChatProvider` is only mounted in chat-specific routes, realtime events won't be processed until user enters chat sections.

#### 4. **Event Registration Timing Issue**
The `registerChatHandlers()` might not be called before Pusher events start arriving.

### Debugging Steps

1. **Check if ChatProvider is mounted globally** - Look for where `<ChatProvider>` wraps the app
2. **Verify conversation initialization** - Check if `fetchStaffConversations()` is called on app startup
3. **Confirm channel subscriptions** - Check if base hotel channels include personal staff notifications
4. **Event handler registration** - Ensure `chatActions.handleEvent` is available when events arrive
5. **Conversation existence** - Check if conversations exist in chatStore before messages arrive

### Expected Event Flow
```
Backend NotificationManager
    ↓ realtime_staff_chat_message_created
Pusher Channel: hotel-{slug}.staff-chat.{conversationId}
    ↓ subscribeToStaffChatConversation() OR base hotel channels
channelRegistry.js
    ↓ handleIncomingRealtimeEvent()
eventBus.js (normalize to message_created)
    ↓ chatActions.handleEvent()
chatStore.jsx (CHAT_ACTIONS.RECEIVE_MESSAGE)
    ↓ Conversation EXISTS in state.conversationsById ← CRITICAL CHECK
    ↓ useChatState()
StaffChatContext (totalUnread calculation)
    ↓ React Components (notification badge update)
```

The issue is likely that conversations are not loaded into `chatStore.conversationsById` until the user manually fetches them by opening the conversation list.