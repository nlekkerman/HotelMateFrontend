import React from 'react';

/**
 * Shared fallback rendered when an RBAC gate fails.
 *
 * Two render modes:
 *  - block (default): full-width Bootstrap alert, suitable for page/section level.
 *  - inline: compact muted text, suitable for table-row / button-group level.
 *
 * Backend 403 remains the final authority; this is purely a UI affordance.
 */
export default function NoAccess({
  message = 'You do not have permission to perform this action.',
  inline = false,
  className = '',
}) {
  if (inline) {
    return (
      <span
        className={`text-muted small fst-italic ${className}`}
        role="status"
        aria-label={message}
        title={message}
      >
        <i className="bi bi-lock me-1" aria-hidden="true" />
        No access
      </span>
    );
  }

  return (
    <div className={`alert alert-warning text-center ${className}`} role="alert">
      {message}
    </div>
  );
}
