import React from 'react';

/**
 * Filter Controls Component
 * Provides UI for filtering bookings by status and date range
 */
const FilterControls = ({ filters, onFilterChange, onClearFilters, stats }) => {
  const handleFilterChange = (key, value) => {
    onFilterChange(key, value);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return `Pending Payment (${stats.pending})`;
      case 'CONFIRMED':
        return `Confirmed (${stats.confirmed})`;
      case 'CANCELLED':
        return `Cancelled (${stats.cancelled})`;
      case 'COMPLETED':
        return `Completed (${stats.completed})`;
      default:
        return `All Statuses (${stats.total})`;
    }
  };

  return (
    <div className="filter-controls">
      <div className="filter-group">
        <label htmlFor="status-filter">Status:</label>
        <select
          id="status-filter"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="form-select"
        >
          <option value="">All Statuses ({stats.total})</option>
          <option value="PENDING_PAYMENT">Pending Payment ({stats.pending})</option>
          <option value="CONFIRMED">Confirmed ({stats.confirmed})</option>
          <option value="CANCELLED">Cancelled ({stats.cancelled})</option>
          <option value="COMPLETED">Completed ({stats.completed})</option>
          <option value="NO_SHOW">No Show</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="start-date">Check-in From:</label>
        <input
          id="start-date"
          type="date"
          value={filters.start_date}
          onChange={(e) => handleFilterChange('start_date', e.target.value)}
          className="form-control"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="end-date">Check-out Until:</label>
        <input
          id="end-date"
          type="date"
          value={filters.end_date}
          onChange={(e) => handleFilterChange('end_date', e.target.value)}
          className="form-control"
        />
      </div>

      <div className="filter-actions">
        <button 
          onClick={onClearFilters} 
          className="btn btn-outline-secondary btn-clear"
          type="button"
        >
          <i className="bi bi-x-circle me-1"></i>
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default FilterControls;