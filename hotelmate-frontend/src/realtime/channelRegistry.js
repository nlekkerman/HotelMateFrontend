// src/realtime/channelRegistry.js
import { getPusherClient } from './realtimeClient';
import { getGuestPusherClient } from './guestRealtimeClient';
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
    // ✅ BACKEND USES HOTEL- PREFIX: hotel-{slug}.{domain}
    
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
    
    // Enhanced room service event binding for debugging
    roomServiceChannel.bind_global((eventName, data) => {
      console.log('🍽️ [channelRegistry] Room service event received:', {
        channel: roomServiceChannelName,
        eventName,
        data,
        timestamp: new Date().toISOString()
      });
    });

    // Service Booking (restaurant/porter/trips - hotel-wide)
    const serviceBookingChannelName = `${hotelSlug}.booking`;
    const serviceBookingChannel = pusher.subscribe(serviceBookingChannelName);
    channels.push(serviceBookingChannel);
    
    // Room Booking (guest accommodations - hotel-wide)
    const roomBookingChannelName = `${hotelSlug}.room-bookings`;
    const roomBookingChannel = pusher.subscribe(roomBookingChannelName);
    channels.push(roomBookingChannel);

    // Rooms (operational room status - hotel-wide)
    const roomsChannelName = `${hotelSlug}.rooms`;
    const roomsChannel = pusher.subscribe(roomsChannelName);
    channels.push(roomsChannel);

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
  // ✅ BACKEND SENDS TO: hotel-killarney.staff-chat.100 (exact pattern from backend logs)
  const channelName = `${hotelSlug}.staff-chat.${conversationId}`;

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
        console.log('🔥 [channelRegistry] Non-system event received:', { channel: channelName, eventName, payloadType: typeof payload });
      }
      
      // Route all events to the event bus
      handleIncomingRealtimeEvent({
        source: 'pusher',
        channel: channel.name,
        eventName,
        payload
      });
    });

   
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
  const channelName = `${hotelSlug}.guest-chat.${roomPin}`;
  
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

/**
 * Subscribe to a specific guest chat channel
 * @param {string} channelName - Full channel name from context (e.g., "hotel-slug.guest-chat.room-123")
 * @returns {Function} Cleanup function to unsubscribe
 */
export function subscribeToGuestChatChannel(channelName) {
  console.log('🔗 [ChannelRegistry] Subscribing to guest chat channel:', channelName);
  
  try {
    const guestClient = getGuestPusherClient();
    const channel = guestClient.subscribe(channelName);
    
    // Bind to message events and route to eventBus
    const messageHandler = (data) => {
      console.log('💬 [GuestChat] Message received:', data);
      handleIncomingRealtimeEvent({
        category: 'guest_chat',
        type: 'message_created',
        data,
        channel: channelName
      });
    };
    
    // Listen for various message event types
    channel.bind('message_created', messageHandler);
    channel.bind('guest_message_created', messageHandler);
    channel.bind('staff_message_created', messageHandler);
    
    console.log('✅ [ChannelRegistry] Guest chat channel subscribed:', channelName);
    
    // Return cleanup function
    return () => {
      console.log('🔌 [ChannelRegistry] Unsubscribing from guest chat channel:', channelName);
      channel.unbind('message_created', messageHandler);
      channel.unbind('guest_message_created', messageHandler);
      channel.unbind('staff_message_created', messageHandler);
      guestClient.unsubscribe(channelName);
    };
  } catch (error) {
    console.error('❌ [ChannelRegistry] Failed to subscribe to guest chat channel:', error);
    return () => {}; // Return no-op cleanup
  }
}

// Track active subscriptions to prevent duplicates
const activeGuestSubscriptions = new Map();

/**
 * Subscribe to guest chat booking channel for token-based authentication
 * @param {Object} params - Subscription parameters
 * @param {string} params.hotelSlug - Hotel slug
 * @param {string} params.bookingId - Booking ID for scoped channel
 * @param {string} params.guestToken - Guest authentication token
 * @param {string} [params.eventName='realtime_event'] - Event name to bind to
 * @returns {Function} Cleanup function
 */
export function subscribeToGuestChatBooking({ hotelSlug, bookingId, guestToken, eventName = 'realtime_event' }) {
  if (!hotelSlug || !bookingId || !guestToken) {
    console.warn('⚠️ [GuestChat] Missing parameters for guest chat booking subscription');
    return () => {};
  }

  // Booking-scoped private channel for guest chat
  const channelName = `private-hotel-${hotelSlug}-guest-chat-booking-${bookingId}`;
  const subscriptionKey = `${guestToken}:${channelName}`;

  // Subscription deduplication guard
  if (activeGuestSubscriptions.has(subscriptionKey)) {
    console.log('🔄 [GuestChat] Already subscribed to channel, returning existing cleanup');
    return activeGuestSubscriptions.get(subscriptionKey);
  }

  console.log('🔗 [GuestChat] SUBSCRIBE:', channelName, {
    hotelSlug,
    bookingId,
    eventName,
    hasToken: !!guestToken
  });

  try {
    const pusher = getGuestPusherClient(guestToken);
    if (!pusher) {
      console.error('❌ [GuestChat] Failed to get guest Pusher client');
      return () => {};
    }

    const channel = pusher.subscribe(channelName);

    // Bind ONLY the unified event (recommended approach)
    channel.bind(eventName, (payload) => {
      console.log(`💬 [GuestChat] Received unified event:`, payload);
      
      // Route through event bus - payload should contain {category, type, payload, meta}
      handleIncomingRealtimeEvent({
        source: "pusher",
        channel: channel.name,
        eventName,
        payload,
      });
    });

    // Error handling
    channel.bind('pusher:subscription_error', (error) => {
      console.error('❌ [GuestChat] Subscription error:', error);
      activeGuestSubscriptions.delete(subscriptionKey);
    });

    channel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ [GuestChat] Successfully subscribed to booking channel');
    });

    // Create cleanup function
    const cleanup = () => {
      console.log('🔌 [GuestChat] UNSUBSCRIBE:', channelName);
      try {
        channel.unbind_all();
        pusher.unsubscribe(channelName);
      } catch (e) {
        console.warn('Guest channel cleanup failed:', e);
      }
      activeGuestSubscriptions.delete(subscriptionKey);
    };

    // Store cleanup function to prevent duplicates
    activeGuestSubscriptions.set(subscriptionKey, cleanup);

    return cleanup;
  } catch (err) {
    console.error('❌ [GuestChat] Failed to subscribe guest chat booking:', err);
    return () => {};
  }
}