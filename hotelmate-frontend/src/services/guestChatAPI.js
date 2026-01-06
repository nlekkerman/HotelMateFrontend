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

/**
 * Fetch chat context including Pusher connection info
 * @param {string} hotelSlug - Hotel slug
 * @param {string} token - Guest token
 * @returns {Promise<Object>} Context with hotel, booking, conversation, pusher info
 */
export const getContext = async (hotelSlug, token) => {
  const response = await guestAPI.get(`/hotel/${hotelSlug}/chat/context`, {
    params: { token }
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
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (hotelSlug, token, options = {}) => {
  const { limit = 50, before } = options;
  
  const params = { token, limit };
  if (before) {
    params.before = before;
  }
  
  const response = await guestAPI.get(`/hotel/${hotelSlug}/chat/messages`, { 
    params 
  });
  
  console.log('[GuestChatAPI] Messages response:', {
    messageCount: response.data?.length || 0,
    before,
    limit,
    dataType: typeof response.data,
    isArray: Array.isArray(response.data)
  });
  
  // Ensure we always return an array
  const messages = response.data || [];
  return Array.isArray(messages) ? messages : [];
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
    { params: { token } }
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
  return `${baseUrl}/guest/hotel/${hotelSlug}/chat/pusher/auth?token=${token}`;
};

export default {
  getContext,
  getMessages,
  sendMessage,
  getPusherAuthEndpoint
};