import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import { useAuth } from "@/context/AuthContext";
import {
  fetchMessages,
  sendMessage,
  uploadFiles,
  markConversationAsRead,
} from "../services/staffChatApi";
// ✅ UNIFIED: No legacy useStaffChat needed - using chatStore directly
import MessageInput from "./MessageInput";
import MessageBubble from "./MessageBubble";
import MessageActions from "./MessageActions";
import ReactionPicker from "./ReactionPicker";
import ReactionsList from "./ReactionsList";
import ReadStatus from "./ReadStatus";
import ShareMessageModal from "./ShareMessageModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import SuccessModal from "./SuccessModal";
import ParticipantsModal from "./ParticipantsModal";
import useSendMessage from "../hooks/useSendMessage";
import useReactions from "../hooks/useReactions";
import useEditMessage from "../hooks/useEditMessage";
import useDeleteMessage from "../hooks/useDeleteMessage";
import useReadReceipts from "../hooks/useReadReceipts";
// ✅ UNIFIED: No individual popup subscriptions - handled globally by StaffChatContext
import { useChatState, useChatDispatch } from "@/realtime/stores/chatStore.jsx";
import { CHAT_ACTIONS } from "@/realtime/stores/chatActions.js";

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
  position = "bottom-right",
  stackIndex = 0,
  isVisible = true,
}) => {
  // ChatWindowPopup rendering

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const markedUpToRef = useRef(0);

  // Get event subscription from StaffChatContext
  // ✅ UNIFIED: Using chatStore only - no legacy useStaffChat subscriptions

  // ✅ FIX: Get current user ID from auth context instead of localStorage
  const { user } = useAuth();
  const currentUserId = user?.staff_id || user?.id || null;

  // Debug: Log current user info
  // Current user data loaded

  // Debug: Log conversation prop to check for issues

  // ✅ UNIFIED: Use chatStore for messages (single source of truth)
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();
  const messages =
    chatState.conversationsById[conversation?.id]?.messages || [];

  // Use send message hook
  const {
    send: sendMsg,
    sending,
    error: sendError,
    replyTo,
    setReply,
    cancelReply,
  } = useSendMessage(hotelSlug, conversation?.id);

  const storeConversation = conversation?.id
    ? chatState.conversationsById[conversation.id]
    : null;
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
      (p) => Number(p.id) !== Number(currentUserId)
    );

    // If we found a different participant and either:
    // 1. No staff prop was provided, OR
    // 2. The staff prop is actually the current user (wrong!)
    if (
      otherParticipant &&
      (!staff || Number(staff.id) === Number(currentUserId))
    ) {
      displayStaff = otherParticipant;
    }
  }

  // Initialize conversation messages if needed
  useEffect(() => {
    if (conversation?.id) {
      const loadMessages = async () => {
        try {
          const response = await fetchMessages(
            hotelSlug,
            conversation.id,
            100, // Increased from 20 to 100 to see more recent messages
            null
          );
          const fetchedMessages =
            response.messages || response.results || response || [];

          chatDispatch({
            type: CHAT_ACTIONS.INIT_MESSAGES_FOR_CONVERSATION,
            payload: {
              conversationId: conversation.id,
              messages: fetchedMessages,
            },
          });
        } catch (error) {
          console.error("❌ Failed to load messages:", error);
        }
      };

      markedUpToRef.current = 0;
      loadMessages();
    }
  }, [conversation?.id, hotelSlug, chatDispatch]);

  // Use reactions hook
  const { toggleReaction, groupReactions } = useReactions(
    hotelSlug,
    conversation?.id,
    (messageId, data) => {
      // ✅ UNIFIED: Reactions updated via chatStore through realtime events
    }
  );

  // Use edit message hook
  const { startEdit, cancelEdit, saveEdit, isEditing, editingMessageId } =
    useEditMessage(hotelSlug, conversation?.id, (messageId, updatedData) => {
      // ✅ UNIFIED: Message edits updated via chatStore through realtime events
    });

  // Use delete message hook with proper callback
  const { deleteMsg, deleting: isDeletingMessage } = useDeleteMessage(
    hotelSlug,
    conversation?.id,
    (messageId, hardDelete, result) => {
      // ✅ UNIFIED: All message deletions handled via chatStore through realtime events

      // Verify the update
      setTimeout(() => {
        const updatedMessages = messages.find((m) => m.id === messageId);
      }, 100);
    }
  );

  // Use read receipts hook
  const {
    markConversationRead,
    getReadStatus,
    isRead,
    readReceipts,
    updateFromRealtimeEvent: updateReadReceipts,
    loadReadReceipts,
  } = useReadReceipts(hotelSlug, conversation?.id, currentUserId);

  // Load read receipts from messages on initial load (CRITICAL!)
  useEffect(() => {
    if (messages.length > 0) {
      loadReadReceipts(messages);
    }
  }, [messages.length, loadReadReceipts]); // Include loadReadReceipts in dependencies

  // Sync readReceipts state changes to messages array (CRITICAL FOR UI UPDATES!)
  useEffect(() => {
    const receiptKeys = Object.keys(readReceipts);
    if (receiptKeys.length === 0) return;

    // Batch update all messages with new read receipts
    const messageIdsToUpdate = receiptKeys.map(Number);

    let updatedCount = 0;
    messageIdsToUpdate.forEach((msgId) => {
      const receipt = readReceipts[msgId];
      const message = messages.find((m) => m.id === msgId);

      if (receipt && message) {
        // Only update if values actually changed
        const needsUpdate = message.read_by_count !== receipt.read_count;

        if (needsUpdate) {
          // ✅ UNIFIED: Read receipts are handled by chatStore via realtime events
          // No need to manually update message state - chatStore handles this automatically
          updatedCount++;
        }
      }
    });
  }, [readReceipts, messages]);

  // ✅ UNIFIED: Messages come through chatStore automatically - no legacy subscriptions needed

  // ✅ UNIFIED: Global subscription handled by StaffChatContext - no individual popup subscriptions needed
  // This prevents the unsubscribe/resubscribe cycle when opening/closing popups

  // Subscribe to staff chat events for useReadReceipts hook
  useEffect(() => {
    if (!hotelSlug || !conversation?.id) return;

    // Listen to chatStore events to also update useReadReceipts hook
    const handleStoreEvent = (event) => {
      if (event.detail?.type === "STAFF_CHAT_READ_RECEIPT_RECEIVED") {
        const { conversationId, staffId, staffName, messageIds, timestamp } =
          event.detail.payload;

        // Only handle events for this conversation
        if (conversationId === conversation.id) {
          // Update useReadReceipts hook state
          if (updateReadReceipts) {
            updateReadReceipts({
              staffId,
              staffName,
              messageIds,
              timestamp,
            });
          }
        }
      }
    };

    // Add event listener for chatStore events
    window.addEventListener("chatStoreEvent", handleStoreEvent);

    return () => {
      window.removeEventListener("chatStoreEvent", handleStoreEvent);
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
  const [successMessage, setSuccessMessage] = useState("");
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mark ALL messages as read when popup opens (or un-minimizes) with messages
  useEffect(() => {
    if (conversation?.id && messages.length > 0 && !isMinimized && messages.length > markedUpToRef.current) {
      // Set this conversation as active to prevent notifications
      if (chatDispatch) {        chatDispatch({
          type: CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
          payload: { conversationId: conversation.id },
        });
      }

      const timer = setTimeout(async () => {
        await markConversationRead();
        markedUpToRef.current = messages.length;
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [
    conversation?.id,
    isMinimized,
    markConversationRead,
    chatDispatch,
  ]);

  // Clear active conversation when popup is minimized
  useEffect(() => {
    if (isMinimized && conversation?.id && chatDispatch) {
      chatDispatch({
        type: CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
        payload: { conversationId: null },
      });
    }
  }, [isMinimized, conversation?.id, chatDispatch]);

  // ✅ UNIFIED: Infinite scroll removed - chatStore loads messages automatically via API
  // No need for infinite scroll with unified architecture

  // Auto-scroll to bottom when new messages arrive + mark as read if new unreads
  useEffect(() => {
    if (!isMinimized && messages.length > 0) {
      scrollToBottom();

      // Only mark as read if there are genuinely new messages since last mark
      if (messages.length > markedUpToRef.current) {
        const timer = setTimeout(async () => {
          await markConversationRead();
          markedUpToRef.current = messages.length;
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [messages.length, isMinimized, markConversationRead]);

  // Auto-scroll to bottom when chat window opens
  useEffect(() => {
    if (!isMinimized && messages.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isMinimized, messages.length > 0]);

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
      // Ensure the message has the correct timestamp field
      const normalizedMessage = {
        ...sentMessage,
        timestamp:
          sentMessage.timestamp ||
          sentMessage.created_at ||
          new Date().toISOString(),
      };

      // Only add optimistic updates for NON-REPLY messages
      // Replies will be handled via Pusher to ensure proper original message display
      const isReply = replyTo !== null;
      
      if (!isReply) {
        // ✅ Immediately add message to chatStore for instant feedback
        chatDispatch({
          type: CHAT_ACTIONS.RECEIVE_MESSAGE,
          payload: {
            message: normalizedMessage,
            conversationId: conversation.id,
          },
        });

        scrollToBottom();
      } else {
      }
    }
  };

  // Handle file upload
  const handleUploadFiles = async (messageText = "") => {
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

      if (result.success && result.message) {
        // Ensure the message has the correct timestamp field
        const normalizedMessage = {
          ...result.message,
          timestamp:
            result.message.timestamp ||
            result.message.created_at ||
            new Date().toISOString(),
        };

        // ✅ Immediately add message to chatStore for instant feedback
        chatDispatch({
          type: CHAT_ACTIONS.RECEIVE_MESSAGE,
          payload: {
            message: normalizedMessage,
            conversationId: conversation.id,
          },
        });


        setSelectedFiles([]);
        if (replyTo) cancelReply();
        scrollToBottom();
      } else {
        console.warn("⚠️ Upload result missing success or message:", result);
      }
    } catch (error) {
      console.error("❌ Failed to upload files:", error);
      console.error("Error details:", error.response?.data || error.message);
      alert("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (files) => {
    // Validate file count
    if (files.length > 10) {
      alert("Maximum 10 files per upload");
      return;
    }

    // Validate file sizes
    const maxSize = 50 * 1024 * 1024; // 50MB
    const oversized = files.filter((f) => f.size > maxSize);
    if (oversized.length > 0) {
      alert(`File too large: ${oversized[0].name} (max 50MB)`);
      return;
    }

    setSelectedFiles(files);
  };

  // Handle file removal
  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Mark ALL messages as read when user focuses input (handles new messages while popup was open)
  const handleInputFocus = async () => {
 ;

    try {
      // Set this conversation as active to prevent notifications
      if (conversation?.id && chatDispatch) {
        chatDispatch({
          type: CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
          payload: { conversationId: conversation.id },
        });
      }

      if (conversation?.id && (conversation?.unread_count || 0) > 0) {
        await markConversationRead();
      }
    } catch (error) {
      console.error('❌ [POPUP MARK ALL] Error marking conversation as read:', error);
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

  // Handle delete - show confirmation modal
  const handleDelete = (messageId, permanent = false) => {
    const message = messages.find((m) => m.id === messageId);

    setMessageToDelete(message);
    setDeleteHard(permanent);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!messageToDelete) {
      console.error("❌ No message to delete");
      return;
    }

    const result = await deleteMsg(messageToDelete.id, deleteHard);

    if (result.success) {
      setShowDeleteConfirm(false);
      setMessageToDelete(null);
      setSuccessMessage(
        deleteHard ? "Message permanently deleted" : "Message deleted"
      );
      setShowSuccessModal(true);
    } else {
      alert(result.error || "Failed to delete message");
    }
  };

  // Handle share
  const handleShare = (message) => {
    setMessageToShare(message);
    setShowShareModal(true);
  };

  // Handle reaction
  const handleReaction = (messageId, emoji) => {
    const message = messages.find((m) => m.id === messageId);
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
  const rightOffset =
    position === "bottom-right"
      ? 364 + stackIndex * 340 // 340px for widget + 24px gap, then 340px per chat
      : "auto";

  const leftOffset =
    position === "bottom-left"
      ? 364 + stackIndex * 340 // 340px for widget + 24px gap, then 340px per chat
      : "auto";

  return (
    <div
      className={`chat-window-popup ${
        isMinimized ? "chat-window-popup--minimized" : ""
      } ${
        isVisible ? "chat-window-popup--visible" : "chat-window-popup--hidden"
      }`}
      style={{
        right: rightOffset !== "auto" ? `${rightOffset}px` : "auto",
        left: leftOffset !== "auto" ? `${leftOffset}px` : "auto",
      }}
    >
      {/* Header */}
      <div className="chat-window-popup__header" onClick={onMinimize}>
        <div className="chat-window-popup__header-content">
          <div className="chat-window-popup__avatar">
            {displayStaff?.profile_image_url ? (
              <img
                src={displayStaff.profile_image_url}
                alt={displayStaff.full_name}
              />
            ) : (
              <div className="chat-window-popup__avatar-placeholder">
                {displayStaff?.full_name?.charAt(0)?.toUpperCase() ||
                  conversation?.title?.charAt(0)?.toUpperCase() ||
                  "?"}
              </div>
            )}
            {displayStaff?.is_on_duty && (
              <span className="chat-window-popup__online-dot" />
            )}
          </div>

          <div className="chat-window-popup__staff-info">
            <div className="chat-window-popup__title-row">
              <h4 className="chat-window-popup__staff-name">
                {conversationData?.title || displayStaff?.full_name || "Chat"}
              </h4>
            </div>
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
            aria-label={isMinimized ? "Maximize" : "Minimize"}
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
          <div
            className="chat-window-popup__messages"
            ref={messagesContainerRef}
          >
            {/* ✅ UNIFIED: No pagination UI needed - chatStore loads messages automatically */}
            {messages.length === 0 ? (
              <div className="chat-window-popup__empty">
                <p>No messages yet</p>
                <p className="text-muted-small">Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const messageText = message.message || message.content || "";
                  const messageTime = message.timestamp || message.created_at;

                  // Use 'sender' field (not 'sender_id') - convert to number for comparison
                  const senderId = Number(message.sender);
                  const userId = Number(currentUserId);
                  const isOwn = senderId === userId;

                  const senderName =
                    message.sender_name ||
                    message.sender_info?.full_name ||
                    "Unknown";

                  const senderAvatar =
                    message.sender_avatar ||
                    message.sender_info?.avatar_url ||
                    null;

                  // USE LIVE readReceipts STATE FOR REAL-TIME UPDATES!
                  const receipt = readReceipts[message.id];
                  const readByList =
                    receipt?.read_by || message.read_by_list || [];
                  const readByCount =
                    receipt?.read_count ?? message.read_by_count ?? 0;

                  return (
                    <div
                      key={message.id}
                      className={`staff-chat-message ${
                        isOwn
                          ? "staff-chat-message--own"
                          : "staff-chat-message--other"
                      }`}
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
                        onDelete={(msgId, permanent) =>
                          handleDelete(msgId, permanent)
                        }
                        onHardDelete={(msgId, permanent) =>
                          handleDelete(msgId, permanent)
                        }
                        deleting={isDeletingMessage}
                      />

                      <div style={{ position: "relative" }}>
                        <MessageBubble
                          message={messageText}
                          timestamp={messageTime}
                          isOwn={isOwn}
                          senderName={senderName}
                          senderAvatar={senderAvatar}
                          replyTo={message.reply_to_message || message.reply_to}
                          isEdited={message.is_edited}
                          isDeleted={message.is_deleted}
                          attachments={message.attachments}
                          isEditing={isEditing(message.id)}
                          isSending={
                            sending &&
                            message.id === messages[messages.length - 1]?.id
                          }
                          readByList={readByList}
                          readByCount={readByCount}
                          onSaveEdit={(newText) => saveEdit(newText)}
                          onCancelEdit={cancelEdit}
                          onReply={() => handleReply(message)}
                          onReaction={() =>
                            setShowReactionPicker(
                              showReactionPicker === message.id
                                ? null
                                : message.id
                            )
                          }
                          onShare={() => handleShare(message)}
                          onDelete={
                            isOwn ? () => handleDelete(message.id, false) : null
                          }
                          reactions={
                            <ReactionsList
                              reactions={message.reactions || []}
                              currentUserId={currentUserId}
                              onReactionClick={(emoji, wasUserReaction) =>
                                handleReactionClick(
                                  message.id,
                                  emoji,
                                  wasUserReaction
                                )
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
        messagePreview={
          messageToDelete?.message || messageToDelete?.content || ""
        }
      />

      {/* Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        onHide={() => {
          //
          setShowSuccessModal(false);
          setSuccessMessage("");
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
          // The conversation will be updated via Pusher
        }}
        onLeaveGroup={(convId) => {
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
      name: PropTypes.string,
    }),
  }),
  isMinimized: PropTypes.bool.isRequired,
  onMinimize: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  position: PropTypes.oneOf(["bottom-right", "bottom-left"]),
  stackIndex: PropTypes.number,
  isVisible: PropTypes.bool,
};

export default ChatWindowPopup;
