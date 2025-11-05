/**
 * Message Deletion Utilities
 * 
 * Handles all message deletion functionality including:
 * - Soft delete (marks message as deleted, shows placeholder)
 * - Hard delete (permanently removes from UI)
 * - Deletion confirmation
 * - API calls to backend
 * - Local state updates
 */

import api from "@/services/api";

/**
 * Deletes a message (soft delete by default)
 * @param {number} messageId - The ID of the message to delete
 * @param {Object} guestSession - Optional guest session for authentication
 * @returns {Promise<Object>} - The response data from backend
 */
export const deleteMessage = async (messageId, guestSession = null) => {
  try {
    console.log('🗑️ Soft deleting message:', messageId);
    console.log('🗑️ Guest session provided:', !!guestSession);
    
    // Build URL with session token for guests
    let url = `/chat/messages/${messageId}/delete/`;
    
    if (guestSession) {
      const sessionToken = guestSession.getToken();
      url += `?session_token=${sessionToken}`;
      console.log('🗑️ Using guest session token for deletion');
    }
    
    // Call backend DELETE API - soft delete (default)
    const response = await api.delete(url);
    
    console.log('✅ Delete response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to delete message:', error);
    throw error;
  }
};

/**
 * Updates local message state after deletion
 * @param {Array} messages - Current messages array
 * @param {number} messageId - ID of the deleted message
 * @param {Object} updatedMessage - Updated message data from backend
 * @param {boolean} hardDelete - Whether this is a hard delete (removes from UI completely)
 * @returns {Array} - Updated messages array
 */
export const updateMessagesAfterDeletion = (messages, messageId, updatedMessage, hardDelete = false) => {
  if (hardDelete) {
    // Hard delete - remove message completely
    console.log(`💥 Hard deleting message ${messageId} - removing from UI`);
    return messages.filter(msg => msg.id !== messageId);
  } else {
    // Soft delete - update message with deletion text
    console.log(`🗑️ Soft deleting message ${messageId} - showing as deleted`);
    return messages.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            ...updatedMessage,
            is_deleted: true,
            attachments: [] // Clear attachments to hide images immediately
          }
        : msg
    );
  }
};

/**
 * Handles the complete message deletion flow
 * @param {number} messageId - The ID of the message to delete
 * @param {Function} setMessages - State setter for messages array
 * @param {Function} setMessageStatuses - State setter for message statuses map
 * @param {Function} onSuccess - Callback on successful deletion
 * @param {Function} onError - Callback on error
 * @param {Object} guestSession - Optional guest session for authentication
 */
export const handleMessageDeletion = async (
  messageId,
  setMessages,
  setMessageStatuses,
  onSuccess,
  onError,
  guestSession = null
) => {
  try {
    const result = await deleteMessage(messageId, guestSession);
    
    // Update message in local state
    if (result?.message) {
      setMessages(prev => updateMessagesAfterDeletion(prev, messageId, result.message, false));
    }
    
    // Remove from message statuses
    setMessageStatuses(prev => {
      const newMap = new Map(prev);
      newMap.delete(messageId);
      return newMap;
    });
    
    console.log('✅ Message soft deleted successfully');
    
    // Call success callback
    if (onSuccess) {
      onSuccess('Message deleted successfully');
    }
  } catch (error) {
    console.error('❌ Failed to delete message:', error);
    
    // Handle specific error cases
    if (error.response?.status === 403) {
      onError && onError('You do not have permission to delete this message.');
    } else if (error.response?.status === 404) {
      // Message already deleted, mark as deleted in UI
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, is_deleted: true, message: '🗑️ Message deleted', attachments: [] }
          : msg
      ));
      onError && onError('Message not found or already deleted.');
    } else {
      const errorMsg = error.response?.data?.error || 
                      error.response?.data?.detail || 
                      'Failed to delete message. Please try again.';
      onError && onError(errorMsg);
    }
  }
};

/**
 * Handles Pusher deletion events from other users
 * @param {Object} data - Pusher event data
 * @param {Function} setMessages - State setter for messages array
 * @param {Function} setMessageStatuses - State setter for message statuses map
 * @param {boolean} isGuest - Whether the current user is a guest (for contextual messages)
 */
