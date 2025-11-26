import api, { buildStaffURL, getHotelSlug } from './api';

/**
 * Public Page Builder API
 * For Super Staff Admins to build/manage hotel public pages
 */
export const publicPageBuilderAPI = {
  /**
   * Get builder data (blank canvas or populated sections)
   * @param {string} hotelSlug - The hotel slug
   * @returns {Promise} - Builder data with is_empty flag, sections, presets
   */
  getBuilderData: (hotelSlug) => {
    const url = buildStaffURL(hotelSlug, 'hotel', 'public-page-builder/');
    return api.get(url);
  },

  /**
   * Bootstrap default layout (only works on blank hotels)
   * @param {string} hotelSlug - The hotel slug
   * @returns {Promise} - Created sections data
   */
  bootstrapDefault: (hotelSlug) => {
    const url = buildStaffURL(hotelSlug, 'hotel', 'public-page-builder/bootstrap-default/');
    return api.post(url);
  },

  /**
   * Create a new section
   * @param {string} hotelSlug - The hotel slug
   * @param {object} sectionData - Section data (hotel, name, position, is_active)
   * @returns {Promise} - Created section
   */
  createSection: (hotelSlug, sectionData) => {
    const url = `/staff/hotel/${hotelSlug}/public-sections/`;
    return api.post(url, sectionData);
  },

  /**
   * Update a section
   * @param {string} hotelSlug - The hotel slug
   * @param {number} sectionId - Section ID
   * @param {object} sectionData - Updated section data
   * @returns {Promise} - Updated section
   */
  updateSection: (hotelSlug, sectionId, sectionData) => {
    const url = `/staff/hotel/${hotelSlug}/public-sections/${sectionId}/`;
    return api.patch(url, sectionData);
  },

  /**
   * Delete a section
   * @param {string} hotelSlug - The hotel slug
   * @param {number} sectionId - Section ID
   * @returns {Promise}
   */
  deleteSection: (hotelSlug, sectionId) => {
    const url = `/staff/hotel/${hotelSlug}/public-sections/${sectionId}/`;
    return api.delete(url);
  },

  /**
   * Create element for a section
   * @param {string} hotelSlug - The hotel slug
   * @param {object} elementData - Element data (section, element_type, title, subtitle, body, settings, etc.)
   * @returns {Promise} - Created element
   */
  createElement: (hotelSlug, elementData) => {
    const url = `/staff/hotel/${hotelSlug}/public-elements/`;
    console.log('[staffApi.createElement] URL:', url);
    console.log('[staffApi.createElement] Payload:', JSON.stringify(elementData, null, 2));
    console.log('[staffApi.createElement] section field:', elementData.section);
    console.log('[staffApi.createElement] section type:', typeof elementData.section);
    return api.post(url, elementData);
  },

  /**
   * Update an element
   * @param {string} hotelSlug - The hotel slug
   * @param {number} elementId - Element ID
   * @param {object} elementData - Updated element data
   * @returns {Promise} - Updated element
   */
  updateElement: (hotelSlug, elementId, elementData) => {
    const url = `/staff/hotel/${hotelSlug}/public-elements/${elementId}/`;
    return api.patch(url, elementData);
  },

  /**
   * Delete an element
   * @param {string} hotelSlug - The hotel slug
   * @param {number} elementId - Element ID
   * @returns {Promise}
   */
  deleteElement: (hotelSlug, elementId) => {
    const url = `/staff/hotel/${hotelSlug}/public-elements/${elementId}/`;
    return api.delete(url);
  },

  /**
   * Create element item (for cards, gallery, reviews)
   * @param {string} hotelSlug - The hotel slug
   * @param {object} itemData - Item data (element, title, subtitle, body, image_url, meta, sort_order, is_active)
   * @returns {Promise} - Created item
   */
  createElementItem: (hotelSlug, itemData) => {
    const url = buildStaffURL(hotelSlug, 'hotel', 'public-element-items/');
    return api.post(url, itemData);
  },

  /**
   * Update element item
   * @param {string} hotelSlug - The hotel slug
   * @param {number} itemId - Item ID
   * @param {object} itemData - Updated item data
   * @returns {Promise} - Updated item
   */
  updateElementItem: (hotelSlug, itemId, itemData) => {
    const url = buildStaffURL(hotelSlug, 'hotel', `public-element-items/${itemId}/`);
    return api.patch(url, itemData);
  },

  /**
   * Delete element item
   * @param {string} hotelSlug - The hotel slug
   * @param {number} itemId - Item ID
   * @returns {Promise}
   */
  deleteElementItem: (hotelSlug, itemId) => {
    const url = buildStaffURL(hotelSlug, 'hotel', `public-element-items/${itemId}/`);
    return api.delete(url);
  },

  /**
   * Upload image for element or item
   * @param {string} hotelSlug - The hotel slug
   * @param {File} file - Image file
   * @returns {Promise} - Uploaded image URL
   */
  uploadImage: (hotelSlug, file) => {
    const formData = new FormData();
    formData.append('image', file);
    const url = buildStaffURL(hotelSlug, 'hotel', 'public-page-images/');
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * Reorder sections
   * @param {string} hotelSlug - The hotel slug
   * @param {array} sectionIds - Array of section IDs in new order
   * @returns {Promise}
   */
  reorderSections: (hotelSlug, sectionIds) => {
    const url = buildStaffURL(hotelSlug, 'hotel', 'public-sections/reorder/');
    return api.post(url, { section_ids: sectionIds });
  }
};

export default publicPageBuilderAPI;
