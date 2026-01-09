/**
 * Canonical channel name helpers
 * Single source of truth for all Pusher channel naming patterns
 * Prevents "same idea, different string" bugs
 */

/**
 * Staff chat conversation channel for message display
 * Used by staff UI to receive guest messages and staff replies in real-time
 * @param {string} hotelSlug - Hotel identifier  
 * @param {string} conversationId - Conversation identifier
 * @returns {string} Channel name: {hotelSlug}.staff-chat.{conversationId}
 */
export const staffChatConversationChannel = (hotelSlug, conversationId) =>
  `${hotelSlug}.staff-chat.${conversationId}`;

/**
 * Staff notification channel for alerts and badges
 * Used for toast notifications, unread counts, and conversation assignments
 * @param {string} hotelSlug - Hotel identifier
 * @param {string} staffId - Staff member identifier  
 * @returns {string} Channel name: {hotelSlug}.staff-{staffId}-notifications
 */
export const staffNotificationsChannel = (hotelSlug, staffId) =>
  `${hotelSlug}.staff-${staffId}-notifications`;

/**
 * Guest booking channel for guest UI
 * Used by guest frontend to receive staff replies
 * @param {string} hotelSlug - Hotel identifier
 * @param {string} bookingId - Booking identifier
 * @returns {string} Channel name: private-hotel-{hotelSlug}-guest-chat-booking-{bookingId}
 */
export const guestBookingChannel = (hotelSlug, bookingId) =>
  `private-hotel-${hotelSlug}-guest-chat-booking-${bookingId}`;

/**
 * Hotel-wide guest messages channel for broadcast notifications
 * Used for staff dashboard notifications when any guest sends a message
 * @param {string} hotelSlug - Hotel identifier
 * @returns {string} Channel name: {hotelSlug}-guest-messages
 */
export const hotelGuestMessagesChannel = (hotelSlug) =>
  `${hotelSlug}-guest-messages`;