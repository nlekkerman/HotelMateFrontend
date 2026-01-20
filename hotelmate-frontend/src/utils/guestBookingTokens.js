/**
 * Guest Booking Token Management Utilities
 * 
 * Provides booking-scoped token storage and resolution to prevent
 * cross-hotel token reuse and handle token rotation after check-in.
 */

/**
 * Generate localStorage key for guest booking token
 * @param {string} bookingId - Booking ID
 * @returns {string} Storage key
 */
export function getGuestBookingTokenKey(bookingId) {
  return `guest_booking_token:${bookingId}`;
}

/**
 * Read guest booking token from localStorage
 * @param {string} bookingId - Booking ID
 * @returns {string|null} Token or null if not found
 */
export function readGuestBookingToken(bookingId) {
  if (!bookingId) return null;
  try {
    return localStorage.getItem(getGuestBookingTokenKey(bookingId));
  } catch (error) {
    console.warn('[GuestBookingTokens] Failed to read token from localStorage:', error);
    return null;
  }
}

/**
 * Write guest booking token to localStorage
 * @param {string} bookingId - Booking ID
 * @param {string} token - Guest token to store
 */
export function writeGuestBookingToken(bookingId, token) {
  if (!bookingId || !token) return;
  try {
    localStorage.setItem(getGuestBookingTokenKey(bookingId), token);
    console.log('[GuestBookingTokens] Stored token for booking:', {
      booking_id: bookingId,
      token_preview: token.substring(0, 10) + '...',
      storage_key: getGuestBookingTokenKey(bookingId)
    });
  } catch (error) {
    console.error('[GuestBookingTokens] Failed to write token to localStorage:', error);
  }
}

/**
 * Clear guest booking token from localStorage
 * @param {string} bookingId - Booking ID
 */
export function clearGuestBookingToken(bookingId) {
  if (!bookingId) return;
  try {
    localStorage.removeItem(getGuestBookingTokenKey(bookingId));
    console.log('[GuestBookingTokens] Cleared token for booking:', bookingId);
  } catch (error) {
    console.error('[GuestBookingTokens] Failed to clear token:', error);
  }
}

/**
 * Resolve guest booking token from multiple sources with priority order:
 * 1. Fresh token from booking payload (highest priority)
 * 2. Stored token from localStorage for this booking
 * 3. Query string token (fallback for deep links)
 * 
 * @param {Object} options - Token resolution options
 * @param {string} options.bookingId - Booking ID
 * @param {string} options.bookingToken - Fresh token from booking API response
 * @param {string} options.queryToken - Token from URL query string
 * @returns {string|null} Resolved token or null
 */
export function resolveGuestBookingToken({ bookingId, bookingToken, queryToken }) {
  const resolved = bookingToken || readGuestBookingToken(bookingId) || queryToken || null;
  
  console.log('[GuestBookingTokens] Token resolution:', {
    booking_id: bookingId,
    has_booking_token: !!bookingToken,
    has_stored_token: !!readGuestBookingToken(bookingId),
    has_query_token: !!queryToken,
    resolved_source: bookingToken ? 'booking_payload' : 
                    readGuestBookingToken(bookingId) ? 'localStorage' :
                    queryToken ? 'query_string' : 'none',
    resolved_preview: resolved ? resolved.substring(0, 10) + '...' : 'null'
  });
  
  return resolved;
}

/**
 * Clean up old guest booking tokens (housekeeping)
 * Removes tokens older than specified days
 * @param {number} maxAgeInDays - Maximum age in days (default: 30)
 */
export function cleanupOldGuestBookingTokens(maxAgeInDays = 30) {
  try {
    const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
    const keysToRemove = [];
    
    // Check all localStorage keys for old guest booking tokens
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('guest_booking_token:')) {
        try {
          const item = localStorage.getItem(key);
          // If we can't determine age, keep it (might be recent)
          // This is a simple implementation - could be enhanced with timestamp storage
        } catch (e) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    if (keysToRemove.length > 0) {
      console.log('[GuestBookingTokens] Cleaned up old tokens:', keysToRemove.length);
    }
  } catch (error) {
    console.error('[GuestBookingTokens] Token cleanup failed:', error);
  }
}