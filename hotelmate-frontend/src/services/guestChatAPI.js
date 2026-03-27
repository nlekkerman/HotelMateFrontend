/**
 * Guest Chat API Service — LOCKED BACKEND CONTRACT
 *
 * Bootstrap: GET /api/guest/hotel/{slug}/chat/context?token=RAW_TOKEN
 *   → returns flat contract: { conversation_id, chat_session, channel_name, events, pusher, permissions }
 *
 * All subsequent chat operations use the returned chat_session
 * via the X-Guest-Chat-Session header. Raw token is NEVER used after bootstrap.
 *
 * Endpoints:
 * - GET  /api/guest/hotel/{slug}/chat/context?token=RAW_TOKEN               ← bootstrap (raw token)
 * - GET  /api/guest/hotel/{slug}/chat/messages       [X-Guest-Chat-Session]
 * - POST /api/guest/hotel/{slug}/chat/messages       [X-Guest-Chat-Session]
 * - POST /api/guest/hotel/{slug}/chat/conversations/{id}/mark_read [X-Guest-Chat-Session]
 * - POST /api/guest/hotel/{slug}/chat/pusher/auth    [X-Guest-Chat-Session]
 */

import { guestAPI } from './api';

/** Header name used for session-based auth on post-bootstrap calls */
export const SESSION_HEADER = 'X-Guest-Chat-Session';

/**
 * Build common Axios config for session-authenticated requests.
 * @param {string} chatSession - Chat session from bootstrap
 * @returns {Object} Axios request config fragment
 */
const sessionConfig = (chatSession) => ({
  headers: { [SESSION_HEADER]: chatSession }
});

// ---------------------------------------------------------------------------
// BOOTSTRAP — GET /api/guest/hotel/{slug}/chat/context?token=RAW_TOKEN
// This is the ONLY call that uses a raw guest token.
// ---------------------------------------------------------------------------

/** Required top-level fields in the bootstrap response */
const REQUIRED_BOOTSTRAP_FIELDS = [
  'conversation_id',
  'chat_session',
  'channel_name',
];

/** Required nested fields checked separately */
const REQUIRED_NESTED_PATHS = [
  { path: ['events', 'message_created'], label: 'events.message_created' },
  { path: ['events', 'message_read'],    label: 'events.message_read' },
  { path: ['pusher', 'key'],             label: 'pusher.key' },
  { path: ['pusher', 'cluster'],         label: 'pusher.cluster' },
  { path: ['pusher', 'auth_endpoint'],   label: 'pusher.auth_endpoint' },
];

/**
 * Validate the bootstrap response against the locked backend contract.
 * Throws on the FIRST missing field.
 * @param {Object} data - Unwrapped bootstrap response
 */
function validateBootstrapContract(data) {
  for (const field of REQUIRED_BOOTSTRAP_FIELDS) {
    if (data[field] == null) {
      throw new Error(`Guest chat bootstrap contract invalid: missing ${field}`);
    }
  }
  for (const { path, label } of REQUIRED_NESTED_PATHS) {
    let cursor = data;
    for (const segment of path) {
      cursor = cursor?.[segment];
    }
    if (cursor == null) {
      throw new Error(`Guest chat bootstrap contract invalid: missing ${label}`);
    }
  }
}

/**
 * Bootstrap: fetch the chat context using a raw guest token.
 * This is the ONLY call that accepts a raw guest token.
 * The response is validated against the locked backend contract.
 *
 * @param {string} hotelSlug - Hotel slug
 * @param {string} token - Raw guest token (from email link)
 * @returns {Promise<Object>} Validated chat bootstrap contract
 */
export const getChatBootstrap = async (hotelSlug, token) => {
  if (!hotelSlug) {
    throw new Error('[GuestChatAPI] Cannot bootstrap: hotelSlug is missing');
  }
  if (!token) {
    throw new Error('[GuestChatAPI] Cannot bootstrap: guest token is missing');
  }

  const response = await guestAPI.get(`/hotel/${hotelSlug}/chat/context`, {
    params: { token }
  });

  // Unwrap envelope if backend returns { success, data: {...} }
  const data = response.data?.success && response.data?.data
    ? response.data.data
    : response.data;

  validateBootstrapContract(data);

  console.log('[GuestChatAPI] Bootstrap validated:', {
    conversation_id: data.conversation_id,
    channel_name: data.channel_name,
    events: data.events,
    pusherCluster: data.pusher.cluster,
    hasAuthEndpoint: !!data.pusher.auth_endpoint,
    permissions: data.permissions,
  });

  return data;
};

// ---------------------------------------------------------------------------
// SESSION-AUTHENTICATED CALLS — use chat_session from bootstrap response
// ---------------------------------------------------------------------------

/**
 * Fetch message history with pagination support
 * @param {string} hotelSlug - Hotel slug
 * @param {string} chatSession - chat_session from bootstrap
 * @param {Object} options - Query options
 * @param {number} [options.limit=50] - Number of messages to fetch
 * @param {string} [options.before] - Message ID for pagination cursor
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (hotelSlug, chatSession, options = {}) => {
  if (!chatSession) {
    throw new Error('[GuestChatAPI] Cannot fetch messages: chat_session is missing');
  }
  const { limit = 50, before } = options;

  const params = { limit };
  if (before) params.before = before;

  const response = await guestAPI.get(`/hotel/${hotelSlug}/chat/messages`, {
    params,
    ...sessionConfig(chatSession)
  });

  // Canonical response format: { messages: [...], conversation_id, count, has_more }
  return response.data?.messages ?? [];
};

/**
 * Send a new message
 * @param {string} hotelSlug - Hotel slug
 * @param {string} chatSession - chat_session from bootstrap
 * @param {Object} messageData - Message payload
 * @param {string} messageData.message - Message content
 * @param {string} messageData.client_message_id - UUID for deduplication
 * @param {string} [messageData.reply_to] - Optional reply message ID
 * @returns {Promise<Object>} Server response with message data
 */
export const sendMessage = async (hotelSlug, chatSession, messageData) => {
  if (!chatSession) {
    throw new Error('[GuestChatAPI] Cannot send message: chat_session is missing');
  }
  const { message, client_message_id, reply_to } = messageData;

  const payload = { message, client_message_id };
  if (reply_to) payload.reply_to = reply_to;

  const response = await guestAPI.post(
    `/hotel/${hotelSlug}/chat/messages`,
    payload,
    sessionConfig(chatSession)
  );

  return response.data;
};

/**
 * Mark a conversation as read by the guest.
 * @param {string} hotelSlug - Hotel slug
 * @param {string} chatSession - chat_session from bootstrap
 * @param {string} conversationId - Conversation to mark
 * @returns {Promise<void>}
 */
export const markRead = async (hotelSlug, chatSession, conversationId) => {
  if (!chatSession) {
    throw new Error('[GuestChatAPI] Cannot mark read: chat_session is missing');
  }
  await guestAPI.post(
    `/hotel/${hotelSlug}/chat/conversations/${conversationId}/mark_read/`,
    {},
    sessionConfig(chatSession)
  );
};

export default {
  getChatBootstrap,
  getMessages,
  sendMessage,
  markRead,
};