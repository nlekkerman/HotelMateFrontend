import React from 'react';
import PropTypes from 'prop-types';

/**
 * OnDutyBadge Component
 * Displays an indicator badge for staff on-duty status
 */
const OnDutyBadge = ({ isOnDuty, showText = true, size = 'medium' }) => {
  if (!isOnDuty) return null;

  const sizeClasses = {
    small: 'on-duty-badge--small',
    medium: 'on-duty-badge--medium',
    large: 'on-duty-badge--large'
  };

  return (
    <span className={`on-duty-badge ${sizeClasses[size]}`}>
      <span className="on-duty-badge__dot" />
      {showText && <span className="on-duty-badge__text">On Duty</span>}
    </span>
  );
};

OnDutyBadge.propTypes = {
  isOnDuty: PropTypes.bool.isRequired,
  showText: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default OnDutyBadge;
