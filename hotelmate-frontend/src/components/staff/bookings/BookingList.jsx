import React, { useState } from 'react';
import FilterControls from './FilterControls';
import BookingTable from './BookingTable';
import StaffSuccessModal from '@/components/staff/modals/StaffSuccessModal';
import useBookingManagement from '@/hooks/useBookingManagement';

/**
 * Booking List Component
 * Main component for displaying and managing hotel bookings
 */
const BookingList = ({ hotelSlug, urlParams }) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '', preset: null });
  
  const {
    bookings,
    loading,
    error,
    filters,
    stats,
    confirmBooking,
    cancelBooking,
    updateFilter,
    clearFilters,
    setFilterFromUrl,
    hasBookings,
    isEmpty
  } = useBookingManagement(hotelSlug);

  // Apply URL parameters on component mount
  React.useEffect(() => {
    if (urlParams) {
      setFilterFromUrl(urlParams);
    }
  }, [urlParams, setFilterFromUrl]);

  const handleConfirm = async (bookingId) => {
    setActionLoading(true);
    try {
      const result = await confirmBooking(bookingId);
      if (result.success) {
        setSuccessModal({
          show: true,
          message: result.message,
          preset: 'booking_confirmed'
        });
      } else {
        setSuccessModal({
          show: true,
          title: 'Confirmation Failed',
          message: result.message,
          preset: null
        });
      }
    } catch (error) {
      setSuccessModal({
        show: true,
        title: 'Error',
        message: 'Failed to confirm booking',
        preset: null
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (bookingId, reason) => {
    setActionLoading(true);
    try {
      const result = await cancelBooking(bookingId, reason);
      if (result.success) {
        setSuccessModal({
          show: true,
          message: result.message,
          preset: 'booking_cancelled'
        });
      } else {
        setSuccessModal({
          show: true,
          title: 'Cancellation Failed',
          message: result.message,
          preset: null
        });
      }
    } catch (error) {
      setSuccessModal({
        show: true,
        title: 'Error',
        message: 'Failed to cancel booking',
        preset: null
      });
    } finally {
      setActionLoading(false);
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
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Bookings</div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="stat-card stat-warning">
              <div className="stat-number">{stats.pending}</div>
              <div className="stat-label">Pending Payment</div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="stat-card stat-success">
              <div className="stat-number">{stats.confirmed}</div>
              <div className="stat-label">Confirmed</div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="stat-card stat-info">
              <div className="stat-number">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="stat-card stat-danger">
              <div className="stat-number">{stats.cancelled}</div>
              <div className="stat-label">Cancelled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <FilterControls
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        stats={stats}
      />

      {/* Loading State */}
      {loading && (
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
      {!loading && (
        <BookingTable
          bookings={bookings}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={actionLoading}
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