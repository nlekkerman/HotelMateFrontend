import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { fetchMessages, sendMessage } from '../services/staffChatApi';
import MessageInput from './MessageInput';
import MessageBubble from './MessageBubble';
import MessageActions from './MessageActions';
import ReactionPicker from './ReactionPicker';
import ReactionsList from './ReactionsList';
import ReadStatus from './ReadStatus';
import useSendMessage from '../hooks/useSendMessage';
import useReactions from '../hooks/useReactions';
import useEditMessage from '../hooks/useEditMessage';
import useDeleteMessage from '../hooks/useDeleteMessage';
import useReadReceipts from '../hooks/useReadReceipts';
import useMessagePagination from '../hooks/useMessagePagination';

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
  console.log('💬 ChatWindowPopup rendering with:', {
    hotelSlug,
    conversationId: conversation?.id,
    staff: staff?.full_name,
    isMinimized,
    stackIndex,
    isVisible
  });

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const sentinelRef = useRef(null);
  
  // Get current user ID from localStorage or use a fallback
  const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
  // Try multiple possible fields for the current user ID
  const currentUserId = currentUserData?.staff_id || currentUserData?.id || null;
  
  // Debug: Log current user info
  console.log('Current User Data:', { 
    currentUserData, 
    currentUserId,
    staff_id: currentUserData?.staff_id,
    id: currentUserData?.id 
  });

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

  // Use delete message hook
  const {
    deleteMsg
  } = useDeleteMessage(hotelSlug, conversation?.id, (messageId) => {
    removePaginatedMessage(messageId);
  });

  // Use read receipts hook
  const {
    markAsRead,
    getReadStatus,
    isRead
  } = useReadReceipts(conversation?.id, currentUserId);

  const [showReactionPicker, setShowReactionPicker] = useState(null);

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
    const sentMessage = await sendMsg(messageText, replyTo, mentions);
    if (sentMessage) {
      addPaginatedMessage(sentMessage);
      scrollToBottom();
    }
  };

  // Handle reply
  const handleReply = (message) => {
    setReply(message);
  };

  // Handle edit
  const handleEdit = (messageId, currentText) => {
    startEdit(messageId, currentText);
  };

  // Handle delete
  const handleDelete = async (messageId, permanent = false) => {
    await deleteMsg(messageId, permanent);
  };

  // Handle reaction
  const handleReaction = (messageId, emoji) => {
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
    ? 388 + (stackIndex * 340) // 364px for widget + 24px gap, then 340px per chat
    : 'auto';
  
  const leftOffset = position === 'bottom-left'
    ? 388 + (stackIndex * 340)
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
            {staff?.profile_image_url ? (
              <img src={staff.profile_image_url} alt={staff.full_name} />
            ) : (
              <div className="chat-window-popup__avatar-placeholder">
                {staff?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            {staff?.is_on_duty && (
              <span className="chat-window-popup__online-dot" />
            )}
          </div>
          
          <div className="chat-window-popup__staff-info">
            <h4 className="chat-window-popup__staff-name">
              {staff?.full_name || 'Chat'}
            </h4>
            {staff?.role && (
              <p className="chat-window-popup__staff-role">
                {staff.role.name}
              </p>
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
                            onEdit={() => handleEdit(message.id, messageText)}
                            onDelete={(msgId, permanent) => handleDelete(msgId, permanent)}
                            onHardDelete={(msgId, permanent) => handleDelete(msgId, permanent)}
                          />

                          <div style={{ position: 'relative' }}>
                            <MessageBubble
                              message={messageText}
                              timestamp={messageTime}
                              isOwn={isOwn}
                              senderName={senderName}
                              replyTo={message.reply_to}
                              isEdited={message.is_edited}
                              attachments={message.attachments}
                              isEditing={isEditing(message.id)}
                              onSaveEdit={(newText) => saveEdit(newText)}
                              onCancelEdit={cancelEdit}
                            />

                            {/* Add Reaction Button */}
                            <button
                              onClick={() => setShowReactionPicker(
                                showReactionPicker === message.id ? null : message.id
                              )}
                              className="staff-chat-message__action-btn"
                              style={{
                                position: 'absolute',
                                bottom: '-10px',
                                right: isOwn ? 'auto' : '8px',
                                left: isOwn ? '8px' : 'auto'
                              }}
                              title="Add reaction"
                            >
                              <i className="bi bi-emoji-smile"></i>
                            </button>

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

                            {/* Reactions List */}
                            <ReactionsList
                              reactions={message.reactions || []}
                              currentUserId={currentUserId}
                              onReactionClick={(emoji, wasUserReaction) => 
                                handleReactionClick(message.id, emoji, wasUserReaction)
                              }
                            />
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
              disabled={sending}
              placeholder="Type a message..."
            />
          </div>
        </>
      )}
    </div>
  );
};

ChatWindowPopup.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  conversation: PropTypes.shape({
    id: PropTypes.number.isRequired,
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
