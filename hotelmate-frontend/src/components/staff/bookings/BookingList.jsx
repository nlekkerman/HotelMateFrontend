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
    currentBucket,
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
          {error.message || error.response?.data?.message || 'Failed to load bookings'}
        </div>
      </div>
    );
  }

  return (
    <div className="booking-list">
      {/* Unified Filter Bar - NEW IMPLEMENTATION */}
      <div className="unified-booking-filters mb-4">
        {/* Left Side: Operational Buckets (Daily Operations) */}
        <div className="operational-group">
          <button
            className={`btn btn-outline-primary btn-sm ${(!currentFilter || currentFilter === 'all') && !currentBucket ? 'active' : ''}`}
            onClick={() => setFilter('filter', 'all')}
          >
            All ({statistics.total || 0})
          </button>
          <button
            className={`btn btn-outline-primary btn-sm ${currentBucket === 'arrivals' ? 'active' : ''}`}
            onClick={() => setFilter('bucket', currentBucket === 'arrivals' ? null : 'arrivals')}
          >
            Arrivals ({statistics.arrivals || 0})
          </button>
          <button
            className={`btn btn-outline-primary btn-sm ${currentBucket === 'in_house' ? 'active' : ''}`}
            onClick={() => setFilter('bucket', currentBucket === 'in_house' ? null : 'in_house')}
          >
            In-House ({statistics.in_house || 0})
          </button>
          <button
            className={`btn btn-outline-primary btn-sm ${currentBucket === 'departures' ? 'active' : ''}`}
            onClick={() => setFilter('bucket', currentBucket === 'departures' ? null : 'departures')}
          >
            Departures ({statistics.departures || 0})
          </button>
        </div>

        {/* Right Side: Administrative Status (Business Operations) */}
        <div className="administrative-group">
          <button
            className={`btn btn-outline-secondary btn-sm ${currentBucket === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('bucket', currentBucket === 'pending' ? null : 'pending')}
          >
            Pending ({(statistics.pendingPayment || 0) + (statistics.pendingApproval || 0)})
          </button>
          <button
            className={`btn btn-outline-secondary btn-sm ${currentFilter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilter('filter', currentFilter === 'confirmed' ? 'all' : 'confirmed')}
          >
            Completed ({statistics.confirmed || 0})
          </button>
          <button
            className={`btn btn-outline-secondary btn-sm ${currentBucket === 'checked_out' ? 'active' : ''}`}
            onClick={() => setFilter('bucket', currentBucket === 'checked_out' ? null : 'checked_out')}
          >
            History ({statistics.checked_out || 0})
          </button>
          <button
            className={`btn btn-outline-secondary btn-sm ${currentBucket === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilter('bucket', currentBucket === 'cancelled' ? null : 'cancelled')}
          >
            Cancelled ({statistics.cancelled || 0})
          </button>
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