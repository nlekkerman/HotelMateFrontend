import { useEffect, useCallback } from 'react';
import { usePusherContext } from '../context/PusherProvider';
import { pusherLogger } from '../utils/logger';

/**
 * Custom hook for real-time staff chat updates via Pusher
 * Handles all chat-related events: messages, edits, deletes, reactions, attachments
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.hotelSlug - Hotel slug for channel subscription
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
 * @returns {Object} Real-time connection status
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
  const { 
    bind, 
    unbind, 
    subscribe, 
    unsubscribe, 
    isConnected, 
    isReady,
    enabled 
  } = usePusherContext();

  // Generate channel names according to backend format
  // Conversation: {hotel_slug}-staff-conversation-{id}
  // Personal: {hotel_slug}-staff-{staff_id}-notifications
  const conversationChannel = conversationId && hotelSlug
    ? `${hotelSlug}-staff-conversation-${conversationId}` 
    : null;
  const personalChannel = staffId && hotelSlug
    ? `${hotelSlug}-staff-${staffId}-notifications` 
    : null;

  /**
   * Handle new message event
   */
  const handleNewMessage = useCallback((data) => {
    console.log('🔔 [useStaffChatRealtime] Pusher new-message event received:', data);
    console.log('🔔 [useStaffChatRealtime] Event data type:', typeof data);
    console.log('🔔 [useStaffChatRealtime] Has callback:', !!onNewMessage);
    if (onNewMessage) {
      onNewMessage(data);
    }
  }, [onNewMessage]);

  /**
   * Handle message edited event
   */
  const handleMessageEdited = useCallback((data) => {
    if (onMessageEdited) {
      onMessageEdited(data);
    }
  }, [onMessageEdited]);

  /**
   * Handle message deleted event
   */
  const handleMessageDeleted = useCallback((data) => {
    if (onMessageDeleted) {
      onMessageDeleted(data);
    }
  }, [onMessageDeleted]);

  /**
   * Handle reaction event
   */
  const handleReaction = useCallback((data) => {
    if (onReaction) {
      onReaction(data);
    }
  }, [onReaction]);

  /**
   * Handle attachment uploaded event
   */
  const handleAttachmentUploaded = useCallback((data) => {
    if (onAttachmentUploaded) {
      onAttachmentUploaded(data);
    }
  }, [onAttachmentUploaded]);

  /**
   * Handle attachment deleted event
   */
  const handleAttachmentDeleted = useCallback((data) => {
    if (onAttachmentDeleted) {
      onAttachmentDeleted(data);
    }
  }, [onAttachmentDeleted]);

  /**
   * Handle typing indicator event
   */
  const handleTyping = useCallback((data) => {
    if (onTyping) {
      onTyping(data);
    }
  }, [onTyping]);

  /**
   * Handle read receipt event
   */
  const handleReadReceipt = useCallback((data) => {
    if (onReadReceipt) {
      onReadReceipt(data);
    }
  }, [onReadReceipt]);

  /**
   * Subscribe to conversation channel and bind events
   */
  useEffect(() => {
    if (!enabled || !isReady || !conversationChannel) {
      console.log('⚠️ [useStaffChatRealtime] Skipping subscription:', { enabled, isReady, conversationChannel });
      return;
    }

    console.log('🎯 [useStaffChatRealtime] Subscribing to conversation:', conversationChannel);
    pusherLogger.channel(`Subscribing to conversation: ${conversationChannel}`);
    subscribe(conversationChannel);

    // Bind all events
    console.log('🔗 [useStaffChatRealtime] Binding new-message event to:', conversationChannel);
    bind(conversationChannel, 'new-message', handleNewMessage);
    bind(conversationChannel, 'message-edited', handleMessageEdited);
    bind(conversationChannel, 'message-deleted', handleMessageDeleted);
    bind(conversationChannel, 'message-reaction', handleReaction);
    bind(conversationChannel, 'attachment-uploaded', handleAttachmentUploaded);
    bind(conversationChannel, 'attachment-deleted', handleAttachmentDeleted);
    bind(conversationChannel, 'user-typing', handleTyping);
    bind(conversationChannel, 'messages-read', handleReadReceipt); // Note: event name is 'messages-read' not 'message-read'

    // Cleanup function
    return () => {
      pusherLogger.channel(`Unsubscribing from conversation: ${conversationChannel}`);
      unbind(conversationChannel, 'new-message', handleNewMessage);
      unbind(conversationChannel, 'message-edited', handleMessageEdited);
      unbind(conversationChannel, 'message-deleted', handleMessageDeleted);
      unbind(conversationChannel, 'message-reaction', handleReaction);
      unbind(conversationChannel, 'attachment-uploaded', handleAttachmentUploaded);
      unbind(conversationChannel, 'attachment-deleted', handleAttachmentDeleted);
      unbind(conversationChannel, 'user-typing', handleTyping);
      unbind(conversationChannel, 'messages-read', handleReadReceipt); // Note: event name is 'messages-read' not 'message-read'
      unsubscribe(conversationChannel);
    };
  }, [
    enabled,
    isReady,
    conversationChannel,
    subscribe,
    unsubscribe,
    bind,
    unbind,
    handleNewMessage,
    handleMessageEdited,
    handleMessageDeleted,
    handleReaction,
    handleAttachmentUploaded,
    handleAttachmentDeleted,
    handleTyping,
    handleReadReceipt
  ]);

  /**
   * Subscribe to personal channel for notifications (mentions, new conversations)
   */
  useEffect(() => {
    if (!enabled || !isReady || !personalChannel) {
      return;
    }

    pusherLogger.channel(`Subscribing to personal: ${personalChannel}`);
    subscribe(personalChannel);

    // Bind personal notification events
    // message-mention, new-conversation, etc.
    // Add specific handlers as needed

    return () => {
      pusherLogger.channel(`Unsubscribing from personal: ${personalChannel}`);
      unsubscribe(personalChannel);
    };
  }, [enabled, isReady, personalChannel, subscribe, unsubscribe]);

  return {
    isConnected: isConnected(),
    isReady,
    enabled,
    conversationChannel,
    personalChannel
  };
};

export default useStaffChatRealtime;
