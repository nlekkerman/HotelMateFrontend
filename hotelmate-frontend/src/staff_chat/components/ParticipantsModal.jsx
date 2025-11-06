import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Spinner } from 'react-bootstrap';
import ParticipantsList from './ParticipantsList';
import { removeParticipant, leaveConversation } from '../services/staffChatApi';

/**
 * ParticipantsModal Component
 * Modal that displays all participants in a group chat
 * Allows leaving the group and removing other participants (admin only)
 */
const ParticipantsModal = ({ 
  show, 
  onHide, 
  participants, 
  currentUserId, 
  groupTitle,
  conversationId,
  hotelSlug,
  canManageParticipants = false,
  onParticipantRemoved = null,
  onLeaveGroup = null
}) => {
  const [removingId, setRemovingId] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(null);

  const handleRemoveParticipant = async (participantId) => {
    if (!conversationId || !hotelSlug) {
      console.error('Missing conversationId or hotelSlug');
      return;
    }

    const participant = participants.find(p => p.id === participantId);
    const confirmMessage = `Remove ${participant?.full_name || 'this user'} from the group?`;
    
    if (!confirm(confirmMessage)) return;

    setRemovingId(participantId);
    setError(null);

    try {
      await removeParticipant(hotelSlug, conversationId, participantId);
      
      // Notify parent component
      if (onParticipantRemoved) {
        onParticipantRemoved(participantId);
      }
      
      console.log('✅ Participant removed successfully');
    } catch (err) {
      console.error('❌ Failed to remove participant:', err);
      setError(err.response?.data?.error || 'Failed to remove participant');
    } finally {
      setRemovingId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!conversationId || !hotelSlug) {
      console.error('Missing conversationId or hotelSlug');
      return;
    }

    if (!confirm('Leave this group? You will no longer receive messages from this conversation.')) {
      return;
    }

    setLeaving(true);
    setError(null);

    try {
      await leaveConversation(hotelSlug, conversationId);
      
      // Notify parent component
      if (onLeaveGroup) {
        onLeaveGroup(conversationId);
      }
      
      console.log('✅ Left group successfully');
      onHide();
    } catch (err) {
      console.error('❌ Failed to leave group:', err);
      setError(err.response?.data?.error || 'Failed to leave group');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="md" 
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-people-fill me-2"></i>
          {groupTitle ? `${groupTitle} - Participants` : 'Participants'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3">
        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setError(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        <div className="mb-3">
          <small className="text-muted">
            {participants?.length || 0} {participants?.length === 1 ? 'member' : 'members'}
          </small>
        </div>
        
        <ParticipantsList
          participants={participants}
          currentUserId={currentUserId}
          compact={false}
          canRemove={canManageParticipants}
          onRemoveParticipant={handleRemoveParticipant}
          removingId={removingId}
        />
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button 
          variant="danger" 
          onClick={handleLeaveGroup}
          disabled={leaving}
        >
          {leaving ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Leaving...
            </>
          ) : (
            <>
              <i className="bi bi-box-arrow-right me-2"></i>
              Leave Group
            </>
          )}
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={onHide}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

ParticipantsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  participants: PropTypes.array,
  currentUserId: PropTypes.number,
  groupTitle: PropTypes.string,
  conversationId: PropTypes.number,
  hotelSlug: PropTypes.string,
  canManageParticipants: PropTypes.bool,
  onParticipantRemoved: PropTypes.func,
  onLeaveGroup: PropTypes.func
};

export default ParticipantsModal;
