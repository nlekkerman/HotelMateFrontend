import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '@/context/AuthContext';
import { fetchMessages, sendMessage, uploadFiles, markConversationAsRead } from '../services/staffChatApi';
import { useStaffChat } from '../context/StaffChatContext';
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
import { subscribeToStaffChatConversation } from '../../realtime/channelRegistry';
import { useChatState, useChatDispatch } from '@/realtime/stores/chatStore.jsx';
import { CHAT_ACTIONS } from '@/realtime/stores/chatActions.js';

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
  
  // Get event subscription from StaffChatContext
  const { subscribeToMessages } = useStaffChat();
  
  // ✅ FIX: Get current user ID from auth context instead of localStorage
  const { user } = useAuth();
  const currentUserId = user?.staff_id || user?.id || null;
  
  // Debug: Log current user info
  // Current user data loaded
  
  // ✅ UNIFIED: Use chatStore for messages (single source of truth)
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();
  const messages = chatState.conversationsById[conversation?.id]?.messages || [];
  const storeConversation = conversation?.id ? chatState.conversationsById[conversation.id] : null;
  const conversationData = useMemo(() => {
    if (!conversation && !storeConversation) {
      return {};
    }
    const base = conversation || {};
    const store = storeConversation || {};
    return {
      ...base,
      ...store,
      participants: store.participants || base.participants || [],
      title: store.title ?? base.title,
      is_group: store.is_group ?? base.is_group,
    };
  }, [conversation, storeConversation]);
  const participants = conversationData.participants || [];

  // For 1-on-1 chats, if staff prop is not provided or is the current user,
  // find the other participant from the conversation
  let displayStaff = staff;
  if (!conversationData?.is_group && participants.length > 0) {
    // Find the participant who is NOT the current user
    const otherParticipant = participants.find(
      p => Number(p.id) !== Number(currentUserId)
    );
    
    // If we found a different participant and either:
    // 1. No staff prop was provided, OR
    // 2. The staff prop is actually the current user (wrong!)
    if (otherParticipant && (!staff || Number(staff.id) === Number(currentUserId))) {
      // console.log('🔄 Correcting staff display - using other participant:', otherParticipant.full_name);
      displayStaff = otherParticipant;
    }
  }
  
  // Initialize conversation messages if needed
  useEffect(() => {
    if (conversation?.id && messages.length === 0) {
      // Load initial messages into chatStore
      const loadMessages = async () => {
        try {
          console.log('📥 Loading messages for conversation:', conversation.id);
          const response = await fetchMessages(hotelSlug, conversation.id, 20, null);
          const fetchedMessages = response.messages || response.results || response || [];
          
          chatDispatch({
            type: CHAT_ACTIONS.INIT_MESSAGES_FOR_CONVERSATION,
            payload: {
              conversationId: conversation.id,
              messages: fetchedMessages
            }
          });
          
          console.log('✅ Loaded', fetchedMessages.length, 'messages into chatStore');
        } catch (error) {
          console.error('❌ Failed to load messages:', error);
        }
      };
      
      loadMessages();
    }
  }, [conversation?.id, messages.length, hotelSlug, chatDispatch]);

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
    // ✅ UNIFIED: Reactions updated via chatStore through realtime events
    console.log('🎯 Reaction updated - handled via chatStore realtime');
  });

  // Use edit message hook
  const {
    startEdit,
    cancelEdit,
    saveEdit,
    isEditing,
    editingMessageId
  } = useEditMessage(hotelSlug, conversation?.id, (messageId, updatedData) => {
    // ✅ UNIFIED: Message edits updated via chatStore through realtime events
    console.log('✏️ Message edit updated - handled via chatStore realtime');
  });

  // Use delete message hook with proper callback
  const {
    deleteMsg,
    deleting: isDeletingMessage
  } = useDeleteMessage(hotelSlug, conversation?.id, (messageId, hardDelete, result) => {
    // ✅ UNIFIED: All message deletions handled via chatStore through realtime events
    console.log('🗑️ Message deletion completed - handled via chatStore realtime:', { messageId, hardDelete });
      
      // Verify the update
      setTimeout(() => {
        const updatedMessages = messages.find(m => m.id === messageId);
        // console.log('🗑️ Message after update:', updatedMessages);
      }, 100);
  });

  // Use read receipts hook
  const {
    markConversationRead,
    getReadStatus,
    isRead,
    readReceipts,
    updateFromRealtimeEvent: updateReadReceipts,
    loadReadReceipts
  } = useReadReceipts(hotelSlug, conversation?.id, currentUserId);

  // Load read receipts from messages on initial load (CRITICAL!)
  useEffect(() => {
    if (messages.length > 0) {
      console.log('📖📖📖 [POPUP LOAD] Loading read receipts from messages on initial load');
      console.log('📖 [POPUP LOAD] Messages count:', messages.length);
      console.log('📖 [POPUP LOAD] Sample message read data:', messages[0]?.read_by_count, messages[0]?.read_by_list);
      console.log('📖 [POPUP LOAD] All messages read data:', messages.map(m => ({
        id: m.id,
        text: m.message_text?.substring(0, 20) + '...',
        read_by_count: m.read_by_count,
        read_by_list: m.read_by_list,
        is_read_by_current_user: m.is_read_by_current_user
      })));
      loadReadReceipts(messages);
      console.log('✅ [POPUP LOAD] Read receipts loaded from messages');
    }
  }, [messages.length, loadReadReceipts]); // Include loadReadReceipts in dependencies

  // Sync readReceipts state changes to messages array (CRITICAL FOR UI UPDATES!)
  useEffect(() => {
    const receiptKeys = Object.keys(readReceipts);
    if (receiptKeys.length === 0) return;
    
    console.log('🔄🔄🔄 [POPUP SYNC] readReceipts state changed, syncing to messages array');
    console.log('🔄 [POPUP SYNC] readReceipts keys:', receiptKeys);
    console.log('🔄 [POPUP SYNC] Current messages count:', messages.length);
    
    // Batch update all messages with new read receipts
    const messageIdsToUpdate = receiptKeys.map(Number);
    console.log('🔄 [POPUP SYNC] Message IDs to update:', messageIdsToUpdate);
    
    let updatedCount = 0;
    messageIdsToUpdate.forEach((msgId) => {
      const receipt = readReceipts[msgId];
      const message = messages.find(m => m.id === msgId);
      
      if (receipt && message) {
        // Only update if values actually changed
        const needsUpdate = message.read_by_count !== receipt.read_count;
        
        if (needsUpdate) {
          console.log(`🔄 [POPUP SYNC] Updating message ${msgId}:`, {
            oldCount: message.read_by_count,
            newCount: receipt.read_count,
            oldList: message.read_by_list?.length,
            newList: receipt.read_by?.length
          });
          
          // ✅ UNIFIED: Read receipts are handled by chatStore via realtime events
          // No need to manually update message state - chatStore handles this automatically
          updatedCount++;
        }
      }
    });
    
    console.log(`✅ [POPUP SYNC] Found ${updatedCount} messages with read receipts`);
  }, [readReceipts, messages]);

  // Subscribe to messages from StaffChatContext (single source of truth!)
  useEffect(() => {
    if (!conversation?.id) {
      console.log('⚠️ [ChatWindowPopup] No conversation ID');
      return;
    }

    console.log('🎯 [ChatWindowPopup] Subscribing to StaffChatContext messages for conversation:', conversation.id);

    // Listen to messages broadcasted by StaffChatContext
    const unsubscribe = subscribeToMessages((message) => {
      // Only process messages for this conversation
      if (message.conversation === conversation.id || message.conversation_id === conversation.id) {
        console.log('📨 [ChatWindowPopup] Received message for this conversation via chatStore');
        // Messages automatically appear via chatStore
        scrollToBottom();
      }
    });

    console.log('✅ [ChatWindowPopup] Subscribed to StaffChatContext message events');

    // Cleanup
    return () => {
      console.log('🧹 [ChatWindowPopup] Unsubscribing from StaffChatContext');
      unsubscribe();
    };
  }, [conversation?.id, subscribeToMessages]);

  // Subscribe to centralized realtime system for read receipts and new messages
  useEffect(() => {
    if (!hotelSlug || !conversation?.id) {
      console.warn('⚠️ [POPUP REALTIME] Missing required data for subscription');
      return;
    }

    console.log('🔔 [POPUP REALTIME] Subscribing to conversation via centralized system');

    // Use the centralized subscription
    const cleanup = subscribeToStaffChatConversation(hotelSlug, conversation.id);
    
    // The events will be automatically routed to chatStore via eventBus
    // Read receipts will be handled by the centralized system
    console.log('✅ [POPUP REALTIME] Subscribed to staff chat conversation');

    // Return cleanup function
    return cleanup;
  }, [hotelSlug, conversation?.id]);

  // Subscribe to staff chat events for useReadReceipts hook
  useEffect(() => {
    if (!hotelSlug || !conversation?.id) return;

    console.log('📋 [READ RECEIPTS] Setting up direct event listener for useReadReceipts');
    
    // Listen to chatStore events to also update useReadReceipts hook
    const handleStoreEvent = (event) => {
      if (event.detail?.type === 'STAFF_CHAT_READ_RECEIPT_RECEIVED') {
        const { conversationId, staffId, staffName, messageIds, timestamp } = event.detail.payload;
        
        // Only handle events for this conversation
        if (conversationId === conversation.id) {
          console.log('📋 [READ RECEIPTS] Received read receipt event for conversation:', conversationId);
          
          // Update useReadReceipts hook state
          if (updateReadReceipts) {
            updateReadReceipts({
              staffId,
              staffName,
              messageIds,
              timestamp
            });
          }
        }
      }
    };

    // Add event listener for chatStore events
    window.addEventListener('chatStoreEvent', handleStoreEvent);

    return () => {
      window.removeEventListener('chatStoreEvent', handleStoreEvent);
    };
  }, [hotelSlug, conversation?.id, updateReadReceipts]);

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

  // Mark ALL messages as read when popup opens with messages
  useEffect(() => {
    if (conversation?.id && messages.length > 0 && !isMinimized) {
      console.log('🎯🎯🎯 [POPUP MARK ALL] Popup opened with messages, marking ALL as read');
      console.log('🎯 [POPUP MARK ALL] Conversation ID:', conversation.id);
      console.log('🎯 [POPUP MARK ALL] Total messages:', messages.length);
      
      // Set this conversation as active to prevent notifications
      if (chatDispatch) {
        console.log('🎯 [POPUP OPEN] Setting conversation as active:', conversation.id);
        chatDispatch({
          type: CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
          payload: { conversationId: conversation.id }
        });
      }
      
      const timer = setTimeout(async () => {
        console.log('📮 [POPUP MARK ALL] Calling markConversationRead...');
        await markConversationRead();
        console.log('✅ [POPUP MARK ALL] markConversationRead completed');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [conversation?.id, messages.length, isMinimized, markConversationRead, chatDispatch]);

  // Clear active conversation when popup is minimized
  useEffect(() => {
    if (isMinimized && conversation?.id && chatDispatch) {
      console.log('🎯 [POPUP MINIMIZE] Clearing active conversation:', conversation.id);
      chatDispatch({
        type: CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
        payload: { conversationId: null }
      });
    }
  }, [isMinimized, conversation?.id, chatDispatch]);

  // ✅ UNIFIED: Infinite scroll removed - chatStore loads messages automatically via API
  // No need for infinite scroll with unified architecture

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isMinimized && messages.length > 0) {
      scrollToBottom();
      
      // Mark ALL messages as read when new messages arrive and popup is visible
      console.log('👁️ [POPUP MARK ALL] New messages arrived, marking ALL as read');
      const timer = setTimeout(async () => {
        console.log('📮 [POPUP MARK ALL] Calling markConversationRead...');
        await markConversationRead();
        console.log('✅ [POPUP MARK ALL] markConversationRead completed');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, isMinimized, markConversationRead]);

  // Handle send message
  const handleSendMessage = async (messageText, mentions) => {
    // If files are selected, upload them instead
    if (selectedFiles.length > 0) {
      await handleUploadFiles(messageText);
      return;
    }

    // The useSendMessage hook only expects messageText - replyTo is handled internally
    const sentMessage = await sendMsg(messageText);
    if (sentMessage) {
      console.log('📤 Raw message from API:', sentMessage);
      
      // Ensure the message has the correct timestamp field
      const normalizedMessage = {
        ...sentMessage,
        timestamp: sentMessage.timestamp || sentMessage.created_at || new Date().toISOString()
      };
      
      console.log('📤 Normalized message:', normalizedMessage);
      
      // ✅ Immediately add message to chatStore for instant feedback
      chatDispatch({
        type: CHAT_ACTIONS.RECEIVE_MESSAGE,
        payload: {
          message: normalizedMessage,
          conversationId: conversation.id
        }
      });
      
      console.log('📤 Message dispatched to chatStore');
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
        console.log('📤 Raw file message from API:', result.message);
        
        // Ensure the message has the correct timestamp field
        const normalizedMessage = {
          ...result.message,
          timestamp: result.message.timestamp || result.message.created_at || new Date().toISOString()
        };
        
        // ✅ Immediately add message to chatStore for instant feedback
        chatDispatch({
          type: CHAT_ACTIONS.RECEIVE_MESSAGE,
          payload: {
            message: normalizedMessage,
            conversationId: conversation.id
          }
        });
        
        console.log('📤 File message dispatched to chatStore');
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

  // Mark ALL messages as read when user focuses input (handles new messages while popup was open)
  const handleInputFocus = async () => {
    console.log('🎯🎯🎯 [POPUP MARK ALL] Input focused, marking ALL messages as read');
    console.log('🎯 [POPUP MARK ALL] This handles new messages received while popup was open');
    console.log('🎯 [POPUP MARK ALL] Current messages count:', messages.length);
    
    // Set this conversation as active to prevent notifications
    if (conversation?.id && chatDispatch) {
      console.log('🎯 [POPUP FOCUS] Setting conversation as active:', conversation.id);
      chatDispatch({
        type: CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
        payload: { conversationId: conversation.id }
      });
    }
    
    console.log('📮 [POPUP MARK ALL] Calling markConversationRead...');
    await markConversationRead();
    console.log('✅ [POPUP MARK ALL] markConversationRead completed');
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
              {conversationData?.title || displayStaff?.full_name || 'Chat'}
            </h4>
            {conversationData?.is_group ? (
              <p className="chat-window-popup__staff-role">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowParticipantsModal(true);
                  }}
                  className="chat-window-popup__participants-btn"
                >
                  <i className="bi bi-people-fill me-1"></i>
                  {participants.length || 0} participants
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
            {/* ✅ UNIFIED: No pagination UI needed - chatStore loads messages automatically */}
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
                      
                      // USE LIVE readReceipts STATE FOR REAL-TIME UPDATES!
                      const receipt = readReceipts[message.id];
                      const readByList = receipt?.read_by || message.read_by_list || [];
                      const readByCount = receipt?.read_count ?? message.read_by_count ?? 0;
                      
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
                              isSending={sending && message.id === messages[messages.length - 1]?.id}
                              readByList={readByList}
                              readByCount={readByCount}
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
                            <>
                              {/* Debug log for read status values */}
                              {console.log(`[READ DEBUG] Message ${message.id}:`, {
                                receipt: receipt,
                                readByList: readByList,
                                readByCount: readByCount,
                                isRead: readByCount > 0
                              })}
                              <ReadStatus
                                isRead={readByCount > 0}
                                readBy={readByList}
                                showDetails={true}
                                size="small"
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
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
              onFocus={handleInputFocus}
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
        participants={participants}
        currentUserId={currentUserId}
        groupTitle={conversationData?.title}
        conversationId={conversationData?.id}
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
