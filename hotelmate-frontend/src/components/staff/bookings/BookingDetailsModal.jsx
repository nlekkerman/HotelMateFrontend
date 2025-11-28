import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import '../modals/StaffModals.css';

/**
 * Simplified Booking Details Modal Component
 * Shows booking information in a clean two-column layout
 */
const BookingDetailsModal = ({ 
  show, 
  booking, 
  onClose,
  onConfirm,
  onCancel 
}) => {
  const { mainColor, accentColor } = useTheme();

  if (!show || !booking) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
      <span className={`badge ${config.class} px-2 py-1`} style={{ fontSize: '0.75rem' }}>
        <i className={`bi bi-${config.icon} me-1`}></i>
        {config.label}
      </span>
    );
  };

  const canConfirm = booking.status === 'PENDING_PAYMENT';
  const canCancel = booking.status === 'PENDING_PAYMENT'; // Only pending bookings can be cancelled

  const modalStyles = {
    backgroundColor: 'rgba(0,0,0,0.3)',
    backdropFilter: 'none'
  };

  const headerStyles = {
    background: mainColor ? `linear-gradient(135deg, ${mainColor} 0%, ${accentColor || mainColor} 100%)` : '#3498db',
    color: 'white',
    border: 'none'
  };

  return (
    <div 
      className="modal show d-block staff-modal" 
      tabIndex="-1" 
      style={{...modalStyles, transition: 'none'}}
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content shadow-lg" style={{ minHeight: '500px', maxHeight: '90vh', width: '100%' }}>
          <div className="modal-header py-2" style={headerStyles}>
            <div className="d-flex align-items-center">
              <i className="bi bi-calendar-check me-2" style={{ fontSize: '1rem' }}></i>
              <div>
                <h6 className="modal-title mb-0 fs-6">Booking Details</h6>
                <small className="opacity-75 small">ID: {booking.booking_id}</small>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body p-2">
            
            {/* Simple Document Layout */}
            <div className="bg-white p-2" style={{ minHeight: '400px' }}>
              
              {/* Status and Basic Info */}
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <h5 className="mb-1 fs-6">{booking.guest_name || booking.name || 'Guest Name'}</h5>
                  <div className="text-muted small">Booking ID: {booking.booking_id || booking.id}</div>
                </div>
                <div className="text-end">
                  {getStatusBadge(booking.status)}
                  <div className="fw-bold text-success small mt-1">
                    {booking.total_amount ? 
                      formatCurrency(booking.total_amount, booking.currency || 'EUR') : 
                      'Amount N/A'
                    }
                  </div>
                </div>
              </div>

              {/* Two Column Information */}
              <div className="row">
                <div className="col-6">
                  
                  <h6 className="text-primary mb-2 small">Guest Information</h6>
                  <div className="mb-1 small">
                    <strong>Email:</strong> {booking.guest_email || booking.email || 'Not provided'}
                  </div>
                  {booking.guest_phone && (
                    <div className="mb-1 small">
                      <strong>Phone:</strong> {booking.guest_phone}
                    </div>
                  )}
                  <div className="mb-2 small">
                    <strong>Guests:</strong> {booking.adults} adult{booking.adults !== 1 ? 's' : ''}{booking.children > 0 && `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}`}
                  </div>

                  <h6 className="text-info mb-2 small">Booking Details</h6>
                  <div className="mb-1 small">
                    <strong>Room Type:</strong> {booking.room_type_name || booking.room_type || 'Not specified'}
                  </div>
                  <div className="mb-1 small">
                    <strong>Check-in:</strong> {booking.check_in ? formatDate(booking.check_in) : 'Not set'}
                  </div>
                  <div className="mb-1 small">
                    <strong>Check-out:</strong> {booking.check_out ? formatDate(booking.check_out) : 'Not set'}
                  </div>
                  <div className="mb-1 small">
                    <strong>Nights:</strong> {booking.check_in && booking.check_out ? calculateNights(booking.check_in, booking.check_out) : 'N/A'}
                  </div>
                  <div className="mb-1 small">
                    <strong>Created:</strong> {booking.created_at ? formatDateTime(booking.created_at) : 'Not available'}
                  </div>
                  {booking.confirmation_number && (
                    <div className="mb-1 small">
                      <strong>Confirmation:</strong> <code className="small">{booking.confirmation_number}</code>
                    </div>
                  )}

                </div>
                
                <div className="col-6">
                  
                  {booking.status === 'CANCELLED' ? (
                    <>
                      <h6 className="text-danger mb-2 small">Cancellation Information</h6>
                      <div className="mb-1 small">
                        <strong>Cancelled Date:</strong> {booking.cancelled_at ? formatDateTime(booking.cancelled_at) : booking.canceled_at ? formatDateTime(booking.canceled_at) : booking.updated_at ? formatDateTime(booking.updated_at) : 'Not specified'}
                      </div>
                      <div className="mb-1 small">
                        <strong>Cancelled By:</strong> {booking.cancelled_by_name || booking.cancelled_by || booking.staff_name || booking.staff_member || booking.updated_by || 'Unknown Staff Member'}
                      </div>
                      <div className="mb-1 small">
                        <strong>Reason:</strong>
                      </div>
                      {(booking.cancellation_reason || booking.cancel_reason || booking.reason || booking.cancellation_notes || booking.notes || booking.cancel_notes) ? (
                        <div className="bg-light p-2 rounded border small">
                          {booking.cancellation_reason || booking.cancel_reason || booking.reason || booking.cancellation_notes || booking.notes || booking.cancel_notes}
                        </div>
                      ) : (
                        <div className="text-muted fst-italic small">No reason provided</div>
                      )}
                    </>
                  ) : (
                    <>
                      <h6 className="text-secondary mb-2 small">Additional Information</h6>
                      {booking.paid_at && (
                        <div className="mb-1 small">
                          <strong>Payment Received:</strong> <span className="text-success">{formatDateTime(booking.paid_at)}</span>
                        </div>
                      )}
                      <div className="mb-1 small">
                        <strong>Status:</strong> Active booking
                      </div>
                      {booking.confirmation_number && (
                        <div className="mb-1 small">
                          <strong>Confirmation Number:</strong>
                          <div className="bg-light p-1 rounded mt-1">
                            <code className="small">{booking.confirmation_number}</code>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                </div>
              </div>
            </div>
          </div>
          
          {booking.status === 'PENDING_PAYMENT' && (
            <div className="modal-footer border-0 py-2">
              <button 
                type="button" 
                className="btn btn-success me-2"
                onClick={() => onConfirm && onConfirm(booking.booking_id)}
              >
                <i className="bi bi-check-circle me-1"></i>
                Confirm Booking
              </button>
              
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={() => onCancel && onCancel(booking.booking_id)}
              >
                <i className="bi bi-x-circle me-1"></i>
                Cancel Booking
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;