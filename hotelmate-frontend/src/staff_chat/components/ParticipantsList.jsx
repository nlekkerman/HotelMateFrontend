import React from 'react';
import PropTypes from 'prop-types';
import StaffAvatar from './StaffAvatar';
import OnDutyBadge from './OnDutyBadge';

/**
 * ParticipantsList Component
 * Displays a list of participants in a group chat
 * Shows avatars, names, roles, and online status
 */
const ParticipantsList = ({ 
  participants, 
  currentUserId, 
  compact = false,
  canRemove = false,
  onRemoveParticipant = null,
  removingId = null
}) => {
  if (!participants || participants.length === 0) {
    return (
      <div className="participants-list__empty">
        <p className="text-muted mb-0">No participants</p>
      </div>
    );
  }

  return (
    <div className={`participants-list ${compact ? 'participants-list--compact' : ''}`}>
      {participants.map((participant) => {
        const isCurrentUser = participant.id === currentUserId;
        
        const participantName = participant.full_name || participant.first_name || 'Unknown';
        const isRemoving = removingId === participant.id;
        
        return (
          <div 
            key={participant.id} 
            className={`participant-item ${isRemoving ? 'participant-item--removing' : ''}`}
          >
            <div className="participant-item__avatar">
              <StaffAvatar
                imageUrl={participant.profile_image_url}
                fullName={participantName}
                size={compact ? 'small' : 'medium'}
                isOnline={participant.is_on_duty}
              />
            </div>
            
            <div className="participant-item__info">
              <div className="participant-item__name">
                {participantName}
                {isCurrentUser && (
                  <span className="participant-item__you-badge">(You)</span>
                )}
              </div>
              
              {participant.role && (
                <div className="participant-item__role">
                  {participant.role.name || participant.role}
                </div>
              )}
              
              {participant.department && (
                <div className="participant-item__department">
                  {participant.department.name || participant.department}
                </div>
              )}
            </div>
            
            <div className="participant-item__badges">
              {participant.is_on_duty && (
                <OnDutyBadge size="small" />
              )}
            </div>

            {/* Remove Button */}
            {canRemove && !isCurrentUser && onRemoveParticipant && (
              <button
                onClick={() => onRemoveParticipant(participant.id)}
                disabled={isRemoving}
                className="participant-item__remove-btn"
                title="Remove from group"
              >
                {isRemoving ? (
                  <i className="bi bi-hourglass-split"></i>
                ) : (
                  <i className="bi bi-x-circle"></i>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

ParticipantsList.propTypes = {
  participants: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      full_name: PropTypes.string,
      first_name: PropTypes.string,
      profile_image_url: PropTypes.string,
      is_on_duty: PropTypes.bool,
      role: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          name: PropTypes.string
        })
      ]),
      department: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          name: PropTypes.string
        })
      ])
    })
  ),
  currentUserId: PropTypes.number,
  compact: PropTypes.bool,
  canRemove: PropTypes.bool,
  onRemoveParticipant: PropTypes.func,
  removingId: PropTypes.number
};

export default ParticipantsList;
