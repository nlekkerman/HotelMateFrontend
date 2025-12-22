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
  onViewPrecheckin,
  loading,
  isAccepting,
  isDeclining
}) => {
  const [showPrecheckinModal, setShowPrecheckinModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  const canApprove = booking.status === 'PENDING_APPROVAL';
  const canDecline = booking.status === 'PENDING_APPROVAL';
  const canSendPrecheckin = booking.status === 'CONFIRMED' && 
    (booking.guest_email || booking.primary_email || booking.booker_email);
  const isPrecheckinComplete = booking?.precheckin_submitted_at != null;



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

  // Check if THIS specific booking is being processed
  const isThisBookingAccepting = isAccepting && booking.booking_id;
  const isThisBookingDeclining = isDeclining && booking.booking_id;

  return (
    <div className="booking-actions">
      {/* Approve/Decline buttons - only for PENDING_APPROVAL */}
      {canApprove && (
        <button 
          onClick={handleApprove}
          className="btn btn-success btn-sm me-2"
          title="Approve booking and capture payment"
          disabled={isAccepting || isDeclining}
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
      )}
      
      {canDecline && (
        <button 
          onClick={handleDecline}
          className="btn btn-outline-warning btn-sm me-2"
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
      )}

      {/* Pre-check-in button - conditional based on completion status */}
      {canSendPrecheckin && (
        isPrecheckinComplete ? (
          <button 
            onClick={() => {
              if (onViewPrecheckin) {
                onViewPrecheckin(booking.booking_id);
              }
            }}
            className="btn btn-success btn-sm"
            title="View Pre-Check-In Details"
            disabled={loading}
          >
            <i className="bi bi-eye me-1"></i>
            View Pre-Check-In
          </button>
        ) : (
          <button 
            onClick={handleSendPrecheckin}
            className="btn btn-danger btn-sm"
            title="Send Pre-Check-In Link"
            disabled={loading}
          >
            <i className="bi bi-envelope me-1"></i>
            Send Pre-Check-In
          </button>
        )
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