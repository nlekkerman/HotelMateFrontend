import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

/**
 * ReactionsList Component
 * Displays grouped reactions on a message
 * Shows count and staff names on hover
 */
const ReactionsList = ({ 
  reactions, 
  currentUserId, 
  onReactionClick, 
  maxDisplay = 5 
}) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    const { emoji, staff_id, staff_name } = reaction;
    
    if (!acc[emoji]) {
      acc[emoji] = {
        emoji,
        count: 0,
        staff: [],
        userReacted: false
      };
    }
    
    acc[emoji].count++;
    acc[emoji].staff.push({
      id: staff_id,
      name: staff_name || 'Unknown User'
    });
    
    if (staff_id === currentUserId) {
      acc[emoji].userReacted = true;
    }
    
    return acc;
  }, {});

  const reactionGroups = Object.values(groupedReactions);

  // Limit displayed reactions
  const displayedReactions = reactionGroups.slice(0, maxDisplay);
  const remainingCount = reactionGroups.length - maxDisplay;

  // Generate tooltip content showing who reacted
  const getTooltipContent = (reactionGroup) => {
    const { staff } = reactionGroup;
    
    if (staff.length === 0) return 'No reactions';
    
    if (staff.length === 1) {
      return staff[0].name;
    }
    
    if (staff.length === 2) {
      return `${staff[0].name} and ${staff[1].name}`;
    }
    
    if (staff.length <= 5) {
      const names = staff.slice(0, -1).map(s => s.name).join(', ');
      const lastName = staff[staff.length - 1].name;
      return `${names}, and ${lastName}`;
    }
    
    // More than 5 people
    const displayNames = staff.slice(0, 3).map(s => s.name).join(', ');
    const othersCount = staff.length - 3;
    return `${displayNames}, and ${othersCount} others`;
  };

  // Handle reaction click
  const handleReactionClick = (emoji, reactionGroup) => {
    if (onReactionClick) {
      onReactionClick(emoji, reactionGroup.userReacted);
    }
  };

  return (
    <div className="reactions-list" role="group" aria-label="Message reactions">
      {displayedReactions.map((reactionGroup) => (
        <OverlayTrigger
          key={reactionGroup.emoji}
          placement="top"
          overlay={
            <Tooltip id={`tooltip-reaction-${reactionGroup.emoji}`}>
              {getTooltipContent(reactionGroup)}
            </Tooltip>
          }
        >
          <button
            type="button"
            className={`reaction-item ${reactionGroup.userReacted ? 'user-reacted' : ''}`}
            onClick={() => handleReactionClick(reactionGroup.emoji, reactionGroup)}
            aria-label={`${reactionGroup.emoji} reaction by ${reactionGroup.count} ${reactionGroup.count === 1 ? 'person' : 'people'}`}
            aria-pressed={reactionGroup.userReacted}
          >
            <span className="reaction-emoji">{reactionGroup.emoji}</span>
            <span className="reaction-count">{reactionGroup.count}</span>
          </button>
        </OverlayTrigger>
      ))}
      
      {remainingCount > 0 && (
        <div className="reaction-item reaction-more">
          <span className="reaction-count">+{remainingCount}</span>
        </div>
      )}
    </div>
  );
};

ReactionsList.propTypes = {
  /** Array of reaction objects from the API */
  reactions: PropTypes.arrayOf(PropTypes.shape({
    emoji: PropTypes.string.isRequired,
    staff_id: PropTypes.number.isRequired,
    staff_name: PropTypes.string
  })),
  /** Current user's staff ID */
  currentUserId: PropTypes.number.isRequired,
  /** Callback when a reaction is clicked (emoji, wasUserReaction) */
  onReactionClick: PropTypes.func,
  /** Maximum number of reactions to display before showing "+X" */
  maxDisplay: PropTypes.number
};

ReactionsList.defaultProps = {
  reactions: [],
  onReactionClick: null,
  maxDisplay: 5
};

export default ReactionsList;
