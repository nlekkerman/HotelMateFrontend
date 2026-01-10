// src/pages/housekeeping/components/FilterPills.jsx
import React from 'react';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All', variant: 'outline-primary' },
  { key: 'checkout-dirty', label: 'Checkout Dirty', variant: 'outline-warning' },
  { key: 'cleaning', label: 'Cleaning', variant: 'outline-info' },
  { key: 'cleaned', label: 'Cleaned', variant: 'outline-success' },
  { key: 'ready', label: 'Ready', variant: 'outline-primary' },
  { key: 'maintenance', label: 'Maintenance', variant: 'outline-secondary' },
  { key: 'out-of-order', label: 'Out of Order', variant: 'outline-danger' },
  { key: 'occupied', label: 'Occupied', variant: 'outline-dark' }
];

const STATUS_TO_COUNT_KEY = {
  'all': null, // Special case - count all rooms
  'checkout-dirty': 'CHECKOUT_DIRTY',
  'cleaning': 'CLEANING_IN_PROGRESS',
  'cleaned': 'CLEANED_UNINSPECTED',
  'ready': 'READY_FOR_GUEST',
  'maintenance': 'MAINTENANCE_REQUIRED',
  'out-of-order': 'OUT_OF_ORDER',
  'occupied': 'OCCUPIED'
};

const FilterPills = ({ activeFilter, onFilterChange, counts, roomsById }) => {
  
  const getFilterCount = (filterKey) => {
    if (filterKey === 'all') {
      return Object.keys(roomsById).length;
    }

    const statusKey = STATUS_TO_COUNT_KEY[filterKey];
    if (!statusKey) return 0;

    // For out-of-order, also check is_out_of_order flag
    if (filterKey === 'out-of-order') {
      return Object.values(roomsById).filter(room => 
        room.room_status === 'OUT_OF_ORDER' || room.is_out_of_order
      ).length;
    }

    return counts[statusKey] || 0;
  };

  return (
    <div className="mb-4">
      <div className="d-flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(option => {
          const count = getFilterCount(option.key);
          const isActive = activeFilter === option.key;
          
          return (
            <button
              key={option.key}
              className={`btn ${isActive ? option.variant.replace('outline-', '') : option.variant} btn-sm d-flex align-items-center gap-2`}
              onClick={() => onFilterChange(option.key)}
            >
              <span>{option.label}</span>
              <span className={`badge ${isActive ? 'bg-white text-dark' : 'bg-primary'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterPills;