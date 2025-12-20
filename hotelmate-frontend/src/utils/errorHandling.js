/**
 * Error Handling Utilities for Room Operations
 * User-friendly error message mapping for room operational failures
 */

/**
 * Extract error message from API error response
 * @param {Error} error - Axios error object
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  // Extract server message from various response formats
  const serverMessage = error.response?.data?.message || 
                       error.response?.data?.error || 
                       error.response?.data?.detail ||
                       error.message;
  
  // Map common room operation errors to user-friendly messages
  const errorMappings = {
    'invalid_transition': 'Invalid room status transition. Please refresh and try again.',
    'invalid transition': 'Invalid room status transition. Please refresh and try again.',
    'room_occupied': 'Cannot perform this action - room is currently occupied.',
    'room occupied': 'Cannot perform this action - room is currently occupied.',
    'room_not_ready': 'Room must be Ready For Guest to check in.',
    'room not ready': 'Room must be Ready For Guest to check in.',
    'room_not_occupied': 'Room is not occupied, cannot check out.',
    'room not occupied': 'Room is not occupied, cannot check out.',
    'maintenance_required': 'Room requires maintenance before this action.',
    'maintenance required': 'Room requires maintenance before this action.',
    'permission_denied': 'You do not have permission to perform this action.',
    'permission denied': 'You do not have permission to perform this action.',
    'insufficient_permissions': 'You do not have permission to perform this action.',
    'not_found': 'Room not found. Please refresh and try again.',
    'not found': 'Room not found. Please refresh and try again.',
    'room_not_found': 'Room not found. Please refresh and try again.',
    'room not found': 'Room not found. Please refresh and try again.',
    'already_checked_in': 'Guest is already checked in to this room.',
    'already checked in': 'Guest is already checked in to this room.',
    'already_checked_out': 'Guest has already checked out of this room.',
    'already checked out': 'Guest has already checked out of this room.',
    'cleaning_in_progress': 'Room cleaning is already in progress.',
    'cleaning in progress': 'Room cleaning is already in progress.',
    'maintenance_in_progress': 'Room maintenance is already in progress.',
    'maintenance in progress': 'Room maintenance is already in progress.',
    'out_of_order': 'Room is currently out of order and unavailable.',
    'out of order': 'Room is currently out of order and unavailable.',
    'network error': 'Network connection failed. Please check your connection and try again.',
    'timeout': 'Request timed out. Please try again.',
    'server_error': 'Server error occurred. Please try again or contact support.',
    'server error': 'Server error occurred. Please try again or contact support.',
    'internal server error': 'Server error occurred. Please try again or contact support.',
    'service_unavailable': 'Service is temporarily unavailable. Please try again later.',
    'service unavailable': 'Service is temporarily unavailable. Please try again later.'
  };
  
  // Check for known error patterns (case-insensitive)
  if (serverMessage) {
    const lowerMessage = serverMessage.toLowerCase();
    for (const [key, friendlyMessage] of Object.entries(errorMappings)) {
      if (lowerMessage.includes(key)) {
        return friendlyMessage;
      }
    }
  }
  
  // Handle HTTP status codes
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Invalid request. Please check the room status and try again.';
      case 401:
        return 'You are not authorized to perform this action. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Room not found. Please refresh the page and try again.';
      case 409:
        return 'Conflicting room status. Please refresh and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error occurred. Please try again or contact support.';
      case 502:
      case 503:
      case 504:
        return 'Service is temporarily unavailable. Please try again later.';
    }
  }
  
  // Handle network errors
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return 'Network connection failed. Please check your connection and try again.';
  }
  
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // Fallback to server message or generic error
  return serverMessage || 'An unexpected error occurred. Please try again.';
};

/**
 * Get contextual error message based on room operation type
 * @param {Error} error - Axios error object
 * @param {string} operation - Type of operation (e.g., 'checkin', 'checkout', 'status_change')
 * @param {string} roomNumber - Room number for context
 * @returns {string} - Contextual error message
 */
export const getContextualErrorMessage = (error, operation, roomNumber) => {
  const baseMessage = getErrorMessage(error);
  
  // Add contextual information based on operation type
  const operationContext = {
    'checkin': `Failed to check in room ${roomNumber}: ${baseMessage}`,
    'checkout': `Failed to check out room ${roomNumber}: ${baseMessage}`,
    'status_change': `Failed to update room ${roomNumber} status: ${baseMessage}`,
    'start_cleaning': `Failed to start cleaning room ${roomNumber}: ${baseMessage}`,
    'mark_cleaned': `Failed to mark room ${roomNumber} as cleaned: ${baseMessage}`,
    'inspect': `Failed to inspect room ${roomNumber}: ${baseMessage}`,
    'mark_maintenance': `Failed to mark room ${roomNumber} for maintenance: ${baseMessage}`,
    'complete_maintenance': `Failed to complete maintenance for room ${roomNumber}: ${baseMessage}`
  };
  
  return operationContext[operation] || baseMessage;
};

/**
 * Log error details for debugging (development only)
 * @param {Error} error - Error object
 * @param {string} operation - Operation that failed
 * @param {Object} context - Additional context
 */
export const logError = (error, operation, context = {}) => {
  if (!import.meta.env.PROD) {
    console.error(`[Room Operations] ${operation} failed:`, {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      context
    });
  }
};

/**
 * Room operation error handler - combines logging and user message
 * @param {Error} error - Error object
 * @param {string} operation - Operation that failed
 * @param {string} roomNumber - Room number for context
 * @param {Object} additionalContext - Additional context for debugging
 * @returns {string} - User-friendly error message
 */
export const handleRoomOperationError = (error, operation, roomNumber, additionalContext = {}) => {
  // Log for debugging
  logError(error, operation, { roomNumber, ...additionalContext });
  
  // Return user-friendly message
  return getContextualErrorMessage(error, operation, roomNumber);
};