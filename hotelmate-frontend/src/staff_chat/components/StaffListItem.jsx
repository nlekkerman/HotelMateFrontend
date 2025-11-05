import React from 'react';
import PropTypes from 'prop-types';
import StaffAvatar from './StaffAvatar';
import OnDutyBadge from './OnDutyBadge';

/**
 * StaffListItem Component
 * Displays a single staff member in the list
 */
const StaffListItem = ({ staff, onStartChat, isLoading = false }) => {
  const handleClick = () => {
    if (!isLoading) {
      onStartChat(staff.id);
    }
  };

  return (
    <li 
      className={`staff-list-item ${isLoading ? 'staff-list-item--loading' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      aria-label={`Start chat with ${staff.full_name}`}
    >
      <StaffAvatar
        imageUrl={staff.profile_image_url}
        fullName={staff.full_name}
        size="medium"
        isOnline={staff.is_on_duty}
      />
      
      <div className="staff-list-item__details">
        <div className="staff-list-item__header">
          <h4 className="staff-list-item__name">{staff.full_name}</h4>
          <OnDutyBadge isOnDuty={staff.is_on_duty} showText={false} size="small" />
        </div>
        
        <div className="staff-list-item__info">
          {staff.role && (
            <span className="staff-list-item__role">{staff.role.name}</span>
          )}
          {staff.department && staff.role && (
            <span className="staff-list-item__separator">•</span>
          )}
          {staff.department && (
            <span className="staff-list-item__department">{staff.department.name}</span>
          )}
        </div>
        
        {staff.email && (
          <span className="staff-list-item__email">{staff.email}</span>
        )}
      </div>

      {isLoading && (
        <div className="staff-list-item__loading-indicator">
          <span className="spinner-small" />
        </div>
      )}
    </li>
  );
};

StaffListItem.propTypes = {
  staff: PropTypes.shape({
    id: PropTypes.number.isRequired,
    first_name: PropTypes.string,
    last_name: PropTypes.string,
    full_name: PropTypes.string.isRequired,
    email: PropTypes.string,
    phone_number: PropTypes.string,
    department: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string
    }),
    role: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string
    }),
    is_active: PropTypes.bool,
    is_on_duty: PropTypes.bool,
    profile_image_url: PropTypes.string
  }).isRequired,
  onStartChat: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default StaffListItem;
