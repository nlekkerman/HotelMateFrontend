// src/realtime/stores/guestChatStore.jsx
import React, { createContext, useContext, useReducer } from 'react';

// State contexts
const GuestChatStateContext = createContext(null);
const GuestChatDispatchContext = createContext(null);

// Initial state
const initialState = {
  conversationsById: {
    // [conversationId]: {
    //   id,
    //   roomNumber,
    //   guestName,
    //   guestId,
    //   lastMessage,
    //   unreadCountForStaff,
    //   unreadCountForGuest,
    //   updatedAt,
    //   isLockedByPin,
    //   participants: []
    // }
  },
  messagesByConversationId: {
    // [conversationId]: [
    //   {
    //     id,
    //     senderType: 'guest' | 'staff',
    //     senderName,
    //     body,
    //     attachments,
    //     createdAt,
    //     readByStaff,
    //     readByGuest,
    //   }
    // ]
  },
  activeConversationId: null,
  lastEventTimestamps: {} // for deduplication: { [key]: timestamp }
};

// Action types
export const GUEST_CHAT_ACTIONS = {
  INIT_CONVERSATIONS_FROM_API: 'INIT_CONVERSATIONS_FROM_API',
  INIT_MESSAGES_FOR_CONVERSATION: 'INIT_MESSAGES_FOR_CONVERSATION',
  SET_ACTIVE_CONVERSATION: 'SET_ACTIVE_CONVERSATION',
  GUEST_MESSAGE_RECEIVED: 'GUEST_MESSAGE_RECEIVED',
  STAFF_MESSAGE_SENT: 'STAFF_MESSAGE_SENT',
  MESSAGE_READ_UPDATE: 'MESSAGE_READ_UPDATE',
  CONVERSATION_CREATED: 'CONVERSATION_CREATED',
  CONVERSATION_METADATA_UPDATED: 'CONVERSATION_METADATA_UPDATED',
  MARK_CONVERSATION_READ_FOR_STAFF: 'MARK_CONVERSATION_READ_FOR_STAFF',
  MARK_CONVERSATION_READ_FOR_GUEST: 'MARK_CONVERSATION_READ_FOR_GUEST',
  UPDATE_EVENT_TIMESTAMPS: 'UPDATE_EVENT_TIMESTAMPS'
};

