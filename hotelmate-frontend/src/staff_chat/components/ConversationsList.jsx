import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import useStaffList from '../hooks/useStaffList';
import useStaffSearch from '../hooks/useStaffSearch';
import useStartConversation from '../hooks/useStartConversation';
import { fetchConversations } from '../services/staffChatApi';

/**
 * ConversationsList Component
 * Search bar at top to find staff and start conversations
 * (Conversations list will be added when backend is ready)
 */
const ConversationsList = ({ hotelSlug, onOpenChat }) => {
  const [startingChatWithId, setStartingChatWithId] = useState(null);
  const [existingConversations, setExistingConversations] = useState([]);

  // Search functionality
  const { searchTerm, debouncedSearchTerm, handleSearchChange, clearSearch } = useStaffSearch();
  
  // Only fetch staff list when actually searching (not empty)
  const shouldFetchStaff = debouncedSearchTerm.trim().length > 0;
  const { 
    staffList, 
    loading: staffLoading, 
    error: staffError 
  } = useStaffList(hotelSlug, shouldFetchStaff ? debouncedSearchTerm : null);

  // Fetch existing conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const conversations = await fetchConversations(hotelSlug);
        setExistingConversations(Array.isArray(conversations) ? conversations : []);
        console.log('📋 Loaded existing conversations:', conversations);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };

    if (hotelSlug) {
      loadConversations();
    }
  }, [hotelSlug]);

  // Start new conversation
  const { startConversation } = useStartConversation(hotelSlug);

  const handleStartNewChat = async (staff) => {
    console.log('🚀 Starting chat with staff:', staff);
    setStartingChatWithId(staff.id);
    
    try {
      // Check if a 1-on-1 conversation already exists with this staff member
      const existingConv = existingConversations.find(conv => {
        // Check if it's a 1-on-1 conversation (2 participants only)
        if (conv.is_group || !conv.participants || conv.participants.length !== 2) {
          return false;
        }
        // Check if this staff member is in the conversation
        return conv.participants.some(participant => participant.id === staff.id);
      });

      if (existingConv) {
        console.log('✅ Found existing conversation:', existingConv.id);
        // Open existing conversation
        if (onOpenChat) {
          onOpenChat(existingConv, staff);
          clearSearch();
        }
      } else {
        console.log('🆕 Creating new conversation with staff:', staff.id);
        // Create new conversation
        const conversation = await startConversation([staff.id]);
        console.log('✅ Conversation created:', conversation);
        
        if (conversation && onOpenChat) {
          console.log('📞 Calling onOpenChat with:', { conversation, staff });
          onOpenChat(conversation, staff);
          clearSearch();
          
          // Add to existing conversations list to prevent duplicates
          setExistingConversations(prev => [...prev, conversation]);
        }
      }
    } catch (err) {
      console.error('❌ Failed to start conversation:', err);
      
      // Show user-friendly error message
      const errorMessage = err.response?.data?.error 
        || err.message 
        || 'Failed to start conversation. Please try again or contact support.';
      
      alert(errorMessage);
    } finally {
      setStartingChatWithId(null);
    }
  };

  const showSearchResults = searchTerm.trim().length > 0;

  return (
    <div className="h-100 d-flex flex-column">
      {/* Search Bar */}
      <div className="p-3 border-bottom">
        <div className="position-relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search staff by name..."
            className="form-control form-control-sm"
            autoFocus
          />
          {searchTerm && (
            <button 
              onClick={clearSearch}
              className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none"
              style={{ marginRight: '5px' }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow-1 overflow-auto">
        {showSearchResults ? (
          // Staff Search Results
          <div className="p-2">
            {staffLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-2 mb-0 small">Searching...</p>
              </div>
            ) : staffError ? (
              <div className="alert alert-danger m-2" role="alert">
                Failed to search staff
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <p className="mb-0">No staff found</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {staffList.map((staff) => (
                  <button
                    key={staff.id}
                    className="list-group-item list-group-item-action border-0 py-3"
                    onClick={() => handleStartNewChat(staff)}
                    disabled={startingChatWithId === staff.id}
                  >
                    <div className="d-flex align-items-center">
                      {/* Circular Avatar */}
                      <div className="position-relative me-3">
                        {staff.profile_image_url ? (
                          <img 
                            src={staff.profile_image_url} 
                            alt={staff.full_name}
                            className="rounded-circle"
                            width="48"
                            height="48"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div 
                            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: '48px', height: '48px', fontSize: '18px' }}
                          >
                            {staff.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        {staff.is_on_duty && (
                          <span 
                            className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                            style={{ width: '14px', height: '14px' }}
                          />
                        )}
                      </div>
                      
                      {/* Staff Info */}
                      <div className="flex-grow-1 text-start">
                        <h6 className="mb-0">{staff.full_name}</h6>
                        {staff.role && (
                          <small className="text-muted">
                            {staff.role.name}
                            {staff.department && ` • ${staff.department.name}`}
                          </small>
                        )}
                      </div>

                      {/* Loading Spinner */}
                      {startingChatWithId === staff.id && (
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Starting chat...</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : existingConversations.length > 0 ? (
          // Show Existing Conversations
          <div className="p-2">
            <div className="list-group list-group-flush">
              {existingConversations.map((conversation) => {
                // Get the other participant (not current user)
                const otherParticipant = conversation.participants?.[0];
                
                return (
                  <button
                    key={conversation.id}
                    className="list-group-item list-group-item-action border-0 py-3"
                    onClick={() => onOpenChat(conversation, otherParticipant)}
                  >
                    <div className="d-flex align-items-center">
                      {/* Avatar */}
                      <div className="position-relative me-3">
                        {otherParticipant?.profile_image_url ? (
                          <img 
                            src={otherParticipant.profile_image_url} 
                            alt={otherParticipant.full_name}
                            className="rounded-circle"
                            width="48"
                            height="48"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div 
                            className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: '48px', height: '48px', fontSize: '18px' }}
                          >
                            {otherParticipant?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        {otherParticipant?.is_on_duty && (
                          <span 
                            className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                            style={{ width: '14px', height: '14px' }}
                          />
                        )}
                      </div>
                      
                      {/* Conversation Info */}
                      <div className="flex-grow-1 text-start">
                        <div className="d-flex justify-content-between align-items-start">
                          <h6 className="mb-0">
                            {conversation.title || otherParticipant?.full_name || 'Chat'}
                          </h6>
                          {conversation.unread_count > 0 && (
                            <span className="badge bg-primary rounded-pill">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        
                        {/* Last Message Preview */}
                        {conversation.last_message && (
                          <small className="text-muted text-truncate d-block" style={{ maxWidth: '250px' }}>
                            {conversation.last_message.message || 'Attachment'}
                          </small>
                        )}
                        
                        {/* Role */}
                        {!conversation.last_message && otherParticipant?.role && (
                          <small className="text-muted">
                            {otherParticipant.role.name}
                          </small>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // Empty State - No Conversations
          <div className="p-2">
            <div className="text-center py-5">
              <div className="display-1 mb-3">💬</div>
              <h6 className="text-muted mb-1">No conversations yet</h6>
              <small className="text-muted">Search for staff to start chatting</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ConversationsList.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  onOpenChat: PropTypes.func.isRequired
};

export default ConversationsList;
