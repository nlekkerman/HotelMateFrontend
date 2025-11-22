import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { fetchMessages, sendMessage, uploadFiles, deleteMessage, deleteAttachment } from '../services/staffChatApi';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import MessageActions from './MessageActions';
import ShareMessageModal from './ShareMessageModal';
import ReactionPicker from './ReactionPicker';
import ReactionsList from './ReactionsList';
import ParticipantsModal from './ParticipantsModal';
import useReadReceipts from '../hooks/useReadReceipts';
import { useStaffChat } from '../context/StaffChatContext';

/**
 * ConversationView Component
 * Displays messages and allows sending new messages in a conversation
 * Auto-marks messages as read when scrolled into view
 */
const ConversationView = ({ hotelSlug, conversation, staff, currentUser }) => {
  console.log('🎬 [CONVERSATION VIEW] Component rendered/updated with:', {
    hotelSlug,
    conversationId: conversation?.id,
    conversationTitle: conversation?.title,
    staffId: currentUser?.id || currentUser?.staff_id,
    timestamp: new Date().toISOString()
  });
  
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
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef(null);

  // Get current user ID from localStorage or props
  const currentUserData = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUserData?.staff_id || currentUserData?.id || null;

  // Read receipts management
  const {
    readReceipts,
    markConversationRead,
    updateFromRealtimeEvent: updateReadReceipts,
    loadReadReceipts
  } = useReadReceipts(hotelSlug, conversation?.id, currentUserId);

  // Get Pusher instance from StaffChatContext
  const { pusherInstance, setCurrentConversationId } = useStaffChat();

  // Real-time Pusher integration - direct channel subscription
  useEffect(() => {
    console.log('🔄 [PUSHER EFFECT] Running Pusher subscription effect:', {
      hasPusherInstance: !!pusherInstance,
      pusherState: pusherInstance?.connection?.state,
      hotelSlug,
      conversationId: conversation?.id
    });
    
    if (!pusherInstance || !hotelSlug || !conversation?.id) {
      console.warn('⚠️ [PUSHER EFFECT] Missing required data, skipping subscription');
      return;
    }

    const channelName = `${hotelSlug}-staff-conversation-${conversation.id}`;
    console.log('📡 [STAFF-TO-STAFF] ConversationView subscribing to:', channelName);
    console.log('📡 [STAFF-TO-STAFF] ⚠️ IMPORTANT: This is STAFF-TO-STAFF (NO -chat suffix!)');
    console.log('📡 [STAFF-TO-STAFF] Hotel:', hotelSlug);
    console.log('📡 [STAFF-TO-STAFF] Conversation ID:', conversation.id);
    console.log('📡 [STAFF-TO-STAFF] Pusher connection state:', pusherInstance.connection.state);
    console.log('📡 [STAFF-TO-STAFF] Pusher socket ID:', pusherInstance.connection.socket_id);
    
    // Get or subscribe to channel
    let channel = pusherInstance.channel(channelName);
    if (!channel) {
      channel = pusherInstance.subscribe(channelName);
    }

    // Handle new messages
    const handleNewMessage = (data) => {
      console.log('📨 [STAFF CHAT] ==================== NEW MESSAGE EVENT ====================');
      console.log('📨 [STAFF CHAT] Raw event data:', JSON.stringify(data, null, 2));
      console.log('📨 [STAFF CHAT] Message details:', {
        id: data.id,
        message: data.message || data.content,
        sender_id: data.sender?.id || data.sender_id,
        sender_name: data.sender?.full_name || data.sender_name,
        conversation_id: data.conversation_id,
        timestamp: data.timestamp || data.created_at,
        has_attachments: !!data.attachments?.length
      });
      
      // Check if message already exists
      setMessages(prev => {
        console.log('📨 [STAFF CHAT] ===== ADDING MESSAGE TO UI =====');
        console.log('📨 [STAFF CHAT] Current messages in state:', prev.length);
        console.log('📨 [STAFF CHAT] Current message IDs:', prev.map(m => m.id));
        console.log('📨 [STAFF CHAT] New message ID:', data.id);
        
        const exists = prev.some(m => m.id === data.id);
        if (exists) {
          console.log('⚠️ [STAFF CHAT] Message already exists, skipping. Message ID:', data.id);
          return prev;
        }
        
        console.log('✅ [STAFF CHAT] Message does NOT exist - ADDING TO UI');
        console.log('✅ [STAFF CHAT] Message content:', data.message || data.content);
        const newMessages = [...prev, data];
        console.log('✅ [STAFF CHAT] New total messages:', newMessages.length);
        console.log('✅ [STAFF CHAT] Updated message IDs:', newMessages.map(m => m.id));
        console.log('✅ [STAFF CHAT] Last 3 messages:', newMessages.slice(-3).map(m => ({ 
          id: m.id, 
          text: (m.message || m.content)?.substring(0, 30),
          sender: m.sender_name || m.sender_info?.full_name
        })));
        console.log('📨 [STAFF CHAT] ===== END ADDING MESSAGE =====');
        
        return newMessages;
      });
      
      console.log('📨 [STAFF CHAT] Scrolling to bottom...');
      scrollToBottom();
    };

    // Handle message edited
    const handleMessageEdited = (data) => {
      console.log('✏️ [STAFF CHAT] Message edited:', data);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.id ? { ...msg, ...data, is_edited: true } : msg
        )
      );
    };

    // Handle message deleted
    const handleMessageDeleted = (data) => {
      console.log('🗑️ [STAFF CHAT] Message deleted:', data);
      if (data.hard_delete) {
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === data.message_id
              ? { ...msg, is_deleted: true, message: data.message?.message || '[Message deleted]' }
              : msg
          )
        );
      }
    };

    // Handle read receipts
    const handleReadReceipt = (data) => {
      console.log('📖📖📖 [READ RECEIPT EVENT] ===========================================');
      console.log('📖 [READ RECEIPT EVENT] Pusher event received at:', new Date().toISOString());
      console.log('📖 [READ RECEIPT EVENT] Raw data:', JSON.stringify(data, null, 2));
      console.log('📖 [READ RECEIPT EVENT] Data type:', typeof data);
      console.log('📖 [READ RECEIPT EVENT] Has message_ids:', !!data.message_ids);
      console.log('📖 [READ RECEIPT EVENT] Message IDs:', data.message_ids);
      console.log('📖 [READ RECEIPT EVENT] Staff ID who read:', data.staff_id);
      console.log('📖 [READ RECEIPT EVENT] Staff name:', data.staff_name);
      console.log('📖 [READ RECEIPT EVENT] Timestamp:', data.timestamp);
      console.log('📖 [READ RECEIPT EVENT] Current conversation ID:', conversation?.id);
      console.log('📖 [READ RECEIPT EVENT] Current messages count:', messages.length);
      console.log('📖 [READ RECEIPT EVENT] ===========================================');
      
      console.log('🔄 [READ RECEIPT EVENT] Calling updateReadReceipts from useReadReceipts hook...');
      updateReadReceipts(data);
      console.log('✅ [READ RECEIPT EVENT] updateReadReceipts completed');
      
      // Update message list with new read counts
      console.log('🔄 [READ RECEIPT EVENT] Updating messages state...');
      setMessages(prevMessages => {
        console.log('📝 [READ RECEIPT STATE] Previous messages count:', prevMessages.length);
        console.log('📝 [READ RECEIPT STATE] Message IDs to update:', data.message_ids);
        
        const updatedMessages = prevMessages.map((msg, index) => {
          if (data.message_ids && data.message_ids.includes(msg.id)) {
            console.log(`✅ [READ RECEIPT STATE] Found message ${msg.id} to update (index ${index})`);
            const alreadyReadBy = msg.read_by_list || [];
            console.log(`   Current read_by_list:`, alreadyReadBy);
            console.log(`   Current read_by_count:`, msg.read_by_count);
            
            const alreadyRead = alreadyReadBy.some(r => r.id === data.staff_id);
            console.log(`   Already read by staff ${data.staff_id}?`, alreadyRead);
            
            if (!alreadyRead) {
              console.log(`   ➕ Adding new read receipt for staff ${data.staff_id}`);
              const updated = {
                ...msg,
                read_by_count: (msg.read_by_count || 0) + 1,
                read_by_list: [
                  ...alreadyReadBy,
                  {
                    id: data.staff_id,
                    name: data.staff_name,
                    timestamp: data.timestamp
                  }
                ]
              };
              console.log(`   New read_by_count:`, updated.read_by_count);
              console.log(`   New read_by_list:`, updated.read_by_list);
              return updated;
            } else {
              console.log(`   ⚠️ Staff already read this message, not updating`);
            }
          }
          return msg;
        });
        
        console.log('📝 [READ RECEIPT STATE] Messages update complete');
        console.log('📝 [READ RECEIPT STATE] Updated messages count:', updatedMessages.length);
        return updatedMessages;
      });
      
      console.log('✅✅✅ [READ RECEIPT EVENT] handleReadReceipt completed ===========================================');
    };

    // Handle attachment deleted
    const handleAttachmentDeleted = (data) => {
      console.log('📎 [STAFF CHAT] Attachment deleted:', data);
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === data.message_id) {
            return {
              ...msg,
              attachments: (msg.attachments || []).filter(att => att.id !== data.attachment_id)
            };
          }
          return msg;
        })
      );
    };

    // Bind all event handlers
    console.log('🎧 [STAFF CHAT] Binding event handlers to channel:', channelName);
    channel.bind('new-message', handleNewMessage);
    console.log('🎧 [STAFF CHAT] ✓ Bound: new-message');
    channel.bind('message-edited', handleMessageEdited);
    console.log('🎧 [STAFF CHAT] ✓ Bound: message-edited');
    channel.bind('message-deleted', handleMessageDeleted);
    console.log('🎧 [STAFF CHAT] ✓ Bound: message-deleted');
    
    console.log('🎧🎧🎧 [STAFF CHAT] BINDING MESSAGES-READ EVENT...');
    console.log('🎧 [STAFF CHAT] Event name: "messages-read"');
    console.log('🎧 [STAFF CHAT] Handler function:', typeof handleReadReceipt);
    console.log('🎧 [STAFF CHAT] Channel:', channelName);
    channel.bind('messages-read', handleReadReceipt);
    console.log('🎧🎧🎧 [STAFF CHAT] ✓✓✓ BOUND: messages-read - THIS IS THE READ RECEIPT EVENT');
    
    channel.bind('attachment-deleted', handleAttachmentDeleted);
    console.log('🎧 [STAFF CHAT] ✓ Bound: attachment-deleted');

    // Listen for Pusher subscription events
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ [STAFF CHAT] Successfully subscribed to channel:', channelName);
    });
    
    channel.bind('pusher:subscription_error', (error) => {
      console.error('❌ [STAFF CHAT] Subscription error for channel:', channelName, error);
    });

    console.log('✅ [STAFF CHAT] All event handlers bound successfully');

    return () => {
      console.log('🔌 [STAFF CHAT] ConversationView cleaning up event handlers');
      channel.unbind('new-message', handleNewMessage);
      channel.unbind('message-edited', handleMessageEdited);
      channel.unbind('message-deleted', handleMessageDeleted);
      channel.unbind('messages-read', handleReadReceipt);
      channel.unbind('attachment-deleted', handleAttachmentDeleted);
    };
  }, [pusherInstance, hotelSlug, conversation?.id, updateReadReceipts]);

  // Debug: Log replyTo state changes
  useEffect(() => {
    // console.log('🔔 ConversationView - replyTo state changed:', replyTo);
  }, [replyTo]);
  
  // Check if user is manager/admin
  const isManagerOrAdmin = currentUserData?.role === 'manager' || currentUserData?.role === 'admin';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (conversation?.id) {
      setCurrentConversationId(conversation.id);
      loadMessages();
    }
    return () => {
      setCurrentConversationId(null);
    };
  }, [conversation?.id, setCurrentConversationId]);

  // Mark conversation as read when conversation is opened
  useEffect(() => {
    if (conversation?.id && messages.length > 0) {
      console.log('✅ [READ RECEIPTS] Conversation opened, marking as read:', conversation.id);
      // Small delay to ensure messages are loaded
      const timer = setTimeout(() => {
        markConversationRead();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [conversation?.id, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-mark as read when last message is visible
  useEffect(() => {
    if (!lastMessageRef.current || messages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // User scrolled to bottom, mark conversation as read
          //
          markConversationRead();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(lastMessageRef.current);

    return () => observer.disconnect();
  }, [messages.length, markConversationRead]);

  const loadMessages = async () => {
    if (!conversation?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchMessages(hotelSlug, conversation.id);
      const messageList = Array.isArray(data) ? data : data.results || [];
      setMessages(messageList);
      
      // Load read receipts from message data
      loadReadReceipts(messageList);
    } catch (err) {
      setError(err.message);
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark as read when user clicks on input field
  const handleInputFocus = () => {
    console.log('🎯 [READ RECEIPTS] Input focused, marking conversation as read');
    markConversationRead();
  };

  const handleSendMessage = async (messageText, mentions) => {
    console.log('📤 [SEND MESSAGE] Starting message send:', {
      messageText: messageText?.substring(0, 50),
      hasFiles: selectedFiles.length > 0,
      fileCount: selectedFiles.length,
      conversationId: conversation?.id,
      replyToId: replyTo?.id,
      currentUserId
    });
    
    if ((!messageText.trim() && selectedFiles.length === 0) || sending) {
      console.warn('⚠️ [SEND MESSAGE] Cannot send - empty or already sending');
      return;
    }

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
      console.log('✅ [SEND MESSAGE] Message sent successfully:', {
        messageId: result.message?.id || result.id,
        hasMessage: !!result.message,
        hasId: !!result.id
      });
      
      if (result.message) {
        console.log('📝 [SEND MESSAGE] Adding result.message to UI:', result.message.id);
        setMessages(prev => {
          console.log('📝 [SEND MESSAGE] Previous count:', prev.length);
          const newMessages = [...prev, result.message];
          console.log('📝 [SEND MESSAGE] New count:', newMessages.length);
          return newMessages;
        });
      } else if (result.id) {
        console.log('📝 [SEND MESSAGE] Adding result to UI:', result.id);
        setMessages(prev => {
          console.log('📝 [SEND MESSAGE] Previous count:', prev.length);
          const newMessages = [...prev, result];
          console.log('📝 [SEND MESSAGE] New count:', newMessages.length);
          return newMessages;
        });
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
    //
    //
    // console.log('🔄 Reply button clicked, message object:', message);
    // console.log('🔄 Message type:', typeof message);
    // console.log('🔄 Message ID:', message?.id);
    // console.log('🔄 Message text:', message?.message || message?.content);
    // console.log('🔄 Sender info:', message?.sender, message?.sender_info);
    // console.log('🔄 Sender name:', message?.sender_name);
    
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
    };
    
    // console.log('🔄 Setting replyTo state to:', replyMessage);
    //
    setReplyTo(replyMessage);
  };

  const handleCancelReply = () => {
    //
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
              
              // Get read receipt info
              // Priority: readReceipts state > message data
              const hookReadData = readReceipts[message.id];
              const readStatus = {
                read_by: hookReadData?.read_by || message.read_by_list || [],
                read_count: hookReadData?.read_count || message.read_by_count || 0
              };
              
              // Debug log for message render
              if (isOwn) {
                console.log(`🎨 [UI RENDER] Message ${message.id}:`, {
                  text: (message.message || message.content || '').substring(0, 30),
                  hookData: hookReadData,
                  messageData: { read_by_list: message.read_by_list, read_by_count: message.read_by_count },
                  finalReadStatus: readStatus,
                  willShowAsSeen: readStatus.read_count > 0
                });
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
                    readByList={readStatus.read_by}
                    readByCount={readStatus.read_count}
                    onSaveEdit={(newText) => {
                      // Handle edit save (you can implement editMessage API call)
                      setEditingMessageId(null);
                    }}
                    onCancelEdit={() => setEditingMessageId(null)}
                    onReply={() => {
                      //
                      // console.log('📣 Message ID:', message.id);
                      // console.log('📣 Full message object:', message);
                      handleReply(message);
                    }}
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
        disabled={sending}
        placeholder={`Message ${staff?.full_name || 'staff member'}...`}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
        onFileSelect={handleFileSelect}
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
        canManageParticipants={true}
        onParticipantRemoved={(participantId) => {
          // console.log('✅ Participant removed:', participantId);
          // Reload messages to reflect changes
          loadMessages();
        }}
        onLeaveGroup={(convId) => {
          // console.log('✅ Left group:', convId);
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
