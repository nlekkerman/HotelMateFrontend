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
  lastEventTimestamps: {}, // for deduplication: "eventType:convId:messageId" -> timestamp
  totalUnreadOverride: null
};

// Reducer
function chatReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.INIT_CONVERSATIONS_FROM_API: {
      const { conversations } = action.payload;
      const conversationsById = { ...state.conversationsById };
      let computedTotalUnread = 0;

      conversations.forEach(conv => {
        const existing = conversationsById[conv.id] || {};
        const unreadCount = conv.unread_count ?? existing.unread_count ?? 0;
        computedTotalUnread += unreadCount;

        conversationsById[conv.id] = {
          id: conv.id,
          title: conv.title || existing.title || '',
          participants: conv.participants || existing.participants || [],
          messages: existing.messages || [],                        // keep existing messages
          unread_count: unreadCount,
          lastMessage: conv.last_message || existing.lastMessage || null,
          updatedAt: conv.updated_at || existing.updatedAt || new Date().toISOString(),
        };
      });

      const nextTotalOverride =
        typeof state.totalUnreadOverride === 'number'
          ? state.totalUnreadOverride
          : computedTotalUnread;

      return {
        ...state,
        conversationsById,
        totalUnreadOverride: nextTotalOverride,
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
      let conversation = state.conversationsById[conversationId];
      
      // If conversation doesn't exist, create a stub conversation from message data
      if (!conversation) {
        console.log('💬 Creating stub conversation for incoming message:', { conversationId, message });
        conversation = {
          id: conversationId,
          title: message.conversation_title || message.title || '',
          participants: message.participants || [],
          messages: [],
          unread_count: 0,
          lastMessage: null,
          updatedAt: message.timestamp || new Date().toISOString(),
        };
      }

      // Check if message already exists (avoid duplicates)
      const messageExists = conversation.messages.some(m => m.id === message.id);
      if (messageExists) return state;

      const updatedMessages = [...conversation.messages, message].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      // Update unread count if not active conversation
      const isActive = state.activeConversationId === conversationId;
      const newUnreadCount = isActive ? 0 : (conversation.unread_count || 0) + 1;

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            messages: updatedMessages,
            unread_count: newUnreadCount,
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

      const updatedTotalOverride =
        typeof state.totalUnreadOverride === 'number'
          ? Math.max(0, state.totalUnreadOverride - (conversation.unread_count || 0))
          : state.totalUnreadOverride;

      return {
        ...state,
        totalUnreadOverride: updatedTotalOverride,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            unread_count: 0
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
              unread_count: 0
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

    case CHAT_ACTIONS.UPDATE_CONVERSATION_UNREAD: {
      const { conversationId, unreadCount = 0, metadata = {} } = action.payload;
      if (!conversationId) return state;

      const existing = state.conversationsById[conversationId];
      const updatedConversation = existing
        ? {
            ...existing,
            unread_count: unreadCount,
            updatedAt: metadata.updatedAt || existing.updatedAt,
          }
        : {
            id: conversationId,
            title: metadata.title || '',
            participants: metadata.participants || [],
            messages: [],
            unread_count: unreadCount,
            lastMessage: metadata.lastMessage || null,
            updatedAt: metadata.updatedAt || new Date().toISOString(),
          };

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: updatedConversation,
        },
      };
    }

    case CHAT_ACTIONS.SET_TOTAL_UNREAD: {
      const totalUnread =
        typeof action.payload.totalUnread === 'number'
          ? Math.max(0, action.payload.totalUnread)
          : null;
      return {
        ...state,
        totalUnreadOverride: totalUnread,
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

    // ✅ Handle both legacy and new event formats
    if (event.category !== 'staff_chat') {
      console.log('💬 Chat store ignoring non-staff-chat event:', event.category);
      return;
    }

    // Handle both legacy format {eventType, data} and new format {type, payload}
    const eventType = event.eventType || event.type;  // ✅ support both formats
    const payload = event.data || event.payload;      // ✅ support both formats
    const eventId = event.meta?.event_id || null;
    const rawConversationId =
      payload?.conversation_id !== undefined
        ? payload?.conversation_id
        : payload?.conversationId;
    const parsedConversationId =
      rawConversationId !== null && rawConversationId !== undefined && rawConversationId !== ''
        ? parseInt(rawConversationId, 10)
        : null;
    const numericConversationId = Number.isNaN(parsedConversationId) ? null : parsedConversationId;

    console.log('💬 Chat store handling staff chat event:', { eventType, conversationId: numericConversationId, payload });

    const eventRequiresConversationId = !['unread_updated'].includes(eventType);

    if (eventRequiresConversationId && numericConversationId === null) {
      console.warn('💬 Chat event missing conversation_id, ignoring:', event);
      return;
    }

    // ✅ Event deduplication using event.meta.event_id (preferred) or timestamp window
    let deduplicationKey;
    if (eventId) {
      deduplicationKey = eventId;
    } else {
      const dedupConversationKey = numericConversationId ?? 'global';
      const dedupMessageKey = payload?.message_id || payload?.messageId || payload?.event_id || Date.now();
      deduplicationKey = `staff:${eventType}:${dedupConversationKey}:${dedupMessageKey}`;
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
              conversationId: numericConversationId,
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
            conversation: numericConversationId,
            is_fcm_placeholder: true // Mark as placeholder for later replacement
          };
          
          globalChatDispatch({
            type: CHAT_ACTIONS.RECEIVE_MESSAGE,
            payload: {
              conversationId: numericConversationId,
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
            conversationId: numericConversationId,
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
            conversationId: numericConversationId,
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
            conversationId: numericConversationId,
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
            conversationId: numericConversationId,
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
              conversationId: numericConversationId,
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
            conversationId: numericConversationId,
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
            conversationId: numericConversationId,
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
            conversationId: numericConversationId,
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
            conversationId: numericConversationId,
            metadata: payload
          }
        });
        break;
      }

      case 'unread_updated': {
        if (typeof payload.total_unread === 'number') {
          globalChatDispatch({
            type: CHAT_ACTIONS.SET_TOTAL_UNREAD,
            payload: { totalUnread: payload.total_unread }
          });
        }

        if (numericConversationId !== null) {
          const unreadCount =
            typeof payload.unread_count === 'number'
              ? payload.unread_count
              : 0;

          globalChatDispatch({
            type: CHAT_ACTIONS.UPDATE_CONVERSATION_UNREAD,
            payload: {
              conversationId: numericConversationId,
              unreadCount,
              metadata: { updatedAt: payload.updated_at }
            }
          });
        }

        break;
      }

      default:
        // Filter out Pusher system events (pusher:subscription_succeeded, etc.)
        if (eventType?.startsWith('pusher:')) {
          console.log('🔄 [chatStore] Pusher system event:', eventType);
        } else {
          console.log('💬 Unknown staff chat event type:', eventType, event);
        }
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