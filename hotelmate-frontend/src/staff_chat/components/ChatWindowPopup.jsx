import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { fetchMessages, sendMessage, uploadFiles } from '../services/staffChatApi';
import MessageInput from './MessageInput';
import MessageBubble from './MessageBubble';
import MessageActions from './MessageActions';
import ReactionPicker from './ReactionPicker';
import ReactionsList from './ReactionsList';
import ReadStatus from './ReadStatus';
import ShareMessageModal from './ShareMessageModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import SuccessModal from './SuccessModal';
import ParticipantsModal from './ParticipantsModal';
import useSendMessage from '../hooks/useSendMessage';
import useReactions from '../hooks/useReactions';
import useEditMessage from '../hooks/useEditMessage';
import useDeleteMessage from '../hooks/useDeleteMessage';
import useReadReceipts from '../hooks/useReadReceipts';
import useMessagePagination from '../hooks/useMessagePagination';
import useStaffChatRealtime from '../hooks/useStaffChatRealtime';

/**
 * ChatWindowPopup Component
 * Individual chat window that can be minimized/closed
 * Multiple windows can be open at once, stacked horizontally
 */
const ChatWindowPopup = ({ 
  hotelSlug, 
  conversation, 
  staff, 
  isMinimized, 
  onMinimize, 
  onClose,
  position = 'bottom-right',
  stackIndex = 0,
  isVisible = true
}) => {
  // ChatWindowPopup rendering

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const sentinelRef = useRef(null);
  
  // Get current user ID from localStorage or use a fallback
  const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
  // Try multiple possible fields for the current user ID
  const currentUserId = currentUserData?.staff_id || currentUserData?.id || null;
  
  // Debug: Log current user info
  // Current user data loaded
  
  // For 1-on-1 chats, if staff prop is not provided or is the current user,
  // find the other participant from the conversation
  let displayStaff = staff;
  if (!conversation?.is_group && conversation?.participants) {
    // Find the participant who is NOT the current user
    const otherParticipant = conversation.participants.find(
      p => p.id !== currentUserId
    );
    
    // If we found a different participant and either:
    // 1. No staff prop was provided, OR
    // 2. The staff prop is actually the current user (wrong!)
    if (otherParticipant && (!staff || staff.id === currentUserId)) {
      // console.log('🔄 Correcting staff display - using other participant:', otherParticipant.full_name);
      displayStaff = otherParticipant;
    }
  }

  // Use pagination hook
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    setupInfiniteScroll,
    addMessage: addPaginatedMessage,
    updateMessage: updatePaginatedMessage,
    removeMessage: removePaginatedMessage
  } = useMessagePagination(hotelSlug, conversation?.id, 20);

  // Use send message hook
  const {
    send: sendMsg,
    sending,
    error: sendError,
    replyTo,
    setReply,
    cancelReply
  } = useSendMessage(hotelSlug, conversation?.id);

  // Use reactions hook
  const {
    toggleReaction,
    groupReactions
  } = useReactions(hotelSlug, conversation?.id, (messageId, data) => {
    // Update message reactions in real-time
    updatePaginatedMessage(messageId, { reactions: data.reactions });
  });

  // Use edit message hook
  const {
    startEdit,
    cancelEdit,
    saveEdit,
    isEditing,
    editingMessageId
  } = useEditMessage(hotelSlug, conversation?.id, (messageId, updatedData) => {
    updatePaginatedMessage(messageId, updatedData);
  });

  // Use delete message hook with proper callback
  const {
    deleteMsg,
    deleting: isDeletingMessage
  } = useDeleteMessage(hotelSlug, conversation?.id, (messageId, hardDelete, result) => {
    // console.log('🗑️ Message deleted callback:', { messageId, hardDelete, result });
    
    if (hardDelete) {
      // Hard delete - remove from UI
      //
      removePaginatedMessage(messageId);
    } else {
      // Soft delete - update message to show deleted state
      const deletedMessage = result?.message?.message || 'Message deleted';
      // Soft delete - updating message to deleted state
      
      updatePaginatedMessage(messageId, {
        is_deleted: true,
        message: deletedMessage
      });
      
      // Verify the update
      setTimeout(() => {
        const updatedMessages = messages.find(m => m.id === messageId);
        // console.log('🗑️ Message after update:', updatedMessages);
      }, 100);
    }
  });

  // Use read receipts hook
  const {
    markAsRead,
    getReadStatus,
    isRead
  } = useReadReceipts(conversation?.id, currentUserId);

  // Use real-time hook for Pusher updates
  useStaffChatRealtime({
    hotelSlug,
    conversationId: conversation?.id,
    staffId: currentUserId,
    onNewMessage: (data) => {
      console.log('📨 Real-time new message:', data);
      if (data.message) {
        addPaginatedMessage(data.message);
        scrollToBottom();
      }
    },
    onMessageEdited: (data) => {
      console.log('✏️ Real-time message edited:', data);
      if (data.message_id && data.message) {
        updatePaginatedMessage(data.message_id, { 
          message: data.message,
          is_edited: true 
        });
      }
    },
    onMessageDeleted: (data) => {
      console.log('🗑️ Real-time message deleted:', data);
      if (data.message_id) {
        if (data.hard_delete) {
          removePaginatedMessage(data.message_id);
        } else {
          updatePaginatedMessage(data.message_id, {
            is_deleted: true,
            message: 'Message deleted'
          });
        }
      }
    },
    onReaction: (data) => {
      console.log('👍 Real-time reaction:', data);
      if (data.message_id && data.reactions) {
        updatePaginatedMessage(data.message_id, { reactions: data.reactions });
      }
    },
    onReadReceipt: (data) => {
      console.log('📖 Real-time read receipt:', data);
      // Update read status for messages
      if (data.message_ids) {
        data.message_ids.forEach(messageId => {
          updatePaginatedMessage(messageId, { 
            is_read: true,
            read_by: data.read_by || []
          });
        });
      }
    }
  });

  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [messageToShare, setMessageToShare] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [deleteHard, setDeleteHard] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Setup infinite scroll
  useEffect(() => {
    if (sentinelRef.current && !isMinimized) {
      return setupInfiniteScroll(sentinelRef);
    }
  }, [setupInfiniteScroll, isMinimized]);

  useEffect(() => {
    if (!isMinimized && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, isMinimized]);

  // Handle send message
  const handleSendMessage = async (messageText, mentions) => {
    // If files are selected, upload them instead
    if (selectedFiles.length > 0) {
      await handleUploadFiles(messageText);
      return;
    }

    const sentMessage = await sendMsg(messageText, replyTo, mentions);
    if (sentMessage) {
      addPaginatedMessage(sentMessage);
      scrollToBottom();
    }
  };

  // Handle file upload
  const handleUploadFiles = async (messageText = '') => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const result = await uploadFiles(
        hotelSlug,
        conversation.id,
        selectedFiles,
        messageText.trim() || undefined,
        replyTo?.id
      );

      // console.log('✅ Upload successful:', result);

      if (result.success && result.message) {
        // console.log('📨 Adding message to UI:', result.message);
        addPaginatedMessage(result.message);
        setSelectedFiles([]);
        if (replyTo) cancelReply();
        scrollToBottom();
      } else {
        console.warn('⚠️ Upload result missing success or message:', result);
      }
    } catch (error) {
      console.error('❌ Failed to upload files:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (files) => {
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

  // Handle file removal
  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle reply
  const handleReply = (message) => {
    setReply(message);
  };

  // Handle edit
  const handleEdit = (messageId, currentText) => {
    startEdit(messageId, currentText);
  };

  // Handle delete - show confirmation modal
  const handleDelete = (messageId, permanent = false) => {
    // console.log('🗑️ handleDelete called:', { messageId, permanent });
    const message = messages.find(m => m.id === messageId);
    // console.log('🗑️ Found message:', message);
    
    setMessageToDelete(message);
    setDeleteHard(permanent);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!messageToDelete) {
      console.error('❌ No message to delete');
      return;
    }

    // console.log('🗑️ Confirming delete:', { 
    //   messageId: messageToDelete.id, 
    //   hardDelete: deleteHard 
    // });

    const result = await deleteMsg(messageToDelete.id, deleteHard);
    // console.log('🗑️ Delete result:', result);

    if (result.success) {
      setShowDeleteConfirm(false);
      setMessageToDelete(null);
      setSuccessMessage(deleteHard ? 'Message permanently deleted' : 'Message deleted');
      setShowSuccessModal(true);
    } else {
      alert(result.error || 'Failed to delete message');
    }
  };

  // Handle share
  const handleShare = (message) => {
    // console.log('📤 Share message:', message);
    setMessageToShare(message);
    setShowShareModal(true);
  };

  // Handle reaction
  const handleReaction = (messageId, emoji) => {
    // console.log('👍 Handle reaction:', { messageId, emoji });
    const message = messages.find(m => m.id === messageId);
    if (message) {
      toggleReaction(messageId, emoji, message.reactions || [], currentUserId);
    }
  };

  // Handle reaction click from list
  const handleReactionClick = (messageId, emoji, wasUserReaction) => {
    handleReaction(messageId, emoji);
  };

  // Calculate position based on stack index
  // Start from the messenger widget (340px + 24px gap = 364px), then add stacking
  const rightOffset = position === 'bottom-right' 
    ? 364 + (stackIndex * 340) // 340px for widget + 24px gap, then 340px per chat
    : 'auto';
  
  const leftOffset = position === 'bottom-left'
    ? 364 + (stackIndex * 340) // 340px for widget + 24px gap, then 340px per chat
    : 'auto';

  return (
    <div 
      className={`chat-window-popup ${isMinimized ? 'chat-window-popup--minimized' : ''} ${isVisible ? 'chat-window-popup--visible' : 'chat-window-popup--hidden'}`}
      style={{
        right: rightOffset !== 'auto' ? `${rightOffset}px` : 'auto',
        left: leftOffset !== 'auto' ? `${leftOffset}px` : 'auto'
      }}
    >
      {/* Header */}
      <div className="chat-window-popup__header" onClick={onMinimize}>
        <div className="chat-window-popup__header-content">
          <div className="chat-window-popup__avatar">
            {displayStaff?.profile_image_url ? (
              <img src={displayStaff.profile_image_url} alt={displayStaff.full_name} />
            ) : (
              <div className="chat-window-popup__avatar-placeholder">
                {displayStaff?.full_name?.charAt(0)?.toUpperCase() || conversation?.title?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            {displayStaff?.is_on_duty && (
              <span className="chat-window-popup__online-dot" />
            )}
          </div>
          
          <div className="chat-window-popup__staff-info">
            <h4 className="chat-window-popup__staff-name">
              {conversation?.title || displayStaff?.full_name || 'Chat'}
            </h4>
            {conversation?.is_group ? (
              <p className="chat-window-popup__staff-role">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowParticipantsModal(true);
                  }}
                  className="chat-window-popup__participants-btn"
                >
                  <i className="bi bi-people-fill me-1"></i>
                  {conversation.participants?.length || 0} participants
                </button>
              </p>
            ) : (
              displayStaff?.role && (
                <p className="chat-window-popup__staff-role">
                  {displayStaff.role.name}
                </p>
              )
            )}
          </div>
        </div>

        <div className="chat-window-popup__actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="chat-window-popup__action-btn"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 8h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="chat-window-popup__action-btn"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages (only show when not minimized) */}
      {!isMinimized && (
        <>
          <div className="chat-window-popup__messages" ref={messagesContainerRef}>
            {loading ? (
              <div className="chat-window-popup__loading">
                <div className="spinner-small" />
              </div>
            ) : (
              <>
                {/* Sentinel for infinite scroll */}
                {hasMore && (
                  <div ref={sentinelRef} className="pagination-sentinel">
                    {loadingMore && (
                      <div className="pagination-loading">
                        <span className="pagination-loading__spinner" />
                        <span className="pagination-loading__text">Loading older messages...</span>
                      </div>
                    )}
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="chat-window-popup__empty">
                    <p>No messages yet</p>
                    <p className="text-muted-small">Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => {
                      const messageText = message.message || message.content || '';
                      const messageTime = message.timestamp || message.created_at;
                      
                      // Use 'sender' field (not 'sender_id') - convert to number for comparison
                      const senderId = Number(message.sender);
                      const userId = Number(currentUserId);
                      const isOwn = senderId === userId;
                      
                      const senderName = message.sender_name || message.sender_info?.full_name || 'Unknown';
                      const readStatus = getReadStatus(message.id);
                      
                      // Log message state including deletion status
                      // console.log('💬 Rendering message:', {
                      //   id: message.id,
                      //   isDeleted: message.is_deleted,
                      //   messageText: messageText.substring(0, 30),
                      //   isOwn
                      // });
                      
                      return (
                        <div
                          key={message.id}
                          className={`staff-chat-message ${isOwn ? 'staff-chat-message--own' : 'staff-chat-message--other'}`}
                        >
                          {/* Message Actions Dropdown */}
                          <MessageActions
                            message={message}
                            isOwn={isOwn}
                            canEdit={isOwn}
                            canDelete={isOwn}
                            canHardDelete={false} // Set based on user permissions
                            onReply={() => handleReply(message)}
                            onShare={() => handleShare(message)}
                            onEdit={() => handleEdit(message.id, messageText)}
                            onDelete={(msgId, permanent) => handleDelete(msgId, permanent)}
                            onHardDelete={(msgId, permanent) => handleDelete(msgId, permanent)}
                            deleting={isDeletingMessage}
                          />

                          <div style={{ position: 'relative' }}>
                            <MessageBubble
                              message={messageText}
                              timestamp={messageTime}
                              isOwn={isOwn}
                              senderName={senderName}
                              replyTo={message.reply_to_message || message.reply_to}
                              isEdited={message.is_edited}
                              isDeleted={message.is_deleted}
                              attachments={message.attachments}
                              isEditing={isEditing(message.id)}
                              onSaveEdit={(newText) => saveEdit(newText)}
                              onCancelEdit={cancelEdit}
                              onReply={() => handleReply(message)}
                              onReaction={() => setShowReactionPicker(
                                showReactionPicker === message.id ? null : message.id
                              )}
                              onShare={() => handleShare(message)}
                              onDelete={isOwn ? () => handleDelete(message.id, false) : null}
                              reactions={
                                <ReactionsList
                                  reactions={message.reactions || []}
                                  currentUserId={currentUserId}
                                  onReactionClick={(emoji, wasUserReaction) => 
                                    handleReactionClick(message.id, emoji, wasUserReaction)
                                  }
                                />
                              }
                            />

                            {/* Reaction Picker */}
                            {showReactionPicker === message.id && (
                              <ReactionPicker
                                show={true}
                                onSelectEmoji={(emoji) => {
                                  handleReaction(message.id, emoji);
                                  setShowReactionPicker(null);
                                }}
                                onClose={() => setShowReactionPicker(null)}
                                position="top"
                              />
                            )}
                          </div>

                          {/* Read Status for own messages */}
                          {isOwn && (
                            <ReadStatus
                              isRead={isRead(message.id)}
                              readBy={readStatus.read_by || []}
                              showDetails={true}
                              size="small"
                            />
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </>
            )}
          </div>

          {/* Input with new MessageInput component */}
          <div className="chat-window-popup__input-form">
            <MessageInput
              onSend={handleSendMessage}
              replyTo={replyTo}
              onCancelReply={cancelReply}
              disabled={sending || uploading}
              placeholder="Type a message..."
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
            />
          </div>
        </>
      )}

      {/* Share Message Modal */}
      {messageToShare && (
        <ShareMessageModal
          show={showShareModal}
          onHide={() => {
            //
            setShowShareModal(false);
            setMessageToShare(null);
          }}
          message={messageToShare}
          hotelSlug={hotelSlug}
          currentUserId={currentUserId}
          onMessageForwarded={(conversation, newMessage) => {
            //
            // Pusher will automatically update all participants in real-time
            // The new message will appear via Pusher event
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        show={showDeleteConfirm}
        onHide={() => {
          //
          setShowDeleteConfirm(false);
          setMessageToDelete(null);
        }}
        onConfirm={confirmDelete}
        hardDelete={deleteHard}
        deleting={isDeletingMessage}
        messagePreview={messageToDelete?.message || messageToDelete?.content || ''}
      />

      {/* Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        onHide={() => {
          //
          setShowSuccessModal(false);
          setSuccessMessage('');
        }}
        message={successMessage}
        icon="check-circle"
        autoCloseDelay={2000}
      />

      {/* Participants Modal */}
      <ParticipantsModal
        show={showParticipantsModal}
        onHide={() => setShowParticipantsModal(false)}
        participants={conversation?.participants || []}
        currentUserId={currentUserId}
        groupTitle={conversation?.title}
        conversationId={conversation?.id}
        hotelSlug={hotelSlug}
        canManageParticipants={true}
        onParticipantRemoved={(participantId) => {
          // console.log('✅ Participant removed:', participantId);
          // The conversation will be updated via Pusher
        }}
        onLeaveGroup={(convId) => {
          // console.log('✅ Left group:', convId);
          // Close the chat window
          onClose();
        }}
      />
    </div>
  );
};

ChatWindowPopup.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  conversation: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string,
    is_group: PropTypes.bool,
    participants: PropTypes.array,
  }).isRequired,
  staff: PropTypes.shape({
    full_name: PropTypes.string,
    profile_image_url: PropTypes.string,
    is_on_duty: PropTypes.bool,
    role: PropTypes.shape({
      name: PropTypes.string
    })
  }),
  isMinimized: PropTypes.bool.isRequired,
  onMinimize: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  position: PropTypes.oneOf(['bottom-right', 'bottom-left']),
  stackIndex: PropTypes.number,
  isVisible: PropTypes.bool
};

export default ChatWindowPopup;
