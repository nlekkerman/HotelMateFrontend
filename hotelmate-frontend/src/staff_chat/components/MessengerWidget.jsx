import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useMessenger } from "../context/MessengerContext";
import { useStaffChat } from "../context/StaffChatContext";
import { useChatState } from "@/realtime/stores/chatStore.jsx";
import ConversationsList from "./ConversationsList";
import ChatWindowPopup from "./ChatWindowPopup";
import GroupChatModal from "./GroupChatModal";
import { useCan } from "@/rbac";
import "../staffChat.css";

/**
 * MessengerWidget Component
 * Facebook Messenger-style chat widget that floats in bottom right
 * Expands to show conversations list and allows opening multiple chat windows
 */
const MessengerWidget = ({
  position = "bottom-right",
  isExpanded: controlledExpanded,
  onExpandChange,
}) => {

  const { user, isStaff } = useAuth();

  // RBAC: authority for visibility comes from `user.rbac.staff_chat`. `isStaff`
  // is only used as a logged-in-staff-session precondition, never as authority.
  const { can } = useCan();
  const staffChatVisible = user?.rbac?.staff_chat?.visible === true;
  const canCreateConversation = can('staff_chat', 'conversation_create');

  // ✅ SIMPLIFIED: Get hotel slug - everyone in same hotel has same slug!
  const getHotelSlug = () => {
    // 1) Auth context (primary)
    if (user?.hotel_slug) {
      return user.hotel_slug;
    }

    console.warn("❌ No hotel slug found - chat will not work");
    return null;
  };

  const hotelSlug = getHotelSlug();

  

  const { registerOpenChatHandler } = useMessenger();

  const { conversations = [], markConversationRead = () => {} } =
    useStaffChat();

  // Get chat state for unread count badge
  const chatState = useChatState();

 
  // Use the backend-provided unread count from chat state
  const totalUnreadCount = useMemo(() => {
   

    // First check if backend sent a total unread override
    if (typeof chatState?.totalUnreadOverride === "number") {
    
      return chatState.totalUnreadOverride;
    }

    // Otherwise count how many conversations have unread messages (not sum of all messages)
    if (!chatState?.conversationsById) {
      return 0;
    }

    const conversationsWithUnread = Object.values(
      chatState.conversationsById
    ).filter((conversation) => {
      const unreadCount = conversation?.unread_count || 0;
      const hasUnread = unreadCount > 0;

      return hasUnread;
    }).length;

  
    return conversationsWithUnread;
  }, [chatState?.conversationsById, chatState?.totalUnreadOverride]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [internalExpanded, setInternalExpanded] = useState(false);

  // Debug logging removed to clean up console
  const [showGroupModal, setShowGroupModal] = useState(false);
  // ✅ BETTER FIX: Remove localStorage persistence - keep chat windows session-only
  // This prevents stale conversation IDs and sync issues in realtime chat
  const [openChats, setOpenChats] = useState([]);
  const [currentPage, setCurrentPage] = useState(0); // For navigating through chat groups

  // Use controlled or internal state
  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  // ✅ REMOVED: No longer persist open chats to localStorage
  // This prevents stale conversation IDs in realtime chat environment
  // Chat windows are now session-only and reset on page refresh

  // Calculate visible chats (max 3 at a time)
  const CHATS_PER_PAGE = 3;
  const totalPages = Math.ceil(openChats.length / CHATS_PER_PAGE);
  const startIndex = currentPage * CHATS_PER_PAGE;
  const endIndex = startIndex + CHATS_PER_PAGE;
  const visibleChats = openChats.slice(startIndex, endIndex);
  const hasMultiplePages = totalPages > 1;

  // Debug: Log when openChats changes
  React.useEffect(() => {
   
  }, [openChats, currentPage, totalPages]);

  // Reset to last page if current page becomes invalid
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  const handleOpenChat = async (conversation, staff) => {
    

    if (!conversation?.id) {
      console.error("❌ No conversation ID provided!");
      return;
    }

    // ✅ FIX: Additional validation - ensure conversation ID is valid
    if (
      typeof conversation.id !== "number" &&
      !Number.isInteger(parseInt(conversation.id))
    ) {
      console.error("❌ Invalid conversation ID format:", conversation.id);
      return;
    }

    // Auto-mark conversation as read when opening
    if (conversation.unread_count > 0 || conversation.unreadCount > 0) {
      try {
        await markConversationRead(conversation.id);
      } catch (error) {
        console.error(
          "❌ [MessengerWidget] Failed to mark conversation as read:",
          error
        );
      }
    }

    // Check if chat is already open
    // ✅ FIX: Ensure type consistency for conversation ID comparison
    const conversationId = parseInt(conversation.id);
    const existingChat = openChats.find(
      (chat) => parseInt(chat.conversationId) === conversationId
    );

    if (existingChat) {
      //
      // If minimized, restore it
      if (existingChat.isMinimized) {
        setOpenChats(
          openChats.map((chat) =>
            parseInt(chat.conversationId) === conversationId
              ? { ...chat, isMinimized: false }
              : chat
          )
        );
      }
    } else {
      //
      // Add new chat window (no limit, but only show 3 at a time)
      setOpenChats([
        ...openChats,
        {
          conversationId: conversationId, // ✅ FIX: Use parsed conversationId for consistency
          conversation,
          staff,
          isMinimized: false,
        },
      ]);

      // Navigate to the page with the new chat
      const newTotalChats = openChats.length + 1;
      const newLastPage = Math.ceil(newTotalChats / CHATS_PER_PAGE) - 1;
      setCurrentPage(newLastPage);

      //
    }

    // Close the widget after opening chat (both mobile and desktop)
    if (controlledExpanded !== undefined && onExpandChange) {
      onExpandChange(false);
    } else {
      setInternalExpanded(false);
    }
  };

  // Register the openChat handler so other components can open chats
  useEffect(() => {
    registerOpenChatHandler(handleOpenChat);
  }, [registerOpenChatHandler, openChats]);

  // Handle URL parameter for auto-opening conversations (mobile navigation)
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId && conversations && conversations.length > 0) {
      // Find the conversation by ID
      const targetConversation = conversations.find(
        (c) => c.id === parseInt(conversationId)
      );

      if (targetConversation) {
        // Open the conversation (this will also mark it as read)
        handleOpenChat(targetConversation, null);

        // Clear the URL parameter so it doesn't auto-open again
        setSearchParams((params) => {
          params.delete("conversation");
          return params;
        });
      } else {
        console.warn(
          "⚠️ [MessengerWidget] Conversation not found for auto-open:",
          conversationId
        );
      }
    }
  }, [searchParams, conversations, handleOpenChat, setSearchParams]);



  // Now we always have a hotelSlug, so always render the full widget

  const toggleWidget = () => {
    const newExpandedState = !isExpanded;

    // If controlled, notify parent
    if (controlledExpanded !== undefined && onExpandChange) {
      onExpandChange(newExpandedState);
    } else {
      // If uncontrolled, use internal state
      setInternalExpanded(newExpandedState);
    }
  };

  const handleMinimizeChat = (conversationId) => {
    // ✅ FIX: Ensure type consistency for conversation ID comparison
    const numericConversationId = parseInt(conversationId);
    setOpenChats(
      openChats.map((chat) =>
        parseInt(chat.conversationId) === numericConversationId
          ? { ...chat, isMinimized: !chat.isMinimized }
          : chat
      )
    );

    // Collapse the widget when minimizing/maximizing a chat
    if (controlledExpanded !== undefined && onExpandChange) {
      onExpandChange(false);
    } else {
      setInternalExpanded(false);
    }
  };

  const handleCloseChat = (conversationId) => {
    // ✅ FIX: Ensure type consistency for conversation ID comparison
    const numericConversationId = parseInt(conversationId);
    setOpenChats(
      openChats.filter(
        (chat) => parseInt(chat.conversationId) !== numericConversationId
      )
    );
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleOpenGroupModal = () => {
    // RBAC: staff_chat.conversation_create
    if (!canCreateConversation) return;
    setShowGroupModal(true);
  };

  const handleCloseGroupModal = () => {
    setShowGroupModal(false);
  };

  const handleGroupCreated = (conversation) => {

    // Open the newly created group chat
    handleOpenChat(conversation, null);

    // Close the modal
    setShowGroupModal(false);
  };

  const positionClasses = {
    "bottom-right": "messenger-widget--bottom-right",
    "bottom-left": "messenger-widget--bottom-left",
  };

  // 🚫 HIDE WIDGET FOR USERS WITHOUT staff_chat VISIBILITY
  // (moved below all hooks to comply with React Rules of Hooks)
  if (!user || !staffChatVisible) {
    return null;
  }

  return (
    <>
      {/* Main Widget - Always shows header at bottom */}
      <div
        key={`messenger-widget-${conversations.length}`}
        className={`messenger-widget  ${positionClasses[position]} ${
          isExpanded ? "messenger-widget--expanded" : ""
        }`}
      >
        <div className="messenger-widget__panel bg-light">
          {/* Header - Always visible, acts as toggle */}
          <div
            className="messenger-widget__header"
            onClick={toggleWidget}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
          >
            {/* Chat Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "white" }}>
              <path
                d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                fill="currentColor"
              />
            </svg>
            {/* Unread Count Badge */}
            {totalUnreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  background: "#ff3b30",
                  color: "white",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "bold",
                  lineHeight: 1,
                }}
              >
                {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
              </span>
            )}
          </div>

          {/* Conversations List - Only visible when expanded */}
          {isExpanded && (
            <ConversationsList
              hotelSlug={hotelSlug}
              onOpenChat={handleOpenChat}
            />
          )}
        </div>
      </div>

      {/* Navigation Controls - Show when more than 3 chats */}
      {hasMultiplePages && (
        <>
          {/* Navigation Arrows */}
          <div
            className={`chat-nav-controls ${
              hasMultiplePages ? "chat-nav-controls--visible" : ""
            }`}
          >
            <button
              className="chat-nav-btn"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              aria-label="Previous chats"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="chat-nav-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              aria-label="Next chats"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 12L10 8L6 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Chat Counter */}
          <div
            className={`chat-counter ${
              hasMultiplePages ? "chat-counter--visible" : ""
            }`}
          >
            {startIndex + 1}-{Math.min(endIndex, openChats.length)} of{" "}
            {openChats.length}
          </div>
        </>
      )}

      {/* Open Chat Windows - Only show visible ones */}
      {openChats.map((chat, globalIndex) => {
        const isVisible = globalIndex >= startIndex && globalIndex < endIndex;
        const visibleIndex = globalIndex - startIndex;

        return (
          <ChatWindowPopup
            key={chat.conversationId}
            hotelSlug={hotelSlug}
            conversation={chat.conversation}
            staff={chat.staff}
            isMinimized={chat.isMinimized}
            onMinimize={() => handleMinimizeChat(chat.conversationId)}
            onClose={() => handleCloseChat(chat.conversationId)}
            position={position}
            stackIndex={visibleIndex}
            isVisible={isVisible}
          />
        );
      })}

      {/* Group Chat Modal */}
      <GroupChatModal
        show={showGroupModal}
        onHide={handleCloseGroupModal}
        hotelSlug={hotelSlug}
        currentUserId={user?.id}
        onGroupCreated={handleGroupCreated}
      />
    </>
  );
};

MessengerWidget.propTypes = {
  position: PropTypes.oneOf(["bottom-right", "bottom-left"]),
  isExpanded: PropTypes.bool,
  onExpandChange: PropTypes.func,
};

export default MessengerWidget;
