import { useEffect, useCallback, useRef } from 'react';
import { useChatState, useChatDispatch } from '@/realtime/stores/chatStore.jsx';
import { sendMessage, uploadFiles, deleteMessage, deleteAttachment } from '../services/staffChatApi';

/**
 * Custom hook for real-time staff chat updates via centralized store
 * Provides interface for staff chat operations while reading from chatStore
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.hotelSlug - Hotel slug for channel subscription (compatibility)
 * @param {number} params.conversationId - Current conversation ID
 * @param {number} params.staffId - Staff ID for personal notifications
 * @param {Function} params.onNewMessage - Callback for new messages
 * @param {Function} params.onMessageEdited - Callback for edited messages
 * @param {Function} params.onMessageDeleted - Callback for deleted messages
 * @param {Function} params.onReaction - Callback for reactions
 * @param {Function} params.onAttachmentUploaded - Callback for new attachments
 * @param {Function} params.onAttachmentDeleted - Callback for deleted attachments
 * @param {Function} params.onTyping - Callback for typing indicators
 * @param {Function} params.onReadReceipt - Callback for read receipts
 * @returns {Object} Chat state and helper functions
 */
const useStaffChatRealtime = ({
  hotelSlug,
  conversationId,
  staffId,
  onNewMessage,
  onMessageEdited,
  onMessageDeleted,
  onReaction,
  onAttachmentUploaded,
  onAttachmentDeleted,
  onTyping,
  onReadReceipt
}) => {
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();

  // Get conversation data from store
  const conversation = conversationId ? chatState.conversationsById[conversationId] : null;
  const messages = conversation?.messages || [];
  const previousMessagesRef = useRef([]);
  const callbacksRef = useRef({
    onNewMessage,
    onMessageEdited, 
    onMessageDeleted,
    onReaction,
    onAttachmentUploaded,
    onAttachmentDeleted,
    onTyping,
    onReadReceipt
  });

  // Update callbacks ref when they change
  callbacksRef.current = {
    onNewMessage,
    onMessageEdited,
    onMessageDeleted, 
    onReaction,
    onAttachmentUploaded,
    onAttachmentDeleted,
    onTyping,
    onReadReceipt
  };

  // Detect changes in messages array and trigger appropriate callbacks
  useEffect(() => {
    if (!conversationId || !messages || messages.length === 0) {
      previousMessagesRef.current = [];
      return;
    }

    const previousMessages = previousMessagesRef.current;
    
    // Find new messages
    const newMessages = messages.filter(msg => 
      !previousMessages.find(prevMsg => prevMsg.id === msg.id)
    );

    // Find edited messages (same ID but different content/edited flag)
    const editedMessages = messages.filter(msg => {
      const prevMsg = previousMessages.find(prevMsg => prevMsg.id === msg.id);
      return prevMsg && (
        prevMsg.message !== msg.message || 
        prevMsg.content !== msg.content ||
        (!prevMsg.is_edited && msg.is_edited)
      );
    });

    // Find deleted messages (messages that exist in previous but not in current)
    const deletedMessageIds = previousMessages
      .filter(prevMsg => !messages.find(msg => msg.id === prevMsg.id))
      .map(msg => msg.id);

    // Trigger callbacks for new messages
    newMessages.forEach(message => {
      if (callbacksRef.current.onNewMessage) {
        console.log('🔔 [useStaffChatRealtime] Store-detected new message:', message.id);
        callbacksRef.current.onNewMessage(message);
      }
    });

    // Trigger callbacks for edited messages  
    editedMessages.forEach(message => {
      if (callbacksRef.current.onMessageEdited) {
        console.log('✏️ [useStaffChatRealtime] Store-detected edited message:', message.id);
        callbacksRef.current.onMessageEdited(message);
      }
    });

    // Trigger callbacks for deleted messages
    deletedMessageIds.forEach(messageId => {
      if (callbacksRef.current.onMessageDeleted) {
        console.log('🗑️ [useStaffChatRealtime] Store-detected deleted message:', messageId);
        callbacksRef.current.onMessageDeleted({ message_id: messageId });
      }
    });

    // Update the ref for next comparison
    previousMessagesRef.current = [...messages];
  }, [messages, conversationId]);

  // Set active conversation in store when conversationId changes
  useEffect(() => {
    if (conversationId && chatState.activeConversationId !== conversationId) {
      chatDispatch({
        type: 'SET_ACTIVE_CONVERSATION',
        payload: { conversationId }
      });
    }
  }, [conversationId, chatState.activeConversationId, chatDispatch]);

  // Helper functions for chat operations using existing HTTP APIs
  const sendMessageHelper = useCallback(async (messageData) => {
    try {
      const response = await sendMessage(conversationId, messageData);
      
      // Optimistically update store
      if (response && response.id) {
        chatDispatch({
          type: 'RECEIVE_MESSAGE',
          payload: {
            message: response,
            conversationId: conversationId
          }
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [conversationId, chatDispatch]);

  const deleteMessageHelper = useCallback(async (messageId) => {
    try {
      await deleteMessage(messageId);
      
      // Optimistically update store
      chatDispatch({
        type: 'MESSAGE_DELETED',
        payload: {
          messageId: messageId,
          conversationId: conversationId
        }
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [conversationId, chatDispatch]);

  const uploadFilesHelper = useCallback(async (files) => {
    try {
      const response = await uploadFiles(conversationId, files);
      return response;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }, [conversationId]);

  const markAsReadHelper = useCallback(() => {
    if (conversationId) {
      chatDispatch({
        type: 'MARK_CONVERSATION_READ',
        payload: { conversationId }
      });
    }
  }, [conversationId, chatDispatch]);

  return {
    // Store state
    conversation,
    messages,
    isConnected: true, // Always connected to store
    isReady: true,     // Always ready with store
    enabled: true,     // Always enabled with store
    
    // Helper functions for chat operations
    sendMessage: sendMessageHelper,
    deleteMessage: deleteMessageHelper,
    uploadFiles: uploadFilesHelper,
    markAsRead: markAsReadHelper,
    
    // Store access (for advanced usage)
    chatState,
    chatDispatch
  };
};

export default useStaffChatRealtime;
