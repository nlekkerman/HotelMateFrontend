import { publicAPI } from "./api";

// Use centralized publicAPI from api.js for consistency and Capacitor support

// API Methods for Public Hotel Page
export const publicHotelPageAPI = {
  /**
   * Fetch all active hotels for landing page
   * @param {Object} params - Query parameters (city, country, hotel_type, tags, sort_by)
   * @returns {Promise} List of hotels
   */
  getHotels: async (params = {}) => {
    try {
      const response = await publicAPI.get('/public/hotels/', { params });
      return response.data;
    } catch (error) {
      console.error('[PublicAPI] Failed to fetch hotels:', error);
      throw error;
    }
  },

  /**
   * Fetch filter options for hotel search
   * @returns {Promise} Available filter options
   */
  getFilterOptions: async () => {
    try {
      const response = await publicAPI.get('/public/hotels/filters/');
      return response.data;
    } catch (error) {
      console.error('[PublicAPI] Failed to fetch filter options:', error);
      throw error;
    }
  },

  /**
   * Fetch dynamic hotel public page data
   * @param {string} slug - Hotel slug
   * @returns {Promise} Hotel page data with sections
   */
  getHotelPage: async (slug) => {
    try {
      const response = await publicAPI.get(`/public/hotel/${slug}/page/`);
      return response.data;
    } catch (error) {
      console.error(`[PublicAPI] Failed to fetch hotel page for ${slug}:`, error);
      throw error;
    }
  },

  /**
   * Fetch all available presets for styling sections, cards, and elements
   * @param {Object} params - Optional filters (target_type, section_type)
   * @returns {Promise} Preset configurations organized by type
   */
  getPresets: async (params = {}) => {
    try {
      const response = await publicApi.get('/public/presets/', { params });
      return response.data;
    } catch (error) {
      console.error('[PublicAPI] Failed to fetch presets:', error);
      throw error;
    }
  },

  /**
   * Fetch a single preset by key
   * @param {string} key - Unique preset key
   * @returns {Promise} Single preset configuration
   */
  getPreset: async (key) => {
    try {
      const response = await publicApi.get(`/public/presets/${key}/`);
      return response.data;
    } catch (error) {
      console.error(`[PublicAPI] Failed to fetch preset ${key}:`, error);
      throw error;
    }
  },
};

export default publicApi;
