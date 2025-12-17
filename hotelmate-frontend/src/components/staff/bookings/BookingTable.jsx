import React, { useState } from 'react';
import BookingActions from './BookingActions';
import BookingDetailsModal from './BookingDetailsModal';

/**
 * Booking Table Component
 * Displays bookings in a responsive table with actions
 */
const BookingTable = ({ bookings, onConfirm, onCancel, loading, hotelSlug }) => {
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
                className={`${loading ? 'table-row-loading' : ''} ${
                  ['CANCELLED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(booking.status) 
                    ? 'booking-row-cancelled' 
                    : 'booking-row-clickable'
                }`}
                onClick={['CANCELLED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(booking.status) 
                  ? undefined 
                  : () => handleBookingClick(booking)}
                style={{ 
                  cursor: ['CANCELLED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(booking.status) 
                    ? 'default' 
                    : 'pointer' 
                }}
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
                    <div className="guest-name fw-semibold">{booking.guest_name}</div>
                    <small className="guest-email d-block text-muted">{booking.guest_email}</small>
                    {booking.guest_phone && (
                      <small className="guest-phone d-block text-muted">
                        <i className="bi bi-telephone me-1"></i>
                        {booking.guest_phone}
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
                    {/* Use party.total_party_size if available, else fallback to adults+children */}
                    {booking.party?.total_party_size ? (
                      <span>{booking.party.total_party_size} guest{booking.party.total_party_size !== 1 ? 's' : ''}</span>
                    ) : booking.party && !booking.party.total_party_size ? (
                      <span>—</span> // Party exists but total_party_size missing - don't guess
                    ) : (
                      // Fallback to adults+children calculation
                      <>
                        {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
                        {booking.children > 0 && (
                          <div className="children-count">
                            <i className="bi bi-person me-1"></i>
                            {booking.children} child{booking.children !== 1 ? 'ren' : ''}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </td>
                
                <td>
                  {/* Party completion status - list payload doesn't include party fields */}
                  {booking.party_complete !== undefined ? (
                    // If list includes party_complete field (rare)
                    booking.party_complete ? (
                      <span className="badge bg-success">Complete</span>
                    ) : (
                      <span className="badge bg-warning text-dark">
                        Missing {booking.party_missing_count || 0}
                      </span>
                    )
                  ) : (
                    // Default: neutral badge since truth lives in detail modal
                    <span className="badge bg-secondary">Details</span>
                  )}
                </td>
                
                <td>
                  <div className="amount-cell">
                    <strong className="total-amount">
                      {formatCurrency(booking.total_amount, booking.currency)}
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