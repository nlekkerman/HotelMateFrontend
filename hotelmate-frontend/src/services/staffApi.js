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

/**
 * Staff Overstay Actions API
 * For handling overstay incidents in booking details
 */
export const staffOverstayAPI = {
  /**
   * Get overstay status for a booking
   * @param {string} hotelSlug - The hotel slug
   * @param {string} bookingId - Booking reference (e.g. BK-2026-0005)
   * @returns {Promise} - Overstay status data
   */
  staffOverstayStatus: (hotelSlug, bookingId) => {
    const url = buildStaffURL(hotelSlug, 'room-bookings', `${bookingId}/overstay/status/`);
    console.log('[staffOverstayAPI] Status request URL:', url);
    return api.get(url);
  },

  /**
   * Acknowledge overstay incident
   * @param {string} hotelSlug - The hotel slug
   * @param {string} bookingId - Booking reference (e.g. BK-2026-0005)
   * @param {object} payload - { note: string, dismiss: boolean }
   * @returns {Promise} - Acknowledgment response
   */
  staffOverstayAcknowledge: (hotelSlug, bookingId, payload) => {
    const url = buildStaffURL(hotelSlug, 'room-bookings', `${bookingId}/overstay/acknowledge/`);
    console.log('[staffOverstayAPI] Acknowledge request URL:', url);
    return api.post(url, {
      note: payload.note || '',
      dismiss: payload.dismiss || false
    });
  },

  /**
   * Extend stay for overstay incident
   * @param {string} hotelSlug - The hotel slug
   * @param {string} bookingId - Booking reference (e.g. BK-2026-0005)
   * @param {object} payload - { add_nights?: number, new_checkout_date?: string }
   * @param {object} options - { idempotencyKey?: string }
   * @returns {Promise} - Extension response with pricing/conflicts
   */
  staffOverstayExtend: (hotelSlug, bookingId, payload, options = {}) => {
    const url = buildStaffURL(hotelSlug, 'room-bookings', `${bookingId}/overstay/extend/`);
    
    console.log('[staffOverstayAPI] Extend request details:', {
      hotelSlug,
      bookingId,
      url,
      payload,
      options
    });
    
    // Validate payload - exactly one of add_nights or new_checkout_date
    const hasAddNights = payload.add_nights !== undefined && payload.add_nights !== null;
    const hasNewCheckoutDate = payload.new_checkout_date !== undefined && payload.new_checkout_date !== null && payload.new_checkout_date !== '';
    
    if (hasAddNights && hasNewCheckoutDate) {
      return Promise.reject(new Error('Cannot specify both add_nights and new_checkout_date'));
    }
    if (!hasAddNights && !hasNewCheckoutDate) {
      return Promise.reject(new Error('Must specify either add_nights or new_checkout_date'));
    }
    
    // Build request config with idempotency header if provided and not empty
    const config = {};
    if (options.idempotencyKey && options.idempotencyKey.trim()) {
      config.headers = {
        'Idempotency-Key': options.idempotencyKey.trim()
      };
    }
    
    return api.post(url, payload, config);
  }
};

export default publicPageBuilderAPI;
