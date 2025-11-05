import React from 'react';
import PropTypes from 'prop-types';

/**
 * StaffAvatar Component
 * Displays staff member's profile image or default avatar
 */
const StaffAvatar = ({ imageUrl, fullName, size = 'medium', isOnline = false }) => {
  const sizeClasses = {
    small: 'staff-avatar--small',
    medium: 'staff-avatar--medium',
    large: 'staff-avatar--large'
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`staff-avatar ${sizeClasses[size]}`}>
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={fullName}
          className="staff-avatar__image"
        />
      ) : (
        <div className="staff-avatar__placeholder">
          {getInitials(fullName)}
        </div>
      )}
      {isOnline && <div className="staff-avatar__online-indicator" />}
    </div>
  );
};

StaffAvatar.propTypes = {
  imageUrl: PropTypes.string,
  fullName: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  isOnline: PropTypes.bool
};

export default StaffAvatar;
