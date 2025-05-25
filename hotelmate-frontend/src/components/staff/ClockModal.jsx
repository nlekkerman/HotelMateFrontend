import React, { useState } from 'react';
import api from '@/services/api';

const ClockModal = ({ isOpen, onClose, staffId, initialStatus, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.patch(`staff/${staffId}/`, {
        is_on_duty: !initialStatus,
      });
      onStatusChange(response.data.is_on_duty);
      onClose();
    } catch (err) {
      console.error('Failed to update duty status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };
console.log('Staff ID passed to ClockModal:', staffId);
  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" onClick={onClose} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="modal-dialog modal-dialog-centered"
        role="document"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{initialStatus ? 'Clock Out' : 'Clock In'}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} disabled={loading}></button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to {initialStatus ? 'clock out' : 'clock in'}?</p>
            {error && <div className="alert alert-danger">{error}</div>}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className={`btn btn-${initialStatus ? 'danger' : 'success'}`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Please wait...
                </>
              ) : (
                `Confirm ${initialStatus ? 'Clock Out' : 'Clock In'}`
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
