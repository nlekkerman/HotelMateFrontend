import { useEffect } from 'react';
import Pusher from 'pusher-js';

/**
 * Hook for real-time hotel updates via Pusher
 * @param {string} hotelSlug - Hotel slug identifier
 * @param {Function} onSettingsUpdate - Callback for settings updates
 * @param {Function} onGalleryUpdate - Callback for gallery updates
 * @param {Function} onRoomTypeUpdate - Callback for room type updates
 */
export const useHotelRealtime = (hotelSlug, onSettingsUpdate, onGalleryUpdate, onRoomTypeUpdate) => {
  useEffect(() => {
    if (!hotelSlug) return;

    // Initialize Pusher
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      encrypted: true,
    });

    const channelName = `hotel-${hotelSlug}`;
    console.log('[Pusher] Subscribing to channel:', channelName);
    const channel = pusher.subscribe(channelName);

    // Settings updates (hero image, general settings)
    channel.bind('settings-updated', (data) => {
      console.log('[Pusher] 🔄 Settings updated:', data);
      onSettingsUpdate?.(data);
    });

    // Gallery image uploaded
    channel.bind('gallery-image-uploaded', (data) => {
      console.log('[Pusher] 🖼️ Gallery image uploaded:', data);
      onGalleryUpdate?.({ type: 'add', url: data.url, publicId: data.public_id });
    });

    // Gallery reordered
    channel.bind('gallery-reordered', (data) => {
      console.log('[Pusher] 🔄 Gallery reordered:', data);
      onGalleryUpdate?.({ type: 'reorder', gallery: data.gallery });
    });

    // Room type image updated
    channel.bind('room-type-image-updated', (data) => {
      console.log('[Pusher] 🛏️ Room type image updated:', data);
      onRoomTypeUpdate?.(data);
    });

    // Connection status
    pusher.connection.bind('connected', () => {
      console.log('[Pusher] ✅ Connected to Pusher');
    });

    pusher.connection.bind('error', (error) => {
      console.error('[Pusher] ❌ Connection error:', error);
    });

    // Cleanup
    return () => {
      console.log('[Pusher] Unsubscribing from channel:', channelName);
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [hotelSlug, onSettingsUpdate, onGalleryUpdate, onRoomTypeUpdate]);
};

export default useHotelRealtime;