// Helper function to sort messages by timestamp
const sortMessagesByTime = (messages) => {
  return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

// Reducer function
function guestChatReducer(state, action) {
  switch (action.type) {
    case GUEST_CHAT_ACTIONS.INIT_CONVERSATIONS_FROM_API: {
      const { conversations } = action.payload;
      const conversationsById = {};
      
      conversations.forEach(conv => {
        conversationsById[conv.id] = {
          id: conv.id,
          roomNumber: conv.room_number || conv.roomNumber,
          guestName: conv.guest_name || conv.guestName,
          guestId: conv.guest_id || conv.guestId,
          lastMessage: conv.last_message || conv.lastMessage,
          unreadCountForStaff: conv.unread_count_for_staff || conv.unreadCountForStaff || 0,
          unreadCountForGuest: conv.unread_count_for_guest || conv.unreadCountForGuest || 0,
          updatedAt: conv.updated_at || conv.updatedAt || new Date().toISOString(),
          isLockedByPin: conv.is_locked_by_pin || conv.isLockedByPin || false,
          participants: conv.participants || []
        };
      });

      return {
        ...state,
        conversationsById: { ...state.conversationsById, ...conversationsById }
      };
    }

    case GUEST_CHAT_ACTIONS.INIT_MESSAGES_FOR_CONVERSATION: {
      const { conversationId, messages } = action.payload;
      
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        senderType: msg.sender_type || msg.senderType,
        senderName: msg.sender_name || msg.senderName,
        body: msg.body || msg.message,
        attachments: msg.attachments || [],
        createdAt: msg.created_at || msg.createdAt || msg.timestamp,
        readByStaff: msg.read_by_staff || msg.readByStaff || false,
        readByGuest: msg.read_by_guest || msg.readByGuest || false
      }));

      return {
        ...state,
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: sortMessagesByTime(formattedMessages)
        }
      };
    }

    case GUEST_CHAT_ACTIONS.SET_ACTIVE_CONVERSATION: {
      return {
        ...state,
        activeConversationId: action.payload.conversationId
      };
    }

    case GUEST_CHAT_ACTIONS.GUEST_MESSAGE_RECEIVED:
    case GUEST_CHAT_ACTIONS.STAFF_MESSAGE_SENT: {
      const { message, conversationId } = action.payload;
      const currentMessages = state.messagesByConversationId[conversationId] || [];
      
      // Check if message already exists (avoid duplicates)
      const messageExists = currentMessages.some(m => m.id === message.id);
      if (messageExists) return state;

      const formattedMessage = {
        id: message.id,
        senderType: message.sender_type || message.senderType,
        senderName: message.sender_name || message.senderName,
        body: message.body || message.message,
        attachments: message.attachments || [],
        createdAt: message.created_at || message.createdAt || message.timestamp,
        readByStaff: message.read_by_staff || message.readByStaff || false,
        readByGuest: message.read_by_guest || message.readByGuest || false
      };

      const updatedMessages = sortMessagesByTime([...currentMessages, formattedMessage]);

      // Update conversation metadata
      const conversation = state.conversationsById[conversationId];
      let updatedConversation = conversation;
      
      if (conversation) {
        const isActive = state.activeConversationId === conversationId;
        const isGuestMessage = formattedMessage.senderType === 'guest';
        
        updatedConversation = {
          ...conversation,
          lastMessage: {
            body: formattedMessage.body,
            senderType: formattedMessage.senderType,
            createdAt: formattedMessage.createdAt,
            hasAttachments: formattedMessage.attachments && formattedMessage.attachments.length > 0
          },
          unreadCountForStaff: isGuestMessage && !isActive 
            ? conversation.unreadCountForStaff + 1 
            : conversation.unreadCountForStaff,
          unreadCountForGuest: !isGuestMessage && !isActive 
            ? conversation.unreadCountForGuest + 1 
            : conversation.unreadCountForGuest,
          updatedAt: formattedMessage.createdAt
        };
      }

      return {
        ...state,
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: updatedMessages
        },
        conversationsById: updatedConversation ? {
          ...state.conversationsById,
          [conversationId]: updatedConversation
        } : state.conversationsById
      };
    }

    case GUEST_CHAT_ACTIONS.MESSAGE_READ_UPDATE: {
      const { messageId, conversationId, readByStaff, readByGuest } = action.payload;
      const currentMessages = state.messagesByConversationId[conversationId] || [];
      
      const updatedMessages = currentMessages.map(msg => 
        msg.id === messageId ? {
          ...msg,
          readByStaff: readByStaff !== undefined ? readByStaff : msg.readByStaff,
          readByGuest: readByGuest !== undefined ? readByGuest : msg.readByGuest
        } : msg
      );

      return {
        ...state,
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: updatedMessages
        }
      };
    }

    case GUEST_CHAT_ACTIONS.CONVERSATION_CREATED: {
      const { conversation } = action.payload;
      
      const formattedConversation = {
        id: conversation.id,
        roomNumber: conversation.room_number || conversation.roomNumber,
        guestName: conversation.guest_name || conversation.guestName,
        guestId: conversation.guest_id || conversation.guestId,
        lastMessage: conversation.last_message || conversation.lastMessage,
        unreadCountForStaff: conversation.unread_count_for_staff || conversation.unreadCountForStaff || 0,
        unreadCountForGuest: conversation.unread_count_for_guest || conversation.unreadCountForGuest || 0,
        updatedAt: conversation.updated_at || conversation.updatedAt || new Date().toISOString(),
        isLockedByPin: conversation.is_locked_by_pin || conversation.isLockedByPin || false,
        participants: conversation.participants || []
      };

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversation.id]: formattedConversation
        }
      };
    }

    case GUEST_CHAT_ACTIONS.CONVERSATION_METADATA_UPDATED: {
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

    case GUEST_CHAT_ACTIONS.MARK_CONVERSATION_READ_FOR_STAFF: {
      const { conversationId } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            unreadCountForStaff: 0
          }
        }
      };
    }

    case GUEST_CHAT_ACTIONS.MARK_CONVERSATION_READ_FOR_GUEST: {
      const { conversationId } = action.payload;
      const conversation = state.conversationsById[conversationId];
      
      if (!conversation) return state;

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            unreadCountForGuest: 0
          }
        }
      };
    }

    case GUEST_CHAT_ACTIONS.UPDATE_EVENT_TIMESTAMPS: {
      return {
        ...state,
        lastEventTimestamps: { 
          ...state.lastEventTimestamps, 
          ...action.payload.lastEventTimestamps 
        }
      };
    }

    default:
      return state;
  }
}

