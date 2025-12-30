/**
 * Booking Hold Storage Utility
 * 
 * Centrally manages booking hold persistence with hotel-scoped keys
 * to prevent cross-hotel booking collisions in localStorage.
 */

/**
 * Get the scoped localStorage key for a hotel
 * @param {string} hotelSlug - Hotel slug identifier
 * @returns {string} Scoped key
 */
const getStorageKey = (hotelSlug) => `booking_hold:${hotelSlug}`;

/**
 * Validate that expiresAt is a parseable date
 * @param {string|Date} expiresAt - Expiration timestamp
 * @returns {boolean} Whether the date is valid
 */
const isValidExpiresAt = (expiresAt) => {
  if (!expiresAt) return false;
  
  const date = new Date(expiresAt);
  return !isNaN(date.getTime());
};

/**
 * Get booking hold data for a specific hotel
 * @param {string} hotelSlug - Hotel slug identifier
 * @returns {{bookingId: string, expiresAt: string} | null} Hold data or null
 */
export const getHold = (hotelSlug) => {
  if (!hotelSlug) return null;
  
  try {
    const key = getStorageKey(hotelSlug);
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    const hold = JSON.parse(data);
    
    // Validate required fields
    if (!hold.bookingId || !hold.expiresAt) {
      clearHold(hotelSlug);
      return null;
    }
    
    // Validate expiresAt is parseable
    if (!isValidExpiresAt(hold.expiresAt)) {
      clearHold(hotelSlug);
      return null;
    }
    
    return {
      bookingId: hold.bookingId,
      expiresAt: hold.expiresAt
    };
  } catch (error) {
    console.warn('Failed to parse booking hold data, clearing storage:', error);
    clearHold(hotelSlug);
    return null;
  }
};

/**
 * Set booking hold data for a specific hotel
 * @param {string} hotelSlug - Hotel slug identifier
 * @param {{bookingId: string, expiresAt: string|Date}} holdData - Hold data to store
 */
export const setHold = (hotelSlug, { bookingId, expiresAt }) => {
  if (!hotelSlug || !bookingId || !expiresAt) {
    console.warn('Invalid booking hold data provided');
    return;
  }
  
  // Validate expiresAt before storing
  if (!isValidExpiresAt(expiresAt)) {
    console.warn('Invalid expiresAt provided:', expiresAt);
    return;
  }
  
  try {
    const key = getStorageKey(hotelSlug);
    const holdData = {
      bookingId: String(bookingId),
      expiresAt: new Date(expiresAt).toISOString()
    };
    
    localStorage.setItem(key, JSON.stringify(holdData));
  } catch (error) {
    console.error('Failed to save booking hold data:', error);
  }
};

/**
 * Clear booking hold data for a specific hotel
 * @param {string} hotelSlug - Hotel slug identifier
 */
export const clearHold = (hotelSlug) => {
  if (!hotelSlug) return;
  
  try {
    const key = getStorageKey(hotelSlug);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear booking hold data:', error);
  }
};

/**
 * Check if a booking hold exists for a hotel
 * @param {string} hotelSlug - Hotel slug identifier
 * @returns {boolean} Whether a hold exists
 */
export const hasHold = (hotelSlug) => {
  return getHold(hotelSlug) !== null;
};

/**
 * Get all booking holds (useful for debugging)
 * @returns {Object} All booking holds by hotel slug
 */
export const getAllHolds = () => {
  const holds = {};
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('booking_hold:')) {
        const hotelSlug = key.replace('booking_hold:', '');
        holds[hotelSlug] = getHold(hotelSlug);
      }
    }
  } catch (error) {
    console.error('Failed to get all holds:', error);
  }
  
  return holds;
};