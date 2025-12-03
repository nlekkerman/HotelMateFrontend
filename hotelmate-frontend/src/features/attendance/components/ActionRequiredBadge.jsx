import React from 'react';

/**
 * Action Required Badge Component
 * Displays a small badge indicating the number of actions required for a staff member
 * Used to show unrostered logs awaiting approval
 */
export default function ActionRequiredBadge({ count = 0, className = '' }) {
  // Don't render anything if count is 0 or invalid
  if (!count || count <= 0) {
    return null;
  }

  return (
    <span 
      className={`badge bg-warning text-dark ms-2 ${className}`}
      style={{ 
        fontSize: '0.65rem',
        padding: '0.2rem 0.4rem',
        borderRadius: '0.75rem',
        fontWeight: '600'
      }}
      title={`${count} action${count !== 1 ? 's' : ''} required`}
    >
      <i className="bi bi-exclamation-triangle-fill me-1" style={{ fontSize: '0.6rem' }}></i>
      {count}
    </span>
  );
}