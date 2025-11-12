import { useEffect, useCallback } from 'react';
import { usePusherContext } from '../context/PusherProvider';

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
    console.log('Pusher: New message received', data);
    if (onNewMessage) {
      onNewMessage(data);
    }
  }, [onNewMessage]);

  /**
   * Handle message edited event
   */
  const handleMessageEdited = useCallback((data) => {
    console.log('Pusher: Message edited', data);
    if (onMessageEdited) {
      onMessageEdited(data);
    }
  }, [onMessageEdited]);

  /**
   * Handle message deleted event
   */
  const handleMessageDeleted = useCallback((data) => {
    console.log('Pusher: Message deleted', data);
    if (onMessageDeleted) {
      onMessageDeleted(data);
    }
  }, [onMessageDeleted]);

  /**
   * Handle reaction event
   */
  const handleReaction = useCallback((data) => {
    console.log('Pusher: Reaction update', data);
    if (onReaction) {
      onReaction(data);
    }
  }, [onReaction]);

  /**
   * Handle attachment uploaded event
   */
  const handleAttachmentUploaded = useCallback((data) => {
    console.log('Pusher: Attachment uploaded', data);
    if (onAttachmentUploaded) {
      onAttachmentUploaded(data);
    }
  }, [onAttachmentUploaded]);

  /**
   * Handle attachment deleted event
   */
  const handleAttachmentDeleted = useCallback((data) => {
    console.log('Pusher: Attachment deleted', data);
    if (onAttachmentDeleted) {
      onAttachmentDeleted(data);
    }
  }, [onAttachmentDeleted]);

  /**
   * Handle typing indicator event
   */
  const handleTyping = useCallback((data) => {
    console.log('Pusher: User typing', data);
    if (onTyping) {
      onTyping(data);
    }
  }, [onTyping]);

  /**
   * Handle read receipt event
   */
  const handleReadReceipt = useCallback((data) => {
    console.log('Pusher: Read receipt', data);
    if (onReadReceipt) {
      onReadReceipt(data);
    }
  }, [onReadReceipt]);

  /**
   * Subscribe to conversation channel and bind events
   */
  useEffect(() => {
    if (!enabled || !isReady || !conversationChannel) {
      console.log('Skipping Pusher subscription:', { enabled, isReady, conversationChannel });
      return;
    }

    console.log(`Subscribing to conversation channel: ${conversationChannel}`);
    subscribe(conversationChannel);

    // Bind all events
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
      console.log(`Unsubscribing from conversation channel: ${conversationChannel}`);
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

    console.log(`Subscribing to personal channel: ${personalChannel}`);
    subscribe(personalChannel);

    // Bind personal notification events
    // message-mention, new-conversation, etc.
    // Add specific handlers as needed

    return () => {
      console.log(`Unsubscribing from personal channel: ${personalChannel}`);
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
