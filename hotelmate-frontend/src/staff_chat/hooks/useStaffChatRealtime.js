import { useEffect, useCallback } from 'react';
import { usePusherContext } from '../context/PusherProvider';

/**
 * Custom hook for real-time staff chat updates via Pusher
 * Handles all chat-related events: messages, edits, deletes, reactions, attachments
 * 
 * @param {Object} params - Hook parameters
 * @param {number} params.conversationId - Current conversation ID
 * @param {number} params.hotelId - Hotel ID for channel subscription
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
  conversationId,
  hotelId,
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

  // Generate channel names
  const conversationChannel = conversationId 
    ? `private-conversation.${conversationId}` 
    : null;
  const hotelChannel = hotelId 
    ? `private-hotel.${hotelId}.staff-chat` 
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
    bind(conversationChannel, 'message-read', handleReadReceipt);

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
      unbind(conversationChannel, 'message-read', handleReadReceipt);
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
   * Subscribe to hotel channel for general notifications
   */
  useEffect(() => {
    if (!enabled || !isReady || !hotelChannel) {
      return;
    }

    console.log(`Subscribing to hotel channel: ${hotelChannel}`);
    subscribe(hotelChannel);

    // Bind hotel-wide events (e.g., new conversations, staff status updates)
    // Add specific handlers as needed

    return () => {
      console.log(`Unsubscribing from hotel channel: ${hotelChannel}`);
      unsubscribe(hotelChannel);
    };
  }, [enabled, isReady, hotelChannel, subscribe, unsubscribe]);

  return {
    isConnected: isConnected(),
    isReady,
    enabled,
    conversationChannel,
    hotelChannel
  };
};

export default useStaffChatRealtime;
