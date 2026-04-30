import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '@/context/AuthContext';
import useStaffList from '../hooks/useStaffList';
import useStaffSearch from '../hooks/useStaffSearch';
import useStartConversation from '../hooks/useStartConversation';
import { fetchConversations, bulkMarkAsRead } from '../services/staffChatApi';
import useUnreadCount from '../hooks/useUnreadCount';
import { useStaffChat } from '../context/StaffChatContext';
import { subscribeToStaffChatConversation } from '@/realtime/channelRegistry';
import { staffChatConversationChannel } from '@/lib/pusher/channels';
import { useCan } from '@/rbac';

/**
 * ConversationsList Component
 * Search bar at top to find staff and start conversations
 * Shows existing conversations with unread counts and "Mark All as Read" button
 * ALSO subscribes to guest booking channels to receive guest messages
 */
const ConversationsList = ({ hotelSlug, onOpenChat }) => {
  const [startingChatWithId, setStartingChatWithId] = useState(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  
  // ✅ FIX: Track ongoing conversation creation attempts to prevent race conditions
  const [creatingConversationsWith, setCreatingConversationsWith] = useState(new Set());
  
  // ✅ FIX: Get current user ID from auth context instead of localStorage
  const { user } = useAuth();
  const currentUserId = user?.staff_id || user?.id || null;

  // RBAC: staff_chat module gates. Authority is `user.rbac.staff_chat.*` only.
  const { can } = useCan();
  const visible = user?.rbac?.staff_chat?.visible === true;
  const canRead = user?.rbac?.staff_chat?.read === true;
  const canCreateConversation = can('staff_chat', 'conversation_create');

  // Get conversations from StaffChatContext (real-time updates via Pusher)
  const { conversations, fetchStaffConversations } = useStaffChat();
  
  // Calculate unread counts from conversations in real-time
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  const conversationsWithUnread = conversations.filter(c => c.unread_count > 0).length;
  
  // Debug logging for conversation updates
  useEffect(() => {
  }, [conversations, totalUnread, conversationsWithUnread]);

  // Search functionality
  const { searchTerm, debouncedSearchTerm, handleSearchChange, clearSearch } = useStaffSearch();
  
  // Only fetch staff list when actually searching (not empty)
  const shouldFetchStaff = debouncedSearchTerm.trim().length > 0;
  const { 
    staffList, 
    loading: staffLoading, 
    error: staffError 
  } = useStaffList(hotelSlug, shouldFetchStaff ? debouncedSearchTerm : null);

  // Initial load - fetch conversations once on mount
  useEffect(() => {
    if (hotelSlug) {
      fetchStaffConversations();
    }
  }, [hotelSlug, fetchStaffConversations]);

  // Subscribe to active guest booking channels for real-time guest messages
  useEffect(() => {
    if (!hotelSlug) return;

    // Fetch active guest conversations and subscribe to their booking channels
    const subscribeToGuestBookings = async () => {
      try {
        // Get active room conversations (guest chat bookings)
        const { fetchRoomConversations } = await import('@/services/roomConversationsAPI');
        const roomConversations = await fetchRoomConversations(hotelSlug);

        const cleanupFunctions = [];

        // Subscribe to each conversation using staff chat channels (works for both guest and staff conversations)
        roomConversations?.forEach((conversation) => {
          if (conversation.conversation_id || conversation.id) {
            const conversationId = conversation.conversation_id || conversation.id;
            const cleanup = subscribeToStaffChatConversation(hotelSlug, conversationId);
            cleanupFunctions.push(cleanup);
          }
        });

        return cleanupFunctions;
      } catch (error) {
        console.error('❌ [CONVERSATIONS LIST] Failed to fetch room conversations:', error);
        return [];
      }
    };

    let cleanupFunctions = [];
    
    subscribeToGuestBookings().then((cleanups) => {
      cleanupFunctions = cleanups;
    });

    // Cleanup on unmount
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup?.());
    };
  }, [hotelSlug]);

  // ✅ UNIFIED: No legacy subscription needed - conversations update automatically via chatStore

  // Start new conversation
  const { startConversation } = useStartConversation(hotelSlug);

  const handleStartNewChat = async (staff) => {
    // RBAC: staff_chat.conversation_create
    if (!canCreateConversation) return;
    
    // ✅ FIX: Prevent race condition - create unique key for user pair
    const conversationKey = [currentUserId, staff.id].sort().join('-');
    if (creatingConversationsWith.has(conversationKey)) {
      return;
    }
    
    setStartingChatWithId(staff.id);
    setCreatingConversationsWith(prev => new Set(prev).add(conversationKey));
    
    try {
      // Check if a 1-on-1 conversation already exists with this staff member
      const existingConv = conversations.find(conv => {
        // Check if it's a 1-on-1 conversation (2 participants only)
        if (conv.is_group || !conv.participants || conv.participants.length !== 2) {
          return false;
        }
        
        // ✅ FIX: Check if BOTH current user AND target staff are in the same conversation
        const participantIds = conv.participants.map(p => p.id);
        const hasCurrentUser = participantIds.includes(currentUserId);
        const hasTargetStaff = participantIds.includes(staff.id);
        
        return hasCurrentUser && hasTargetStaff;
      });

      if (existingConv) {
        // Open existing conversation
        if (onOpenChat) {
          onOpenChat(existingConv, staff);
          clearSearch();
        }
      } else {
        // Create new conversation
        const conversation = await startConversation([staff.id]);
        
        if (conversation && onOpenChat) {
          onOpenChat(conversation, staff);
          clearSearch();
          
          // Context will automatically update via fetchStaffConversations
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
      // ✅ FIX: Clear the conversation creation lock using the same key
      const conversationKey = [currentUserId, staff.id].sort().join('-');
      setCreatingConversationsWith(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationKey);
        return newSet;
      });
    }
  };

  /**
   * Mark all conversations as read
   */
  const handleMarkAllAsRead = async () => {
    const unreadConvIds = conversations
      .filter(c => c.unread_count > 0)
      .map(c => c.id);
    
    if (unreadConvIds.length === 0) {
      return;
    }

    setMarkingAllAsRead(true);
    
    try {
      const response = await bulkMarkAsRead(hotelSlug, unreadConvIds);
      
      // Refresh conversations to get updated unread counts
      await fetchStaffConversations();
      
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
      alert('Failed to mark all as read. Please try again.');
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const showSearchResults = searchTerm.trim().length > 0;

  // RBAC: fail closed for staff_chat visibility/read.
  if (!visible || !canRead) return null;

  return (
    <div className="h-100 d-flex flex-column">
      {/* Search Bar */}
      <div className="p-3 border-bottom">
        <div className="position-relative mb-2">
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
        
        {/* Mark All as Read Button */}
        {!showSearchResults && conversationsWithUnread > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAllAsRead}
            className="btn btn-sm btn-outline-primary w-100"
            style={{ fontSize: '0.85rem' }}
          >
            {markingAllAsRead ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Marking as read...
              </>
            ) : (
              <>
                <i className="bi bi-check2-all me-2"></i>
                Mark All as Read ({totalUnread})
              </>
            )}
          </button>
        )}
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
                    disabled={startingChatWithId === staff.id || !canCreateConversation}
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
        ) : conversations.length > 0 ? (
          // Show ALL Existing Conversations - sorted by latest message, unread first
          <div className="p-2">
            <div className="d-flex flex-column gap-2">
              {conversations
                .sort((a, b) => {
                  // First, prioritize conversations with unread messages
                  const aHasUnread = (a.unread_count || 0) > 0;
                  const bHasUnread = (b.unread_count || 0) > 0;
                  
                  if (aHasUnread && !bHasUnread) return -1;
                  if (!aHasUnread && bHasUnread) return 1;
                  
                  // Then sort by latest message timestamp (most recent first)
                  const aTimestamp = a.last_message?.created_at || a.updated_at || a.created_at || 0;
                  const bTimestamp = b.last_message?.created_at || b.updated_at || b.created_at || 0;
                  
                  return new Date(bTimestamp) - new Date(aTimestamp);
                })
                .map((conversation) => {
                // Get the other participant (not current user)
                // Filter out the current user from participants to show the OTHER person
                const otherParticipant = conversation.participants?.find(
                  p => p.id !== currentUserId
                );
                
                return (
                  <div
                    key={conversation.id}
                    className={`conversation-card ${
                      conversation.unread_count > 0 ? 'conversation-card--unread' : ''
                    }`}
                    onClick={() => onOpenChat(conversation, otherParticipant)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="conversation-card__content">
                      {/* Avatar */}
                      <div className="conversation-card__avatar">
                        {otherParticipant?.profile_image_url ? (
                          <img 
                            src={otherParticipant.profile_image_url} 
                            alt={otherParticipant.full_name}
                            className="conversation-card__avatar-img"
                          />
                        ) : (
                          <div className="conversation-card__avatar-placeholder">
                            {otherParticipant?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        {otherParticipant?.is_on_duty && (
                          <span className="conversation-card__online-dot" />
                        )}
                      </div>
                      
                      {/* Conversation Info */}
                      <div className="conversation-card__info">
                        <div className="conversation-card__header">
                          <h6 className="conversation-card__name">
                            {conversation.title || otherParticipant?.full_name || 'Chat'}
                          </h6>
                          {conversation.unread_count > 0 && (
                            <span className="conversation-card__badge">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        
                        {/* Last Message Preview */}
                        {conversation.last_message && (
                          <div className="conversation-card__message-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <p className="conversation-card__message" style={{ margin: 0 }}>
                              {(() => {
                                const msg = conversation.last_message;
                                
                                // Check if backend sent has_attachments flag
                                const hasAttachments = msg.has_attachments || (msg.attachments && msg.attachments.length > 0);
                                
                                // If message is "[File shared]" or has attachments, show icon
                                if (hasAttachments || msg.message === '[File shared]') {
                                // Try to determine if it's an image from attachments array
                                if (msg.attachments && msg.attachments.length > 0) {
                                  const hasImage = msg.attachments.some(att => {
                                    const type = att.file_type?.toLowerCase() || '';
                                    const ext = att.file_name?.split('.').pop().toLowerCase() || '';
                                    return type === 'image' || 
                                           type.startsWith('image/') || 
                                           ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(type) ||
                                           ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) ||
                                           att.mime_type?.startsWith('image/');
                                  });
                                  
                                  if (hasImage) {
                                    return (
                                      <>
                                        <i className="bi bi-image me-1"></i>
                                        {msg.attachments.length > 1 ? `${msg.attachments.length} Photos` : 'Photo'}
                                      </>
                                    );
                                  } else {
                                    return (
                                      <>
                                        <i className="bi bi-paperclip me-1"></i>
                                        {msg.attachments.length > 1 ? `${msg.attachments.length} Files` : 'File'}
                                      </>
                                    );
                                  }
                                } else {
                                  // No attachment details, just show generic attachment icon
                                  return (
                                    <>
                                      <i className="bi bi-paperclip me-1"></i>
                                      Attachment
                                    </>
                                  );
                                }
                              }
                              
                              // Show text message
                              if (msg.message) {
                                return msg.message;
                              }
                              
                              return 'Message';
                            })()}
                            </p>
                            
                            {/* Status indicator for own messages */}
                            {conversation.last_message.sender === currentUserId && (
                              <span style={{
                                fontSize: '9px',
                                color: conversation.last_message.read_by_count > 0 ? '#0d6efd' : '#28a745',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                flexShrink: 0,
                                fontWeight: '500'
                              }}>
                                <i className={`bi bi-check2-all`} style={{ fontSize: '10px' }}></i>
                                {conversation.last_message.read_by_count > 0 ? 'Seen' : 'Delivered'}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Role */}
                        {!conversation.last_message && otherParticipant?.role && (
                          <p className="conversation-card__role">
                            {otherParticipant.role.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
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
