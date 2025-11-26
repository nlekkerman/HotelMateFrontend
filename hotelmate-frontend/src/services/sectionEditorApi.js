/**
 * Section-Based Page Editor API Service
 * Handles all API calls for section management, hero, gallery, list, and news sections
 */

import api, { buildStaffURL } from './api';

/**
 * Build section editor URL  
 * Pattern: /api/staff/hotel/<hotel_slug>/<path>
 * @param {string} hotelSlug - Hotel slug
 * @param {string} path - Additional path
 * @returns {string} - Formatted URL
 */
const buildSectionURL = (hotelSlug, path = '') => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/staff/hotel/${hotelSlug}/${cleanPath}`;
};

// ==========================================
// SECTION MANAGEMENT
// ==========================================

/**
 * Create a new section (auto-initializes based on type)
 * @param {string} hotelSlug - Hotel slug
 * @param {Object} sectionData - Section data
 * @returns {Promise<Object>} Created section
 */
export const createSection = async (hotelSlug, sectionData) => {
  const response = await api.post(
    buildSectionURL(hotelSlug, 'sections/create/'),
    sectionData
  );
  // Backend returns {message, section}
  return response.data.section || response.data;
};

/**
 * List all sections for a hotel
 * @param {string} hotelSlug - Hotel slug
 * @returns {Promise<Array>} List of sections
 */
export const listSections = async (hotelSlug) => {
  const response = await api.get(
    buildSectionURL(hotelSlug, 'public-sections/')
  );
  // Backend returns paginated response: {count, next, previous, results}
  return response.data.results || response.data;
};

/**
 * Update a section
 * @param {string} hotelSlug - Hotel slug
 * @param {number} sectionId - Section ID
 * @param {Object} updates - Section updates
 * @returns {Promise<Object>} Updated section
 */
export const updateSection = async (hotelSlug, sectionId, updates) => {
  const response = await api.patch(
    buildSectionURL(hotelSlug, `public-sections/${sectionId}/`),
    updates
  );
  return response.data;
};

/**
 * Delete a section
 * @param {string} hotelSlug - Hotel slug
 * @param {number} sectionId - Section ID
 * @returns {Promise<void>}
 */
export const deleteSection = async (hotelSlug, sectionId) => {
  await api.delete(
    buildSectionURL(hotelSlug, `public-sections/${sectionId}/`)
  );
};

// ==========================================
// HERO SECTION
// ==========================================

/**
 * Update hero section data
 * @param {string} hotelSlug - Hotel slug
 * @param {number} heroId - Hero section ID
 * @param {Object} updates - Hero data updates
 * @returns {Promise<Object>} Updated hero data
 */
export const updateHeroSection = async (hotelSlug, heroId, updates) => {
  const response = await api.patch(
    buildSectionURL(hotelSlug, `hero-sections/${heroId}/`),
    updates
  );
  return response.data;
};

/**
 * Upload hero image
 * @param {string} hotelSlug - Hotel slug
 * @param {number} heroId - Hero section ID
 * @param {File} imageFile - Image file
 * @returns {Promise<Object>} Updated hero data
 */
export const uploadHeroImage = async (hotelSlug, heroId, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await api.post(
    buildSectionURL(hotelSlug, `hero-sections/${heroId}/upload-hero-image/`),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Upload hero logo
 * @param {string} hotelSlug - Hotel slug
 * @param {number} heroId - Hero section ID
 * @param {File} imageFile - Logo file
 * @returns {Promise<Object>} Updated hero data
 */
export const uploadHeroLogo = async (hotelSlug, heroId, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await api.post(
    buildSectionURL(hotelSlug, `hero-sections/${heroId}/upload-logo/`),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

// ==========================================
// GALLERY SECTION
// ==========================================

/**
 * Create gallery container
 * @param {string} hotelSlug - Hotel slug
 * @param {Object} containerData - Gallery container data
 * @returns {Promise<Object>} Created gallery container
 */
export const createGalleryContainer = async (hotelSlug, containerData) => {
  const response = await api.post(
    buildSectionURL(hotelSlug, 'gallery-containers/'),
    containerData
  );
  return response.data;
};

/**
 * List gallery containers for a section
 * @param {string} hotelSlug - Hotel slug
 * @param {number} sectionId - Section ID
 * @returns {Promise<Array>} List of gallery containers
 */
export const listGalleryContainers = async (hotelSlug, sectionId) => {
  const response = await api.get(
    buildSectionURL(hotelSlug, `gallery-containers/?section=${sectionId}`)
  );
  return response.data;
};

/**
 * Update gallery container
 * @param {string} hotelSlug - Hotel slug
 * @param {number} containerId - Gallery container ID
 * @param {Object} updates - Container updates
 * @returns {Promise<Object>} Updated gallery container
 */
export const updateGalleryContainer = async (hotelSlug, containerId, updates) => {
  const response = await api.patch(
    buildSectionURL(hotelSlug, `gallery-containers/${containerId}/`),
    updates
  );
  return response.data;
};

/**
 * Delete gallery container
 * @param {string} hotelSlug - Hotel slug
 * @param {number} containerId - Gallery container ID
 * @returns {Promise<void>}
 */
export const deleteGalleryContainer = async (hotelSlug, containerId) => {
  await api.delete(
    buildSectionURL(hotelSlug, `gallery-containers/${containerId}/`)
  );
};

/**
 * Bulk upload images to gallery
 * @param {string} hotelSlug - Hotel slug
 * @param {number} galleryId - Gallery container ID
 * @param {Array<File>} imageFiles - Image files (max 20)
 * @returns {Promise<Object>} Upload result with created images
 */
export const bulkUploadGalleryImages = async (hotelSlug, galleryId, imageFiles) => {
  const formData = new FormData();
  formData.append('gallery', galleryId);
  
  imageFiles.forEach((file) => {
    formData.append('images', file);
  });
  
  const response = await api.post(
    buildSectionURL(hotelSlug, 'gallery-images/bulk-upload/'),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Update gallery image
 * @param {string} hotelSlug - Hotel slug
 * @param {number} imageId - Gallery image ID
 * @param {Object} updates - Image updates (caption, alt_text, sort_order)
 * @returns {Promise<Object>} Updated gallery image
 */
export const updateGalleryImage = async (hotelSlug, imageId, updates) => {
  const response = await api.patch(
    buildSectionURL(hotelSlug, `gallery-images/${imageId}/`),
    updates
  );
  return response.data;
};

/**
 * Delete gallery image
 * @param {string} hotelSlug - Hotel slug
 * @param {number} imageId - Gallery image ID
 * @returns {Promise<void>}
 */
export const deleteGalleryImage = async (hotelSlug, imageId) => {
  await api.delete(
    buildSectionURL(hotelSlug, `gallery-images/${imageId}/`)
  );
};

// ==========================================
// LIST/CARD SECTION
// ==========================================

/**
 * Create list container
 * @param {string} hotelSlug - Hotel slug
 * @param {Object} containerData - List container data
 * @returns {Promise<Object>} Created list container
 */
export const createListContainer = async (hotelSlug, containerData) => {
  const response = await api.post(
    buildSectionURL(hotelSlug, 'list-containers/'),
    containerData
  );
  return response.data;
};

/**
 * List containers for a section
 * @param {string} hotelSlug - Hotel slug
 * @param {number} sectionId - Section ID
 * @returns {Promise<Array>} List of list containers
 */
export const listListContainers = async (hotelSlug, sectionId) => {
  const response = await api.get(
    buildSectionURL(hotelSlug, `list-containers/?section=${sectionId}`)
  );
  return response.data;
};

/**
 * Update list container
 * @param {string} hotelSlug - Hotel slug
 * @param {number} containerId - List container ID
 * @param {Object} updates - Container updates
 * @returns {Promise<Object>} Updated list container
 */
export const updateListContainer = async (hotelSlug, containerId, updates) => {
  const response = await api.patch(
    buildSectionURL(hotelSlug, `list-containers/${containerId}/`),
    updates
  );
  return response.data;
};

/**
 * Delete list container
 * @param {string} hotelSlug - Hotel slug
 * @param {number} containerId - List container ID
 * @returns {Promise<void>}
 */
export const deleteListContainer = async (hotelSlug, containerId) => {
  await api.delete(
    buildSectionURL(hotelSlug, `list-containers/${containerId}/`)
  );
};

/**
 * Create card
 * @param {string} hotelSlug - Hotel slug
 * @param {Object} cardData - Card data
 * @returns {Promise<Object>} Created card
 */
export const createCard = async (hotelSlug, cardData) => {
  const response = await api.post(
    buildSectionURL(hotelSlug, 'cards/'),
    cardData
  );
  return response.data;
};

/**
 * Update card
 * @param {string} hotelSlug - Hotel slug
 * @param {number} cardId - Card ID
 * @param {Object} updates - Card updates
 * @returns {Promise<Object>} Updated card
 */
export const updateCard = async (hotelSlug, cardId, updates) => {
  const response = await api.patch(
    buildSectionURL(hotelSlug, `cards/${cardId}/`),
    updates
  );
  return response.data;
};

/**
 * Upload card image
 * @param {string} hotelSlug - Hotel slug
 * @param {number} cardId - Card ID
 * @param {File} imageFile - Image file
 * @returns {Promise<Object>} Updated card
 */
export const uploadCardImage = async (hotelSlug, cardId, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await api.post(
    buildSectionURL(hotelSlug, `cards/${cardId}/upload-image/`),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Delete card
 * @param {string} hotelSlug - Hotel slug
 * @param {number} cardId - Card ID
 * @returns {Promise<void>}
 */
export const deleteCard = async (hotelSlug, cardId) => {
  await api.delete(
    buildSectionURL(hotelSlug, `cards/${cardId}/`)
  );
};

// ==========================================
// NEWS SECTION
// ==========================================

/**
 * Create news item
 * @param {string} hotelSlug - Hotel slug
 * @param {Object} newsData - News item data
 * @returns {Promise<Object>} Created news item
 */
export const createNewsItem = async (hotelSlug, newsData) => {
  const response = await api.post(
    buildSectionURL(hotelSlug, 'news-items/'),
    newsData
  );
  return response.data;
};

/**
 * List news items for a section
 * @param {string} hotelSlug - Hotel slug
 * @param {number} sectionId - Section ID
 * @returns {Promise<Array>} List of news items
 */
export const listNewsItems = async (hotelSlug, sectionId) => {
  const response = await api.get(
    buildSectionURL(hotelSlug, `news-items/?section=${sectionId}`)
  );
  return response.data;
};

/**
 * Update news item
 * @param {string} hotelSlug - Hotel slug
 * @param {number} newsId - News item ID
 * @param {Object} updates - News item updates
 * @returns {Promise<Object>} Updated news item
 */
export const updateNewsItem = async (hotelSlug, newsId, updates) => {
  const response = await api.patch(
    buildSectionURL(hotelSlug, `news-items/${newsId}/`),
    updates
  );
  return response.data;
};

/**
 * Delete news item
 * @param {string} hotelSlug - Hotel slug
 * @param {number} newsId - News item ID
 * @returns {Promise<void>}
 */
export const deleteNewsItem = async (hotelSlug, newsId) => {
  await api.delete(
    buildSectionURL(hotelSlug, `news-items/${newsId}/`)
  );
};

/**
 * Create content block
 * @param {string} hotelSlug - Hotel slug
 * @param {Object} blockData - Content block data
 * @returns {Promise<Object>} Created content block
 */
export const createContentBlock = async (hotelSlug, blockData) => {
  const response = await api.post(
    buildSectionURL(hotelSlug, 'content-blocks/'),
    blockData
  );
  return response.data;
};

/**
 * Update content block
 * @param {string} hotelSlug - Hotel slug
 * @param {number} blockId - Content block ID
 * @param {Object} updates - Block updates
 * @returns {Promise<Object>} Updated content block
 */
export const updateContentBlock = async (hotelSlug, blockId, updates) => {
  const response = await api.patch(
    buildSectionURL(hotelSlug, `content-blocks/${blockId}/`),
    updates
  );
  return response.data;
};

/**
 * Upload content block image
 * @param {string} hotelSlug - Hotel slug
 * @param {number} blockId - Content block ID
 * @param {File} imageFile - Image file
 * @returns {Promise<Object>} Updated content block
 */
export const uploadContentBlockImage = async (hotelSlug, blockId, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await api.post(
    buildSectionURL(hotelSlug, `content-blocks/${blockId}/upload-image/`),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Delete content block
 * @param {string} hotelSlug - Hotel slug
 * @param {number} blockId - Content block ID
 * @returns {Promise<void>}
 */
export const deleteContentBlock = async (hotelSlug, blockId) => {
  await api.delete(
    buildSectionURL(hotelSlug, `content-blocks/${blockId}/`)
  );
};

// ==========================================
// PUBLIC VIEW
// ==========================================

/**
 * Get hotel page with all sections (public endpoint)
 * @param {string} slug - Hotel slug
 * @returns {Promise<Object>} Hotel page data with sections
 */
export const getPublicHotelPage = async (slug) => {
  // Use publicAPI for public endpoint (no auth required)
  const { publicAPI } = await import('./api');
  const response = await publicAPI.get(`/public/hotel/${slug}/page/`);
  return response.data;
};

export default {
  // Section Management
  createSection,
  listSections,
  updateSection,
  deleteSection,
  
  // Hero
  updateHeroSection,
  uploadHeroImage,
  uploadHeroLogo,
  
  // Gallery
  createGalleryContainer,
  listGalleryContainers,
  updateGalleryContainer,
  deleteGalleryContainer,
  bulkUploadGalleryImages,
  updateGalleryImage,
  deleteGalleryImage,
  
  // List/Cards
  createListContainer,
  listListContainers,
  updateListContainer,
  deleteListContainer,
  createCard,
  updateCard,
  uploadCardImage,
  deleteCard,
  
  // News
  createNewsItem,
  listNewsItems,
  updateNewsItem,
  deleteNewsItem,
  createContentBlock,
  updateContentBlock,
  uploadContentBlockImage,
  deleteContentBlock,
  
  // Public
  getPublicHotelPage,
};
