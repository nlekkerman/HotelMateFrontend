/**
 * Room Conversations API Service
 * Handles API calls for guest-to-staff room conversations
 * Based on the STAFF_ROOM_CONVERSATIONS_API_GUIDE.md
 */

import api, { buildStaffURL } from '@/services/api';

/**
 * Helper to build chat URL for room conversations  
 * Uses pattern: /api/staff/hotel/{hotel_slug}/chat/
 */
const buildRoomChatURL = (hotelSlug, path = '') => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return buildStaffURL(hotelSlug, 'chat', cleanPath);
};

/**
 * Fetch all room conversations between guests and front office staff
 * @param {string} hotelSlug - The hotel's slug identifier
 * @returns {Promise<Array>} Array of room conversations ordered by most recent activity
 */
export const fetchRoomConversations = async (hotelSlug) => {
  try {
    if (!hotelSlug) {
      throw new Error('Hotel slug is required');
    }
    
    console.log('[RoomConversationsAPI] Fetching room conversations for hotel:', hotelSlug);
    const response = await api.get(buildRoomChatURL(hotelSlug, 'conversations/'));
    
    // Handle different response formats
    const conversations = Array.isArray(response.data) ? response.data : response.data?.conversations || [];
    
    console.log('[RoomConversationsAPI] Room conversations response:', {
      count: conversations.length,
      data: conversations
    });
    
    return conversations;
  } catch (error) {
    console.error('[RoomConversationsAPI] Error fetching room conversations:', error);
    
    // Return empty array on error to prevent UI crashes
    if (error.response?.status === 404 || error.response?.status === 403) {
      console.warn('[RoomConversationsAPI] No conversations found or access denied, returning empty array');
      return [];
    }
    
    throw error;
  }
};

/**
 * Fetch messages for a specific room conversation
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} conversationId - The conversation ID
 * @param {Object} options - Query options
 * @param {number} [options.limit=50] - Number of messages to fetch
 * @param {number} [options.before_id] - Load messages older than this ID (for pagination)
 * @returns {Promise<Object>} Object with messages and metadata
 */
export const fetchRoomConversationMessages = async (hotelSlug, conversationId, options = {}) => {
  try {
    const { limit = 50, before_id } = options;
    
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    
    if (before_id) {
      params.append('before_id', before_id.toString());
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const endpoint = buildRoomChatURL(hotelSlug, `conversations/${conversationId}/messages/${queryString}`);
    
    console.log('[RoomConversationsAPI] Fetching messages:', {
      hotelSlug,
      conversationId,
      endpoint,
      options
    });
    
    const response = await api.get(endpoint);
    
    console.log('[RoomConversationsAPI] Messages response:', {
      messageCount: response.data?.messages?.length || response.data?.length || 0,
      conversationId
    });
    
    return response.data;
  } catch (error) {
    console.error('[RoomConversationsAPI] Error fetching room conversation messages:', error);
    throw error;
  }
};

/**
 * Send a message to a room conversation (staff reply)
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} conversationId - The conversation ID
 * @param {Object} messageData - Message data
 * @param {string} messageData.message - Message content
 * @param {string} [messageData.client_message_id] - Client-generated message ID
 * @returns {Promise<Object>} Sent message object
 */
export const sendRoomConversationMessage = async (hotelSlug, conversationId, messageData) => {
  try {
    const endpoint = buildRoomChatURL(hotelSlug, `conversations/${conversationId}/messages/send/`);
    
    console.log('[RoomConversationsAPI] Sending message:', {
      hotelSlug,
      conversationId,
      endpoint,
      messageLength: messageData.message?.length || 0
    });
    
    const response = await api.post(endpoint, messageData);
    
    console.log('[RoomConversationsAPI] Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[RoomConversationsAPI] Error sending room conversation message:', error);
    throw error;
  }
};

/**
 * Mark a room conversation as read by staff
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} conversationId - The conversation ID
 * @returns {Promise<Object>} Success response
 */
export const markRoomConversationRead = async (hotelSlug, conversationId) => {
  try {
    const endpoint = buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/mark-read/`);
    
    console.log('[RoomConversationsAPI] Marking conversation as read:', {
      hotelSlug,
      conversationId,
      endpoint
    });
    
    const response = await api.post(endpoint);
    
    console.log('[RoomConversationsAPI] Conversation marked as read:', response.data);
    return response.data;
  } catch (error) {
    console.error('[RoomConversationsAPI] Error marking conversation as read:', error);
    throw error;
  }
};

/**
 * Get unread count for all room conversations
 * @param {string} hotelSlug - The hotel's slug identifier
 * @returns {Promise<Object>} Object with total unread count and breakdown
 */
export const fetchRoomConversationsUnreadCount = async (hotelSlug) => {
  try {
    if (!hotelSlug) {
      throw new Error('Hotel slug is required');
    }
    
    const endpoint = buildRoomChatURL(hotelSlug, 'conversations/unread-count/');
    
    console.log('[RoomConversationsAPI] Fetching unread count for hotel:', hotelSlug);
    
    const response = await api.get(endpoint);
    
    console.log('[RoomConversationsAPI] Unread count response:', response.data);
    return response.data || { total_unread: 0, conversations: [] };
  } catch (error) {
    console.error('[RoomConversationsAPI] Error fetching unread count:', error);
    
    // Return default structure on error
    if (error.response?.status === 404 || error.response?.status === 403) {
      console.warn('[RoomConversationsAPI] Unread count endpoint not found or access denied, returning default');
      return { total_unread: 0, conversations: [] };
    }
    
    throw error;
  }
};

export default {
  fetchRoomConversations,
  fetchRoomConversationMessages,
  sendRoomConversationMessage,
  markRoomConversationRead,
  fetchRoomConversationsUnreadCount
};