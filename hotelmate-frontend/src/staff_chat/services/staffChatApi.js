/**
 * Staff Chat API Service
 * Handles all API calls for staff chat functionality
 * Uses axios for consistency with other API services
 */

import api from '@/services/api';

/**
 * Fetch list of staff members for a hotel
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {string} searchTerm - Optional search term
 * @param {string} ordering - Optional ordering field (e.g., 'first_name', '-last_name')
 * @returns {Promise<Array>} Array of staff members
 */
export const fetchStaffList = async (hotelSlug, searchTerm = '', ordering = '') => {
  try {
    const params = new URLSearchParams();
    
    if (searchTerm) {
      params.append('search', searchTerm);
    }
    
    if (ordering) {
      params.append('ordering', ordering);
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`/staff_chat/${hotelSlug}/staff-list/${queryString}`);
    
    // Handle both paginated and non-paginated responses
    // If response has a 'results' array (paginated), return that
    // Otherwise return the data directly (assuming it's an array)
    return response.data?.results || response.data || [];
  } catch (error) {
    console.error('Error fetching staff list:', error);
    throw error;
  }
};

/**
 * Create a new conversation or retrieve existing one
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {Array<number>} participantIds - Array of staff IDs to include in conversation
 * @param {string} title - Optional title for group conversations
 * @returns {Promise<Object>} Conversation object
 */
export const createConversation = async (hotelSlug, participantIds, title = null) => {
  try {
    const payload = {
      participant_ids: participantIds,
      ...(title && { title })
    };
    
    const response = await api.post(`/staff_chat/${hotelSlug}/conversations/`, payload);
    
    return response.data;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Fetch conversations for current user
 * @param {string} hotelSlug - The hotel's slug identifier
 * @returns {Promise<Array>} Array of conversations
 */
export const fetchConversations = async (hotelSlug) => {
  try {
    const response = await api.get(`/staff_chat/${hotelSlug}/conversations/`);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Fetch messages for a specific conversation
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} conversationId - The conversation ID
 * @param {number} limit - Number of messages to fetch (default: 50)
 * @param {number} beforeId - Load messages older than this ID (for pagination)
 * @returns {Promise<Object>} Object with messages array, count, and has_more
 */
export const fetchMessages = async (hotelSlug, conversationId, limit = 50, beforeId = null) => {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    
    if (beforeId) {
      params.append('before_id', beforeId.toString());
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(
      `/staff_chat/${hotelSlug}/conversations/${conversationId}/messages/${queryString}`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

/**
 * Send a message in a conversation
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} conversationId - The conversation ID
 * @param {string} message - The message content
 * @param {number} replyToId - Optional ID of message to reply to
 * @returns {Promise<Object>} Created message object
 */
export const sendMessage = async (hotelSlug, conversationId, message, replyToId = null) => {
  try {
    const payload = {
      message: message,
      ...(replyToId && { reply_to: replyToId })
    };
    
    const response = await api.post(
      `/staff_chat/${hotelSlug}/conversations/${conversationId}/send-message/`,
      payload
    );
    
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Edit a message
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} messageId - The message ID
 * @param {string} newMessage - The updated message content
 * @returns {Promise<Object>} Updated message object
 */
export const editMessage = async (hotelSlug, messageId, newMessage) => {
  try {
    const payload = {
      message: newMessage
    };
    
    const response = await api.patch(
      `/staff_chat/${hotelSlug}/messages/${messageId}/edit/`,
      payload
    );
    
    return response.data;
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
};

/**
 * Delete a message
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} messageId - The message ID
 * @param {boolean} hardDelete - If true, permanently delete (managers only)
 * @returns {Promise<Object>} Deletion result
 */
export const deleteMessage = async (hotelSlug, messageId, hardDelete = false) => {
  try {
    const params = hardDelete ? '?hard_delete=true' : '';
    
    const response = await api.delete(
      `/staff_chat/${hotelSlug}/messages/${messageId}/delete/${params}`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

/**
 * Add emoji reaction to a message
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} messageId - The message ID
 * @param {string} emoji - The emoji to react with (👍, ❤️, 😊, etc.)
 * @returns {Promise<Object>} Reaction object
 */
export const addReaction = async (hotelSlug, messageId, emoji) => {
  try {
    const payload = {
      emoji: emoji
    };
    
    const response = await api.post(
      `/staff_chat/${hotelSlug}/messages/${messageId}/react/`,
      payload
    );
    
    return response.data;
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
};

/**
 * Remove emoji reaction from a message
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} messageId - The message ID
 * @param {string} emoji - The emoji to remove
 * @returns {Promise<Object>} Success message
 */
export const removeReaction = async (hotelSlug, messageId, emoji) => {
  try {
    const response = await api.delete(
      `/staff_chat/${hotelSlug}/messages/${messageId}/react/${encodeURIComponent(emoji)}/`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
};

/**
 * Upload file attachments to a conversation
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} conversationId - The conversation ID
 * @param {Array<File>} files - Array of files to upload (max 10, 50MB each)
 * @param {string} message - Optional message text
 * @param {number} replyToId - Optional ID of message to reply to
 * @returns {Promise<Object>} Upload result with message and attachments
 */
export const uploadFiles = async (hotelSlug, conversationId, files, message = null, replyToId = null) => {
  try {
    const formData = new FormData();
    
    // Add files
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Optional message text
    if (message) {
      formData.append('message', message);
    }
    
    // Optional reply to
    if (replyToId) {
      formData.append('reply_to', replyToId);
    }
    
    const response = await api.post(
      `/staff_chat/${hotelSlug}/conversations/${conversationId}/upload/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
};

/**
 * Delete a file attachment
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {number} attachmentId - The attachment ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAttachment = async (hotelSlug, attachmentId) => {
  try {
    const response = await api.delete(
      `/staff_chat/${hotelSlug}/attachments/${attachmentId}/delete/`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error deleting attachment:', error);
    throw error;
  }
};
