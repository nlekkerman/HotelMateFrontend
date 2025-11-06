import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Button, ListGroup, Alert, Tab, Tabs, Badge } from 'react-bootstrap';
import { fetchStaffList, getConversationsForForwarding, forwardMessage } from '../services/staffChatApi';

/**
 * ShareMessageModal Component
 * Modal for forwarding messages to existing conversations or new people
 * 
 * NEW FORWARDING APPROACH:
 * - Shows user's existing conversations for quick selection
 * - Allows selecting new people to create new conversations automatically
 * - Uses backend forward endpoint that handles both existing and new conversations
 * - Backend preserves message content but NOT reply chains (reply_to = null)
 * - Real-time updates sent via Pusher to all participants automatically
 * - FCM notifications sent to recipients (except sender)
 * 
 * @see Backend: /api/staff-chat/<hotel_slug>/messages/<message_id>/forward/
 * @see Backend: /api/staff-chat/<hotel_slug>/conversations/for-forwarding/
 */
const ShareMessageModal = ({
  show,
  onHide,
  message,
  hotelSlug,
  currentUserId,
  onMessageForwarded,
  onOpenConversation,
}) => {
  // Tab management
  const [activeTab, setActiveTab] = useState('conversations');
  
  // Conversations state
  const [conversations, setConversations] = useState([]);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [conversationSearch, setConversationSearch] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  
  // New people state
  const [staffList, setStaffList] = useState([]);
  const [selectedNewPeople, setSelectedNewPeople] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);
  
  // Shared state
  const [forwarding, setForwarding] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [forwardResults, setForwardResults] = useState(null);

  // Load data when modal opens
  useEffect(() => {
    if (show) {
      loadConversations();
      setSelectedConversations([]);
      setSelectedNewPeople([]);
      setConversationSearch('');
      setStaffSearch('');
      setError(null);
      setActiveTab('conversations');
    }
  }, [show]);

  // Load conversations with search (debounced)
  useEffect(() => {
    if (show && activeTab === 'conversations') {
      const timer = setTimeout(() => {
        loadConversations(conversationSearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [conversationSearch, show, activeTab]);

  // Load staff when switching to new people tab
  useEffect(() => {
    if (show && activeTab === 'newPeople' && staffList.length === 0) {
      loadStaff();
    }
  }, [show, activeTab]);

  // Load staff with search (debounced)
  useEffect(() => {
    if (show && activeTab === 'newPeople' && staffList.length > 0) {
      const timer = setTimeout(() => {
        loadStaff(staffSearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [staffSearch, show, activeTab]);

  /**
   * Load conversations for forwarding
   */
  const loadConversations = async (search = '') => {
    setLoadingConversations(true);
    setError(null);
    
    try {
      const data = await getConversationsForForwarding(hotelSlug, search);
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  /**
   * Load staff list for new people selection
   */
  const loadStaff = async (search = '') => {
    setLoadingStaff(true);
    setError(null);
    
    try {
      const data = await fetchStaffList(hotelSlug, search, '', 50);
      const results = data?.results || data || [];
      
      // Filter out current user and inactive staff
      const otherStaff = results.filter(
        staff => staff.id !== currentUserId && staff.is_active !== false
      );
      
      setStaffList(otherStaff);
    } catch (err) {
      console.error('Error loading staff list:', err);
      setError('Failed to load staff members');
      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  /**
   * Toggle conversation selection
   */
  const toggleConversation = (conversationId) => {
    setSelectedConversations(prev =>
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  /**
   * Toggle staff/person selection
   */
  const togglePerson = (staffId) => {
    setSelectedNewPeople(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  /**
   * Handle forward action
   */
  const handleForward = async () => {
    // Validation
    if (selectedConversations.length === 0 && selectedNewPeople.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setForwarding(true);
    setError(null);

    try {
      console.log('Forwarding message:', {
        messageId: message.id,
        conversationIds: selectedConversations,
        newParticipantIds: selectedNewPeople,
      });

      const results = await forwardMessage(
        hotelSlug,
        message.id,
        selectedConversations,
        selectedNewPeople
      );

      console.log('Forward results:', results);
      
      setForwardResults(results);
      setShowSuccess(true);

      // Call callback if provided
      if (onMessageForwarded) {
        onMessageForwarded(results);
      }

      // Close modal after showing success
      setTimeout(() => {
        handleClose();
      }, 2500);

    } catch (err) {
      console.error('Error forwarding message:', err);
      setError(err.response?.data?.error || 'Failed to forward message. Please try again.');
    } finally {
      setForwarding(false);
    }
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    setSelectedConversations([]);
    setSelectedNewPeople([]);
    setConversationSearch('');
    setStaffSearch('');
    setError(null);
    setShowSuccess(false);
    setForwardResults(null);
    setActiveTab('conversations');
    onHide();
  };

  // Calculate total selections
  const totalSelected = selectedConversations.length + selectedNewPeople.length;

  return (
    <>
      <Modal show={show} onHide={handleClose} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Forward Message</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* Message Preview */}
          <div className="mb-3 p-3 bg-light rounded">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="bi bi-arrow-right-circle text-primary"></i>
              <strong className="text-muted">Message from {message.sender?.first_name || 'User'}</strong>
            </div>
            
            {/* Show text message if present and not placeholder */}
            {message.message && message.message !== '[File shared]' && (
              <p className="mb-2 text-break">{message.message}</p>
            )}
            
            {/* Show attachments preview */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2">
                {message.attachments.map((att, index) => {
                  const isImage = att.file_type === 'image' || 
                                  att.mime_type?.startsWith('image/') ||
                                  /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(att.file_name);
                  
                  if (isImage) {
                    return (
                      <div key={att.id || index} className="mb-2">
                        <img 
                          src={att.file_url} 
                          alt={att.file_name}
                          className="img-fluid rounded"
                          style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
                        />
                        <small className="text-muted d-block mt-1">
                          <i className="bi bi-image me-1"></i>
                          {att.file_name}
                        </small>
                      </div>
                    );
                  } else {
                    return (
                      <div key={att.id || index} className="mb-2">
                        <div className="d-flex align-items-center gap-2 p-2 bg-white rounded border">
                          <i className="bi bi-file-earmark text-primary"></i>
                          <span className="text-truncate small">{att.file_name}</span>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          {/* Tabs for Conversations vs New People */}
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            {/* Existing Conversations Tab */}
            <Tab 
              eventKey="conversations" 
              title={
                <span>
                  <i className="bi bi-chat-dots me-2"></i>
                  Conversations
                  {selectedConversations.length > 0 && (
                    <Badge bg="primary" className="ms-2">{selectedConversations.length}</Badge>
                  )}
                </span>
              }
            >
              {/* Search Conversations */}
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="🔍 Search conversations..."
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  disabled={loadingConversations}
                />
              </Form.Group>

              {/* Conversations List */}
              {loadingConversations ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2 small">Loading conversations...</p>
                </div>
              ) : conversations.length === 0 ? (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  No conversations found.
                </Alert>
              ) : (
                <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {conversations.map(conv => (
                    <ListGroup.Item
                      key={conv.id}
                      action
                      active={selectedConversations.includes(conv.id)}
                      onClick={() => toggleConversation(conv.id)}
                      className="d-flex align-items-start"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <strong>{conv.title}</strong>
                          {conv.is_group && (
                            <Badge bg="secondary" className="small">Group</Badge>
                          )}
                        </div>
                        
                        {conv.last_message && (
                          <p className="mb-1 small text-muted text-truncate">
                            {conv.last_message.sender_name}: {conv.last_message.message}
                          </p>
                        )}
                        
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-muted">
                            {conv.participant_count} participant{conv.participant_count > 1 ? 's' : ''}
                          </small>
                          {conv.last_message && (
                            <small className="text-muted">
                              • {new Date(conv.last_message.timestamp).toLocaleDateString()}
                            </small>
                          )}
                        </div>
                      </div>
                      
                      {selectedConversations.includes(conv.id) && (
                        <i className="bi bi-check-circle-fill text-primary ms-2"></i>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Tab>

            {/* New People Tab */}
            <Tab 
              eventKey="newPeople" 
              title={
                <span>
                  <i className="bi bi-person-plus me-2"></i>
                  New People
                  {selectedNewPeople.length > 0 && (
                    <Badge bg="primary" className="ms-2">{selectedNewPeople.length}</Badge>
                  )}
                </span>
              }
            >
              {/* Search Staff */}
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="🔍 Search staff by name or role..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  disabled={loadingStaff}
                />
              </Form.Group>

              {/* Staff List */}
              {loadingStaff ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2 small">Loading staff...</p>
                </div>
              ) : staffList.length === 0 ? (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  No staff members available.
                </Alert>
              ) : (
                <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {staffList.map(staff => (
                    <ListGroup.Item
                      key={staff.id}
                      action
                      active={selectedNewPeople.includes(staff.id)}
                      onClick={() => togglePerson(staff.id)}
                      className="d-flex align-items-center"
                    >
                      {/* Avatar */}
                      <div className="me-3">
                        {staff.profile_image_url ? (
                          <img 
                            src={staff.profile_image_url} 
                            alt={staff.full_name || `${staff.first_name} ${staff.last_name}`}
                            className="rounded-circle"
                            width="40"
                            height="40"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div 
                            className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: '40px', height: '40px' }}
                          >
                            {(staff.first_name?.[0] || staff.full_name?.[0] || '?').toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Staff Info */}
                      <div className="flex-grow-1">
                        <div className="fw-semibold">
                          {staff.full_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim()}
                        </div>
                        {staff.role && (
                          <small className="text-muted">
                            {typeof staff.role === 'string' ? staff.role : staff.role.name || staff.role.slug || ''}
                          </small>
                        )}
                      </div>
                      
                      {/* Selected Indicator */}
                      {selectedNewPeople.includes(staff.id) && (
                        <i className="bi bi-check-circle-fill text-primary"></i>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Tab>
          </Tabs>

          {/* Selection Summary */}
          {totalSelected > 0 && (
            <Alert variant="primary" className="mb-0 mt-3">
              <i className="bi bi-check2-circle me-2"></i>
              <strong>{totalSelected}</strong> recipient{totalSelected > 1 ? 's' : ''} selected
              {selectedConversations.length > 0 && ` (${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''})`}
              {selectedNewPeople.length > 0 && ` (${selectedNewPeople.length} new ${selectedNewPeople.length > 1 ? 'people' : 'person'})`}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={forwarding}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleForward}
            disabled={totalSelected === 0 || forwarding}
          >
            {forwarding ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Forwarding...</span>
                </span>
                Forwarding...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-right-circle me-2"></i>
                Forward to {totalSelected || '...'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Success Modal */}
      <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered size="sm">
        <Modal.Body className="text-center py-4">
          <div className="mb-3">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
          </div>
          <h5 className="mb-3">Message Forwarded!</h5>
          
          {forwardResults && (
            <div>
              <p className="text-muted mb-3">
                Successfully forwarded to <strong>{forwardResults.total_forwarded}</strong> recipient{forwardResults.total_forwarded > 1 ? 's' : ''}
              </p>
              
              {/* Show breakdown */}
              <div className="d-flex flex-column gap-2 small">
                {forwardResults.forwarded_to_existing > 0 && (
                  <div className="badge bg-primary bg-opacity-10 text-primary py-2">
                    <i className="bi bi-chat-dots me-2"></i>
                    {forwardResults.forwarded_to_existing} existing conversation{forwardResults.forwarded_to_existing > 1 ? 's' : ''}
                  </div>
                )}
                {forwardResults.forwarded_to_new > 0 && (
                  <div className="badge bg-success bg-opacity-10 text-success py-2">
                    <i className="bi bi-person-plus me-2"></i>
                    {forwardResults.forwarded_to_new} new conversation{forwardResults.forwarded_to_new > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              {/* Show failures if any */}
              {forwardResults.results && forwardResults.results.some(r => !r.success) && (
                <Alert variant="warning" className="mt-3 mb-0 small text-start">
                  <strong>Note:</strong> Some forwards failed. Check console for details.
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

ShareMessageModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  message: PropTypes.shape({
    id: PropTypes.number.isRequired,
    message: PropTypes.string,
    content: PropTypes.string,
    sender: PropTypes.shape({
      id: PropTypes.number,
      first_name: PropTypes.string,
      full_name: PropTypes.string,
    }),
    attachments: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        file_name: PropTypes.string,
        file_type: PropTypes.string,
        file_url: PropTypes.string,
        mime_type: PropTypes.string,
      })
    ),
  }).isRequired,
  hotelSlug: PropTypes.string.isRequired,
  currentUserId: PropTypes.number.isRequired,
  onMessageForwarded: PropTypes.func,
  onOpenConversation: PropTypes.func,
};

export default ShareMessageModal;