// Global dispatch reference for eventBus integration
let globalGuestChatDispatch = null;
let globalGuestChatStateRef = null;

// Register handlers for eventBus integration
function registerGuestChatHandlers(dispatch, stateRef) {
  globalGuestChatDispatch = dispatch;
  globalGuestChatStateRef = stateRef;
}

// Actions object for eventBus integration
export const guestChatActions = {
  _processedEventIds: new Set(), // Event ID-based deduplication

  handleEvent: (event, dispatchRef = null) => {
    // Use provided dispatch or global fallback
    const dispatch = dispatchRef || globalGuestChatDispatch;
    
    if (!dispatch) {
      console.warn("[guestChatStore] handleEvent called before store is ready");
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
      conversationId = event.conversationId || payload?.conversation_id;
    }

    // ✅ CRITICAL: Validate conversation_id exists
    if (!conversationId) {
      console.warn("[guestChatStore] Event missing conversation_id, ignoring:", event);
      return;
    }

    // ✅ Event deduplication using event.meta.event_id (preferred) or timestamp window
    let deduplicationKey;
    if (eventId) {
      deduplicationKey = eventId;
    } else {
      deduplicationKey = `guest:${eventType}:${conversationId}:${payload?.message_id || Date.now()}`;
    }

    if (guestChatActions._processedEventIds.has(deduplicationKey)) {
      console.log("[guestChatStore] Duplicate event detected, skipping:", deduplicationKey);
      return;
    }

    // Store event ID to prevent duplicates
    guestChatActions._processedEventIds.add(deduplicationKey);

    // Clean up old event IDs (keep only last 1000)
    if (guestChatActions._processedEventIds.size > 1000) {
      const eventIds = Array.from(guestChatActions._processedEventIds);
      const toDelete = eventIds.slice(0, 500);
      toDelete.forEach(id => guestChatActions._processedEventIds.delete(id));
    }

    console.log("[guestChatStore] Processing event:", eventType, conversationId, payload);

    // ✅ Handle events from the guide
    switch (eventType) {
      case 'guest_message_created':
        dispatch({
          type: GUEST_CHAT_ACTIONS.GUEST_MESSAGE_RECEIVED,
          payload: {
            message: payload,
            conversationId
          }
        });
        break;

      case 'staff_message_created':
        dispatch({
          type: GUEST_CHAT_ACTIONS.STAFF_MESSAGE_SENT,
          payload: {
            message: payload,
            conversationId
          }
        });
        break;

      case 'unread_updated':
        // Update unread count for the conversation
        dispatch({
          type: GUEST_CHAT_ACTIONS.CONVERSATION_METADATA_UPDATED,
          payload: {
            conversationId,
            metadata: {
              unreadCountForStaff: payload.unread_count || 0,
              updatedAt: payload.updated_at || new Date().toISOString()
            }
          }
        });
        break;

      case 'message_read':
        dispatch({
          type: GUEST_CHAT_ACTIONS.MESSAGE_READ_UPDATE,
          payload: {
            messageId: payload.message_id,
            conversationId,
            readByStaff: payload.read_by_staff,
            readByGuest: payload.read_by_guest
          }
        });
        break;

      case 'conversation_created':
        dispatch({
          type: GUEST_CHAT_ACTIONS.CONVERSATION_CREATED,
          payload: {
            conversation: payload
          }
        });
        break;

      case 'conversation_updated':
        dispatch({
          type: GUEST_CHAT_ACTIONS.CONVERSATION_METADATA_UPDATED,
          payload: {
            conversationId,
            metadata: payload
          }
        });
        break;

      default:
        console.log('[guestChatStore] Unknown event type:', eventType, event);
    }
  },

  // Helper actions for direct dispatch usage
  initFromAPI: (conversations, dispatch) => {
    if (dispatch) {
      dispatch({
        type: GUEST_CHAT_ACTIONS.INIT_CONVERSATIONS_FROM_API,
        payload: { conversations }
      });
    }
  },

  initMessagesForConversation: (conversationId, messages, dispatch) => {
    if (dispatch) {
      dispatch({
        type: GUEST_CHAT_ACTIONS.INIT_MESSAGES_FOR_CONVERSATION,
        payload: { conversationId, messages }
      });
    }
  },

  setActiveConversation: (conversationId, dispatch) => {
    if (dispatch) {
      dispatch({
        type: GUEST_CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
        payload: { conversationId }
      });
    }
  },

  markConversationReadForStaff: (conversationId, dispatch) => {
    if (dispatch) {
      dispatch({
        type: GUEST_CHAT_ACTIONS.MARK_CONVERSATION_READ_FOR_STAFF,
        payload: { conversationId }
      });
    }
  },

  markConversationReadForGuest: (conversationId, dispatch) => {
    if (dispatch) {
      dispatch({
        type: GUEST_CHAT_ACTIONS.MARK_CONVERSATION_READ_FOR_GUEST,
        payload: { conversationId }
      });
    }
  }
};

