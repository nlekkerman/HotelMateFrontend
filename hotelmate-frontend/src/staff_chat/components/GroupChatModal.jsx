import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import StaffSelector from './StaffSelector';
import useGroupChat from '../hooks/useGroupChat';

/**
 * GroupChatModal Component
 * Modal for creating group chats with staff selection and title input
 */
const GroupChatModal = ({ 
  show, 
  onHide, 
  hotelSlug, 
  currentUserId,
  onGroupCreated 
}) => {
  const {
    selectedStaff,
    groupTitle,
    isCreating,
    error,
    setGroupTitle,
    toggleStaffSelection,
    createGroup,
    reset,
    isValid,
  } = useGroupChat(hotelSlug);

  // Reset form when modal is closed
  useEffect(() => {
    if (!show) {
      reset();
    }
  }, [show, reset]);

  const handleCreateGroup = async () => {
    const conversation = await createGroup();
    
    if (conversation) {
      // Notify parent component
      if (onGroupCreated) {
        onGroupCreated(conversation);
      }
      
      // Close modal
      onHide();
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onHide();
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={handleClose} 
      size="lg" 
      centered
      backdrop={isCreating ? 'static' : true}
      keyboard={!isCreating}
    >
      <Modal.Header closeButton={!isCreating}>
        <Modal.Title>
          <i className="bi bi-people-fill me-2"></i>
          Create Group Chat
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => reset()}>
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {/* Group Title Input */}
        <div className="mb-4">
          <Form.Group>
            <Form.Label>
              Group Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., Morning Shift Team, Housekeeping..."
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              disabled={isCreating}
              maxLength={100}
              autoFocus
            />
            <Form.Text className="text-muted">
              Choose a descriptive name for your group
            </Form.Text>
          </Form.Group>
        </div>

        {/* Staff Selection */}
        <div>
          <Form.Label>
            Select Members <span className="text-danger">*</span>
            {selectedStaff.length >= 2 && (
              <span className="text-success ms-2">
                <i className="bi bi-check-circle-fill"></i>
              </span>
            )}
          </Form.Label>
          <Form.Text className="d-block mb-2 text-muted">
            Select at least 2 staff members to create a group
          </Form.Text>
          
          <div className="group-chat-modal__staff-selector">
            <StaffSelector
              hotelSlug={hotelSlug}
              selectedStaffIds={selectedStaff}
              onToggleStaff={toggleStaffSelection}
              currentUserId={currentUserId}
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-3">
          <Alert variant="info" className="mb-0">
            <small>
              <i className="bi bi-info-circle me-2"></i>
              <strong>Note:</strong> You will be automatically added to the group. 
              All members will receive a notification when the group is created.
            </small>
          </Alert>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <div className="text-muted">
          <small>
            {selectedStaff.length > 0 && (
              <>
                {selectedStaff.length + 1} member{selectedStaff.length + 1 !== 1 ? 's' : ''} total
                {' '}(including you)
              </>
            )}
          </small>
        </div>
        <div>
          <Button 
            variant="secondary" 
            onClick={handleClose}
            disabled={isCreating}
            className="me-2"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateGroup}
            disabled={!isValid() || isCreating}
          >
            {isCreating ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Creating...
              </>
            ) : (
              <>
                <i className="bi bi-plus-circle me-2"></i>
                Create Group
              </>
            )}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

GroupChatModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  hotelSlug: PropTypes.string.isRequired,
  currentUserId: PropTypes.number,
  onGroupCreated: PropTypes.func,
};

export default GroupChatModal;
