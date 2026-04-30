import React, { useState } from "react";
import { handleClockAction, showClockOptionsModal, getActionDescription } from "../utils/clockActions";
import { showToast } from "../utils/statusUpdates";
import { useCan } from "@/rbac";
import NoAccess from "@/components/NoAccess";

/**
 * Attendance Clock Actions Component
 * Provides clock in/out, break start/end buttons for staff in attendance table
 */
export default function AttendanceClockActions({ staff, hotelSlug, onAction }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { can } = useCan();
  const canClock = can("attendance", "clock_in_out");
  const canBreak = can("attendance", "break_toggle");

  // Don't show actions if no staff or current_status
  if (!staff || !staff.current_status || !hotelSlug) {
    return null;
  }

  const currentStatus = staff.current_status;
  // Primary action authority depends on current status:
  // off_duty -> clock_in_out, on_duty/on_break -> break_toggle
  const isBreakAction = currentStatus.status === 'on_duty' || currentStatus.status === 'on_break';
  const canPrimary = isBreakAction ? canBreak : canClock;

  const handleAction = async (actionType = 'primary') => {
    if (loading) return;
    if (actionType === 'primary' && !canPrimary) return;
    // Secondary modal exposes both break_toggle and clock_in_out options;
    // require at least one to be allowed.
    if (actionType !== 'primary' && !canBreak && !canClock) return;

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
          if (typeof onAction === 'function') {
            onAction(modalResult);
          }
          setLoading(false);
        });
        return; // Exit early for modal
      }

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

  // Hide entirely if user has no clock authority at all.
  if (!canClock && !canBreak) {
    return <NoAccess inline />;
  }

  return (
    <div className="attendance-clock-actions">
      <div className="d-flex gap-2 align-items-center">
        {/* Primary Action Button */}
        <button
          type="button"
          className={`btn btn-sm btn-${primaryAction.variant}`}
          disabled={loading || !canPrimary}
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