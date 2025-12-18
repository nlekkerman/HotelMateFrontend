import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import './StaffModals.css';

/**
 * Staff Confirmation Modal Component
 * Custom styled modal with staff theme integration and preset logic support
 */
const StaffConfirmationModal = ({ 
  show, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  preset = null, // New preset logic support
  onConfirm, 
  onCancel 
}) => {
  const { mainColor, accentColor } = useTheme();

  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const getPresetConfig = () => {
    if (!preset) return {};

    const presets = {
      confirm_booking: {
        icon: 'check-circle',
        iconColor: '#28a745',
        confirmVariant: 'success',
        confirmText: 'Confirm Booking'
      },
      cancel_booking: {
        icon: 'x-circle',
        iconColor: '#dc3545',
        confirmVariant: 'danger',
        confirmText: 'Cancel Booking'
      },
      delete_item: {
        icon: 'trash',
        iconColor: '#dc3545',
        confirmVariant: 'danger',
        confirmText: 'Delete'
      },
      approve_request: {
        icon: 'check-square',
        iconColor: '#28a745',
        confirmVariant: 'success',
        confirmText: 'Approve'
      },
      reject_request: {
        icon: 'x-square',
        iconColor: '#ffc107',
        confirmVariant: 'warning',
        confirmText: 'Reject'
      },
      approve_booking: {
        icon: 'credit-card',
        iconColor: '#28a745',
        confirmVariant: 'success',
        confirmText: 'Approve & Capture'
      },
      decline_booking: {
        icon: 'x-circle',
        iconColor: '#ffc107',
        confirmVariant: 'warning',
        confirmText: 'Decline & Release'
      }
    };

    return presets[preset] || {};
  };

  const presetConfig = getPresetConfig();
  const finalConfirmVariant = presetConfig.confirmVariant || confirmVariant;
  const finalConfirmText = presetConfig.confirmText || confirmText;

  const modalStyles = {
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)'
  };

  const headerStyles = {
    background: mainColor ? `linear-gradient(135deg, ${mainColor} 0%, ${accentColor || mainColor} 100%)` : '#3498db',
    color: 'white',
    border: 'none'
  };

  const confirmButtonStyles = {
    backgroundColor: mainColor || '#3498db',
    borderColor: mainColor || '#3498db',
    color: 'white'
  };

  return (
    <div 
      className="modal show d-block staff-modal" 
      tabIndex="-1" 
      style={modalStyles}
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg">
          <div className="modal-header" style={headerStyles}>
            <div className="d-flex align-items-center">
              {presetConfig.icon && (
                <i 
                  className={`bi bi-${presetConfig.icon} me-2`}
                  style={{ fontSize: '1.2rem', color: 'white' }}
                ></i>
              )}
              <h5 className="modal-title mb-0">{title}</h5>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onCancel}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body py-4">
            {presetConfig.icon && (
              <div className="text-center mb-3">
                <i 
                  className={`bi bi-${presetConfig.icon}`}
                  style={{ 
                    fontSize: '3rem', 
                    color: presetConfig.iconColor 
                  }}
                ></i>
              </div>
            )}
            <p className="mb-0 text-center fs-6">{message}</p>
          </div>
          
          <div className="modal-footer border-0 justify-content-center">
            <button 
              type="button" 
              className="btn btn-outline-secondary me-3 px-4" 
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button 
              type="button" 
              className={`btn btn-${finalConfirmVariant} px-4`}
              style={finalConfirmVariant === 'primary' ? confirmButtonStyles : {}}
              onClick={onConfirm}
            >
              {finalConfirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffConfirmationModal;