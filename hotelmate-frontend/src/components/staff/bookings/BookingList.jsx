import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import BookingTable from './BookingTable';
import AdvancedFiltersPanel from './AdvancedFiltersPanel';
import BookingSearchInput from './BookingSearchInput';
import StaffSuccessModal from '@/components/staff/modals/StaffSuccessModal';
import { useStaffRoomBookings } from '@/hooks/useStaffRoomBookings';
import { staffBookingService } from '@/services/api';
import { BUCKET_OPTIONS } from '@/types/bookingFilters';

/**
 * Modern Booking List Component
 * Uses canonical FilterSet backend with new filter UI
 */
const BookingList = ({ hotelSlug }) => {
  const queryClient = useQueryClient();
  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '', preset: null });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const {
    bookings,
    pagination,
    statistics,
    filters,
    page,
    isLoading,
    isFetching,
    error,
    updateFilters,
    updatePage,
    resetFilters,
    setBucket,
    setSearch,
    refetch,
    hasBookings,
    isEmpty,
    isFiltered
  } = useStaffRoomBookings(hotelSlug);

  // Send pre-check-in link mutation
  const sendPrecheckinMutation = useMutation({
    mutationFn: async (bookingId) => {
      return await staffBookingService.sendPrecheckinLink(hotelSlug, bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
    }
  });

  // Accept booking mutation
  const acceptBookingMutation = useMutation({
    mutationFn: async (bookingId) => {
      return await staffBookingService.acceptRoomBooking(hotelSlug, bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      toast.success('Booking approved, payment captured.');
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        const errorMessage = error.response?.data?.message || 'Booking expired and cannot be approved.';
        toast.error(errorMessage);
        queryClient.invalidateQueries({
          queryKey: ['staff-room-bookings', hotelSlug]
        });
      } else {
        toast.error(error.response?.data?.message || 'Failed to approve booking');
      }
    }
  });

  // Decline booking mutation
  const declineBookingMutation = useMutation({
    mutationFn: async (bookingId) => {
      return await staffBookingService.declineRoomBooking(hotelSlug, bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      toast.success('Booking declined, authorization released.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to decline booking');
    }
  });

  const handleSendPrecheckin = async (bookingId) => {
    try {
      const result = await sendPrecheckinMutation.mutateAsync(bookingId);
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
    await acceptBookingMutation.mutateAsync(bookingId);
  };

  const handleDecline = async (bookingId) => {
    await declineBookingMutation.mutateAsync(bookingId);
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