/**
 * Error logging and user feedback utilities for attendance system
 */
import React from 'react';

// Error types for categorization
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation', 
  PERMISSION: 'permission',
  DATA: 'data',
  SYSTEM: 'system',
  REALTIME: 'realtime'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Central error logger for attendance system
 */
class AttendanceErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 100; // Keep last 100 errors
  }

  /**
   * Log an error with context
   * @param {Error|string} error - The error object or message
   * @param {Object} context - Additional context about the error
   */
  logError(error, context = {}) {
    const errorEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: error?.message || error || 'Unknown error',
      stack: error?.stack,
      type: context.type || ERROR_TYPES.SYSTEM,
      severity: context.severity || ERROR_SEVERITY.MEDIUM,
      component: context.component || 'unknown',
      action: context.action || 'unknown',
      hotelSlug: context.hotelSlug,
      userId: context.userId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData: context.data || {}
    };

    // Add to local storage
    this.errors.unshift(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Attendance Error [${errorEntry.type}]`);
      console.error('Message:', errorEntry.message);
      console.error('Component:', errorEntry.component);
      console.error('Action:', errorEntry.action);
      if (errorEntry.additionalData && Object.keys(errorEntry.additionalData).length > 0) {
        console.error('Additional Data:', errorEntry.additionalData);
      }
      if (errorEntry.stack) {
        console.error('Stack:', errorEntry.stack);
      }
      console.groupEnd();
    }

    // Send to logging service (if available)
    this.sendToLoggingService(errorEntry);

    return errorEntry.id;
  }

  /**
   * Send error to external logging service
   * @param {Object} errorEntry - The error entry to send
   */
  async sendToLoggingService(errorEntry) {
    try {
      // Only send high/critical errors or in production
      const shouldSend = errorEntry.severity === ERROR_SEVERITY.HIGH || 
                        errorEntry.severity === ERROR_SEVERITY.CRITICAL ||
                        process.env.NODE_ENV === 'production';

      if (!shouldSend) return;

      // Replace this with your actual logging service endpoint
      // await fetch('/api/logs/frontend-errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorEntry)
      // });

    } catch (loggingError) {
      console.warn('Failed to send error to logging service:', loggingError);
    }
  }

  /**
   * Get recent errors for debugging
   * @param {number} limit - Number of errors to return
   * @returns {Array} Recent errors
   */
  getRecentErrors(limit = 10) {
    return this.errors.slice(0, limit);
  }

  /**
   * Clear all logged errors
   */
  clearErrors() {
    this.errors = [];
  }
}

// Global error logger instance
export const errorLogger = new AttendanceErrorLogger();

/**
 * User-friendly error messages based on error context
 */
export function getUserFriendlyError(error, context = {}) {
  const { type, action, component } = context;

  // Network errors
  if (type === ERROR_TYPES.NETWORK || error?.message?.includes('fetch')) {
    if (action === 'approve' || action === 'reject') {
      return 'Unable to process the approval/rejection. Please check your connection and try again.';
    }
    if (action === 'export') {
      return 'Export failed due to connection issues. Please try again.';
    }
    if (action === 'finalize') {
      return 'Unable to finalize period. Please check your connection and try again.';
    }
    return 'Connection error. Please check your internet connection and try again.';
  }

  // Permission errors
  if (type === ERROR_TYPES.PERMISSION || error?.response?.status === 403) {
    return 'You don\'t have permission to perform this action. Please contact your administrator.';
  }

  // Validation errors
  if (type === ERROR_TYPES.VALIDATION || error?.response?.status === 400) {
    const serverMessage = error?.response?.data?.message;
    if (serverMessage) {
      return serverMessage;
    }
    return 'Invalid data provided. Please check your input and try again.';
  }

  // Data errors
  if (type === ERROR_TYPES.DATA) {
    if (component === 'period') {
      return 'Period data is invalid or missing. Please refresh and try again.';
    }
    if (component === 'roster') {
      return 'Roster data could not be loaded. Please refresh and try again.';
    }
    return 'Data error occurred. Please refresh the page and try again.';
  }

  // Realtime errors
  if (type === ERROR_TYPES.REALTIME) {
    return 'Real-time updates are currently unavailable. Data may not update automatically.';
  }

  // Default error messages
  if (error?.response?.status === 404) {
    return 'The requested data was not found. It may have been deleted or moved.';
  }

  if (error?.response?.status === 500) {
    return 'Server error occurred. Please try again in a few minutes.';
  }

  // Generic fallback
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}

/**
 * Toast notification system for user feedback
 */
class ToastManager {
  constructor() {
    this.toasts = [];
    this.maxToasts = 5;
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   */
  show({ message, type = 'info', duration = 5000, persistent = false }) {
    const toast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: Date.now(),
      persistent
    };

    this.toasts.unshift(toast);
    if (this.toasts.length > this.maxToasts) {
      this.toasts.pop();
    }

    // Auto-remove non-persistent toasts
    if (!persistent && duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }

    // Trigger UI update if callback is set
    if (this.onUpdate) {
      this.onUpdate([...this.toasts]);
    }

    return toast.id;
  }

  /**
   * Remove a toast
   * @param {string} id - Toast ID
   */
  remove(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    if (this.onUpdate) {
      this.onUpdate([...this.toasts]);
    }
  }

  /**
   * Clear all toasts
   */
  clear() {
    this.toasts = [];
    if (this.onUpdate) {
      this.onUpdate([]);
    }
  }

  /**
   * Set callback for UI updates
   * @param {Function} callback - Update callback
   */
  setUpdateCallback(callback) {
    this.onUpdate = callback;
  }
}

// Global toast manager
export const toastManager = new ToastManager();

/**
 * Hook for using toast notifications in components
 */
export function useToasts() {
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    toastManager.setUpdateCallback(setToasts);
    return () => toastManager.setUpdateCallback(null);
  }, []);

  return {
    toasts,
    showToast: toastManager.show.bind(toastManager),
    removeToast: toastManager.remove.bind(toastManager),
    clearToasts: toastManager.clear.bind(toastManager)
  };
}

/**
 * Enhanced error handler that logs and shows user feedback
 * @param {Error} error - The error object
 * @param {Object} context - Error context
 * @param {Object} options - Handler options
 */
export function handleAttendanceError(error, context = {}, options = {}) {
  const { showToast = true, logError = true } = options;

  let errorId = null;

  // Log the error
  if (logError) {
    errorId = errorLogger.logError(error, context);
  }

  // Show user-friendly message
  if (showToast) {
    const userMessage = getUserFriendlyError(error, context);
    toastManager.show({
      message: userMessage,
      type: 'error',
      duration: 8000
    });
  }

  return { errorId, userMessage: getUserFriendlyError(error, context) };
}

/**
 * Success feedback for user actions
 */
export function showSuccessMessage(action, context = {}) {
  let message = 'Action completed successfully';

  switch (action) {
    case 'approve':
      message = 'Clock log approved successfully';
      break;
    case 'reject':
      message = 'Clock log rejected successfully';
      break;
    case 'finalize':
      message = 'Period finalized successfully';
      break;
    case 'export':
      message = 'Export completed successfully';
      break;
    case 'stay-clocked-in':
      message = 'Staff will stay clocked in';
      break;
    case 'force-clock-out':
      message = 'Staff clocked out successfully';
      break;
    default:
      if (context.message) {
        message = context.message;
      }
  }

  toastManager.show({
    message,
    type: 'success',
    duration: 4000
  });
}

export default {
  errorLogger,
  toastManager,
  handleAttendanceError,
  showSuccessMessage,
  getUserFriendlyError,
  useToasts,
  ERROR_TYPES,
  ERROR_SEVERITY
};