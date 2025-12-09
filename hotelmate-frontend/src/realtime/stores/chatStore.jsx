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

      // Merge existing messages (may include realtime ones) with API messages
      const existingMessages = conversation.messages || [];
      const newMessages = messages || [];
      
      // Create a map to avoid duplicates by ID
      const messageMap = new Map();
      
      // Add existing messages first (including realtime ones)
      existingMessages.forEach(msg => {
        if (msg.id) messageMap.set(msg.id, msg);
      });
      
      // Add/update with API messages (may be more complete)
      newMessages.forEach(msg => {
        if (msg.id) {
          // Normalize attachment field names for API messages too
          const normalizedMessage = {
            ...msg,
            attachments: (msg.attachments || []).map(att => ({
              ...att,
              file_url: att.file_url || att.url,
              file_name: att.file_name || att.filename,
              file_type: att.file_type || att.type,
              file_size: att.file_size || att.size
            }))
          };
          messageMap.set(msg.id, normalizedMessage);
        }
      });
      
      // Convert back to array and sort by timestamp
      const mergedMessages = Array.from(messageMap.values()).sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      console.log('🔄 [INIT_MESSAGES] Merged messages:', {
        conversationId,
        existingCount: existingMessages.length,
        newFromAPI: newMessages.length,
        finalCount: mergedMessages.length
      });

      return {
        ...state,
        conversationsById: {
          ...state.conversationsById,
          [conversationId]: {
            ...conversation,
            messages: mergedMessages
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
      console.log('🎯 [REDUCER] RECEIVE_MESSAGE called:', { conversationId, messageId: message.id, messageText: message.message });
      console.log('🎯 [REDUCER] Full action payload:', action.payload);
      console.log('🎯 [REDUCER] Available conversations:', Object.keys(state.conversationsById));
      console.log('🎯 [REDUCER] Current state snapshot:', {
        totalConversations: Object.keys(state.conversationsById).length,
        activeConversationId: state.activeConversationId
      });
      
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
      } else {
        console.log('🎯 [REDUCER] Found existing conversation, current message count:', conversation.messages?.length || 0);
      }

      // Check if message already exists (avoid duplicates)
      const messageExists = conversation.messages.some(m => m.id === message.id);
      if (messageExists) return state;

      const updatedMessages = [...conversation.messages, message].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      console.log('🎯 [REDUCER] UPDATING CONVERSATION STATE:', {
        conversationId,
        oldMessageCount: conversation.messages.length,
        newMessageCount: updatedMessages.length,
        newMessage: { id: message.id, text: message.message, sender: message.sender }
      });

      // Update unread count if not active conversation
      // Note: Backend will send unread_updated event with correct total, so we rely on that for accuracy
      const isActive = state.activeConversationId === conversationId;
      const newUnreadCount = isActive ? 0 : (conversation.unread_count || 0) + 1;

      const updatedState = {
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
      
      console.log('✅ [REDUCER] RETURNING UPDATED STATE - message added to conversation', conversationId);
      return updatedState;
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
      console.log('📊 [chatReducer] UPDATE_CONVERSATION_UNREAD:', { conversationId, unreadCount, metadata });
      if (!conversationId) return state;

      const existing = state.conversationsById[conversationId];
      const previousUnread = existing?.unread_count || 0;
      console.log('📊 [chatReducer] Previous unread:', previousUnread, '-> New unread:', unreadCount);
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

      const adjustedTotal =
        typeof state.totalUnreadOverride === 'number'
          ? Math.max(0, state.totalUnreadOverride + (unreadCount - previousUnread))
          : state.totalUnreadOverride;

      console.log('📊 [chatReducer] UPDATE_CONVERSATION_UNREAD:', { 
        conversationId,
        previousUnread, 
        newUnread: unreadCount,
        previousTotal: state.totalUnreadOverride,
        adjustedTotal
      });

      return {
        ...state,
        totalUnreadOverride: adjustedTotal,
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
      console.log('📊 [chatReducer] SET_TOTAL_UNREAD:', { 
        previous: state.totalUnreadOverride, 
        new: totalUnread 
      });
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
    console.log('🔥 [chatActions.handleEvent] CALLED with event:', event);
    console.log('🔥 [chatActions.handleEvent] Event structure:', {
      category: event.category,
      type: event.type,
      eventType: event.eventType,
      hasPayload: !!event.payload,
      payloadKeys: event.payload ? Object.keys(event.payload) : []
    });
    
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
    let eventType = event.eventType || event.type;  // ✅ support both formats
    const payload = event.data || event.payload;      // ✅ support both formats
    
    console.log('🔥 [chatStore] Mapped event type:', { original: event.eventType || event.type, mapped: eventType });
    const eventId = event.meta?.event_id || null;
    const rawConversationId =
      payload?.conversation !== undefined
        ? payload.conversation
        : payload?.conversation_id !== undefined
          ? payload.conversation_id
          : payload?.conversationId; // ✅ backend sends 'conversation' field first
    const parsedConversationId =
      rawConversationId !== null && rawConversationId !== undefined && rawConversationId !== ''
        ? parseInt(rawConversationId, 10)
        : null;
    const numericConversationId = Number.isNaN(parsedConversationId) ? null : parsedConversationId;

    console.log('💬 Chat store handling staff chat event:', { eventType, conversationId: numericConversationId, payload });

    const eventRequiresConversationId = !['realtime_staff_chat_unread_updated'].includes(eventType);

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

    // ✅ Handle events with EXACT backend event names from notification_manager.py
    console.log(`📨 [chatStore] Processing ${eventType}:`, { conversationId: numericConversationId, payload });
    switch (eventType) {
      case 'realtime_staff_chat_message_created': {
        console.log('📨 [chatStore] Processing message_created:', { numericConversationId, payload });
        console.log('🔥 [chatStore] Raw payload fields:', Object.keys(payload));
        console.log('🔥 [chatStore] Full payload:', JSON.stringify(payload, null, 2));
        console.log('🔥 [chatStore] Message payload structure:', {
          hasId: !!payload.id,
          hasText: !!payload.text,
          hasMessage: !!payload.message,
          senderId: payload.sender_id ?? payload.sender,
          conversation: payload.conversation,
          conversationId: payload.conversation_id,
        });

        // Full message object - be flexible with field names from backend
        const hasId = payload.id;
        const hasMessage = payload.message || payload.text;
        const hasSender = payload.sender || payload.sender_id;
        const hasFullMessage = hasId && hasMessage && hasSender;

        console.log('🔥 [chatStore] Message validation details:', { 
          hasId: !!hasId, 
          idValue: hasId,
          hasMessage: !!hasMessage, 
          messageValue: hasMessage,
          hasSender: !!hasSender, 
          senderValue: hasSender,
          hasFullMessage 
        });

        if (!hasFullMessage) {
          console.error('❌ [chatStore] Message validation FAILED - missing required fields');
          console.error('❌ Raw payload that failed validation:', payload);
        }

        if (hasFullMessage) {
          const text = payload.message ?? payload.text ?? '';

          // Normalize attachment field names (backend sends 'url', frontend expects 'file_url')
          const normalizedAttachments = (payload.attachments || []).map(att => ({
            ...att,
            file_url: att.file_url || att.url, // Backend sends 'url', normalize to 'file_url'
            file_name: att.file_name || att.filename, // Ensure consistent naming
            file_type: att.file_type || att.type,
            file_size: att.file_size || att.size
          }));

          const mappedMessage = {
            id: payload.id,
            message: text,
            sender: payload.sender_id ?? payload.sender,
            sender_name: payload.sender_name ?? payload.sender_info?.name,
            timestamp: payload.timestamp,
            conversation: numericConversationId,
            attachments: normalizedAttachments,
            is_system_message: payload.is_system_message || false,
            is_edited: payload.is_edited || false,
            is_deleted: payload.is_deleted || false,
            status: payload.status,
            delivered_at: payload.delivered_at,
            read_by_list: payload.read_by_list || [],
            read_by_count: payload.read_by_count || 0,
          };

          console.log('✅ [chatStore] Message validation PASSED - creating mapped message:', mappedMessage);
          console.log('📎 [chatStore] Attachment normalization:', {
            originalAttachments: payload.attachments,
            normalizedAttachments: normalizedAttachments,
            attachmentCount: normalizedAttachments.length,
            firstAttachmentUrls: normalizedAttachments.length > 0 ? {
              original_url: payload.attachments[0]?.url,
              normalized_file_url: normalizedAttachments[0]?.file_url
            } : null
          });
          console.log('🚀 [chatStore] DISPATCHING RECEIVE_MESSAGE:', { 
            conversationId: numericConversationId, 
            messageId: payload.id, 
            messageText: text,
            hasAttachments: normalizedAttachments.length > 0
          });
          
          globalChatDispatch({
            type: CHAT_ACTIONS.RECEIVE_MESSAGE,
            payload: {
              conversationId: numericConversationId,
              message: mappedMessage,
            },
          });
          
          console.log('✅ [chatStore] RECEIVE_MESSAGE dispatch completed successfully');
        } else if (payload.notification && payload.sender_id) {
          // FCM fallback
          const fcmMessage = {
            id: `fcm-${Date.now()}`,
            message: payload.notification.body || 'New message',
            sender: parseInt(payload.sender_id),
            sender_name: payload.sender_name,
            timestamp: new Date().toISOString(),
            conversation: numericConversationId,
            is_fcm_placeholder: true,
          };

          globalChatDispatch({
            type: CHAT_ACTIONS.RECEIVE_MESSAGE,
            payload: {
              conversationId: numericConversationId,
              message: fcmMessage,
            },
          });
        } else {
          console.warn('📨 [chatStore] message_created payload missing required fields:', payload);
        }
        break;
      }

      case 'realtime_staff_chat_message_edited': {
        globalChatDispatch({
          type: CHAT_ACTIONS.MESSAGE_UPDATED,
          payload: {
            conversationId: numericConversationId,
            messageId: parseInt(payload.id || payload.message_id),
            updatedFields: payload
          }
        });
        break;
      }

      case 'realtime_staff_chat_message_deleted': {
        globalChatDispatch({
          type: CHAT_ACTIONS.MESSAGE_DELETED,
          payload: {
            conversationId: numericConversationId,
            messageId: parseInt(payload.message_id)
          }
        });
        break;
      }

      case 'realtime_staff_chat_staff_mentioned': {
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

      // No other event types supported - backend sends only exact normalized event names

      case 'realtime_staff_chat_messages_read': {
        // Handle multi-message read receipts from backend
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

      case 'realtime_staff_chat_message_delivered': {
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

      case 'realtime_staff_chat_typing': {
        // Handle typing indicators (can be added to state if needed)
        console.log('💬 Typing indicator received:', payload);
        break;
      }

      case 'realtime_staff_chat_attachment_uploaded':
      case 'realtime_staff_chat_attachment_deleted': {
        // Normalize attachment field names for consistency
        const normalizedAttachments = (payload.attachments || []).map(att => ({
          ...att,
          file_url: att.file_url || att.url,
          file_name: att.file_name || att.filename,
          file_type: att.file_type || att.type,
          file_size: att.file_size || att.size
        }));

        // Handle attachment events by refreshing the message
        globalChatDispatch({
          type: CHAT_ACTIONS.MESSAGE_UPDATED,
          payload: {
            conversationId: numericConversationId,
            messageId: parseInt(payload.message_id),
            updatedFields: { attachments: normalizedAttachments }
          }
        });
        break;
      }

      // Note: Backend doesn't send conversation_update events in notification_manager.py
      // Conversation updates come through other event types

      case 'realtime_staff_chat_unread_updated': {
        console.log('📊 [chatStore] Processing unread_updated:', { numericConversationId, payload });
        console.log('📊 [chatStore] Backend authoritative unread update - this should override any local counting');
        
        if (typeof payload.total_unread === 'number') {
          console.log('📊 [chatStore] Updating total unread to:', payload.total_unread);
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
          
          console.log('📊 [chatStore] Updating conversation unread:', { conversationId: numericConversationId, unreadCount });
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
    
    // Add debug functions to window for testing
    if (typeof window !== 'undefined') {
      window.debugRealtimeUnread = (conversationId, unreadCount) => {
        console.log('🧪 Debug: Simulating unread_updated event:', { conversationId, unreadCount });
        dispatch({
          type: CHAT_ACTIONS.UPDATE_CONVERSATION_UNREAD,
          payload: { conversationId: parseInt(conversationId), unreadCount }
        });
      };
      
      window.debugTotalUnread = (totalUnread) => {
        console.log('🧪 Debug: Setting total unread:', totalUnread);
        dispatch({
          type: CHAT_ACTIONS.SET_TOTAL_UNREAD,
          payload: { totalUnread }
        });
      };
    }
    
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