import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { useStaffChat } from '../context/StaffChatContext';
import StaffChatList from './StaffChatList';
import ConversationView from './ConversationView';

/**
 * StaffChatContainer Component
 * Container component that manages the overall staff chat flow
 * Handles navigation between staff list and conversation view
 * Supports opening specific conversation via URL query parameter
 */
const StaffChatContainer = ({ 
  hotelSlug,
  onNavigateToConversation,
  renderConversationView 
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversations } = useStaffChat();
  const [activeView, setActiveView] = useState('list'); // 'list' or 'conversation'
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Check for conversation ID in URL query parameter
  useEffect(() => {
    const conversationIdParam = searchParams.get('conversation');
    
    if (conversationIdParam && conversations.length > 0) {
      const conversationId = parseInt(conversationIdParam, 10);
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (conversation) {
        console.log('📱 [StaffChatContainer] Opening conversation from URL:', conversationId);
        
        // Get current user ID to find the other participant
        const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserId = currentUserData?.staff_id || currentUserData?.id;
        
        // Find the other participant
        const otherParticipant = conversation.participants?.find(
          p => p.id !== currentUserId
        );
        
        setSelectedConversation(conversation);
        setSelectedStaff(otherParticipant || null);
        setActiveView('conversation');
        
        // Clear the query parameter after opening
        setSearchParams({});
      }
    }
  }, [searchParams, conversations, setSearchParams]);

  const handleConversationCreated = (conversation, staff) => {
    setSelectedConversation(conversation);
    setSelectedStaff(staff);
    
    // If custom navigation handler is provided, use it
    if (onNavigateToConversation) {
      onNavigateToConversation(conversation, staff);
    } else {
      // Otherwise, switch to conversation view
      setActiveView('conversation');
    }
  };

  const handleBackToList = () => {
    setActiveView('list');
    setSelectedConversation(null);
    setSelectedStaff(null);
  };

  return (
    <div className="staff-chat-container">
      {activeView === 'list' ? (
        <StaffChatList
          hotelSlug={hotelSlug}
          onConversationCreated={handleConversationCreated}
        />
      ) : (
        <div className="conversation-view">
          <div className="conversation-view__header">
            <button 
              onClick={handleBackToList} 
              className="conversation-view__back-button"
              aria-label="Back to staff list"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12 16l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            
            {selectedStaff && (
              <div className="conversation-view__staff-info">
                <div className="conversation-view__avatar">
                  {selectedStaff.profile_image_url ? (
                    <img 
                      src={selectedStaff.profile_image_url} 
                      alt={selectedStaff.full_name}
                      className="conversation-view__avatar-image"
                    />
                  ) : (
                    <div className="conversation-view__avatar-placeholder">
                      {selectedStaff.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  {selectedStaff.is_on_duty && (
                    <span className="conversation-view__online-indicator" />
                  )}
                </div>
                <div className="conversation-view__staff-details">
                  <h3 className="conversation-view__staff-name">
                    {selectedStaff.full_name}
                  </h3>
                  {selectedStaff.role && (
                    <p className="conversation-view__staff-role">
                      {selectedStaff.role.name}
                      {selectedStaff.department && ` • ${selectedStaff.department.name}`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {renderConversationView ? (
            renderConversationView(selectedConversation, selectedStaff, handleBackToList)
          ) : (
            <ConversationView
              hotelSlug={hotelSlug}
              conversation={selectedConversation}
              staff={selectedStaff}
            />
          )}
        </div>
      )}
    </div>
  );
};

StaffChatContainer.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  onNavigateToConversation: PropTypes.func,
  renderConversationView: PropTypes.func
};

export default StaffChatContainer;
