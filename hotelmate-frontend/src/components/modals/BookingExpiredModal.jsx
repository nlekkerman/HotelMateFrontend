import React from 'react';

/**
 * Booking Expired Modal Component
 * 
 * Displays when a booking hold has expired and provides restart functionality.
 * Consistent with existing modal patterns in the application.
 */
const BookingExpiredModal = ({ 
  open = false,
  onRestart,
  message = "Your reservation hold has expired. The selected room is no longer reserved for you."
}) => {
  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      // Don't allow clicking outside to close - force user to restart
      return;
    }
  };

  const handleRestart = () => {
    if (onRestart) {
      onRestart();
    }
  };

  return (
    <div 
      className="modal fade show" 
      style={{ display: 'block' }}
      tabIndex="-1"
      role="dialog"
      aria-labelledby="bookingExpiredModalLabel"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold text-danger" id="bookingExpiredModalLabel">
              <i className="bi bi-clock-history me-2"></i>
              Reservation Expired
            </h5>
          </div>
          
          <div className="modal-body pt-2">
            <div className="text-center">
              <div className="mb-3">
                <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '3rem' }}></i>
              </div>
              
              <p className="mb-4 text-muted">
                {message}
              </p>
              
              <div className="alert alert-info mb-4" role="alert">
                <small>
                  <strong>Don't worry!</strong> You can start a new booking to check availability and reserve your room again.
                </small>
              </div>
            </div>
          </div>
          
          <div className="modal-footer border-0 pt-0">
            <button
              type="button"
              className="btn btn-primary btn-lg w-100"
              onClick={handleRestart}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Start New Booking
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal backdrop */}
      <div className="modal-backdrop fade show"></div>
    </div>
  );
};

export default BookingExpiredModal;