import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

/**
 * ReadStatus Component
 * Displays read receipt status for messages
 * Shows checkmarks and "Read by X" information
 */
const ReadStatus = ({ 
  isRead, 
  readBy = [], 
  showDetails = true,
  size = 'normal'
}) => {
  // Don't render anything if message is not read
  if (!isRead && readBy.length === 0) {
    return null;
  }

  const iconSize = size === 'small' ? '12px' : '14px';

  /**
   * Generate tooltip content showing who read the message
   */
  const getTooltipContent = () => {
    if (readBy.length === 0) return 'Delivered';
    
    if (readBy.length === 1) {
      return `Read by ${readBy[0].staff_name}`;
    }
    
    if (readBy.length === 2) {
      return `Read by ${readBy[0].staff_name} and ${readBy[1].staff_name}`;
    }
    
    if (readBy.length <= 5) {
      const names = readBy.slice(0, -1).map(r => r.staff_name).join(', ');
      const lastName = readBy[readBy.length - 1].staff_name;
      return `Read by ${names}, and ${lastName}`;
    }
    
    // More than 5 people
    const displayNames = readBy.slice(0, 3).map(r => r.staff_name).join(', ');
    const othersCount = readBy.length - 3;
    return `Read by ${displayNames}, and ${othersCount} others`;
  };

  /**
   * Render checkmark icons
   */
  const renderCheckmarks = () => {
    if (isRead || readBy.length > 0) {
      // Double checkmark (read)
      return (
        <div className="read-status__checkmarks read-status__checkmarks--read">
          <i 
            className="bi bi-check-all" 
            style={{ fontSize: iconSize }}
          />
        </div>
      );
    }
    
    // Single checkmark (delivered but not read)
    return (
      <div className="read-status__checkmarks">
        <i 
          className="bi bi-check" 
          style={{ fontSize: iconSize }}
        />
      </div>
    );
  };

  /**
   * Render with tooltip if showDetails is true
   */
  if (showDetails) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="read-status-tooltip">
            {getTooltipContent()}
          </Tooltip>
        }
      >
        <span className={`read-status read-status--${size}`}>
          {renderCheckmarks()}
        </span>
      </OverlayTrigger>
    );
  }

  // Render without tooltip
  return (
    <span className={`read-status read-status--${size}`}>
      {renderCheckmarks()}
    </span>
  );
};

ReadStatus.propTypes = {
  /** Whether the message has been read */
  isRead: PropTypes.bool,
  /** Array of staff who read the message */
  readBy: PropTypes.arrayOf(PropTypes.shape({
    staff_id: PropTypes.number.isRequired,
    staff_name: PropTypes.string.isRequired,
    read_at: PropTypes.string
  })),
  /** Show detailed tooltip with names */
  showDetails: PropTypes.bool,
  /** Size of the checkmark icons */
  size: PropTypes.oneOf(['small', 'normal'])
};

ReadStatus.defaultProps = {
  isRead: false,
  readBy: [],
  showDetails: true,
  size: 'normal'
};

export default ReadStatus;
