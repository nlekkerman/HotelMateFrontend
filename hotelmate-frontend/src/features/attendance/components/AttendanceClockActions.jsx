import React, { useState } from "react";
import { handleClockAction, showClockOptionsModal, getActionDescription } from "../utils/clockActions";
import { showToast } from "../utils/statusUpdates";

/**
 * Attendance Clock Actions Component
 * Provides clock in/out, break start/end buttons for staff in attendance table
 */
export default function AttendanceClockActions({ staff, hotelSlug, onAction }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Don't show actions if no staff or current_status
  if (!staff || !staff.current_status || !hotelSlug) {
    return null;
  }

  const currentStatus = staff.current_status;

  const handleAction = async (actionType = 'primary') => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (actionType === 'primary') {
        // Handle the primary action based on current status
        result = await handleClockAction(currentStatus, hotelSlug);
      } else {
        // Handle secondary actions (show options modal)
        showClockOptionsModal(currentStatus, hotelSlug, (modalResult) => {
          console.log('[AttendanceClockActions] Modal action completed:', modalResult);
          if (typeof onAction === 'function') {
            onAction(modalResult);
          }
          setLoading(false);
        });
        return; // Exit early for modal
      }

      console.log('[AttendanceClockActions] Action completed:', result);
      
      // Show success notification
      showToast(`${primaryAction.label} successful!`, 'success', 2000);
      
      if (typeof onAction === 'function') {
        onAction(result);
      }
    } catch (err) {
      console.error('[AttendanceClockActions] Action failed:', err);
      setError(err.response?.data?.detail || err.message || 'Action failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Get button info based on current status
  const getPrimaryAction = () => {
    switch (currentStatus.status) {
      case 'off_duty':
        return { 
          label: 'Clock In', 
          variant: 'success',
          icon: 'bi-clock'
        };
      case 'on_duty':
        return { 
          label: 'Start Break', 
          variant: 'warning',
          icon: 'bi-pause-circle'
        };
      case 'on_break':
        return { 
          label: 'End Break', 
          variant: 'info',
          icon: 'bi-play-circle'
        };
      default:
        return { 
          label: 'Clock Action', 
          variant: 'secondary',
          icon: 'bi-clock'
        };
    }
  };

  const primaryAction = getPrimaryAction();

  // Show secondary options for complex states
  const showSecondaryAction = currentStatus.status === 'on_duty' || currentStatus.status === 'on_break';

  return (
    <div className="attendance-clock-actions">
      <div className="d-flex gap-2 align-items-center">
        {/* Primary Action Button */}
        <button
          type="button"
          className={`btn btn-sm btn-${primaryAction.variant}`}
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            handleAction('primary');
          }}
          title={loading ? 'Processing...' : primaryAction.label}
        >
          {loading ? (
            <div className="spinner-border spinner-border-sm me-1" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : (
            <i className={`bi ${primaryAction.icon} me-1`}></i>
          )}
          {loading ? '...' : primaryAction.label}
        </button>

        {/* Secondary Actions (Options) */}
        {showSecondaryAction && !loading && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleAction('options');
            }}
            title="More options"
          >
            <i className="bi bi-three-dots"></i>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-danger small mt-1" style={{ fontSize: "0.75rem" }}>
          {error}
        </div>
      )}

      {/* Status Display */}
      {currentStatus.is_on_break && currentStatus.total_break_minutes && (
        <small className="text-muted d-block mt-1">
          Break: {currentStatus.total_break_minutes}min
        </small>
      )}
    </div>
  );
}