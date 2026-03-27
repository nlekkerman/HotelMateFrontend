/**
 * Guest Chat API Service - SESSION/GRANT FLOW
 *
 * Bootstrap: GET /api/guest/context/?token={token}
 *   → returns full guest context including guest_chat.session
 *
 * All subsequent chat operations use the returned guest_chat.session grant
 * via the X-Guest-Chat-Session header.
 *
 * Endpoints:
 * - GET  /api/guest/context/?token={token}                              ← bootstrap (raw token)
 * - GET  /api/guest/hotel/{hotelSlug}/chat/context  [X-Guest-Chat-Session]  ← chat context
 * - GET  /api/guest/hotel/{hotelSlug}/chat/messages  [X-Guest-Chat-Session]
 * - POST /api/guest/hotel/{hotelSlug}/chat/messages  [X-Guest-Chat-Session]
 * - POST /api/guest/hotel/{hotelSlug}/chat/pusher/auth [X-Guest-Chat-Session]
 */

import { guestAPI } from './api';
import { getGuestToken } from '@/utils/guestToken';

/** Header name used for session-based auth on post-bootstrap calls */
export const SESSION_HEADER = 'X-Guest-Chat-Session';

/**
 * Build common Axios config for session-authenticated requests.
 * @param {string} chatSession - Chat session/grant returned by getContext
 * @returns {Object} Axios request config fragment
 */
const sessionConfig = (chatSession) => ({
  headers: { [SESSION_HEADER]: chatSession }
});

// ---------------------------------------------------------------------------
// BOOTSTRAP — uses raw guest token to get session grant
// GET /api/guest/context/?token={token}
// ---------------------------------------------------------------------------

/**
 * Bootstrap: fetch the full guest context (permissions, chat grant, etc.)
 * This is the ONLY call that accepts a raw guest token.
 *
 * The chat session lives at response.guest_chat.session.
 *
 * @param {string} token - Raw guest token (from email link / localStorage)
 * @returns {Promise<Object>} Full guest context including guest_chat.session
 */
export const getBootstrap = async (token) => {
  const resolvedToken = token || getGuestToken();
  if (!resolvedToken) {
    throw new Error('[GuestChatAPI] Cannot bootstrap: guest token is missing');
  }
  const response = await guestAPI.get('/context/', {
    params: { token: resolvedToken }
  });

  // Unwrap envelope if backend returns { success, data: {...} }
  const ctx = response.data?.success && response.data?.data
    ? response.data.data
    : response.data;

  console.log('[GuestChatAPI] Bootstrap response:', ctx);
  return ctx;
};

/** @deprecated Use getBootstrap — kept as alias for existing imports */
export const getContext = getBootstrap;

/**
 * Fetch chat-specific context (conversation, pusher info, etc.)
 * This is a SESSION-authenticated call — NOT the bootstrap.
 *
 * @param {string} hotelSlug - Hotel slug
 * @param {string} chatSession - Chat session grant from bootstrap
 * @returns {Promise<Object>} Chat context (conversation, pusher, etc.)
 */
export const getChatContext = async (hotelSlug, chatSession) => {
  if (!chatSession) {
    throw new Error('[GuestChatAPI] Cannot fetch chat context: chat session is missing');
  }
  const response = await guestAPI.get(
    `/hotel/${hotelSlug}/chat/context`,
    sessionConfig(chatSession)
  );
  const ctx = response.data?.success && response.data?.data
    ? response.data.data
    : response.data;
  console.log('[GuestChatAPI] Chat context response:', ctx);
  return ctx;
};

// ---------------------------------------------------------------------------
// SESSION-AUTHENTICATED CALLS — use chat_session from getContext response
// ---------------------------------------------------------------------------

/**
 * Fetch message history with pagination support
 * @param {string} hotelSlug - Hotel slug
 * @param {string} chatSession - Chat session/grant from bootstrap
 * @param {Object} options - Query options
 * @param {number} [options.limit=50] - Number of messages to fetch
 * @param {string} [options.before] - Message ID for pagination cursor
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (hotelSlug, chatSession, options = {}) => {
  if (!chatSession) {
    throw new Error('[GuestChatAPI] Cannot fetch messages: chat session is missing');
  }
  const { limit = 50, before } = options;
  
  const params = { limit };
  if (before) params.before = before;
  
  const response = await guestAPI.get(`/hotel/${hotelSlug}/chat/messages`, { 
    params,
    ...sessionConfig(chatSession)
  });
  
  console.log('[GuestChatAPI] Messages response:', {
    messageCount: response.data?.messages?.length || 0,
    before,
    limit,
    hasMessagesProperty: !!response.data?.messages
  });
  
  // Canonical response format: { messages: [...], conversation_id, count, has_more }
  return response.data?.messages ?? [];
};

/**
 * Send a new message with optimistic update support
 * @param {string} hotelSlug - Hotel slug
 * @param {string} chatSession - Chat session/grant from bootstrap
 * @param {Object} messageData - Message data
 * @param {string} messageData.message - Message content
 * @param {string} messageData.client_message_id - UUID for deduplication
 * @param {string} [messageData.reply_to] - Optional reply message ID
 * @returns {Promise<Object>} Server response with message data
 */
export const sendMessage = async (hotelSlug, chatSession, messageData) => {
  if (!chatSession) {
    throw new Error('[GuestChatAPI] Cannot send message: chat session is missing');
  }
  const { message, client_message_id, reply_to } = messageData;
  
  const payload = { 
    message, 
    client_message_id 
  };
  
  if (reply_to) {
    payload.reply_to = reply_to;
  }
  
  console.log('[GuestChatAPI] Sending message:', {
    hotelSlug,
    client_message_id,
    messageLength: message?.length || 0,
    hasReplyTo: !!reply_to
  });
  
  const response = await guestAPI.post(
    `/hotel/${hotelSlug}/chat/messages`, 
    payload,
    sessionConfig(chatSession)
  );
  
  console.log('[GuestChatAPI] Message sent successfully:', response.data);
  return response.data;
};

/**
 * Get auth endpoint URL for Pusher private channel authentication.
 * No longer embeds a raw token in the URL — the Pusher client sends
 * the chat session via the X-Guest-Chat-Session header instead.
 *
 * @param {string} hotelSlug - Hotel slug
 * @returns {string} Auth endpoint URL (without credentials in the query string)
 */
export const getPusherAuthEndpoint = (hotelSlug) => {
  // Get base URL - same logic as main API service
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isDev = import.meta.env.DEV;
    
    if (isLocal && isDev) {
      return "http://localhost:8000/api/";
    }
    
    return "https://hotel-porter-d25ad83b12cf.herokuapp.com/api";
  };
  
  const baseUrl = getApiBaseUrl().replace(/\/$/, ''); // Remove trailing slash
  return `${baseUrl}/guest/hotel/${hotelSlug}/chat/pusher/auth`;
};

/**
 * Mark a conversation as read by the guest.
 * @param {string} hotelSlug - Hotel slug
 * @param {string} conversationId - Conversation to mark
 * @param {string} chatSession - Chat session/grant from bootstrap
 * @returns {Promise<void>}
 */
export const markRead = async (hotelSlug, conversationId, chatSession) => {
  if (!chatSession) {
    throw new Error('[GuestChatAPI] Cannot mark read: chat session is missing');
  }
  await guestAPI.post(
    `/hotel/${hotelSlug}/chat/conversations/${conversationId}/mark_read/`,
    {},
    sessionConfig(chatSession)
  );
};

export default {
  getBootstrap,
  getContext,
  getChatContext,
  getMessages,
  sendMessage,
  getPusherAuthEndpoint,
  markRead
};