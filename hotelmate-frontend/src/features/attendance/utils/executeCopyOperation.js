import api from "@/services/api";

/**
 * Execute roster copy operations with unified API handling
 * @param {Object} options - Copy operation options
 * @param {string} options.type - Operation type: "day" | "staff_week" | "bulk" | "period"
 * @param {string} options.hotelSlug - Hotel slug for the API endpoint
 * @param {Object} options.payload - Request payload specific to operation type
 * @returns {Promise<Object>} - API response with success details
 */
export async function executeCopyOperation({ type, hotelSlug, payload }) {
  if (!hotelSlug) {
    throw new Error("Hotel slug is required for copy operations");
  }

  if (!payload) {
    throw new Error("Payload is required for copy operations");
  }

  let endpoint;
  
  // Map operation type to correct API endpoint
  switch (type) {
    case "day":
      endpoint = `/staff/hotel/${hotelSlug}/attendance/shift-copy/copy-roster-day-all/`;
      break;
    case "staff_week":
      endpoint = `/staff/hotel/${hotelSlug}/attendance/shift-copy/copy-week-staff/`;
      break;
    case "bulk":
      endpoint = `/staff/hotel/${hotelSlug}/attendance/shift-copy/copy-roster-bulk/`;
      break;
    case "period":
      endpoint = `/staff/hotel/${hotelSlug}/attendance/shift-copy/copy-entire-period/`;
      break;
    default:
      throw new Error(`Unknown copy operation type: ${type}`);
  }

  try {
    const response = await api.post(endpoint, payload);
    return response.data;
  } catch (error) {
    // Extract error details from response
    const errorData = error.response?.data;
    const detail = errorData?.detail || error.message || "Copy operation failed";
    const errorCode = errorData?.error_code;

    // Create enhanced error object
    const enhancedError = new Error(detail);
    enhancedError.errorCode = errorCode;
    enhancedError.originalError = error;
    
    throw enhancedError;
  }
}

/**
 * Get user-friendly error message based on error code
 * @param {Error} error - Error object from executeCopyOperation
 * @returns {string} - User-friendly error message
 */
export function getCopyErrorMessage(error) {
  const errorCode = error.errorCode;
  
  switch (errorCode) {
    case "TARGET_PERIOD_PUBLISHED":
      return "Cannot copy to a published/locked period. Please select a different target period.";
    case "NO_SOURCE_SHIFTS":
      return "No source shifts found for this operation. Please check your selection and try again.";
    case "HOTEL_MISMATCH":
      return "Source and target periods must belong to the same hotel.";
    case "RATE_LIMITED":
      return "Too many copy operations. Please wait a moment before trying again.";
    default:
      return error.message || "Copy operation failed. Please try again.";
  }
}

/**
 * Get success message from copy operation result
 * @param {Object} result - Result object from executeCopyOperation
 * @returns {string} - Formatted success message
 */
export function getCopySuccessMessage(result) {
  const copiedShifts = result.copied_shifts || 0;
  const skippedConflicts = result.skipped_conflicts || 0;
  
  let message = `Copied ${copiedShifts} shift${copiedShifts !== 1 ? 's' : ''} successfully.`;
  
  if (skippedConflicts > 0) {
    message += ` Skipped ${skippedConflicts} conflict${skippedConflicts !== 1 ? 's' : ''}.`;
  }
  
  return message;
}