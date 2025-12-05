// src/realtime/stores/chatStore.jsx
import React, { createContext, useContext, useReducer } from 'react';
import { CHAT_ACTIONS } from './chatActions.js';

// Re-export for backward compatibility
export { CHAT_ACTIONS };

const ChatStateContext = createContext(null);
const ChatDispatchContext = createContext(null);

// Initial state
const initialState = {
  conversationsById: {},
  activeConversationId: null,
  lastEventTimestamps: {} // for deduplication: "eventType:convId:messageId" -> timestamp
};

// Reducer
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

    case CHAT_ACTIONS.SET_ACTIVE_CONVERSATION: {
      return {
        ...state,
        activeConversationId: action.payload.conversationId
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

// Deduplication helper
function shouldProcessEvent(eventType, conversationId, messageId, lastEventTimestamps) {
  const key = `${eventType}:${conversationId}:${messageId || ''}`;
  const now = Date.now();
  const lastProcessed = lastEventTimestamps[key];
  
  // If processed within last 3 seconds, skip
  if (lastProcessed && (now - lastProcessed) < 3000) {
    console.log('🔄 Skipping duplicate event:', key);
    return false;
  }
  
  return true;
}

function updateEventTimestamp(eventType, conversationId, messageId, lastEventTimestamps) {
  const key = `${eventType}:${conversationId}:${messageId || ''}`;
  return {
    ...lastEventTimestamps,
    [key]: Date.now()
  };
}

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

    // ✅ NEW: Handle unified backend event format {category, type, payload, meta}
    let eventType, payload, eventId, conversationId;
    
    if (event.category && event.type && event.payload) {
      // New format from backend
      eventType = event.type;
      payload = event.payload;
      eventId = event.meta?.event_id;
      conversationId = payload.conversation_id; // ✅ CRITICAL: Must use payload.conversation_id as source of truth
    } else {
      // Legacy format for backward compatibility
      eventType = event.eventType;
      payload = event.data;
      eventId = null;
      conversationId = payload?.conversation_id || payload?.conversationId;
    }

    console.log('💬 Chat store handling event:', eventType, conversationId, payload);

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
        globalChatDispatch({
          type: CHAT_ACTIONS.RECEIVE_MESSAGE,
          payload: {
            conversationId: parseInt(conversationId),
            message: payload
          }
        });
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
      case 'message_read': {
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