import api, { buildStaffURL, getHotelSlug } from './api.js';

/**
 * Room Operations API Module
 * Canonical endpoints for room status management, turnover workflows, and guest operations
 * Following realtime-only architecture - no optimistic UI updates
 */

// ============= HOUSEKEEPING OPERATIONS (room_id) =============

/**
 * Update room status via housekeeping endpoint
 * @param {string} hotelSlug - The hotel slug
 * @param {string} roomId - The room ID (not room_number)
 * @param {Object} payload - { status: string, note?: string }
 * @returns {Promise} - API response
 */
export const updateHousekeepingRoomStatus = async (hotelSlug, roomId, { status, note }) => {
  const url = buildStaffURL(hotelSlug, 'housekeeping', `/rooms/${roomId}/status/`);
  const payload = { status };
  if (note && note.trim()) {
    payload.note = note.trim();
  }
  return api.post(url, payload);
};

/**
 * Get room status history from housekeeping
 * @param {string} hotelSlug - The hotel slug
 * @param {string} roomId - The room ID (not room_number)
 * @returns {Promise} - API response with status history
 */
export const getHousekeepingStatusHistory = async (hotelSlug, roomId) => {
  const url = buildStaffURL(hotelSlug, 'housekeeping', `/rooms/${roomId}/status-history/`);
  return api.get(url);
};

// ============= TURNOVER WORKFLOW OPERATIONS (room_number) =============

/**
 * Start cleaning process for a room
 * @param {string} hotelSlug - The hotel slug
 * @param {string} roomNumber - The room number
 * @returns {Promise} - API response
 */
export const startCleaning = async (hotelSlug, roomNumber) => {
  const url = buildStaffURL(hotelSlug, '', `/rooms/${roomNumber}/start-cleaning/`);
  return api.post(url);
};

/**
 * Mark room as cleaned (uninspected)
 * @param {string} hotelSlug - The hotel slug
 * @param {string} roomNumber - The room number
 * @returns {Promise} - API response
 */
export const markCleaned = async (hotelSlug, roomNumber) => {
  const url = buildStaffURL(hotelSlug, '', `/rooms/${roomNumber}/mark-cleaned/`);
  return api.post(url);
};

/**
 * Inspect cleaned room and mark ready
 * @param {string} hotelSlug - The hotel slug
 * @param {string} roomNumber - The room number
 * @returns {Promise} - API response
 */
export const inspectRoom = async (hotelSlug, roomNumber) => {
  const url = buildStaffURL(hotelSlug, '', `/rooms/${roomNumber}/inspect/`);
  return api.post(url);
};

/**
 * Mark room as requiring maintenance
 * @param {string} hotelSlug - The hotel slug
 * @param {string} roomNumber - The room number
 * @returns {Promise} - API response
 */
export const markMaintenance = async (hotelSlug, roomNumber) => {
  const url = buildStaffURL(hotelSlug, '', `/rooms/${roomNumber}/mark-maintenance/`);
  return api.post(url);
};

/**
 * Complete maintenance and return room to service
 * @param {string} hotelSlug - The hotel slug
 * @param {string} roomNumber - The room number
 * @returns {Promise} - API response
 */
export const completeMaintenance = async (hotelSlug, roomNumber) => {
  const url = buildStaffURL(hotelSlug, '', `/rooms/${roomNumber}/complete-maintenance/`);
  return api.post(url);
};

// ============= GUEST OPERATIONS (room_number) =============

/**
 * Check in guest to room
 * @param {string} hotelSlug - The hotel slug
 * @param {string} roomNumber - The room number
 * @returns {Promise} - API response
 */
export const checkinRoom = async (hotelSlug, roomNumber) => {
  const url = buildStaffURL(hotelSlug, '', `/rooms/${roomNumber}/checkin/`);
  return api.post(url);
};

/**
 * Check out guest from room
 * @param {string} hotelSlug - The hotel slug
 * @param {string} roomNumber - The room number
 * @returns {Promise} - API response
 */
export const checkoutRoom = async (hotelSlug, roomNumber) => {
  const url = buildStaffURL(hotelSlug, '', `/rooms/${roomNumber}/checkout/`);
  return api.post(url);
};

// ============= CONVENIENCE FUNCTIONS =============

/**
 * Get current hotel slug from context or localStorage
 * @returns {string|null}
 */
export const getCurrentHotelSlug = () => {
  return getHotelSlug();
};

/**
 * Room operations service object for easier usage
 */
export const roomOperationsService = {
  // Housekeeping
  updateStatus: updateHousekeepingRoomStatus,
  getStatusHistory: getHousekeepingStatusHistory,
  
  // Turnover workflow
  startCleaning,
  markCleaned,
  inspectRoom,
  markMaintenance,
  completeMaintenance,
  
  // Guest operations
  checkinRoom,
  checkoutRoom,
  
  // Utilities
  getCurrentHotelSlug
};