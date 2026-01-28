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
    onSuccess: (result, bookingId) => {
      // Mark the booking as seen to remove NEW badge
      queryClient.setQueryData(['staff-room-bookings', hotelSlug], (oldData) => {
        if (!oldData?.results) return oldData;
        
        return {
          ...oldData,
          results: oldData.results.map(booking => 
            booking.booking_id === bookingId || booking.id === bookingId
              ? {
                  ...booking,
                  staff_seen_at: new Date().toISOString(),
                  is_new_for_staff: false,
                  status: 'CONFIRMED' // Update status optimistically
                }
              : booking
          )
        };
      });
      
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
    onSuccess: (result, bookingId) => {
      // Mark the booking as seen to remove NEW badge
      queryClient.setQueryData(['staff-room-bookings', hotelSlug], (oldData) => {
        if (!oldData?.results) return oldData;
        
        return {
          ...oldData,
          results: oldData.results.map(booking => 
            booking.booking_id === bookingId || booking.id === bookingId
              ? {
                  ...booking,
                  staff_seen_at: new Date().toISOString(),
                  is_new_for_staff: false,
                  status: 'CANCELLED' // Update status optimistically
                }
              : booking
          )
        };
      });
      
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
      // Mark the booking as seen first
      queryClient.setQueryData(['staff-room-bookings', hotelSlug], (oldData) => {
        if (!oldData?.results) return oldData;
        
        return {
          ...oldData,
          results: oldData.results.map(booking => 
            booking.booking_id === bookingId || booking.id === bookingId
              ? {
                  ...booking,
                  staff_seen_at: new Date().toISOString(),
                  is_new_for_staff: false
                }
              : booking
          )
        };
      });
      
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

  // Error state
  if (error) {
    return (
      <Container fluid>
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error.message || error.response?.data?.message || 'Failed to load bookings'}
          <button className="btn btn-outline-danger btn-sm ms-3" onClick={refetch}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Retry
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      {/* Modern Bucket Filter Bar */}
      <div className="modern-bucket-bar mb-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-center">
          {BUCKET_OPTIONS.map((bucket) => {
            const isActive = filters.bucket === bucket.value;
            const count = filters.include_counts ? statistics[bucket.key] : null;
            
            return (
              <button
                key={bucket.key}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setBucket(isActive ? null : bucket.value)}
              >
                {bucket.label}
                {count !== null && ` (${count})`}
              </button>
            );
          })}
        </div>
       
      </div>

      {/* Search and Advanced Filters */}
      <Row className="mb-4">
        <Col md={8}>
          <BookingSearchInput
            value={filters.q}
            onChange={setSearch}
            placeholder="Search guests, emails, booking IDs, rooms..."
          />
        </Col>
        <Col md={4} className="d-flex gap-2">
          {isFiltered && (
            <button
              className="btn btn-outline-warning btn-sm"
              onClick={resetFilters}
              title="Clear all filters"
            >
              <i className="bi bi-funnel"></i>
              Clear ({Object.values(filters).filter(v => 
                v !== null && v !== '' && (!Array.isArray(v) || v.length > 0)
              ).length})
            </button>
          )}
          <div className="d-flex align-items-center">
            {isFetching && (
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Updating...</span>
              </div>
            )}
            <small className="text-muted">
              {pagination ? `${pagination.count} total` : `${bookings.length} results`}
            </small>
          </div>
        </Col>
      </Row>

      {/* Advanced Filters Panel */}
      <AdvancedFiltersPanel
        filters={filters}
        onFilterChange={updateFilters}
        show={showAdvancedFilters}
        onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
        roomTypes={[]} // TODO: Add room types from hotel data
      />

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading bookings...</span>
          </div>
          <p className="mt-3 text-muted">Loading bookings...</p>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-5">
          <i className="bi bi-calendar-x" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
          <h5 className="mt-3 text-muted">No bookings found</h5>
          <p className="text-muted">
            {isFiltered 
              ? 'Try adjusting your filters or search terms.' 
              : 'No bookings available for this hotel.'}
          </p>
        </div>
      )}

      {/* Bookings Table */}
      {hasBookings && (
        <BookingTable
          bookings={bookings}
          onSendPrecheckin={handleSendPrecheckin}
          onApprove={handleApprove}
          onDecline={handleDecline}
          loading={sendPrecheckinMutation.isPending}
          isBookingAccepting={(bookingId) => acceptBookingMutation.isPending && acceptBookingMutation.variables === bookingId}
          isBookingDeclining={(bookingId) => declineBookingMutation.isPending && declineBookingMutation.variables === bookingId}
          hotelSlug={hotelSlug}
        />
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav aria-label="Booking list pagination">
            <ul className="pagination">
              <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => updatePage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </button>
              </li>
              
              {Array.from({ length: Math.min(pagination.total_pages, 10) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => updatePage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </li>
                );
              })}
              
              <li className={`page-item ${page >= pagination.total_pages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => updatePage(page + 1)}
                  disabled={page >= pagination.total_pages}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Success Modal */}
      <StaffSuccessModal
        show={successModal.show}
        title={successModal.title}
        message={successModal.message}
        preset={successModal.preset}
        onClose={() => setSuccessModal({ show: false, title: '', message: '', preset: null })}
      />
    </Container>
  );
};

export default BookingList;