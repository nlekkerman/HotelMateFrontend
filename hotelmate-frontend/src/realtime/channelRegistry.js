// src/realtime/channelRegistry.js
import { getPusherClient } from './realtimeClient';
import { createGuestPusherClient } from './guestRealtimeClient';
import { handleIncomingRealtimeEvent } from './eventBus';
import * as guestChatAPI from '../services/guestChatAPI.js';

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

  try {
    // Attendance (hotel-wide)
    const attendanceChannelName = `${hotelSlug}.attendance`;
    const attendanceChannel = pusher.subscribe(attendanceChannelName);
    channels.push(attendanceChannel);

    // Room Service (hotel-wide) 
    const roomServiceChannelName = `${hotelSlug}.room-service`;
    const roomServiceChannel = pusher.subscribe(roomServiceChannelName);
    channels.push(roomServiceChannel);

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

    // Staff Bookings (booking lifecycle events for staff - hotel-wide)
    const staffBookingsChannelName = `${hotelSlug}-staff-bookings`;
    const staffBookingsChannel = pusher.subscribe(staffBookingsChannelName);
    channels.push(staffBookingsChannel);

    // Staff Overstays (overstay events for staff - hotel-wide)
    const staffOverstaysChannelName = `${hotelSlug}-staff-overstays`;
    const staffOverstaysChannel = pusher.subscribe(staffOverstaysChannelName);
    channels.push(staffOverstaysChannel);

    // Guest Messages (hotel-wide notifications when any guest sends message)
    const guestMessagesChannelName = `${hotelSlug}-guest-messages`;
    const guestMessagesChannel = pusher.subscribe(guestMessagesChannelName);
    channels.push(guestMessagesChannel);

    // Personal staff notifications (if staffId provided)
    if (staffId) {
      const personalChannelName = `${hotelSlug}.staff-${staffId}-notifications`;
      const personalNotifications = pusher.subscribe(personalChannelName);
      channels.push(personalNotifications);
    }

    // Note: Staff chat channels are conversation-specific and will be 
    // subscribed to dynamically when users enter specific conversations:
    // - hotel-{slug}.staff-chat.{conversation_id}

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
    });

    subscriptionsActive = true;
    currentChannels = channels;

    // Return cleanup function
    return () => {
      channels.forEach(channel => {
        try {
          channel.unbind_all();
          channel.unsubscribe();
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
    
    channel.bind_global((eventName, payload) => {
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
        channel.unbind_all();
        pusher.unsubscribe(channelName); // Use pusher.unsubscribe() instead of channel.unsubscribe()
        const index = currentChannels.indexOf(channel);
        if (index > -1) {
          currentChannels.splice(index, 1);
        }
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
 * Mark conversation as read - calls API and updates store
 * @param {string|number} conversationId - Must be valid conversation ID
 * @param {string} conversationType - "guest" | "staff"
 * @param {boolean} isWindowActive - Only mark read if window is active
 * @param {string} hotelSlug - Hotel slug for API endpoint
 * @param {string} [chatSession] - Guest chat session (required for guest type)
 */
export async function markConversationRead(conversationId, conversationType = "guest", isWindowActive = true, hotelSlug = null, chatSession = null) {
  if (!conversationId) {
    console.warn("⚠️ markConversationRead called with undefined conversationId");
    return;
  }

  if (!isWindowActive) {

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

    } else {
      // Guest chat — session-based auth, routed through guestChatAPI service
      if (!chatSession) {
        console.warn("⚠️ markConversationRead(guest) called without chatSession — skipping");
        return;
      }
      await guestChatAPI.markRead(hotelSlug, chatSession, conversationId);
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



// Track active subscriptions to prevent duplicates
const activeGuestSubscriptions = new Map();
const activeStaffGuestChatSubscriptions = new Map();

/**
 * Subscribe staff to guest chat booking channel 
 * @param {Object} params - Subscription parameters
 * @param {string} params.hotelSlug - Hotel slug
 * @param {string} params.bookingId - Booking ID for scoped channel
 * @param {string} [params.eventName='realtime_event'] - Event name to bind to
 * @returns {Function} Cleanup function
 */
export function subscribeStaffToGuestChatBooking({ hotelSlug, bookingId, eventName = 'realtime_event' }) {
  if (!hotelSlug || !bookingId) {
    console.warn('⚠️ [StaffGuestChat] Missing parameters for staff guest chat booking subscription');
    return () => {};
  }

  // Same channel as guests use - staff join the conversation
  const channelName = `private-hotel-${hotelSlug}-guest-chat-booking-${bookingId}`;
  const subscriptionKey = `staff:${channelName}`;

  // Subscription deduplication guard
  if (activeStaffGuestChatSubscriptions.has(subscriptionKey)) {
    return activeStaffGuestChatSubscriptions.get(subscriptionKey);
  }

  try {
    // Use staff pusher client with staff auth endpoint
    const pusher = getPusherClient();
    if (!pusher) {
      console.error('❌ [StaffGuestChat] Failed to get staff Pusher client');
      return () => {};
    }

    const channel = pusher.subscribe(channelName);

    // Bind ONLY the unified event (same as guest)
    channel.bind(eventName, (payload) => {
      // Route through event bus - same as guest events
      handleIncomingRealtimeEvent({
        source: "pusher",
        channel: channel.name,
        eventName,
        payload,
      });
    });

    // Error handling
    channel.bind('pusher:subscription_error', (error) => {
      console.error('❌ [StaffGuestChat] Subscription error for channel:', channelName, {
        error,
        hotelSlug,
        bookingId,
        channelName
      });
      activeStaffGuestChatSubscriptions.delete(subscriptionKey);
    });

    // Create cleanup function
    const cleanup = () => {
      try {
        channel.unbind_all();
        pusher.unsubscribe(channelName);
      } catch (e) {
        console.warn('Staff guest chat channel cleanup failed:', e);
      }
      activeStaffGuestChatSubscriptions.delete(subscriptionKey);
    };

    // Store cleanup function to prevent duplicates
    activeStaffGuestChatSubscriptions.set(subscriptionKey, cleanup);

    return cleanup;
  } catch (err) {
    console.error('❌ [StaffGuestChat] Failed to subscribe staff to guest chat booking:', err);
    return () => {};
  }
}

/**
 * Subscribe to guest chat channel using session/grant-based authentication
 * @param {Object} params - Subscription parameters
 * @param {string} params.hotelSlug - Hotel slug
 * @param {string} params.chatSession - Chat session/grant from bootstrap
 * @param {string} [params.channelName] - Channel name from context (preferred)
 * @param {string} [params.eventName='realtime_event'] - Event name to bind to
 * @returns {Function} Cleanup function
 */
export function subscribeToGuestChatBooking({ hotelSlug, channelName, chatSession, eventName = 'realtime_event' }) {
  if (!hotelSlug || !chatSession || !channelName) {
    console.warn('⚠️ [GuestChat] Missing parameters for guest chat subscription');
    return () => {};
  }

  const subscriptionKey = `${chatSession}:${channelName}`;

  // Subscription deduplication guard
  if (activeGuestSubscriptions.has(subscriptionKey)) {
    return activeGuestSubscriptions.get(subscriptionKey);
  }

  try {
    const authEndpoint = getPusherAuthEndpoint(hotelSlug);
    
    const pusher = createGuestPusherClient(chatSession, { authEndpoint });
    if (!pusher) {
      console.error('❌ [GuestChat] Failed to get guest Pusher client');
      return () => {};
    }

    const channel = pusher.subscribe(channelName);

    // Bind ONLY the unified event (recommended approach)
    channel.bind(eventName, (payload) => {
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
      console.error('❌ [GuestChat] Subscription error for channel:', channelName, {
        error,
        hotelSlug,
        channelName
      });
      activeGuestSubscriptions.delete(subscriptionKey);
    });

    // Create cleanup function
    const cleanup = () => {
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