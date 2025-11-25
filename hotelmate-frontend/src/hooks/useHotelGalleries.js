import { useState, useEffect } from 'react';
import Pusher from 'pusher-js';
import api from '@/services/api';

/**
 * Hook for managing hotel galleries with real-time updates
 * Based on the new Gallery System (GALLERY_SYSTEM_GUIDE.md)
 * 
 * @param {string} hotelSlug - The hotel slug
 * @returns {object} Gallery management functions and state
 */
export const useHotelGalleries = (hotelSlug) => {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all galleries for the hotel
  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/staff/hotel/${hotelSlug}/galleries/`);
      console.log('[useHotelGalleries] 📦 Fetched galleries:', response.data);
      
      // Handle paginated response - check for results array
      let data = [];
      if (response.data && response.data.results) {
        // Paginated response
        data = response.data.results;
      } else if (Array.isArray(response.data)) {
        // Direct array response
        data = response.data;
      }
      
      // Ensure each gallery has images array initialized
      const galleriesWithImages = data.map(g => ({
        ...g,
        images: g.images || [],
        image_count: g.image_count || 0
      }));
      
      console.log('[useHotelGalleries] ✅ Setting galleries:', galleriesWithImages);
      setGalleries(galleriesWithImages);
      setError(null);
    } catch (err) {
      console.error('[useHotelGalleries] Fetch error:', err);
      setError(err.message);
      setGalleries([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Create a new gallery
  const createGallery = async (galleryData) => {
    try {
      const response = await api.post(`/staff/hotel/${hotelSlug}/galleries/`, galleryData);
      const newGallery = response.data;
      
      // Ensure the new gallery has images array initialized
      if (!newGallery.images) {
        newGallery.images = [];
        newGallery.image_count = 0;
      }
      
      setGalleries([...galleries, newGallery]);
      return newGallery;
    } catch (err) {
      console.error('[useHotelGalleries] Create gallery error:', err);
      throw err;
    }
  };

  // Update gallery details (name, description, category, etc.)
  const updateGallery = async (galleryId, updates) => {
    try {
      const response = await api.patch(`/staff/hotel/${hotelSlug}/galleries/${galleryId}/`, updates);
      setGalleries(galleries.map(g => g.id === galleryId ? response.data : g));
      return response.data;
    } catch (err) {
      console.error('[useHotelGalleries] Update gallery error:', err);
      throw err;
    }
  };

  // Delete a gallery
  const deleteGallery = async (galleryId) => {
    try {
      await api.delete(`/staff/hotel/${hotelSlug}/galleries/${galleryId}/`);
      setGalleries(galleries.filter(g => g.id !== galleryId));
    } catch (err) {
      console.error('[useHotelGalleries] Delete gallery error:', err);
      throw err;
    }
  };

  // Upload image to a specific gallery
  const uploadImage = async (galleryId, imageFile, caption = '', altText = '', isFeatured = false) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('caption', caption);
      formData.append('alt_text', altText || caption);
      formData.append('display_order', 0);
      formData.append('is_featured', isFeatured);

      const response = await api.post(
        `/staff/hotel/${hotelSlug}/galleries/${galleryId}/upload_image/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Refresh galleries to get updated image count
      await fetchGalleries();
      
      return response.data;
    } catch (err) {
      console.error('[useHotelGalleries] Upload image error:', err);
      throw err;
    }
  };

  // Delete an image from gallery
  const deleteImage = async (imageId) => {
    try {
      await api.delete(`/staff/hotel/${hotelSlug}/gallery-images/${imageId}/`);
      
      // Refresh galleries to get updated image count
      await fetchGalleries();
    } catch (err) {
      console.error('[useHotelGalleries] Delete image error:', err);
      throw err;
    }
  };

  // Update image details (caption, alt text, featured status)
  const updateImage = async (imageId, updates) => {
    try {
      const response = await api.patch(
        `/staff/hotel/${hotelSlug}/gallery-images/${imageId}/`,
        updates
      );
      
      // Refresh galleries to reflect changes
      await fetchGalleries();
      
      return response.data;
    } catch (err) {
      console.error('[useHotelGalleries] Update image error:', err);
      throw err;
    }
  };

  // Reorder images within a gallery
  const reorderImages = async (galleryId, imageIds) => {
    try {
      await api.post(
        `/staff/hotel/${hotelSlug}/galleries/${galleryId}/reorder_images/`,
        { image_ids: imageIds }
      );
      
      // Refresh galleries to reflect new order
      await fetchGalleries();
    } catch (err) {
      console.error('[useHotelGalleries] Reorder images error:', err);
      throw err;
    }
  };

  // Setup real-time updates and initial fetch
  useEffect(() => {
    if (!hotelSlug) return;

    fetchGalleries();

    // Setup Pusher for real-time updates
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe(`hotel-${hotelSlug}`);

    // Listen for gallery updates
    channel.bind('gallery-updated', (data) => {
      console.log('[useHotelGalleries] 🔄 Real-time gallery update:', data);
      
      // Refresh galleries when changes occur
      fetchGalleries();
    });

    // Cleanup
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`hotel-${hotelSlug}`);
    };
  }, [hotelSlug]);

  return {
    galleries,
    loading,
    error,
    createGallery,
    updateGallery,
    deleteGallery,
    uploadImage,
    deleteImage,
    updateImage,
    reorderImages,
    refreshGalleries: fetchGalleries,
  };
};
