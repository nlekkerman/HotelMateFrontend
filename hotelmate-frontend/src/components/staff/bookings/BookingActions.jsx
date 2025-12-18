import React, { useState } from 'react';
import StaffConfirmationModal from '@/components/staff/modals/StaffConfirmationModal';
import StaffInputModal from '@/components/staff/modals/StaffInputModal';

/**
 * Booking Actions Component
 * Provides action buttons for booking operations (confirm, cancel, send pre-check-in, approve, decline)
 */
const BookingActions = ({ 
  booking, 
  onSendPrecheckin, 
  onApprove, 
  onDecline, 
  loading,
  isAccepting,
  isDeclining
}) => {
  const [showPrecheckinModal, setShowPrecheckinModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  const canApprove = booking.status === 'PENDING_APPROVAL' && booking.party_complete !== false;
  const canDecline = booking.status === 'PENDING_APPROVAL';
  const canSendPrecheckin = booking.status === 'CONFIRMED' && 
    (booking.guest_email || booking.primary_email || booking.booker_email);



  const handleSendPrecheckin = () => {
    setShowPrecheckinModal(true);
  };

  const handleSendPrecheckinConfirm = () => {
    onSendPrecheckin(booking.booking_id);
    setShowPrecheckinModal(false);
  };

  const handleApprove = () => {
    setShowApproveModal(true);
  };

  const handleApproveConfirm = () => {
    onApprove(booking.booking_id);
    setShowApproveModal(false);
  };

  const handleDecline = () => {
    setShowDeclineModal(true);
  };

  const handleDeclineConfirm = () => {
    onDecline(booking.booking_id);
    setShowDeclineModal(false);
  };

  return (
    <div className="booking-actions">
      {booking.status === 'PENDING_APPROVAL' ? (
        <>
          <button 
            onClick={handleApprove}
            className="btn btn-success btn-sm me-2"
            title={booking.party_complete === false ? "Complete guest information first" : "Approve booking and capture payment"}
            disabled={isAccepting || isDeclining || booking.party_complete === false}
          >
            {isAccepting ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-1"></i>
                Approve & Capture
              </>
            )}
          </button>
          
          <button 
            onClick={handleDecline}
            className="btn btn-outline-warning btn-sm"
            title="Decline booking and release authorization"
            disabled={isAccepting || isDeclining}
          >
            {isDeclining ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-x-circle me-1"></i>
                Decline & Release
              </>
            )}
          </button>
        </>
      ) : (
        <>
          {booking.status === 'CONFIRMED' && (
            <>
              <span className="badge bg-success me-2">
                <i className="bi bi-check-circle me-1"></i>
                Confirmed
              </span>
              {canSendPrecheckin && (
                <button 
                  onClick={handleSendPrecheckin}
                  className="btn btn-outline-primary btn-sm"
                  title="Send Pre-Check-In Link"
                  disabled={loading}
                >
                  <i className="bi bi-envelope me-1"></i>
                  Pre-Check-In
                </button>
              )}
            </>
          )}
          
          {booking.status === 'CANCELLED' && (
            <span className="badge bg-danger">
              <i className="bi bi-x-circle me-1"></i>
              Cancelled
            </span>
          )}

          {booking.status === 'DECLINED' && (
            <span className="badge bg-warning">
              <i className="bi bi-x-circle me-1"></i>
              Declined
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



      <StaffConfirmationModal
        show={showPrecheckinModal}
        title="Send Pre-Check-In Link"
        message={`Send pre-check-in link for booking ${booking.booking_id}?\n\nEmail will be sent to: ${booking.guest_email || booking.primary_email || booking.booker_email}`}
        preset="send_precheckin"
        onConfirm={handleSendPrecheckinConfirm}
        onCancel={() => setShowPrecheckinModal(false)}
      />

      <StaffConfirmationModal
        show={showApproveModal}
        title="Approve Booking"
        message="This will charge the guest now."
        preset="approve_booking"
        onConfirm={handleApproveConfirm}
        onCancel={() => setShowApproveModal(false)}
      />

      <StaffConfirmationModal
        show={showDeclineModal}
        title="Decline Booking"
        message="This will cancel the authorization (guest won't be charged)."
        preset="decline_booking"
        onConfirm={handleDeclineConfirm}
        onCancel={() => setShowDeclineModal(false)}
      />
    </div>
  );
};

export default BookingActions;