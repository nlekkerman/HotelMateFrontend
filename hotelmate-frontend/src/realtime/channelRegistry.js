// src/realtime/channelRegistry.js
import { getPusherClient } from './realtimeClient';
import { handleIncomingRealtimeEvent } from './eventBus';

let subscriptionsActive = false;
let currentChannels = [];

/**
 * Subscribe to all base hotel channels and route events to event bus
 * @param {Object} params - Subscription parameters
 * @param {string} params.hotelSlug - Hotel slug for channel names
 * @param {string} [params.staffId] - Staff ID for personal channels (optional)
 * @returns {Function} Cleanup function
 */
export function subscribeBaseHotelChannels({ hotelSlug, staffId }) {
  if (subscriptionsActive) {
    console.warn('🔄 Channels already subscribed, skipping duplicate subscription');
    return () => {}; // Return empty cleanup
  }

  if (!hotelSlug) {
    console.warn('⚠️ No hotelSlug provided, skipping channel subscriptions');
    return () => {};
  }

  const pusher = getPusherClient();
  const channels = [];

  console.log('🔗 Subscribing to base hotel channels:', { hotelSlug, staffId });

  try {
    // Hotel-wide channel (offers, general hotel events)
    const hotelChannel = pusher.subscribe(`hotel-${hotelSlug}`);
    channels.push(hotelChannel);

    // Staff chat channel
    const staffChatChannel = pusher.subscribe(`staff-chat-hotel-${hotelSlug}`);
    channels.push(staffChatChannel);

    // Room service channel
    const roomServiceChannel = pusher.subscribe(`room-service-hotel-${hotelSlug}`);
    channels.push(roomServiceChannel);

    // Guest chat channel
    const guestChatChannel = pusher.subscribe(`guest-chat-hotel-${hotelSlug}`);
    channels.push(guestChatChannel);

    // Gallery channel
    const galleryChannel = pusher.subscribe(`gallery-hotel-${hotelSlug}`);
    channels.push(galleryChannel);

    // Booking channel
    const bookingChannel = pusher.subscribe(`booking-hotel-${hotelSlug}`);
    channels.push(bookingChannel);

    // Personal attendance channel (only if staffId provided)
    if (staffId) {
      const attendanceChannel = pusher.subscribe(`attendance-hotel-${hotelSlug}-staff-${staffId}`);
      channels.push(attendanceChannel);
    }

    // Bind global event handlers to all channels
    channels.forEach(channel => {
      channel.bind_global((eventName, payload) => {
        handleIncomingRealtimeEvent({
          source: 'pusher',
          channel: channel.name,
          eventName,
          payload
        });
      });

      console.log(`✅ Subscribed to channel: ${channel.name}`);
    });

    subscriptionsActive = true;
    currentChannels = channels;

    // Return cleanup function
    return () => {
      console.log('🧹 Cleaning up channel subscriptions');
      
      channels.forEach(channel => {
        try {
          channel.unbind_all();
          channel.unsubscribe();
          console.log(`🗑️ Unsubscribed from: ${channel.name}`);
        } catch (error) {
          console.error('❌ Error unsubscribing from channel:', channel.name, error);
        }
      });

      subscriptionsActive = false;
      currentChannels = [];
    };

  } catch (error) {
    console.error('❌ Error subscribing to channels:', error);
    
    // Cleanup any successful subscriptions
    channels.forEach(channel => {
      try {
        channel.unbind_all();
        channel.unsubscribe();
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError);
      }
    });

    return () => {};
  }
}

/**
 * Get current subscription status
 * @returns {Object} Subscription info
 */
export function getSubscriptionStatus() {
  return {
    active: subscriptionsActive,
    channelCount: currentChannels.length,
    channels: currentChannels.map(ch => ch.name)
  };
}