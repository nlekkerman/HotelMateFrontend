/**
 * Shared booking display helpers.
 *
 * Canonical room field from backend: `assigned_room_number`
 * Backward-safe fallbacks kept for older payload shapes.
 */

/**
 * Resolve the assigned room number from a booking object.
 * Priority: canonical flat field → legacy flat field → nested shapes.
 *
 * @param {object|null|undefined} booking
 * @returns {string|number|null}
 */
export const getAssignedRoomNumber = (booking) =>
  booking?.assigned_room_number ??
  booking?.room_number ??
  booking?.assigned_room?.room_number ??
  booking?.room?.room_number ??
  null;
