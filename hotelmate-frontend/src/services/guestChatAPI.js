/**
 * Guest Chat API Service - SESSION/GRANT FLOW
 * 
 * Bootstrap (getContext) uses hotel_slug + raw guest token to resolve the booking.
 * All subsequent chat operations use the returned chat_session grant.
 * 
 * Endpoints:
 * - GET  /api/guest/hotel/{hotelSlug}/chat/context?token={token}         ← bootstrap (raw token)
 * - GET  /api/guest/hotel/{hotelSlug}/chat/messages   [X-Guest-Chat-Session]
 * - POST /api/guest/hotel/{hotelSlug}/chat/messages   [X-Guest-Chat-Session]
 * - POST /api/guest/hotel/{hotelSlug}/chat/pusher/auth [X-Guest-Chat-Session]
 */

import { guestAPI } from './api';
import { requireGuestToken } from '@/utils/guestToken';

/** Header name used for session-based auth on post-bootstrap calls */
const SESSION_HEADER = 'X-Guest-Chat-Session';

/**
 * Build common Axios config for session-authenticated requests.
 * @param {string} chatSession - Chat session/grant returned by getContext
 * @returns {Object} Axios request config fragment
 */
const sessionConfig = (chatSession) => ({
  headers: { [SESSION_HEADER]: chatSession }
});

// ---------------------------------------------------------------------------
// BOOTSTRAP — still uses the raw guest token
// ---------------------------------------------------------------------------

/**
 * Fetch chat context including Pusher connection info.
 * This is the bootstrap call — the only one that accepts a raw guest token.
 *
 * The response is expected to contain a `chat_session` field that all
 * subsequent calls must use instead of the raw token.
 *
 * @param {string} hotelSlug - Hotel slug
 * @param {string} token - Raw guest token (from email link / localStorage)
 * @returns {Promise<Object>} Context with hotel, booking, conversation, pusher, chat_session
 */
export const getContext = async (hotelSlug, token) => {
  const resolvedToken = token || requireGuestToken('guestChatAPI.getContext');
  if (!resolvedToken) {
    throw new Error('[GuestChatAPI] Cannot fetch context: guest token is missing');
  }
  const params = { token: resolvedToken };
  const response = await guestAPI.get(`/hotel/${hotelSlug}/chat/context`, {
    params
  });
  
  // Unwrap envelope if backend returns { success, data: {...} }
  const ctx = response.data?.success && response.data?.data
    ? response.data.data
    : response.data;
  
  console.log('[GuestChatAPI] Context response:', ctx);
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

export default {
  getContext,
  getMessages,
  sendMessage,
  getPusherAuthEndpoint
};