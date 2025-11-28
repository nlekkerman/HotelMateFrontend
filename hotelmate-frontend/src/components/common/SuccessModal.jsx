import React from 'react';

/**
 * Custom Success Modal Component
 * Shows success messages with custom styling
 */
const SuccessModal = ({ 
  show, 
  title = 'Success', 
  message, 
  buttonText = 'OK',
  onClose 
}) => {
  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal show d-block" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0">
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body text-center py-4">
            <div className="success-icon mb-3">
              <i 
                className="bi bi-check-circle-fill text-success" 
                style={{ fontSize: '4rem' }}
              ></i>
            </div>
            <h4 className="modal-title mb-3">{title}</h4>
            <p className="text-muted mb-0">{message}</p>
          </div>
          <div className="modal-footer border-0 justify-content-center">
            <button 
              type="button" 
              className="btn btn-success px-4"
              onClick={onClose}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;