import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '@/context/AuthContext';
import ConversationsList from './ConversationsList';
import ChatWindowPopup from './ChatWindowPopup';
import '../staffChat.css';

/**
 * MessengerWidget Component
 * Facebook Messenger-style chat widget that floats in bottom right
 * Expands to show conversations list and allows opening multiple chat windows
 */
const MessengerWidget = ({ position = 'bottom-right' }) => {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  const [isExpanded, setIsExpanded] = useState(false);
  const [openChats, setOpenChats] = useState([]); // Array of {conversationId, staff, isMinimized}

  // Debug: Log when openChats changes
  React.useEffect(() => {
    console.log('🔄 openChats state changed:', openChats);
  }, [openChats]);

  if (!hotelSlug) return null;

  const toggleWidget = () => {
    setIsExpanded(!isExpanded);
  };

  const handleOpenChat = (conversation, staff) => {
    console.log('🎯 handleOpenChat called with:', { conversation, staff });
    console.log('🎯 Conversation ID:', conversation?.id);
    console.log('🎯 Current open chats:', openChats);
    
    if (!conversation?.id) {
      console.error('❌ No conversation ID provided!');
      return;
    }
    
    // Check if chat is already open
    const existingChat = openChats.find(chat => chat.conversationId === conversation.id);
    
    if (existingChat) {
      console.log('✅ Chat already open, restoring if minimized');
      // If minimized, restore it
      if (existingChat.isMinimized) {
        setOpenChats(openChats.map(chat => 
          chat.conversationId === conversation.id 
            ? { ...chat, isMinimized: false }
            : chat
        ));
      }
    } else {
      console.log('✅ Opening new chat window');
      // Add new chat window (max 3 open at once like Facebook)
      if (openChats.length >= 3) {
        // Remove the oldest chat
        setOpenChats([...openChats.slice(1), {
          conversationId: conversation.id,
          conversation,
          staff,
          isMinimized: false
        }]);
      } else {
        setOpenChats([...openChats, {
          conversationId: conversation.id,
          conversation,
          staff,
          isMinimized: false
        }]);
      }
      console.log('✅ Chat window added to openChats array');
    }
    
    // Close the widget on mobile after opening chat
    if (window.innerWidth < 768) {
      setIsExpanded(false);
    }
  };

  const handleMinimizeChat = (conversationId) => {
    setOpenChats(openChats.map(chat => 
      chat.conversationId === conversationId 
        ? { ...chat, isMinimized: !chat.isMinimized }
        : chat
    ));
  };

  const handleCloseChat = (conversationId) => {
    setOpenChats(openChats.filter(chat => chat.conversationId !== conversationId));
  };

  const positionClasses = {
    'bottom-right': 'messenger-widget--bottom-right',
    'bottom-left': 'messenger-widget--bottom-left'
  };

  console.log('🎨 MessengerWidget render - openChats:', openChats);
  console.log('🎨 Number of open chats:', openChats.length);

  return (
    <>
      {/* Main Widget Button/Panel */}
      <div className={`messenger-widget ${positionClasses[position]} ${isExpanded ? 'messenger-widget--expanded' : ''}`}>
        {/* Collapsed: Chat Icon Button */}
        {!isExpanded && (
          <button
            onClick={toggleWidget}
            className="messenger-widget__button"
            aria-label="Open staff chat"
            title="Staff Chat"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
                fill="currentColor"
              />
              <circle cx="12" cy="10" r="1.5" fill="currentColor" />
              <circle cx="8" cy="10" r="1.5" fill="currentColor" />
              <circle cx="16" cy="10" r="1.5" fill="currentColor" />
            </svg>
          </button>
        )}

        {/* Expanded: Conversations List */}
        {isExpanded && (
          <div className="messenger-widget__panel">
            <div className="messenger-widget__header">
              <h3 className="messenger-widget__title">Staff Chat</h3>
              <button
                onClick={toggleWidget}
                className="messenger-widget__close"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5l10 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <ConversationsList
              hotelSlug={hotelSlug}
              onOpenChat={handleOpenChat}
            />
          </div>
        )}
      </div>

      {/* Open Chat Windows */}
      {openChats.map((chat, index) => (
        <ChatWindowPopup
          key={chat.conversationId}
          hotelSlug={hotelSlug}
          conversation={chat.conversation}
          staff={chat.staff}
          isMinimized={chat.isMinimized}
          onMinimize={() => handleMinimizeChat(chat.conversationId)}
          onClose={() => handleCloseChat(chat.conversationId)}
          position={position}
          stackIndex={index}
        />
      ))}
    </>
  );
};

MessengerWidget.propTypes = {
  position: PropTypes.oneOf(['bottom-right', 'bottom-left'])
};

export default MessengerWidget;
