// src/services/themeService.js
import api from './api';

/**
 * Fetch hotel settings including theme colors
 * @param {string} hotelSlug - The hotel slug
 * @param {string} authToken - Authentication token
 * @returns {Promise<Object>} Hotel settings with theme colors
 */
export async function fetchHotelSettings(hotelSlug, authToken) {
  const { data } = await api.get(`/staff/hotel/${hotelSlug}/settings/`);
  return data;
}

/**
 * Update hotel settings including theme colors
 * @param {string} hotelSlug - The hotel slug
 * @param {string} authToken - Authentication token
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<Object>} Updated hotel settings
 */
export async function updateHotelTheme(hotelSlug, authToken, updates) {
  const { data } = await api.patch(`/staff/hotel/${hotelSlug}/settings/`, updates);
  return data;
}