// Context provider
export function GuestChatProvider({ children }) {
  const [state, dispatch] = useReducer(guestChatReducer, initialState);

  // Register global handlers for eventBus integration
  React.useEffect(() => {
    registerGuestChatHandlers(dispatch, () => state);
    
    return () => {
      // Cleanup on unmount
      registerGuestChatHandlers(null, null);
    };
  }, [dispatch, state]);

  return (
    <GuestChatStateContext.Provider value={state}>
      <GuestChatDispatchContext.Provider value={dispatch}>
        {children}
      </GuestChatDispatchContext.Provider>
    </GuestChatStateContext.Provider>
  );
}

// Hooks
export function useGuestChatState() {
  const context = useContext(GuestChatStateContext);
  if (!context) {
    throw new Error('useGuestChatState must be used within GuestChatProvider');
  }
  return context;
}

export function useGuestChatDispatch() {
  const context = useContext(GuestChatDispatchContext);
  if (!context) {
    throw new Error('useGuestChatDispatch must be used within GuestChatProvider');
  }
  return context;
}

// Legacy compatibility and utility hooks
export function useGuestChatStore() {
  const state = useGuestChatState();
  const dispatch = useGuestChatDispatch();
  
  return {
    guestChatData: {
      conversations: Object.values(state.conversationsById),
      messages: state.activeConversationId 
        ? state.messagesByConversationId[state.activeConversationId] || []
        : [],
      activeConversation: state.activeConversationId 
        ? state.conversationsById[state.activeConversationId] 
        : null,
      activeConversationId: state.activeConversationId
    },
    handleEvent: (normalizedEvent) => {
      guestChatActions.handleEvent(normalizedEvent, dispatch);
    }
  };
}

// Legacy provider name for backward compatibility
export function GuestChatStoreProvider({ children }) {
  return <GuestChatProvider>{children}</GuestChatProvider>;
}