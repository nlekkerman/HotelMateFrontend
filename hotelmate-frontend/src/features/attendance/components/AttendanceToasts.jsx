import React from 'react';
import { useToasts } from '../utils/errorHandling';

/**
 * Toast notification component for attendance system
 */
export default function AttendanceToasts() {
  const { toasts, removeToast } = useToasts();

  if (toasts.length === 0) {
    return null;
  }

  const getToastClasses = (type) => {
    const baseClasses = 'toast show';
    switch (type) {
      case 'success':
        return `${baseClasses} bg-success text-white`;
      case 'error':
        return `${baseClasses} bg-danger text-white`;
      case 'warning':
        return `${baseClasses} bg-warning text-dark`;
      case 'info':
      default:
        return `${baseClasses} bg-primary text-white`;
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'error':
        return 'bi-exclamation-triangle-fill';
      case 'warning':
        return 'bi-exclamation-circle-fill';
      case 'info':
      default:
        return 'bi-info-circle-fill';
    }
  };

  return (
    <div 
      className="toast-container position-fixed top-0 end-0 p-3" 
      style={{ zIndex: 1080 }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={getToastClasses(toast.type)}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          style={{ minWidth: '300px' }}
        >
          <div className="toast-header">
            <i className={`bi ${getIconForType(toast.type)} me-2`}></i>
            <strong className="me-auto">
              {toast.type === 'success' && 'Success'}
              {toast.type === 'error' && 'Error'}
              {toast.type === 'warning' && 'Warning'}
              {toast.type === 'info' && 'Info'}
            </strong>
            <small className="text-muted">
              {new Date(toast.timestamp).toLocaleTimeString()}
            </small>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => removeToast(toast.id)}
            ></button>
          </div>
          <div className="toast-body">
            {toast.message}
          </div>
        </div>
      ))}
    </div>
  );
}