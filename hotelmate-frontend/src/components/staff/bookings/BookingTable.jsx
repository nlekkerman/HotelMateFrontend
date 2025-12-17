import React, { useState } from 'react';
import BookingActions from './BookingActions';
import BookingDetailsModal from './BookingDetailsModal';

/**
 * Booking Table Component
 * Displays bookings in a responsive table with actions
 */
const BookingTable = ({ bookings, onConfirm, onCancel, onSendPrecheckin, loading, hotelSlug }) => {
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING_PAYMENT': { class: 'bg-warning text-dark', icon: 'clock', label: 'Pending Payment' },
      'CONFIRMED': { class: 'bg-success', icon: 'check-circle', label: 'Confirmed' },
      'CANCELLED': { class: 'bg-danger', icon: 'x-circle', label: 'Cancelled' },
      'COMPLETED': { class: 'bg-info', icon: 'calendar-check', label: 'Completed' },
      'NO_SHOW': { class: 'bg-secondary', icon: 'person-x', label: 'No Show' }
    };
    
    const config = statusConfig[status] || { class: 'bg-secondary', icon: 'question', label: status };
    
    return (
      <span className={`badge ${config.class}`}>
        <i className={`bi bi-${config.icon} me-1`}></i>
        {config.label}
      </span>
    );
  };

  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleBookingClick = (booking) => {
    setSelectedBookingId(booking.booking_id);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedBookingId(null);
  };

  const handleConfirmFromModal = (bookingId) => {
    onConfirm(bookingId);
    handleCloseModal();
  };

  const handleCancelFromModal = (bookingId) => {
    onCancel(bookingId, 'Cancelled by staff');
    handleCloseModal();
  };

  if (bookings.length === 0) {
    return (
      <div className="booking-table-empty">
        <div className="text-center py-5">
          <i className="bi bi-calendar-x" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
          <h5 className="mt-3 text-muted">No bookings found</h5>
          <p className="text-muted">Try adjusting your filters or check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-table-container">
      <div className="table-responsive">
        <table className="table booking-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Guest Details</th>
              <th>Room Type</th>
              <th>Stay Period</th>
              <th>Guests</th>
              <th>Party</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr 
                key={booking.id} 
                className={`${loading ? 'table-row-loading' : ''} booking-row-clickable`}
                onClick={() => handleBookingClick(booking)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <div className="booking-id-cell">
                    <strong className="booking-id">{booking.booking_id}</strong>
                    {booking.confirmation_number && (
                      <small className="confirmation-number d-block text-muted">
                        {booking.confirmation_number}
                      </small>
                    )}
                    {booking.created_at && (
                      <small className="created-date d-block text-muted">
                        Created: {formatDate(booking.created_at)}
                      </small>
                    )}
                  </div>
                </td>
                
                <td>
                  <div className="guest-info-cell">
                    <div className="guest-name fw-semibold">
                      {(() => {
                        const displayName = booking.party?.primary?.full_name ?? 
                          (booking.party?.primary?.first_name && booking.party?.primary?.last_name 
                            ? `${booking.party.primary.first_name} ${booking.party.primary.last_name}` 
                            : "Primary guest missing");
                        return displayName === "Primary guest missing" ? (
                          <span className="text-muted">Guest Information Pending</span>
                        ) : (
                          displayName
                        );
                      })()}
                    </div>
                    {booking.party?.primary?.email && (
                      <small className="guest-email d-block text-muted">
                        <i className="bi bi-envelope me-1"></i>
                        {booking.party.primary.email}
                      </small>
                    )}
                    {booking.party?.primary?.phone && (
                      <small className="guest-phone d-block text-muted">
                        <i className="bi bi-telephone me-1"></i>
                        {booking.party.primary.phone}
                      </small>
                    )}
                  </div>
                </td>
                
                <td>
                  <span className="room-type">{booking.room_type_name}</span>
                </td>
                
                <td>
                  <div className="stay-period-cell">
                    <div className="dates">
                      <i className="bi bi-calendar-range me-1"></i>
                      {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                    </div>
                    <small className="nights text-muted">
                      {calculateNights(booking.check_in, booking.check_out)} nights
                    </small>
                  </div>
                </td>
                
                <td>
                  <div className="guest-count">
                    <i className="bi bi-people me-1"></i>
                    {(() => {
                      const guestCount = booking.party?.total_count ?? 0;
                      return guestCount > 0 ? (
                        <span>{guestCount} guest{guestCount !== 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      );
                    })()}
                  </div>
                </td>
                
                <td>
                  {/* Party completion status using new backend fields */}
                  {booking.party_status_display ? (
                    // Use the human-readable display from backend
                    <span className={`badge ${booking.party_complete ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {booking.party_status_display}
                    </span>
                  ) : booking.party_complete !== undefined ? (
                    // Fallback to boolean status
                    booking.party_complete ? (
                      <span className="badge bg-success">
                        <i className="bi bi-check-circle me-1"></i>Complete
                      </span>
                    ) : (
                      <span className="badge bg-warning text-dark">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Missing {booking.party_missing_count || 0}
                      </span>
                    )
                  ) : (
                    // Default: neutral badge for details
                    <span className="badge bg-secondary">
                      <i className="bi bi-info-circle me-1"></i>Details
                    </span>
                  )}
                </td>
                
                <td>
                  <div className="amount-cell">
                    <strong className="total-amount">
                      {booking.total_amount !== null && booking.total_amount !== undefined ? (
                        formatCurrency(booking.total_amount, booking.currency)
                      ) : (
                        <span className="text-muted">Pending calculation</span>
                      )}
                    </strong>
                    {booking.paid_at && (
                      <div className="paid-indicator">
                        <i className="bi bi-check-circle-fill text-success me-1"></i>
                        <small className="text-success">Paid</small>
                      </div>
                    )}
                  </div>
                </td>
                
                <td>
                  {getStatusBadge(booking.status)}
                </td>
                
                <td onClick={(e) => e.stopPropagation()}>
                  <BookingActions
                    booking={booking}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                    onSendPrecheckin={onSendPrecheckin}
                    loading={loading}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        show={showDetailsModal}
        bookingId={selectedBookingId}
        hotelSlug={hotelSlug}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default BookingTable;