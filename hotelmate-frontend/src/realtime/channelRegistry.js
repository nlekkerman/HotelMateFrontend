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
    // ✅ NEW STANDARDIZED CHANNEL FORMAT: hotel-{slug}.{domain}
    
    console.log('🔥 [channelRegistry] Base hotel channels - hotelSlug:', hotelSlug);
    
    // Attendance (hotel-wide)
    const attendanceChannelName = `${hotelSlug}.attendance`;
    console.log('🔥 [channelRegistry] Subscribing to attendance:', attendanceChannelName);
    const attendanceChannel = pusher.subscribe(attendanceChannelName);
    channels.push(attendanceChannel);

    // Room Service (hotel-wide) 
    const roomServiceChannelName = `${hotelSlug}.room-service`;
    const roomServiceChannel = pusher.subscribe(roomServiceChannelName);
    channels.push(roomServiceChannel);

    // Booking (hotel-wide)
    const bookingChannelName = `${hotelSlug}.booking`;
    const bookingChannel = pusher.subscribe(bookingChannelName);
    channels.push(bookingChannel);

    // Personal staff notifications (if staffId provided)
    if (staffId) {
      const personalChannelName = `${hotelSlug}.staff-${staffId}-notifications`;
      const personalNotifications = pusher.subscribe(personalChannelName);
      channels.push(personalNotifications);
    }

    // Note: Staff chat and guest chat channels are conversation-specific and will be 
    // subscribed to dynamically when users enter specific conversations:
    // - hotel-{slug}.staff-chat.{conversation_id}
    // - hotel-{slug}.guest-chat.{room_pin}

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
 * Subscribe to specific staff chat conversation
 * @param {string} hotelSlug - Hotel slug
 * @param {string} conversationId - Staff chat conversation ID
 * @returns {Function} Cleanup function for this channel
 */
export function subscribeToStaffChatConversation(hotelSlug, conversationId) {
  if (!hotelSlug || !conversationId) {
    console.warn('⚠️ Missing hotelSlug or conversationId for staff chat subscription');
    return () => {};
  }

  const pusher = getPusherClient();
  // ✅ BACKEND HANDLES PREFIXING: Use hotel slug exactly as backend provides it
  const channelName = `${hotelSlug}.staff-chat.${conversationId}`;
  
  console.log('🔥 [channelRegistry] Attempting to subscribe to:', channelName);
  console.log('🔥 [channelRegistry] Raw hotelSlug value:', hotelSlug);
  console.log('🔥 [channelRegistry] Pusher connection state:', pusher.connection.state);
  console.log('🔥 [channelRegistry] Auth token available:', !!localStorage.getItem('token'));
  
  try {
    const channel = pusher.subscribe(channelName);
    
    // Add subscription error handlers
    channel.bind('pusher:subscription_error', (error) => {
      console.error('❌ [channelRegistry] Subscription error for channel:', channelName, error);
    });
    
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ [channelRegistry] Successfully subscribed to:', channelName);
    });
    
    channel.bind_global((eventName, payload) => {
      if (!eventName.startsWith('pusher:')) {
        console.log('🔥 [channelRegistry] Received event on channel:', channelName, 'event:', eventName);
      }
      handleIncomingRealtimeEvent({
        source: 'pusher',
        channel: channel.name,
        eventName,
        payload
      });
    });

    console.log(`✅ Subscribed to staff chat: ${channelName}`);
    currentChannels.push(channel);

    return () => {
      try {
        console.log('🔥 [channelRegistry] Attempting cleanup for channel:', channelName);
        channel.unbind_all();
        pusher.unsubscribe(channelName); // Use pusher.unsubscribe() instead of channel.unsubscribe()
        const index = currentChannels.indexOf(channel);
        if (index > -1) {
          currentChannels.splice(index, 1);
        }
        console.log(`🗑️ Unsubscribed from staff chat: ${channelName}`);
      } catch (error) {
        console.error('❌ Error unsubscribing from staff chat channel:', channelName, error);
      }
    };
  } catch (error) {
    console.error('❌ Error subscribing to staff chat channel:', channelName, error);
    return () => {};
  }
}

/**
 * Subscribe to specific guest chat conversation
 * @param {string} hotelSlug - Hotel slug
 * @param {string} roomPin - Guest chat room PIN
 * @returns {Function} Cleanup function for this channel
 */
export function subscribeToGuestChatConversation(hotelSlug, roomPin) {
  if (!hotelSlug || !roomPin) {
    console.warn('⚠️ Missing hotelSlug or roomPin for guest chat subscription');
    return () => {};
  }

  const pusher = getPusherClient();
  const channelName = `hotel-${hotelSlug}.guest-chat.${roomPin}`;
  
  try {
    const channel = pusher.subscribe(channelName);
    
    channel.bind_global((eventName, payload) => {
      handleIncomingRealtimeEvent({
        source: 'pusher',
        channel: channel.name,
        eventName,
        payload
      });
    });

    console.log(`✅ Subscribed to guest chat: ${channelName}`);
    currentChannels.push(channel);

    return () => {
      try {
        channel.unbind_all();
        channel.unsubscribe();
        const index = currentChannels.indexOf(channel);
        if (index > -1) {
          currentChannels.splice(index, 1);
        }
        console.log(`🗑️ Unsubscribed from guest chat: ${channelName}`);
      } catch (error) {
        console.error('❌ Error unsubscribing from guest chat channel:', channelName, error);
      }
    };
  } catch (error) {
    console.error('❌ Error subscribing to guest chat channel:', channelName, error);
    return () => {};
  }
}

/**
 * Mark conversation as read - calls API and updates store
 * ✅ CRITICAL: Only call when conversation_id exists and user is active
 * @param {string|number} conversationId - Must be valid conversation ID
 * @param {string} conversationType - "guest" | "staff"
 * @param {boolean} isWindowActive - Only mark read if window is active
 * @param {string} hotelSlug - Hotel slug for API endpoint
 */
export async function markConversationRead(conversationId, conversationType = "guest", isWindowActive = true, hotelSlug = null) {
  if (!conversationId) {
    console.warn("⚠️ markConversationRead called with undefined conversationId");
    return;
  }

  if (!isWindowActive) {
    console.log("📖 Window not active, skipping markConversationRead");
    return;
  }

  if (!hotelSlug) {
    console.warn("⚠️ markConversationRead called without hotelSlug");
    return;
  }

  try {
    if (conversationType === "staff") {
      // Use existing staff chat API
      const { markConversationAsRead } = await import('../staff_chat/services/staffChatApi.js');
      await markConversationAsRead(hotelSlug, conversationId);
      console.log(`✅ Marked staff conversation ${conversationId} as read`);
    } else {
      // Guest chat API call
      const endpoint = `/api/guest_chat/${hotelSlug}/conversations/${conversationId}/mark_read/`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Auth headers will be added by interceptors
        }
      });

      if (response.ok) {
        console.log(`✅ Marked guest conversation ${conversationId} as read`);
      } else {
        console.error('❌ Failed to mark guest conversation as read:', response.status);
      }
    }
  } catch (error) {
    console.error('❌ Error marking conversation as read:', error);
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