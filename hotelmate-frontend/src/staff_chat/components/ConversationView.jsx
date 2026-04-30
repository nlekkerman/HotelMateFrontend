import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { fetchMessages, sendMessage, uploadFiles, deleteMessage, deleteAttachment } from '../services/staffChatApi';
import { useChatState, useChatDispatch } from '@/realtime/stores/chatStore.jsx';
import { subscribeToStaffChatConversation } from '@/realtime/channelRegistry.js';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import MessageActions from './MessageActions';
import ShareMessageModal from './ShareMessageModal';
import ReactionPicker from './ReactionPicker';
import ReactionsList from './ReactionsList';
import ParticipantsModal from './ParticipantsModal';
import useReadReceipts from '../hooks/useReadReceipts';
import { useStaffChat } from '../context/StaffChatContext';
import { useAuth } from '@/context/AuthContext';
import { useCan } from '@/rbac';

/**
 * ConversationView Component
 * Displays messages and allows sending new messages in a conversation
 * Auto-marks messages as read when scrolled into view
 */
const ConversationView = ({ hotelSlug, conversation, staff, currentUser }) => {
  // Removed excessive logging for performance
  
  // Get chat state from store
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();
  
  // Get conversation data from store
  const storeConversation = conversation?.id ? chatState.conversationsById[conversation.id] : null;
  const messages = storeConversation?.messages || [];
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [messageToShare, setMessageToShare] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef(null);
  const markedUpToRef = useRef(0);

  // Get current user from AuthContext, fallback to prop
  const { user: authUser } = useAuth();
  const currentUserData = currentUser || authUser || {};
  const currentUserId = currentUserData?.staff_id || currentUserData?.id || null;

  // Read receipts management
  const {
    readReceipts,
    markConversationRead,
    updateFromRealtimeEvent: updateReadReceipts,
    loadReadReceipts
  } = useReadReceipts(hotelSlug, conversation?.id, currentUserId);

  // Sync readReceipts state changes to store messages
  useEffect(() => {
    if (Object.keys(readReceipts).length === 0 || !conversation?.id) return;
    
    // Syncing readReceipts to store (logging reduced for performance)
    
    // Update messages with read receipt data in the store
    Object.keys(readReceipts).forEach(messageId => {
      const receipt = readReceipts[messageId];
      if (receipt) {
        // Updating message in store with read receipts
        
        // Dispatch read receipt update to store
        chatDispatch({
          type: 'RECEIVE_READ_RECEIPT',
          payload: {
            messageId: parseInt(messageId),
            conversationId: conversation.id,
            readBy: receipt.read_by,
            readCount: receipt.read_count
          }
        });
      }
    });
    
    // Store updated with read receipts
  }, [readReceipts, conversation?.id, chatDispatch]);

  // Get setCurrentConversationId from StaffChatContext (for compatibility)
  const { setCurrentConversationId } = useStaffChat();

  // Set active conversation in store when conversation changes
  useEffect(() => {
    if (conversation?.id && chatState.activeConversationId !== conversation.id) {
      // Setting active conversation in store
      
      chatDispatch({
        type: 'SET_ACTIVE_CONVERSATION',
        payload: { conversationId: conversation.id }
      });
      
      // Backward compatibility with existing staff chat context
      setCurrentConversationId(conversation.id);
    }
  }, [conversation?.id, chatState.activeConversationId, chatDispatch, setCurrentConversationId]);

  // Subscribe to active conversation's Pusher channel for real-time updates
  useEffect(() => {
    if (!hotelSlug || !conversation?.id) {
      return;
    }

    if (!import.meta.env.PROD) {
    }

    // Subscribe to the conversation's Pusher channel
    const cleanup = subscribeToStaffChatConversation(hotelSlug, conversation.id);

    return () => {
      if (!import.meta.env.PROD) {
      }
      cleanup();
    };
  }, [hotelSlug, conversation?.id]);

  // Handle realtime events from store (messages automatically update via store state)
  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, conversation?.id]);

  // Handle read receipts from realtime events
  // Read receipts are now handled through chatStore - window events removed





  // Debug: Log replyTo state changes
  useEffect(() => {
  }, [replyTo]);
  
  // RBAC: staff_chat module action gates. Authority is `user.rbac.staff_chat.actions.<action>` only.
  const { can } = useCan();
  const canSend = can('staff_chat', 'message_send');
  const canAttach = can('staff_chat', 'attachment_upload');
  const canModerate = can('staff_chat', 'message_moderate');
  const canDeleteAttachment = can('staff_chat', 'attachment_delete');
  const canAssign = can('staff_chat', 'conversation_assign');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    markedUpToRef.current = 0;
    if (conversation?.id) {
      setCurrentConversationId(conversation.id);
      loadMessages();
    }
    return () => {
      setCurrentConversationId(null);
    };
  }, [conversation?.id, setCurrentConversationId]);

  // Initialize messages from store when conversation changes
  useEffect(() => {
    if (conversation?.id && !storeConversation) {
      // Initialize conversation in store if it doesn't exist
      chatDispatch({
        type: 'INIT_CONVERSATIONS_FROM_API',
        payload: {
          conversations: [{ ...conversation, _source: 'staff_chat' }]
        }
      });
    }
  }, [conversation, storeConversation, chatDispatch]);

  // Auto mark last message as read when it comes into view
  useEffect(() => {
    if (!lastMessageRef.current || messages.length === 0) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && messages.length > markedUpToRef.current) {
          await markConversationRead();
          markedUpToRef.current = messages.length;
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(lastMessageRef.current);

    return () => observer.disconnect();
  }, [messages.length, markConversationRead]);

  // Mark ALL messages as read when conversation is opened or new unreads arrive
  useEffect(() => {
    if (conversation?.id && messages.length > 0 && messages.length > markedUpToRef.current) {
      const timer = setTimeout(async () => {
        await markConversationRead();
        markedUpToRef.current = messages.length;
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [conversation?.id, messages.length, markConversationRead]);

  // Note: Auto-scroll and mark as read logic already handled above

  const loadMessages = async () => {
    if (!conversation?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchMessages(hotelSlug, conversation.id);
      const messageList = Array.isArray(data) ? data : data.results || [];
      
      // Load messages into store
      chatDispatch({
        type: 'INIT_MESSAGES_FOR_CONVERSATION',
        payload: {
          conversationId: conversation.id,
          messages: messageList
        }
      });
      
      // Load read receipts from message data
      loadReadReceipts(messageList);
    } catch (err) {
      setError(err.message);
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark ALL messages as read when user focuses input (handles new messages while chat was open)
  const handleInputFocus = async () => {
    try {
      if (conversation?.id && (storeConversation?.unread_count || 0) > 0) {
        await markConversationRead(conversation.id);
      }
    } catch (error) {
      console.error('❌ [MARK ALL AS READ] Error marking conversation as read:', error);
    }
  };

  const handleSendMessage = async (messageText, mentions) => {
    if ((!messageText.trim() && selectedFiles.length === 0) || sending) {
      return;
    }
    // RBAC: staff_chat.message_send required for any send.
    if (!canSend) return;
    // RBAC: staff_chat.attachment_upload required when files are attached.
    if (selectedFiles.length > 0 && !canAttach) return;

    setSending(true);
    
    try {
      let result;
      
      if (selectedFiles.length > 0) {
        // Upload files with optional message and reply
        result = await uploadFiles(
          hotelSlug, 
          conversation.id, 
          selectedFiles, 
          messageText.trim() || null,
          replyTo?.id || null
        );
      } else {
        // Send text message only
        result = await sendMessage(
          hotelSlug, 
          conversation.id, 
          messageText.trim(),
          replyTo?.id || null
        );
      }
      
      // Add new message to store
      const messageToAdd = result.message || result;
      const isReply = replyTo?.id !== null && replyTo?.id !== undefined;
      
      if (messageToAdd && messageToAdd.id && !isReply) {
        chatDispatch({
          type: 'RECEIVE_MESSAGE',
          payload: {
            message: messageToAdd,
            conversationId: conversation.id
          }
        });
      } else if (isReply) {
      }
      
      // Clear inputs
      setReplyTo(null);
      setSelectedFiles([]);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleReply = useCallback((message) => {
    // Ensure message has proper structure for MessageInput
    const replyMessage = {
      id: message.id,
      message: message.message || message.content,
      content: message.content || message.message,
      sender_name: message.sender?.first_name || 
                   message.sender?.full_name || 
                   message.sender_info?.full_name ||
                   message.sender_name ||
                   'User',
      sender_info: message.sender_info || message.sender,
      attachments: message.attachments || [],
      is_deleted: message.is_deleted || false,
    };
    
    setReplyTo(replyMessage);
  }, []);

  const handleCancelReply = () => {
    //
    setReplyTo(null);
  };

  const handleFileSelect = (files) => {
    // RBAC: staff_chat.attachment_upload
    if (!canAttach) return;
    // Validate file count
    if (files.length > 10) {
      alert('Maximum 10 files per upload');
      return;
    }
    
    // Validate file sizes
    const maxSize = 50 * 1024 * 1024; // 50MB
    const oversized = files.filter(f => f.size > maxSize);
    if (oversized.length > 0) {
      alert(`File too large: ${oversized[0].name} (max 50MB)`);
      return;
    }
    
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleShare = useCallback((message) => {
    setMessageToShare(message);
    setShowShareModal(true);
  }, []);

  const handleDelete = useCallback(async (messageId, hardDelete = false) => {
    // RBAC: staff_chat.message_moderate (no ownership-based bypass).
    if (!canModerate) return;
    const confirmText = hardDelete 
      ? 'Permanently delete this message? This cannot be undone.'
      : 'Delete this message?';
    
    if (!confirm(confirmText)) return;

    setDeleting(true);
    
    try {
      const result = await deleteMessage(hotelSlug, messageId, hardDelete);
      
      // Update store with delete result
      chatDispatch({
        type: 'MESSAGE_DELETED',
        payload: {
          messageId: messageId,
          conversationId: conversation.id,
          hardDelete: result.hard_delete,
          deletedMessage: result.message
        }
      });
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [hotelSlug, conversation?.id, chatDispatch, canModerate]);

  const handleDeleteAttachment = async (attachmentId) => {
    // RBAC: staff_chat.attachment_delete
    if (!canDeleteAttachment) return;
    if (!confirm('Delete this file?')) return;

    try {
      const result = await deleteAttachment(hotelSlug, attachmentId);
      
      // ✅ UNIFIED: Attachment deletion will be updated via chatStore through realtime events
    } catch (err) {
      console.error('Error deleting attachment:', err);
      alert('Failed to delete file. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="conversation-view__loading">
        <div className="spinner" />
        <p>Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversation-view__error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to load messages</h3>
        <p>{error}</p>
        <button onClick={loadMessages} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  // Memoized handlers to prevent MessageBubble re-renders
  const handleSaveEdit = useCallback((newText) => {
    // Handle edit save (you can implement editMessage API call)
    setEditingMessageId(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleReaction = useCallback((messageId) => {
    setShowReactionPicker(messageId);
  }, []);

  return (
    <div className="conversation-view__content">
      {/* Header for group chats */}
      {conversation?.is_group && (
        <div className="conversation-view__header">
          <div className="conversation-view__header-info">
            <h3 className="conversation-view__title">
              {conversation.title || 'Group Chat'}
            </h3>
            <button
              onClick={() => setShowParticipantsModal(true)}
              className="conversation-view__participants-btn"
            >
              <i className="bi bi-people-fill me-1"></i>
              {conversation.participants?.length || 0} participants
            </button>
          </div>
        </div>
      )}
      
      <div className="conversation-view__messages">
        {messages.length === 0 ? (
          <div className="conversation-view__empty">
            <div className="empty-icon">💬</div>
            <h3>No messages yet</h3>
            <p>Start the conversation with {staff?.full_name}</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              // Determine sender ID - handle various API response formats
              const senderId = message.sender?.id || Number(message.sender) || message.sender_id;
              const userId = Number(currentUserId);
              const isOwn = senderId === userId;
              
              // Get sender name
              const senderName = message.sender?.first_name || 
                               message.sender?.full_name || 
                               message.sender_info?.full_name ||
                               'User';
              
              // Get read receipt info - USE MESSAGE DATA AS SINGLE SOURCE OF TRUTH
              // The messages state is updated by handleReadReceipt, so we only need that
              const readStatus = {
                read_by: message.read_by_list || [],
                read_count: message.read_by_count || 0
              };
              
              // Debug log for message render
              if (isOwn) {
              }

              // Attach ref to last message for intersection observer
              const isLastMessage = index === messages.length - 1;
              
              return (
                <div
                  key={message.id}
                  ref={isLastMessage ? lastMessageRef : null}
                  className={`staff-chat-message ${isOwn ? 'staff-chat-message--own' : 'staff-chat-message--other'}`}
                >
                  <MessageBubble
                    message={message.message || message.content || ''}
                    timestamp={message.timestamp || message.created_at}
                    isOwn={isOwn}
                    senderName={senderName}
                    replyTo={message.reply_to_message}
                    isEdited={message.is_edited || false}
                    isDeleted={message.is_deleted || false}
                    attachments={message.attachments || []}
                    isEditing={editingMessageId === message.id}
                    isSending={message.is_sending || false}
                    readByList={readStatus.read_by}
                    readByCount={readStatus.read_count}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onReply={() => handleReply(message)}
                    onReaction={() => handleReaction(message.id)}
                    onShare={() => handleShare(message)}
                    onDelete={canModerate ? () => handleDelete(message.id, false) : null}
                    reactions={
                      message.reactions && message.reactions.length > 0 ? (
                        <ReactionsList
                          reactions={message.reactions}
                          currentUserId={currentUserId}
                          onReactionClick={(emoji) => {
                            // Handle reaction click (add/remove)
                          }}
                        />
                      ) : null
                    }
                  />
                  
                  {/* Message Actions Dropdown */}
                  {!message.is_deleted && (
                    <MessageActions
                      message={message}
                      isOwn={isOwn}
                      canEdit={isOwn}
                      canDelete={canModerate}
                      canHardDelete={canModerate}
                      onEdit={() => setEditingMessageId(message.id)}
                      onDelete={() => handleDelete(message.id, false)}
                      onHardDelete={() => handleDelete(message.id, true)}
                      onReply={handleReply}
                      onShare={() => handleShare(message)}
                      deleting={deleting}
                    />
                  )}
                  
                  {/* Reaction Picker */}
                  {showReactionPicker === message.id && (
                    <ReactionPicker
                      onEmojiSelect={(emoji) => {
                        // Handle emoji selection
                        setShowReactionPicker(null);
                      }}
                      onClose={() => setShowReactionPicker(null)}
                    />
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={sending || !canSend}
        placeholder={`Message ${staff?.full_name || 'staff member'}...`}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
        onFileSelect={canAttach ? handleFileSelect : undefined}
        selectedFiles={selectedFiles}
        onRemoveFile={handleRemoveFile}
        showMentionSuggestions={true}
        onFocus={handleInputFocus}
      />
      
      {/* Share Message Modal */}
      {messageToShare && (
        <ShareMessageModal
          show={showShareModal}
          onHide={() => {
            setShowShareModal(false);
            setMessageToShare(null);
          }}
          message={messageToShare}
          hotelSlug={hotelSlug}
          currentUserId={currentUser?.id}
          onMessageForwarded={async (conversation, newMessage) => {
            //
            // Reload messages to show the forwarded message immediately
            await loadMessages();
          }}
        />
      )}

      {/* Participants Modal */}
      <ParticipantsModal
        show={showParticipantsModal}
        onHide={() => setShowParticipantsModal(false)}
        participants={conversation?.participants || []}
        currentUserId={currentUserId}
        groupTitle={conversation?.title}
        conversationId={conversation?.id}
        hotelSlug={hotelSlug}
        canManageParticipants={canAssign}
        onParticipantRemoved={(participantId) => {
          // Reload messages to reflect changes
          loadMessages();
        }}
        onLeaveGroup={(convId) => {
          // You may want to navigate away or show a message
          alert('You have left the group');
        }}
      />
    </div>
  );
};

ConversationView.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  conversation: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string,
    is_group: PropTypes.bool,
    participants: PropTypes.array
  }).isRequired,
  staff: PropTypes.shape({
    id: PropTypes.number,
    full_name: PropTypes.string,
    profile_image_url: PropTypes.string
  }),
  currentUser: PropTypes.shape({
    id: PropTypes.number,
    staff_id: PropTypes.number,
    role: PropTypes.string
  })
};

export default ConversationView;