export const handlePusherDeletion = (data, setMessages, setMessageStatuses, isGuest = false) => {
  console.log('🗑️ [PUSHER] Message deletion event received:', data);
  console.log('🗑️ [PUSHER] Full event data:', JSON.stringify(data, null, 2));
  
  const { message_id, soft_delete, hard_delete, message, deleted_by, original_sender, staff_name } = data;
  
  // Prefer soft_delete (new field), fallback to !hard_delete for backward compatibility
  const isSoftDelete = soft_delete !== undefined ? soft_delete : !hard_delete;
  
  console.log('🗑️ [PUSHER] Extracted values:', {
    message_id,
    soft_delete,
    hard_delete,
    isSoftDelete,
    message,
    has_message: !!message,
    deleted_by,
    original_sender,
    staff_name,
    isGuest
  });
  
  if (!message_id) {
    console.error('❌ [PUSHER] No message_id in deletion event!');
    return;
  }

  console.log(`🗑️ [PUSHER] Processing deletion for message ID: ${message_id}`);
  
  if (!isSoftDelete) {
    // Hard delete - permanently remove message from UI
    console.log(`💥 [PUSHER] Hard deleting message ${message_id} - removing from UI`);
    setMessages(prevMessages => {
      console.log(`💥 [PUSHER] Before filter - message count: ${prevMessages.length}`);
      const filtered = prevMessages.filter(msg => msg.id !== message_id);
      console.log(`💥 [PUSHER] After filter - message count: ${filtered.length}`);
      return filtered;
    });
  } else {
    // Soft delete - update message with contextual deletion text
    console.log(`🗑️ [PUSHER] Soft deleting message ${message_id} - showing as deleted`);
    setMessages(prevMessages => {
      console.log(`🗑️ [PUSHER] Before update - message count: ${prevMessages.length}`);
      
      // Find the message to be deleted
      const targetMessage = prevMessages.find(msg => msg.id === message_id);
      if (targetMessage) {
        console.log(`🗑️ [PUSHER] Found target message:`, {
          id: targetMessage.id,
          has_attachments: !!targetMessage.attachments,
          attachment_count: targetMessage.attachments?.length,
          message_text: targetMessage.message?.substring(0, 50)
        });
      } else {
        console.warn(`⚠️ [PUSHER] Message ${message_id} NOT FOUND in current messages!`);
      }
      
      const updated = prevMessages.map(msg => {
        if (msg.id === message_id) {
          // Get contextual deletion message
          let deletionMessage = message?.message; // Use backend message if provided
          
          // If we have context data, create custom message
          if (deleted_by && original_sender) {
            deletionMessage = getContextualDeletionText(deleted_by, original_sender, staff_name, isGuest);
            console.log(`🗑️ [PUSHER] Using contextual deletion text: "${deletionMessage}"`);
          }
          
          const updatedMsg = { 
            ...msg, 
            message: deletionMessage || '[Message deleted]',
            is_deleted: true,
            deleted_by,
            original_sender,
            staff_name,
            attachments: [] // Clear attachments to hide images
          };
          console.log(`🗑️ [PUSHER] Updated message ${message_id}:`, {
            old_message: msg.message?.substring(0, 50),
            new_message: updatedMsg.message,
            old_attachments: msg.attachments?.length || 0,
            new_attachments: updatedMsg.attachments?.length || 0,
            is_deleted: updatedMsg.is_deleted,
            deleted_by: updatedMsg.deleted_by,
            original_sender: updatedMsg.original_sender
          });
          return updatedMsg;
        }
        return msg;
      });
      
      console.log(`🗑️ [PUSHER] After update - message count: ${updated.length}`);
      console.log(`✅ [PUSHER] Deletion update complete for message ${message_id}`);
      return updated;
    });
  }
  
  // Remove from message statuses
  setMessageStatuses(prev => {
    const newMap = new Map(prev);
    newMap.delete(message_id);
    console.log(`🗑️ [PUSHER] Removed message ${message_id} from status map`);
    return newMap;
  });
  
  console.log(`✅ [PUSHER] Message deletion handled successfully for ID: ${message_id}`);
};

/**
 * Gets contextual deletion text based on who deleted what
 * @param {string} deleted_by - "staff" or "guest"
 * @param {string} original_sender - "staff" or "guest"
 * @param {string} staff_name - Name of staff who deleted (if applicable)
 * @param {boolean} isGuestView - Whether viewing from guest UI
 * @returns {string} - Contextual deletion message
 */
export const getContextualDeletionText = (deleted_by, original_sender, staff_name, isGuestView) => {
  // For guest UI
  if (isGuestView) {
    if (deleted_by === 'guest' && original_sender === 'guest') {
      return '[You deleted this message]';
    }
    if (deleted_by === 'staff' && original_sender === 'guest') {
      return '[Message removed by staff]';
    }
    if (deleted_by === 'staff' && original_sender === 'staff') {
      return '[Message deleted]';
    }
  }
  
  // For staff UI
  if (deleted_by === 'guest' && original_sender === 'guest') {
    return '[Message deleted by guest]';
  }
  if (deleted_by === 'staff') {
    return staff_name 
      ? `[Message deleted by ${staff_name}]`
      : '[Message deleted]';
  }
  
  return '[Message deleted]';
};

/**
 * Gets deletion text for display in UI
 * @param {Object} message - The deleted message object
 * @returns {string} - Formatted deletion text
 */
export const getDeletionText = (message) => {
  // Backend provides smart deletion text:
  // "[Message deleted]" for text-only
  // "[File deleted]" for file-only
  // "[Message and file(s) deleted]" for text + files
  return message?.message || '🗑️ Message deleted';
};

/**
 * React component for deleted message display
 */
export const DeletedMessageDisplay = ({ message, isMine }) => {
  const deletionText = getDeletionText(message);
  
  return (
    <div
      className={`d-flex mb-3 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}
    >
      <div 
        className="px-3 py-2 rounded text-muted"
        style={{
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          fontSize: '0.85rem',
          fontStyle: 'italic',
          border: '1px solid rgba(220, 53, 69, 0.2)',
          color: '#dc3545',
          maxWidth: '280px'
        }}
      >
        {deletionText}
      </div>
    </div>
  );
};
