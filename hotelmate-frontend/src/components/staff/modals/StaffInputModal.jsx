import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import './StaffModals.css';

/**
 * Staff Input Modal Component
 * Custom styled input modal with staff theme integration and localStorage support
 */
const StaffInputModal = ({ 
  show, 
  title, 
  message, 
  placeholder = '',
  defaultValue = '',
  storageKey = null, // localStorage key for auto-save/load
  confirmText = 'Submit', 
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  preset = null,
  onConfirm, 
  onCancel 
}) => {
  const { mainColor, accentColor } = useTheme();
  const [inputValue, setInputValue] = useState('');

  // Load from localStorage when modal opens
  useEffect(() => {
    if (show) {
      if (storageKey) {
        const saved = localStorage.getItem(storageKey);
        setInputValue(saved || defaultValue || '');
      } else {
        setInputValue(defaultValue || '');
      }
    }
  }, [show, storageKey, defaultValue]);

  // Save to localStorage when input changes
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (storageKey) {
      localStorage.setItem(storageKey, value);
    }
  };

  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleConfirm = () => {
    onConfirm(inputValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  const getPresetConfig = () => {
    if (!preset) return {};

    const presets = {
      cancel_booking: {
        icon: 'x-circle',
        iconColor: '#dc3545',
        confirmVariant: 'danger',
        confirmText: 'Cancel Booking'
      },
      add_note: {
        icon: 'chat-square-text',
        iconColor: '#17a2b8',
        confirmVariant: 'info',
        confirmText: 'Add Note'
      },
      reason_input: {
        icon: 'pencil-square',
        iconColor: '#ffc107',
        confirmVariant: 'warning',
        confirmText: 'Submit Reason'
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
            <p className="mb-3 text-center fs-6">{message}</p>
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder={placeholder}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              autoFocus
              style={{
                borderRadius: '8px',
                border: `2px solid ${mainColor || '#3498db'}33`,
                fontSize: '16px'
              }}
            />
            {storageKey && (
              <small className="text-muted mt-2 d-block">
                <i className="bi bi-save me-1"></i>
                Automatically saved
              </small>
            )}
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
              onClick={handleConfirm}
            >
              {finalConfirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffInputModal;