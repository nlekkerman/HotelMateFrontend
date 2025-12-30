import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearHold } from '@/utils/bookingHoldStorage';

/**
 * Canonical Expired Booking Handler Hook
 * 
 * Centralizes expired booking interpretation and restart behavior.
 * Provides a single, consistent way to handle expired bookings across the app.
 */
export const useExpiredBookingHandler = (hotelSlug) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  /**
   * Check if an API error indicates an expired booking
   * @param {Error} error - API error object
   * @returns {boolean} Whether the error indicates expiration
   */
  const isExpiredError = useCallback((error) => {
    if (!error) return false;
    
    // Check HTTP status codes that indicate expiration
    const expiredStatusCodes = [400, 404, 410];
    if (error.response?.status && expiredStatusCodes.includes(error.response.status)) {
      return true;
    }
    
    // Check error messages that indicate expiration
    const errorMessage = error.response?.data?.message || error.message || '';
    const expiredKeywords = ['expired', 'invalid', 'not found', 'cancelled'];
    
    return expiredKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword)
    );
  }, []);
  
  /**
   * Check if a booking status indicates expiration
   * @param {string} status - Booking status
   * @returns {boolean} Whether the status indicates expiration
   */
  const isExpiredStatus = useCallback((status) => {
    return status === 'CANCELLED_DRAFT';
  }, []);
  
  /**
   * Check if a booking object indicates expiration
   * @param {Object} booking - Booking object from API
   * @returns {boolean} Whether the booking is expired
   */
  const isExpiredBooking = useCallback((booking) => {
    if (!booking) return true;
    
    // Check status
    if (isExpiredStatus(booking.status)) {
      return true;
    }
    
    // Check expires_at if present
    if (booking.expires_at) {
      const now = new Date();
      const expiresAt = new Date(booking.expires_at);
      if (now > expiresAt) {
        return true;
      }
    }
    
    return false;
  }, [isExpiredStatus]);
  
  /**
   * Handle expired booking scenario
   * @param {Error|Object} resultOrError - API error or booking object
   * @returns {boolean} Whether expiration was handled
   */
  const handleExpired = useCallback((resultOrError) => {
    let isExpired = false;
    
    // Check if it's an error
    if (resultOrError instanceof Error || resultOrError?.response) {
      isExpired = isExpiredError(resultOrError);
    } 
    // Check if it's a booking object
    else if (resultOrError && typeof resultOrError === 'object') {
      isExpired = isExpiredBooking(resultOrError);
    }
    
    if (isExpired) {
      setIsModalOpen(true);
      return true;
    }
    
    return false;
  }, [isExpiredError, isExpiredBooking]);
  
  /**
   * Restart the booking process
   * Canonical restart action that:
   * 1. Clears booking hold storage
   * 2. Resets guest booking state
   * 3. Navigates to room selection route
   */
  const restart = useCallback(() => {
    // Clear booking hold storage
    if (hotelSlug) {
      clearHold(hotelSlug);
    }
    
    // Close modal
    setIsModalOpen(false);
    
    // Navigate to room selection - using existing booking route pattern
    const bookingRoute = `/${hotelSlug}/book`;
    navigate(bookingRoute, { replace: true });
  }, [hotelSlug, navigate]);
  
  /**
   * Open the expired modal manually
   */
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  
  /**
   * Close the expired modal manually
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  /**
   * Check if any condition indicates expiration
   * @param {Error|Object} resultOrError - API error or booking object
   * @returns {boolean} Whether the result indicates expiration
   */
  const isExpired = useCallback((resultOrError) => {
    if (resultOrError instanceof Error || resultOrError?.response) {
      return isExpiredError(resultOrError);
    } else if (resultOrError && typeof resultOrError === 'object') {
      return isExpiredBooking(resultOrError);
    }
    return false;
  }, [isExpiredError, isExpiredBooking]);
  
  return {
    isExpired,
    isModalOpen,
    openModal,
    closeModal,
    handleExpired,
    restart,
    // Utility functions for manual checks
    isExpiredError,
    isExpiredStatus,
    isExpiredBooking
  };
};

export default useExpiredBookingHandler;