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

const FilterPills = ({ activeFilter, onFilterChange, counts, rooms = [] }) => {
  
  const getFilterCount = (filterKey) => {
    // counts is now pill-keyed, so we can use it directly
    return counts[filterKey] || 0;
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