import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { useMessenger } from '../context/MessengerContext';
import { useStaffChat } from '../context/StaffChatContext';
import ConversationsList from './ConversationsList';
import ChatWindowPopup from './ChatWindowPopup';
import GroupChatModal from './GroupChatModal';
import '../staffChat.css';

/**
 * MessengerWidget Component
 * Facebook Messenger-style chat widget that floats in bottom right
 * Expands to show conversations list and allows opening multiple chat windows
 */
const MessengerWidget = ({ position = 'bottom-right', isExpanded: controlledExpanded, onExpandChange }) => {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  const { registerOpenChatHandler } = useMessenger();
  const { conversations, totalUnread, markConversationRead } = useStaffChat();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [openChats, setOpenChats] = useState(() => {
    // Restore open chats from localStorage on mount
    try {
      const saved = localStorage.getItem('staff-chat-open-windows');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Failed to restore open chats:', error);
    }
    return [];
  });
  const [currentPage, setCurrentPage] = useState(0); // For navigating through chat groups
  
  // Use controlled or internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  // Persist open chats to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('staff-chat-open-windows', JSON.stringify(openChats));
    } catch (error) {
      console.error('Failed to save open chats:', error);
    }
  }, [openChats]);

  // Calculate visible chats (max 3 at a time)
  const CHATS_PER_PAGE = 3;
  const totalPages = Math.ceil(openChats.length / CHATS_PER_PAGE);
  const startIndex = currentPage * CHATS_PER_PAGE;
  const endIndex = startIndex + CHATS_PER_PAGE;
  const visibleChats = openChats.slice(startIndex, endIndex);
  const hasMultiplePages = totalPages > 1;

  // Debug: Log when openChats changes
  React.useEffect(() => {
    // console.log('🔄 openChats state changed:', openChats);
    // console.log('📄 Current page:', currentPage, '| Total pages:', totalPages);
  }, [openChats, currentPage, totalPages]);

  // Reset to last page if current page becomes invalid
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  // Total unread count is now provided directly by useStaffChat hook from chatStore
  // No need for manual subscription - it's reactive to store changes

  const handleOpenChat = async (conversation, staff) => {
    // console.log('🎯 handleOpenChat called with:', { conversation, staff });
    // console.log('🎯 Conversation ID:', conversation?.id);
    // console.log('🎯 Current open chats:', openChats);
    
    if (!conversation?.id) {
      console.error('❌ No conversation ID provided!');
      return;
    }
    
    // Auto-mark conversation as read when opening
    if (conversation.unread_count > 0 || conversation.unreadCount > 0) {
      console.log('📖 [MessengerWidget] Auto-marking conversation as read:', conversation.id);
      try {
        await markConversationRead(conversation.id);
        console.log('✅ [MessengerWidget] Conversation marked as read');
      } catch (error) {
        console.error('❌ [MessengerWidget] Failed to mark conversation as read:', error);
      }
    }
    
    // Check if chat is already open
    const existingChat = openChats.find(chat => chat.conversationId === conversation.id);
    
    if (existingChat) {
      //
      // If minimized, restore it
      if (existingChat.isMinimized) {
        setOpenChats(openChats.map(chat => 
          chat.conversationId === conversation.id 
            ? { ...chat, isMinimized: false }
            : chat
        ));
      }
    } else {
      //
      // Add new chat window (no limit, but only show 3 at a time)
      setOpenChats([...openChats, {
        conversationId: conversation.id,
        conversation,
        staff,
        isMinimized: false
      }]);
      
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

  if (!hotelSlug) return null;

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
    setOpenChats(openChats.map(chat => 
      chat.conversationId === conversationId 
        ? { ...chat, isMinimized: !chat.isMinimized }
        : chat
    ));
    
    // Collapse the widget when minimizing/maximizing a chat
    if (controlledExpanded !== undefined && onExpandChange) {
      onExpandChange(false);
    } else {
      setInternalExpanded(false);
    }
  };

  const handleCloseChat = (conversationId) => {
    setOpenChats(openChats.filter(chat => chat.conversationId !== conversationId));
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
    setShowGroupModal(true);
  };

  const handleCloseGroupModal = () => {
    setShowGroupModal(false);
  };

  const handleGroupCreated = (conversation) => {
    // console.log('✅ Group created:', conversation);
    
    // Open the newly created group chat
    handleOpenChat(conversation, null);
    
    // Close the modal
    setShowGroupModal(false);
  };

  const positionClasses = {
    'bottom-right': 'messenger-widget--bottom-right',
    'bottom-left': 'messenger-widget--bottom-left'
  };

  // console.log('🎨 MessengerWidget render - openChats:', openChats);
  // console.log('🎨 Number of open chats:', openChats.length);
  // console.log('🎨 Visible chats:', visibleChats.length);

  return (
    <>
      {/* Main Widget - Always shows header at bottom */}
      <div className={`messenger-widget  ${positionClasses[position]} ${isExpanded ? 'messenger-widget--expanded' : ''}`}>
        <div className="messenger-widget__panel bg-light">
          {/* Header - Always visible, acts as toggle */}
          <div 
            className="messenger-widget__header main-bg text-white"
            onClick={toggleWidget}
            style={{ cursor: 'pointer' }}
          >
            <h3 className="messenger-widget__title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                <path
                  d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
                  fill="currentColor"
                />
                <circle cx="12" cy="10" r="1.5" fill="currentColor" />
                <circle cx="8" cy="10" r="1.5" fill="currentColor" />
                <circle cx="16" cy="10" r="1.5" fill="currentColor" />
              </svg>
              Staff Chat
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Dropdown Menu - Only show when expanded */}
              {isExpanded && (
                <Dropdown onClick={(e) => e.stopPropagation()}>
                  <Dropdown.Toggle 
                    variant="link" 
                    className="p-0 border-0 text-white"
                    style={{ 
                      boxShadow: 'none',
                      background: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="5" r="2" fill="currentColor" />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                      <circle cx="12" cy="19" r="2" fill="currentColor" />
                    </svg>
                  </Dropdown.Toggle>

                  <Dropdown.Menu 
                    align="end"
                    className="shadow-sm"
                    style={{ minWidth: '180px' }}
                  >
                    <Dropdown.Item 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenGroupModal();
                      }}
                      className="d-flex align-items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M17 11a1 1 0 0 1 0 2h-4v4a1 1 0 0 1-2 0v-4H7a1 1 0 0 1 0-2h4V7a1 1 0 0 1 2 0v4h4z" 
                          fill="currentColor"
                        />
                        <path 
                          d="M9 2C7.34315 2 6 3.34315 6 5C6 6.65685 7.34315 8 9 8C10.6569 8 12 6.65685 12 5C12 3.34315 10.6569 2 9 2Z" 
                          fill="currentColor"
                        />
                        <path 
                          d="M15 4C15 2.89543 15.8954 2 17 2C18.1046 2 19 2.89543 19 4C19 5.10457 18.1046 6 17 6C15.8954 6 15 5.10457 15 4Z" 
                          fill="currentColor"
                        />
                        <path 
                          d="M6 10.5C4.067 10.5 2.5 12.067 2.5 14V15.5C2.5 16.8807 3.61929 18 5 18H9.17071C8.42384 17.0534 8 15.8801 8 14.6V14C8 12.067 9.567 10.5 11.5 10.5H6Z" 
                          fill="currentColor"
                        />
                        <path 
                          d="M17.8293 18H22C23.3807 18 24.5 16.8807 24.5 15.5V14C24.5 12.067 22.933 10.5 21 10.5H15.5C14.5 10.5 13.6 10.9 13 11.5" 
                          fill="currentColor"
                        />
                      </svg>
                      <span>Create Group</span>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}

              {/* Toggle Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWidget();
                }}
                className="messenger-widget__toggle"
                aria-label={isExpanded ? "Close" : "Open"}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  {isExpanded ? (
                    <path
                      d="M15 12L10 7L5 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M5 8L10 13L15 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </button>
            </div>
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
          <div className={`chat-nav-controls ${hasMultiplePages ? 'chat-nav-controls--visible' : ''}`}>
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
          <div className={`chat-counter ${hasMultiplePages ? 'chat-counter--visible' : ''}`}>
            {startIndex + 1}-{Math.min(endIndex, openChats.length)} of {openChats.length}
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
  position: PropTypes.oneOf(['bottom-right', 'bottom-left']),
  isExpanded: PropTypes.bool,
  onExpandChange: PropTypes.func
};

export default MessengerWidget;
