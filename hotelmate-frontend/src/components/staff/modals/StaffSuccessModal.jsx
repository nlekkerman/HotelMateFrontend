import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import './StaffModals.css';

/**
 * Staff Success Modal Component
 * Custom styled success modal with staff theme integration and preset logic
 */
const StaffSuccessModal = ({ 
  show, 
  title = 'Success', 
  message, 
  buttonText = 'OK',
  preset = null, // Preset logic support
  autoClose = false,
  autoCloseDelay = 3000,
  style = {}, // Additional style support
  onClose 
}) => {
  const { mainColor, accentColor } = useTheme();

  React.useEffect(() => {
    if (show && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoClose, autoCloseDelay, onClose]);

  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getPresetConfig = () => {
    if (!preset) return {};

    const presets = {
      booking_confirmed: {
        icon: 'check-circle-fill',
        iconColor: '#28a745',
        title: 'Booking Confirmed',
        buttonColor: '#28a745'
      },
      booking_cancelled: {
        icon: 'x-circle-fill',
        iconColor: '#dc3545',
        title: 'Booking Cancelled',
        buttonColor: '#dc3545'
      },
      item_deleted: {
        icon: 'trash-fill',
        iconColor: '#dc3545',
        title: 'Item Deleted',
        buttonColor: '#dc3545'
      },
      request_approved: {
        icon: 'check-square-fill',
        iconColor: '#28a745',
        title: 'Request Approved',
        buttonColor: '#28a745'
      },
      request_rejected: {
        icon: 'x-square-fill',
        iconColor: '#ffc107',
        title: 'Request Rejected',
        buttonColor: '#ffc107'
      },
      data_saved: {
        icon: 'save-fill',
        iconColor: '#17a2b8',
        title: 'Data Saved',
        buttonColor: '#17a2b8'
      },
      operation_completed: {
        icon: 'check-all',
        iconColor: '#28a745',
        title: 'Operation Completed',
        buttonColor: '#28a745'
      }
    };

    return presets[preset] || {};
  };

  const presetConfig = getPresetConfig();
  const finalTitle = presetConfig.title || title;
  const finalIcon = presetConfig.icon || 'check-circle-fill';
  const finalIconColor = presetConfig.iconColor || '#28a745';

  const modalStyles = {
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    ...style // Merge any additional styles passed as props
  };

  const headerStyles = {
    background: mainColor ? `linear-gradient(135deg, ${mainColor} 0%, ${accentColor || mainColor} 100%)` : '#28a745',
    color: 'white',
    border: 'none'
  };

  const buttonStyles = {
    backgroundColor: presetConfig.buttonColor || mainColor || '#28a745',
    borderColor: presetConfig.buttonColor || mainColor || '#28a745',
    color: 'white'
  };

  return (
    <div 
      className="modal show d-block staff-success-modal" 
      tabIndex="-1" 
      style={modalStyles}
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg">
          <div className="modal-header" style={headerStyles}>
            <div className="d-flex align-items-center">
              <i 
                className={`bi bi-${finalIcon} me-2`}
                style={{ fontSize: '1.2rem', color: 'white' }}
              ></i>
              <h5 className="modal-title mb-0">{finalTitle}</h5>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body text-center py-5">
            <div className="success-icon mb-4">
              <i 
                className={`bi bi-${finalIcon}`}
                style={{ 
                  fontSize: '5rem', 
                  color: finalIconColor,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                }}
              ></i>
            </div>
            <p className="text-muted mb-0 fs-5">{message}</p>
            
            {autoClose && (
              <div className="mt-3">
                <small className="text-muted">
                  Auto-closing in {autoCloseDelay / 1000} seconds...
                </small>
              </div>
            )}
          </div>
          
          <div className="modal-footer border-0 justify-content-center pb-4">
            <button 
              type="button" 
              className="btn px-5 py-2 fw-semibold"
              style={buttonStyles}
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

export default StaffSuccessModal;