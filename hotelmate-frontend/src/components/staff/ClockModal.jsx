import React, { useState } from 'react';
import api from '@/services/api';

const ClockModal = ({ isOpen, onClose, staffId, initialStatus, onStatusChange, currentStatus }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const getActionFromStatus = (currentStatus) => {
    if (!currentStatus || !currentStatus.status) {
      return initialStatus ? 'clock_out' : 'clock_in';
    }
    
    switch (currentStatus.status) {
      case 'off_duty':
        return 'clock_in';
      case 'on_duty':
        return 'start_break';
      case 'on_break':
        return 'end_break';
      default:
        return initialStatus ? 'clock_out' : 'clock_in';
    }
  };

  const getActionLabel = (currentStatus) => {
    if (!currentStatus || !currentStatus.status) {
      return initialStatus ? 'Clock Out' : 'Clock In';
    }
    
    switch (currentStatus.status) {
      case 'off_duty':
        return 'Clock In';
      case 'on_duty':
        return 'Start Break';
      case 'on_break':
        return 'End Break';
      default:
        return initialStatus ? 'Clock Out' : 'Clock In';
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use enhanced status API if available
      if (currentStatus && currentStatus.status) {
        const action = getActionFromStatus(currentStatus);
        
        // Use new duty status toggle endpoint
        const response = await api.patch(`staff/${staffId}/duty-status/`, {
          action: action
        });
        
        // Update with new status data
        if (response.data.current_status) {
          onStatusChange(response.data.is_on_duty, response.data.current_status);
        } else {
          onStatusChange(response.data.is_on_duty);
        }
        
        // Dispatch event to update navbar with enhanced data
        window.dispatchEvent(new CustomEvent('clockStatusChanged', {
          detail: { 
            is_on_duty: response.data.is_on_duty,
            current_status: response.data.current_status,
            action: action
          }
        }));
      } else {
        // Fallback to original logic
        const response = await api.patch(`staff/${staffId}/`, {
          is_on_duty: !initialStatus,
        });
        onStatusChange(response.data.is_on_duty);
        
        window.dispatchEvent(new CustomEvent('clockStatusChanged', {
          detail: { is_on_duty: response.data.is_on_duty }
        }));
      }
      
      onClose();
    } catch (err) {
      console.error('Failed to update duty status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" onClick={onClose} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="modal-dialog modal-dialog-centered"
        role="document"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{getActionLabel(currentStatus)}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} disabled={loading}></button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to {getActionLabel(currentStatus).toLowerCase()}?</p>
            {currentStatus && (
              <div className="alert alert-info">
                <small>Current status: <strong>{currentStatus.label}</strong></small>
                {currentStatus.is_on_break && currentStatus.total_break_minutes && (
                  <small className="d-block">Break time: {currentStatus.total_break_minutes} minutes</small>
                )}
              </div>
            )}
            {error && <div className="alert alert-danger">{error}</div>}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className={`btn btn-${
                currentStatus?.status === 'off_duty' ? 'success' :
                currentStatus?.status === 'on_duty' ? 'warning' :
                currentStatus?.status === 'on_break' ? 'info' :
                initialStatus ? 'danger' : 'success'
              }`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Please wait...
                </>
              ) : (
                `Confirm ${getActionLabel(currentStatus)}`
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockModal;
