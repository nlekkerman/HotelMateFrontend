import api from '@/services/api';

/**
 * Provision a new hotel with primary admin and optional registration packages.
 * This is the ONLY valid hotel creation flow — POST /api/hotels/provision/
 *
 * @param {Object} payload
 * @param {Object} payload.hotel - Hotel details
 * @param {Object} payload.primary_admin - { first_name, last_name, email }
 * @param {Object} [payload.registration_packages] - { generate_count }
 * @returns {Promise<Object>} Backend response with hotel, admin, warnings, packages
 */
export async function provisionHotel(payload) {
  const response = await api.post('/hotel/hotels/provision/', payload);
  return response.data;
}
