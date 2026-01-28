import React, { useState } from 'react';
import StaffConfirmationModal from '@/components/staff/modals/StaffConfirmationModal';
import StaffInputModal from '@/components/staff/modals/StaffInputModal';

/**
 * Booking Actions Component
 * Provides action buttons for booking operations (confirm, cancel, send pre-check-in, send survey, approve, decline)
 */
const BookingActions = ({ 
  booking, 
  onSendPrecheckin, 
  onSendSurvey,
  onApprove, 
  onDecline, 
  onViewPrecheckin,
  loading,
  isAccepting,
  isDeclining
}) => {
  const [showPrecheckinModal, setShowPrecheckinModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  const canApprove = booking.status === 'PENDING_APPROVAL' || booking.status === 'PENDING_PAYMENT';
  const canDecline = booking.status === 'PENDING_APPROVAL' || booking.status === 'PENDING_PAYMENT';
  const canSendPrecheckin = booking.status === 'CONFIRMED' && 
    (booking.guest_email || booking.primary_email || booking.booker_email);
  const isPrecheckinComplete = booking?.precheckin_submitted_at != null;
  
  // Disable all actions if booking is expired
  const isExpired = booking.status === 'EXPIRED';
  const effectiveCanApprove = canApprove && !isExpired;
  const effectiveCanDecline = canDecline && !isExpired;
  const effectiveCanSendPrecheckin = canSendPrecheckin && !isExpired;
  
  // Room operations logic
  const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
  const isCheckedOut = !!booking.checked_out_at;
  const hasAssignedRoom = booking.assigned_room || booking.room;
  const canShowRoomOperation = hasAssignedRoom && !isCheckedOut;
  
  // Survey button logic - Frontend Guards (Hard Rules)
  const canSendSurvey = booking.status === 'COMPLETED' && 
    !booking.survey_completed &&
    (booking.guest_email || booking.primary_email || booking.booker_email);
  const isSurveyCompleted = booking?.survey_completed;
  const hasSurveySent = booking?.survey_sent_at != null;



  const handleSendPrecheckin = () => {
    setShowPrecheckinModal(true);
  };

  const handleSendPrecheckinConfirm = () => {
    onSendPrecheckin(booking.booking_id);
    setShowPrecheckinModal(false);
  };

  const handleSendSurvey = () => {
    setShowSurveyModal(true);
  };

  const handleSendSurveyConfirm = () => {
    if (onSendSurvey) {
      onSendSurvey(booking.booking_id);
    }
    setShowSurveyModal(false);
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
      {/* Show EXPIRED notice if booking is expired */}
      {isExpired && (
        <small className="text-muted">
          <i className="bi bi-clock-history me-1"></i>
          Actions disabled - booking expired
        </small>
      )}
      
      {/* Approve/Decline buttons - only for PENDING_APPROVAL and not expired */}
      {effectiveCanApprove && (
        <button 
          onClick={handleApprove}
          className="btn btn-success btn-sm me-2"
          title={booking.paid_at ? "Confirm booking" : "Approve booking and capture payment"}
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
      
      {effectiveCanDecline && (
        <button 
          onClick={handleDecline}
          className="btn btn-outline-warning btn-sm me-2"
          title={booking.paid_at ? "Decline & refund" : "Decline booking"}
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

      {/* Pre-check-in button - conditional based on completion status and not expired */}
      {effectiveCanSendPrecheckin && (
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

      {/* Room Operation button - conditional based on guest status */}
      {canShowRoomOperation && (
        <button 
          className="btn btn-outline-primary btn-sm"
          title={isInHouse ? "Move guest to different room" : "Reassign room before check-in"}
          disabled={loading}
        >
          <i className={`bi ${isInHouse ? 'bi-house-door' : 'bi-arrow-repeat'} me-1`}></i>
          {isInHouse ? 'Move Room' : 'Reassign Room'}
          {booking.room_moved_at && (
            <span className="badge bg-info ms-1" style={{ fontSize: '0.65rem' }}>Moved</span>
          )}
        </button>
      )}

      {/* Survey button - only for COMPLETED bookings */}
      {canSendSurvey && (
        hasSurveySent && !isSurveyCompleted ? (
          <button 
            onClick={handleSendSurvey}
            className="btn btn-outline-info btn-sm me-2"
            title="Resend Survey Link"
            disabled={loading}
          >
            <i className="bi bi-envelope me-1"></i>
            Resend Survey
          </button>
        ) : (
          <button 
            onClick={handleSendSurvey}
            className="btn btn-info btn-sm me-2"
            title="Send Survey Link"
            disabled={loading}
          >
            <i className="bi bi-envelope-paper me-1"></i>
            Send Survey
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
        show={showSurveyModal}
        title={hasSurveySent && !isSurveyCompleted ? "Resend Survey Link" : "Send Survey Link"}
        message={`${hasSurveySent && !isSurveyCompleted ? 'Resend' : 'Send'} survey link for booking ${booking.booking_id}?\n\nEmail will be sent to: ${booking.guest_email || booking.primary_email || booking.booker_email}`}
        preset="send_survey"
        onConfirm={handleSendSurveyConfirm}
        onCancel={() => setShowSurveyModal(false)}
      />

      <StaffConfirmationModal
        show={showApproveModal}
        title="Approve Booking"
        message={`You will accept booking ${booking.booking_id || booking.id} for ${
          booking.party?.primary?.full_name ||
          booking.party_primary_full_name ||
          booking.guest_display_name ||
          booking.guest_name ||
          (booking.party?.primary?.first_name && booking.party?.primary?.last_name
            ? `${booking.party.primary.first_name} ${booking.party.primary.last_name}`
            : (booking.primary_first_name && booking.primary_last_name
              ? `${booking.primary_first_name} ${booking.primary_last_name}`
              : (booking.first_name && booking.last_name
                ? `${booking.first_name} ${booking.last_name}`
                : 'Guest Information Pending')))
        }.\n\nCheck-in: ${booking.check_in ? new Date(booking.check_in).toLocaleDateString() : 'Not set'}\nStay duration: ${booking.check_in && booking.check_out ? Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)) + ' nights' : 'Not calculated'}`}
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