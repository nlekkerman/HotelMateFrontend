import React, { useState } from 'react';
import FilterControls from './FilterControls';
import BookingTable from './BookingTable';
import StaffSuccessModal from '@/components/staff/modals/StaffSuccessModal';
import { useBookingManagement } from '@/hooks/useBookingManagement';
import { toast } from 'react-toastify';

/**
 * Booking List Component
 * Main component for displaying and managing hotel bookings
 */
const BookingList = ({ hotelSlug, urlParams }) => {
  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '', preset: null });
  
  const {
    bookings,
    statistics,
    isLoading,
    error,
    sendPrecheckinLink,
    acceptBooking,
    declineBooking,
    isSendingPrecheckin,
    isBookingAccepting,
    isBookingDeclining,
    hasBookings,
    isEmpty,
    currentFilter,
    setFilter
  } = useBookingManagement(hotelSlug);



  const handleSendPrecheckin = async (bookingId) => {
    try {
      const result = await sendPrecheckinLink(bookingId);
      const sentTo = result.sent_to || 'guest';
      setSuccessModal({
        show: true,
        message: `Pre-check-in link sent to ${sentTo}`,
        preset: 'precheckin_sent'
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send pre-check-in link. Please try again.');
    }
  };

  const handleApprove = async (bookingId) => {
    try {
      await acceptBooking(bookingId);
      // Success toast is handled in the mutation
    } catch (error) {
      // Error toast is handled in the mutation
    }
  };

  const handleDecline = async (bookingId) => {
    try {
      await declineBooking(bookingId);
      // Success toast is handled in the mutation
    } catch (error) {
      // Error toast is handled in the mutation
    }
  };

  if (error) {
    return (
      <div className="booking-list-error">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="booking-list">
      {/* Stats Summary */}
      <div className="booking-stats mb-4 ">
        <div className="row g-3 justify-content-center">
          <div className="col-md-2">
            <div className="stat-card">
              <div className="stat-number">{statistics.total}</div>
              <div className="stat-label">Total Bookings</div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="stat-card stat-warning">
              <div className="stat-number">{statistics.pendingPayment}</div>
              <div className="stat-label">Pending Payment</div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="stat-card stat-info">
              <div className="stat-number">{statistics.pendingApproval}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="stat-card stat-success">
              <div className="stat-number">{statistics.confirmed}</div>
              <div className="stat-label">Confirmed</div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="stat-card stat-info">
              <div className="stat-number">{statistics.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="stat-card stat-danger">
              <div className="stat-number">{statistics.cancelled}</div>
              <div className="stat-label">Cancelled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="booking-list-loading">
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading bookings...</p>
          </div>
        </div>
      )}

      {/* Booking Table */}
      {!isLoading && (
        <BookingTable
          bookings={bookings}
          onSendPrecheckin={handleSendPrecheckin}
          onApprove={handleApprove}
          onDecline={handleDecline}
          loading={isSendingPrecheckin}
          isBookingAccepting={isBookingAccepting}
          isBookingDeclining={isBookingDeclining}
          hotelSlug={hotelSlug}
        />
      )}

      {/* Staff Success/Error Modal */}
      <StaffSuccessModal
        show={successModal.show}
        title={successModal.title}
        message={successModal.message}
        preset={successModal.preset}
        onClose={() => setSuccessModal({ show: false, title: '', message: '', preset: null })}
      />
    </div>
  );
};

export default BookingList;