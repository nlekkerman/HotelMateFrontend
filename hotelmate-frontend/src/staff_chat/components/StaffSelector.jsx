import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Form, Badge, Spinner, Alert } from 'react-bootstrap';
import SearchInput from './SearchInput';
import StaffAvatar from './StaffAvatar';
import OnDutyBadge from './OnDutyBadge';
import useStaffList from '../hooks/useStaffList';

/**
 * StaffSelector Component
 * Allows selection of multiple staff members for group chat creation
 */
const StaffSelector = ({ 
  hotelSlug, 
  selectedStaffIds = [], 
  onToggleStaff,
  currentUserId 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { staffList, loading, error } = useStaffList(hotelSlug, searchTerm);

  // Filter out current user from staff list
  const filteredStaff = staffList.filter(staff => staff.id !== currentUserId);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleSearchClear = () => {
    setSearchTerm('');
  };

  const isStaffSelected = (staffId) => selectedStaffIds.includes(staffId);

  if (error) {
    return (
      <Alert variant="danger" className="mb-0">
        <i className="bi bi-exclamation-triangle me-2"></i>
        Failed to load staff members. Please try again.
      </Alert>
    );
  }

  return (
    <div className="staff-selector">
      {/* Search Input */}
      <div className="staff-selector__search mb-3">
        <SearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          onClear={handleSearchClear}
          placeholder="Search staff by name, department, or role..."
        />
      </div>

      {/* Selected Count Badge */}
      {selectedStaffIds.length > 0 && (
        <div className="mb-3">
          <Badge bg="primary" className="px-3 py-2">
            {selectedStaffIds.length} staff member{selectedStaffIds.length !== 1 ? 's' : ''} selected
          </Badge>
        </div>
      )}

      {/* Staff List */}
      <div className="staff-selector__list">
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <p className="mt-2 mb-0 text-muted">Loading staff members...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-people" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
            <p className="mt-2 mb-0 text-muted">
              {searchTerm ? 'No staff members found' : 'No staff available'}
            </p>
          </div>
        ) : (
          <div className="staff-selector__items">
            {filteredStaff.map((staff) => (
              <div
                key={staff.id}
                className={`staff-selector__item ${
                  isStaffSelected(staff.id) ? 'staff-selector__item--selected' : ''
                }`}
                onClick={() => onToggleStaff(staff.id)}
              >
                {/* Checkbox */}
                <Form.Check
                  type="checkbox"
                  checked={isStaffSelected(staff.id)}
                  onChange={() => onToggleStaff(staff.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="staff-selector__checkbox"
                />

                {/* Avatar */}
                <StaffAvatar
                  firstName={staff.first_name}
                  lastName={staff.last_name}
                  profileImage={staff.profile_image}
                  size="medium"
                />

                {/* Staff Info */}
                <div className="staff-selector__info">
                  <div className="staff-selector__name">
                    {staff.first_name} {staff.last_name}
                  </div>
                  <div className="staff-selector__details">
                    {staff.role?.name && (
                      <span className="staff-selector__role">{staff.role.name}</span>
                    )}
                    {staff.role?.name && staff.department?.name && (
                      <span className="staff-selector__separator">•</span>
                    )}
                    {staff.department?.name && (
                      <span className="staff-selector__department">
                        {staff.department.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* On Duty Badge */}
                {staff.is_on_duty && (
                  <div className="ms-auto">
                    <OnDutyBadge size="small" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

StaffSelector.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  selectedStaffIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  onToggleStaff: PropTypes.func.isRequired,
  currentUserId: PropTypes.number,
};

export default StaffSelector;
