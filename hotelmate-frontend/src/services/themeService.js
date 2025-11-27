// src/services/themeService.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hotel-porter-d25ad83b12cf.herokuapp.com';

/**
 * Fetch hotel settings including theme colors
 * @param {string} hotelSlug - The hotel slug
 * @param {string} authToken - Authentication token
 * @returns {Promise<Object>} Hotel settings with theme colors
 */
export async function fetchHotelSettings(hotelSlug, authToken) {
  const response = await fetch(
    `${API_BASE_URL}/staff/hotel/${hotelSlug}/settings/`,
    {
      headers: {
        'Authorization': `Token ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch hotel settings');
  }
  
  return await response.json();
}

/**
 * Update hotel settings including theme colors
 * @param {string} hotelSlug - The hotel slug
 * @param {string} authToken - Authentication token
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<Object>} Updated hotel settings
 */
export async function updateHotelTheme(hotelSlug, authToken, updates) {
  const response = await fetch(
    `${API_BASE_URL}/staff/hotel/${hotelSlug}/settings/`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update theme');
  }
  
  return await response.json();
}
