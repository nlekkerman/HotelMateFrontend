/**
 * Guest Chat API Service - CANONICAL ENDPOINTS ONLY
 * 
 * Provides all guest chat API operations using the canonical guest endpoints.
 * No references to /api/public/chat/ allowed.
 * 
 * Endpoints:
 * - GET /api/guest/hotel/{hotelSlug}/chat/context?token={guestToken}
 * - GET /api/guest/hotel/{hotelSlug}/chat/messages?token={guestToken}&limit=50&before=<message_id>
 * - POST /api/guest/hotel/{hotelSlug}/chat/messages?token={guestToken}
 */

import { guestAPI } from './api';
import { requireGuestToken } from '@/utils/guestToken';

/**
 * Fetch chat context including Pusher connection info
 * @param {string} hotelSlug - Hotel slug
 * @param {string} token - Guest token
 * @param {Object} [identity] - Additional identity context
 * @param {string} [identity.bookingId] - Booking ID
 * @param {string} [identity.email] - Guest email
 * @returns {Promise<Object>} Context with hotel, booking, conversation, pusher info
 */
export const getContext = async (hotelSlug, token, { bookingId, email } = {}) => {
  const resolvedToken = token || requireGuestToken('guestChatAPI.getContext');
  if (!resolvedToken) {
    throw new Error('[GuestChatAPI] Cannot fetch context: guest token is missing');
  }
  const params = { token: resolvedToken };
  if (bookingId) params.booking_id = bookingId;
  if (email) params.email = email;
  const response = await guestAPI.get(`/hotel/${hotelSlug}/chat/context`, {
    params
  });
  
  console.log('[GuestChatAPI] Context response:', response.data);
  return response.data;
};

/**
 * Fetch message history with pagination support
 * @param {string} hotelSlug - Hotel slug
 * @param {string} token - Guest token
 * @param {Object} options - Query options
 * @param {number} [options.limit=50] - Number of messages to fetch
 * @param {string} [options.before] - Message ID for pagination cursor
 * @param {string} [options.bookingId] - Booking ID for identity context
 * @param {string} [options.email] - Guest email for identity context
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (hotelSlug, token, options = {}) => {
  const resolvedToken = token || requireGuestToken('guestChatAPI.getMessages');
  if (!resolvedToken) {
    throw new Error('[GuestChatAPI] Cannot fetch messages: guest token is missing');
  }
  const { limit = 50, before, bookingId, email } = options;
  
  const params = { token: resolvedToken, limit };
  if (before) params.before = before;
  if (bookingId) params.booking_id = bookingId;
  if (email) params.email = email;
  
  const response = await guestAPI.get(`/hotel/${hotelSlug}/chat/messages`, { 
    params 
  });
  
  console.log('[GuestChatAPI] Messages response:', {
    messageCount: response.data?.messages?.length || response.data?.length || 0,
    before,
    limit,
    dataType: typeof response.data,
    isArray: Array.isArray(response.data),
    hasMessagesProperty: !!response.data?.messages
  });
  
  // Handle different response formats
  // New format: { messages: [...], conversation_id: 74, count: 2, has_more: false }
  // Old format: [...]
  let messages;
  if (response.data?.messages && Array.isArray(response.data.messages)) {
    messages = response.data.messages;
  } else if (Array.isArray(response.data)) {
    messages = response.data;
  } else {
    messages = [];
  }
  
  return messages;
};

/**
 * Send a new message with optimistic update support
 * @param {string} hotelSlug - Hotel slug
 * @param {string} token - Guest token
 * @param {Object} messageData - Message data
 * @param {string} messageData.message - Message content
 * @param {string} messageData.client_message_id - UUID for deduplication
 * @param {string} [messageData.reply_to] - Optional reply message ID
 * @returns {Promise<Object>} Server response with message data
 */
export const sendMessage = async (hotelSlug, token, messageData) => {
  const resolvedToken = token || requireGuestToken('guestChatAPI.sendMessage');
  if (!resolvedToken) {
    throw new Error('[GuestChatAPI] Cannot send message: guest token is missing');
  }
  const { message, client_message_id, reply_to, booking_id, email } = messageData;
  
  const payload = { 
    message, 
    client_message_id 
  };
  
  if (reply_to) {
    payload.reply_to = reply_to;
  }
  
  const params = { token: resolvedToken };
  if (booking_id) params.booking_id = booking_id;
  if (email) params.email = email;
  
  console.log('[GuestChatAPI] Sending message:', {
    hotelSlug,
    client_message_id,
    messageLength: message?.length || 0,
    hasReplyTo: !!reply_to
  });
  
  const response = await guestAPI.post(
    `/hotel/${hotelSlug}/chat/messages`, 
    payload,
    { params }
  );
  
  console.log('[GuestChatAPI] Message sent successfully:', response.data);
  return response.data;
};

/**
 * Get auth endpoint for Pusher private channel authentication
 * @param {string} hotelSlug - Hotel slug
 * @param {string} token - Guest token
 * @returns {string} Auth endpoint URL
 */
export const getPusherAuthEndpoint = (hotelSlug, token) => {
  const resolvedToken = token || requireGuestToken('guestChatAPI.getPusherAuthEndpoint');
  if (!resolvedToken) {
    console.error('[GuestChatAPI] Cannot build Pusher auth endpoint: guest token is missing');
    return null;
  }
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
  return `${baseUrl}/guest/hotel/${hotelSlug}/chat/pusher/auth?token=${encodeURIComponent(resolvedToken)}`;
};

export default {
  getContext,
  getMessages,
  sendMessage,
  getPusherAuthEndpoint
};