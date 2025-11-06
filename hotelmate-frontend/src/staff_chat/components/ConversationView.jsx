import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { fetchMessages, sendMessage, uploadFiles, deleteMessage, deleteAttachment } from '../services/staffChatApi';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import MessageActions from './MessageActions';
import ShareMessageModal from './ShareMessageModal';
import ReactionPicker from './ReactionPicker';
import ReactionsList from './ReactionsList';

/**
 * ConversationView Component
 * Displays messages and allows sending new messages in a conversation
 */
const ConversationView = ({ hotelSlug, conversation, staff, currentUser }) => {
  const [messages, setMessages] = useState([]);
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
  const messagesEndRef = useRef(null);

  // Get current user ID from localStorage or props
  const currentUserData = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUserData?.staff_id || currentUserData?.id || null;

  // Debug: Log replyTo state changes
  useEffect(() => {
    console.log('🔔 ConversationView - replyTo state changed:', replyTo);
  }, [replyTo]);
  
  // Check if user is manager/admin
  const isManagerOrAdmin = currentUserData?.role === 'manager' || currentUserData?.role === 'admin';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, [conversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!conversation?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchMessages(hotelSlug, conversation.id);
      setMessages(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (messageText, mentions) => {
    if ((!messageText.trim() && selectedFiles.length === 0) || sending) return;

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
      
      // Add new message to list
      if (result.message) {
        setMessages(prev => [...prev, result.message]);
      } else if (result.id) {
        setMessages(prev => [...prev, result]);
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

  const handleReply = (message) => {
    console.log('========================================');
    console.log('🔄🔄🔄 HANDLE REPLY CALLED IN CONVERSATIONVIEW 🔄🔄🔄');
    console.log('🔄 Reply button clicked, message object:', message);
    console.log('🔄 Message ID:', message?.id);
    console.log('🔄 Message text:', message?.message || message?.content);
    console.log('🔄 Setting replyTo state to:', message);
    console.log('========================================');
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    console.log('❌ Canceling reply');
    setReplyTo(null);
  };

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

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleShare = (message) => {
    setMessageToShare(message);
    setShowShareModal(true);
  };

  const handleDelete = async (messageId, hardDelete = false) => {
    const confirmText = hardDelete 
      ? 'Permanently delete this message? This cannot be undone.'
      : 'Delete this message?';
    
    if (!confirm(confirmText)) return;

    setDeleting(true);
    
    try {
      const result = await deleteMessage(hotelSlug, messageId, hardDelete);
      
      if (result.hard_delete) {
        // Hard delete - remove from UI
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        // Soft delete - update to show deleted state
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, is_deleted: true, message: result.message.message }
            : msg
        ));
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Delete this file?')) return;

    try {
      const result = await deleteAttachment(hotelSlug, attachmentId);
      
      // Update message to remove attachment
      setMessages(prev => prev.map(msg => {
        if (msg.id === result.message_id) {
          return {
            ...msg,
            attachments: (msg.attachments || []).filter(att => att.id !== attachmentId)
          };
        }
        return msg;
      }));
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

  return (
    <div className="conversation-view__content">
      <div className="conversation-view__messages">
        {messages.length === 0 ? (
          <div className="conversation-view__empty">
            <div className="empty-icon">💬</div>
            <h3>No messages yet</h3>
            <p>Start the conversation with {staff?.full_name}</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              // Determine sender ID - handle various API response formats
              const senderId = message.sender?.id || Number(message.sender) || message.sender_id;
              const userId = Number(currentUserId);
              const isOwn = senderId === userId;
              
              // Get sender name
              const senderName = message.sender?.first_name || 
                               message.sender?.full_name || 
                               message.sender_info?.full_name ||
                               'User';
              
              // Create the reply handler for this specific message
              const replyHandler = () => {
                console.log('📣 onReply handler called for message ID:', message.id);
                handleReply(message);
              };
              
              return (
                <div
                  key={message.id}
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
                    onSaveEdit={(newText) => {
                      // Handle edit save (you can implement editMessage API call)
                      setEditingMessageId(null);
                    }}
                    onCancelEdit={() => setEditingMessageId(null)}
                    onReply={replyHandler}
                    onReaction={() => setShowReactionPicker(message.id)}
                    onShare={() => handleShare(message)}
                    onDelete={isOwn || isManagerOrAdmin ? () => handleDelete(message.id, false) : null}
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
                      canDelete={isOwn}
                      canHardDelete={isManagerOrAdmin}
                      onEdit={() => setEditingMessageId(message.id)}
                      onDelete={() => handleDelete(message.id, false)}
                      onHardDelete={() => handleDelete(message.id, true)}
                      onReply={() => handleReply(message)}
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
        disabled={sending}
        placeholder={`Message ${staff?.full_name || 'staff member'}...`}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
        onFileSelect={handleFileSelect}
        selectedFiles={selectedFiles}
        onRemoveFile={handleRemoveFile}
        showMentionSuggestions={true}
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
            console.log('✅ Message forwarded, refreshing messages');
            // Reload messages to show the forwarded message immediately
            await loadMessages();
          }}
        />
      )}
    </div>
  );
};

ConversationView.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  conversation: PropTypes.shape({
    id: PropTypes.number.isRequired,
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
