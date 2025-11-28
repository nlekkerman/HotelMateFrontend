import React, { useState } from 'react';
import StaffConfirmationModal from '@/components/staff/modals/StaffConfirmationModal';
import StaffInputModal from '@/components/staff/modals/StaffInputModal';

/**
 * Booking Actions Component
 * Provides action buttons for booking operations (confirm, cancel)
 */
const BookingActions = ({ booking, onConfirm, onCancel, loading }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const canConfirm = booking.status === 'PENDING_PAYMENT';
  const canCancel = booking.status === 'PENDING_PAYMENT'; // Only pending bookings can be cancelled

  const handleConfirm = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmConfirm = () => {
    onConfirm(booking.booking_id);
    setShowConfirmModal(false);
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = (reason) => {
    onCancel(booking.booking_id, reason || 'Cancelled by staff');
    setShowCancelModal(false);
  };

  return (
    <div className="booking-actions">
      {booking.status === 'PENDING_PAYMENT' ? (
        <>
          <button 
            onClick={handleConfirm}
            className="btn btn-success btn-sm me-1"
            title="Confirm Booking"
            disabled={loading}
          >
            <i className="bi bi-check-circle me-1"></i>
            Confirm
          </button>
          
          <button 
            onClick={handleCancel}
            className="btn btn-danger btn-sm me-1"
            title="Cancel Booking"
            disabled={loading}
          >
            <i className="bi bi-x-circle me-1"></i>
            Cancel
          </button>
        </>
      ) : (
        // Show status badges for non-actionable bookings
        <>
          {booking.status === 'CONFIRMED' && (
            <span className="badge bg-success">
              <i className="bi bi-check-circle me-1"></i>
              Confirmed
            </span>
          )}
          
          {booking.status === 'CANCELLED' && (
            <span className="badge bg-danger">
              <i className="bi bi-x-circle me-1"></i>
              Cancelled
            </span>
          )}

          {booking.status === 'COMPLETED' && (
            <span className="badge bg-info">
              <i className="bi bi-calendar-check me-1"></i>
              Completed
            </span>
          )}

          {booking.status === 'NO_SHOW' && (
            <span className="badge bg-secondary">
              <i className="bi bi-person-x me-1"></i>
              No Show
            </span>
          )}
        </>
      )}

      {/* Staff Confirmation Modal for Booking Confirmation */}
      <StaffConfirmationModal
        show={showConfirmModal}
        title="Confirm Booking"
        message={`Are you sure you want to confirm booking ${booking.booking_id}?`}
        preset="confirm_booking"
        onConfirm={handleConfirmConfirm}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Staff Input Modal for Booking Cancellation */}
      <StaffInputModal
        show={showCancelModal}
        title="Cancel Booking"
        message={`Cancel booking ${booking.booking_id}?\n\nPlease provide a reason (optional):`}
        placeholder="Enter cancellation reason..."
        defaultValue="Cancelled by staff"
        storageKey="booking_cancellation_reason"
        preset="cancel_booking"
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
};

export default BookingActions;