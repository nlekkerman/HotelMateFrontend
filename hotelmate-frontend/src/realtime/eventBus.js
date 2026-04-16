// src/realtime/eventBus.js
import { addNotificationFromEvent } from './stores/notificationsStore.jsx';
import { attendanceActions } from './stores/attendanceStore.jsx';
import { chatActions, dispatchUnreadCountsUpdate } from './stores/chatStore.jsx';
import { guestChatActions } from './stores/guestChatStore.jsx';
import { roomServiceActions } from './stores/roomServiceStore.jsx';
import { serviceBookingActions } from './stores/serviceBookingStore.jsx';
import { roomBookingActions } from './stores/roomBookingStore.jsx';
import { roomsActions } from './stores/roomsStore.jsx';
import { showGuestMessageNotification } from '../utils/guestNotifications.jsx';
import { overviewSignalsActions } from './stores/overviewSignalsStore.jsx';

// ---------------------------------------------------------------------------
// Overview signal mapping — maps (category, event.type) → overview module + reason
// Only meaningful operational events are mapped; noise is excluded.
// ---------------------------------------------------------------------------
const OVERVIEW_EVENT_MAP = {
  room_booking: {
    booking_created:             (e) => ({ module: 'room_bookings', reason: `New booking – ${e.payload?.guest_name || 'Guest'}` }),
    booking_confirmed:           (e) => ({ module: 'room_bookings', reason: `Booking confirmed – ${e.payload?.guest_name || 'Guest'}` }),
    booking_updated:             (e) => ({ module: 'room_bookings', reason: `Booking updated – #${e.payload?.booking_id || ''}` }),
    booking_checked_in:          (e) => ({ module: 'room_bookings', reason: `Check-in – ${e.payload?.guest_name || 'Guest'}` }),
    booking_checked_out:         (e) => ({ module: 'room_bookings', reason: `Check-out – ${e.payload?.guest_name || 'Guest'}` }),
    booking_overstay_flagged:    (e) => ({ module: 'room_bookings', reason: `Overstay flagged – Room ${e.payload?.room_number || ''}` }),
    booking_payment_required:    (e) => ({ module: 'room_bookings', reason: `Payment required – ${e.payload?.guest_name || 'Guest'}` }),
  },
  room_service: {
    order_created:        (e) => ({ module: 'room_services', reason: `New order – Room ${e.payload?.room_number || ''}` }),
    order_status_changed: (e) => ({ module: 'room_services', reason: `Order ${e.payload?.status || 'updated'} – Room ${e.payload?.room_number || ''}` }),
  },
  booking: {
    // restaurant / service bookings — not tracked in first version
  },
};

/** Record an overview signal if the event is mapped. */
function maybeRecordOverviewSignal(event) {
  const catMap = OVERVIEW_EVENT_MAP[event.category];
  if (!catMap) return;
  const builder = catMap[event.type];
  if (!builder) return;
  const signal = builder(event);
  if (signal) overviewSignalsActions.recordSignal(signal);
}

// Global event deduplication using meta.event_id
const globalProcessedEventIds = new Set();
const MAX_EVENT_IDS = 1000; // LRU-style limit

// Dev-only debug logging
const DEBUG_REALTIME = import.meta.env.DEV;

function maybeCleanupEventIds() {
  if (globalProcessedEventIds.size > MAX_EVENT_IDS) {
    // Convert to array, keep last 500, convert back to Set
    const idsArray = Array.from(globalProcessedEventIds);
    globalProcessedEventIds.clear();
    idsArray.slice(-500).forEach(id => globalProcessedEventIds.add(id));
  }
}

function logBookingEvent(event) {
  if (!DEBUG_REALTIME || event.category !== 'room_booking') return;
}

/**
 * Normalize FCM payload to domain event format
 * @param {Object} fcmPayload - Raw FCM payload from Firebase SDK
 * @returns {Object|null} Normalized event or null if unhandled
 */
function normalizeFcmEvent(fcmPayload) {
  const data = fcmPayload?.data || {};
  
  if (data.type === "staff_chat_message") {
    try {
      const normalized = {
        category: "staff_chat",
        type: "realtime_staff_chat_message_created",
        payload: {
          id: data.message_id ? parseInt(data.message_id) : undefined,
          conversation_id: data.conversation_id ? parseInt(data.conversation_id) : undefined,
          sender_id: data.sender_id ? parseInt(data.sender_id) : undefined,
          sender_name: data.sender_name,
          message: fcmPayload?.notification?.body || data.message || "",
          timestamp: new Date().toISOString()
        },
        meta: {
          hotel_slug: data.hotel_slug,
          source: "fcm",
          event_id: `fcm-${Date.now()}`,
          ts: new Date().toISOString()
        }
      };
      return normalized;
    } catch (error) {
      console.error('❌ [FCM] Error normalizing staff_chat_message:', error);
      console.error('❌ [FCM] Data causing error:', data);
      return null;
    }
  }
  
  if (data.type === "staff_chat_conversations_with_unread") {
    // FCM does not provide per-conversation, so only update total
    const totalUnread = data.conversations_with_unread_count
      ? parseInt(data.conversations_with_unread_count, 10)
      : 0;
    // Synthesize canonical event
    const normalized = {
      category: "staff_chat",
      type: "realtime_staff_chat_unread_updated",
      payload: {
        total_unread: totalUnread,
        is_total_update: true,
        updated_at: new Date().toISOString()
      },
      meta: {
        hotel_slug: data.hotel_slug,
        source: "fcm",
        event_id: `fcm-unread-${Date.now()}`,
        ts: new Date().toISOString()
      }
    };
    return normalized;
  }
  
  return null;
}

/**
 * Main entry point for all realtime events from Pusher and FCM
 * @param {Object} evt - Event object
 * @param {string} evt.source - Event source: "pusher" | "fcm" | "local"
 * @param {string} evt.channel - Pusher channel name (if applicable)
 * @param {string} evt.eventName - Pusher event name (if applicable)
 * @param {Object} evt.payload - Raw event data
 */
export function handleIncomingRealtimeEvent({ source, channel, eventName, payload }) {
  try {

    // 1️⃣ IGNORE PUSHER SYSTEM EVENTS (like pusher:subscription_succeeded)
    if (source === 'pusher' && eventName?.startsWith('pusher:')) {
      return; // ⬅️ nothing else, no warning, no routing
    }

    // Accept normalized OR direct-message payloads
    if (payload?.category && payload?.type) {
      // 🔥 For staff_chat, prefer the Pusher eventName (realtime_staff_chat_*)
      let effectiveType = payload.type;

      if (
        payload.category === 'staff_chat' &&
        typeof eventName === 'string' &&
        eventName.startsWith('realtime_staff_chat_')
      ) {
        effectiveType = eventName; // 👈 use the LONG name that chatStore expects
      }

      // FULL normalized - FIXED: Use effectiveType instead of payload.type
      const normalized = {
        category: payload.category,
        type: effectiveType, // 👈 FIXED: Use the effectiveType we calculated
        payload: payload.payload ?? payload.data ?? {},
        meta: { ...(payload.meta || { channel, eventName }) },
        source,
        timestamp: payload.meta?.ts || new Date().toISOString(),
      };
      if (maybeHandleStaffChatUnreadUpdate(normalized)) {
        return;
      }
      routeToDomainStores(normalized);
      maybeAddToNotificationCenter(normalized);
      return;
    }

    // SUPPORT raw Pusher event (e.g. direct message payload) - ALWAYS process staff-chat events
    if (channel?.includes("staff-chat") && eventName?.startsWith("realtime_staff_chat_")) {
        const normalized = {
          category: "staff_chat",
          type: eventName,
          payload: payload,           // <---- PAYLOAD IS THE MESSAGE
          meta: { channel, eventName, event_id: payload?.event_id },
          source,
          timestamp: new Date().toISOString()
        };
        if (maybeHandleStaffChatUnreadUpdate(normalized)) {
          return;
        }
        routeToDomainStores(normalized);
        maybeAddToNotificationCenter(normalized);
        return;
    }

    // 3️⃣ FCM EVENT NORMALIZATION
    if (source === 'fcm') {
      const event = normalizeFcmEvent(payload);

      if (!event) {
        console.warn('⚠️ [EventBus] FCM event ignored - no handler for type:', payload?.data?.type);
        return;
      }

      if (maybeHandleStaffChatUnreadUpdate(event)) {
        return;
      }

      routeToDomainStores(event);
      maybeAddToNotificationCenter(event);
      return;
    }

    // FALLBACK: Process ANY staff-chat event that doesn't match above patterns
    if (channel?.includes("staff-chat") && eventName && !eventName.startsWith('pusher:')) {
        const normalized = {
          category: "staff_chat",
          type: eventName,
          payload: payload,
          meta: { channel, eventName, event_id: payload?.event_id || payload?.id },
          source,
          timestamp: new Date().toISOString()
        };
        if (maybeHandleStaffChatUnreadUpdate(normalized)) {
          return;
        }
        routeToDomainStores(normalized);
        return;
    }

    // Hotel-level guest messages channel (notify all staff when any guest sends message)
    if (channel?.endsWith('-guest-messages') && eventName === 'new-guest-message' && !eventName?.startsWith('pusher:')) {
      // Extract hotel slug from channel name
      const hotelSlug = channel.split('-guest-messages')[0];
      
      // Show toast notification to all staff using utility function
      showGuestMessageNotification({
        guest_name: payload?.guest_name || 'Guest',
        room_number: payload?.room_number || 'Unknown', 
        message_preview: payload?.message ? payload.message.substring(0, 50) : 'New message',
        conversation_id: payload?.conversation_id,
        booking_id: payload?.booking_id,
        hotel_slug: hotelSlug
      });
      
      // Create normalized event for notification center
      const guestMessageNotification = {
        category: 'guest_notification',
        type: 'new_guest_message',
        payload: {
          guest_name: payload?.guest_name || 'Guest',
          room_number: payload?.room_number || 'Unknown',
          message_preview: payload?.message ? payload.message.substring(0, 50) : 'New message',
          conversation_id: payload?.conversation_id,
          booking_id: payload?.booking_id,
          timestamp: payload?.timestamp || new Date().toISOString()
        },
        meta: {
          channel,
          eventName,
          event_id: payload?.event_id || payload?.id || `guest-msg-${Date.now()}`,
          hotel_slug: hotelSlug
        },
        source,
        timestamp: new Date().toISOString()
      };
      
      // Add to notification center
      maybeAddToNotificationCenter(guestMessageNotification);
      
      // Also route to chatStore so the sidebar conversation list updates
      // (unread count, last message preview) without requiring a page refresh.
      // The -notifications channel also bridges guest messages, but this ensures
      // the hotel-wide channel always keeps the sidebar in sync.
      if (payload?.conversation_id) {
        const guestChatStoreEvent = {
          category: 'staff_chat',
          type: 'realtime_staff_chat_message_created',
          payload: {
            id: payload?.message_id || payload?.id || `guest-msg-${Date.now()}`,
            message: payload?.message || 'New message',
            sender_id: payload?.guest_id || payload?.sender_id || `guest-${Date.now()}`,
            sender: payload?.guest_id || payload?.sender_id || `guest-${Date.now()}`,
            sender_name: payload?.guest_name || 'Guest',
            sender_role: 'guest',
            sender_type: 'guest',
            conversation_id: payload.conversation_id,
            conversation: payload.conversation_id,
            booking_id: payload?.booking_id,
            room_number: payload?.room_number,
            timestamp: payload?.timestamp || new Date().toISOString(),
            created_at: payload?.timestamp || new Date().toISOString()
          },
          meta: {
            channel,
            eventName: 'realtime_staff_chat_message_created',
            event_id: payload?.event_id || payload?.id || `guest-msg-store-${Date.now()}`,
            conversation_id: payload.conversation_id
          },
          source,
          timestamp: payload?.timestamp || new Date().toISOString()
        };
        routeToDomainStores(guestChatStoreEvent);
      }
      
      return;
    }

    // Guest chat: only accept booking-based private channels
    if (channel?.startsWith('private-hotel-') && channel?.includes('-guest-chat-booking-') && !eventName?.startsWith('pusher:')) {
      const normalized = {
        category: 'guest_chat',
        type: payload?.type || eventName || 'message_created',
        payload: payload?.payload || payload?.message || payload || {},
        meta: {
          channel,
          eventName,
          event_id: payload?.meta?.event_id || payload?.event_id || payload?.id,
        },
        source,
        timestamp: payload?.meta?.ts || new Date().toISOString(),
      };
      routeToDomainStores(normalized);
      return;
    }
    
    // 4️⃣ RAW ROOM STATUS EVENTS NORMALIZATION
    // Support both hyphenated (legacy) and underscored (backend contract) event names
    if (channel?.includes('.rooms') && (eventName === 'room-status-changed' || eventName === 'room_status_changed')) {
      const normalized = {
        category: "rooms",
        type: "room_status_changed",
        payload: payload,
        meta: { 
          channel, 
          eventName, 
          event_id: payload?.event_id || payload?.id || `room-status-${Date.now()}`,
          scope: { room_number: payload?.room_number }
        },
        source,
        timestamp: new Date().toISOString()
      };
      routeToDomainStores(normalized);
      return;
    }

    // 4b️⃣ ROOM OCCUPANCY EVENTS NORMALIZATION
    // Support both hyphenated (legacy) and underscored (backend contract) event names
    if (channel?.includes('.rooms') && (eventName === 'room-occupancy-updated' || eventName === 'room_occupancy_updated')) {
      const normalized = {
        category: "rooms",
        type: "room_updated", // Map to existing room_updated handler in roomsStore
        payload: payload,
        meta: { 
          channel, 
          eventName, 
          event_id: payload?.event_id || payload?.id || `room-occupancy-${Date.now()}`,
          scope: { room_number: payload?.room_number }
        },
        source,
        timestamp: new Date().toISOString()
      };
      routeToDomainStores(normalized);
      return;
    }

    // 4c️⃣ RAW room_updated EVENT NORMALIZATION
    // Backend may emit raw room_updated without category/type envelope
    if (channel?.includes('.rooms') && eventName === 'room_updated') {
      const normalized = {
        category: "rooms",
        type: "room_updated",
        payload: payload,
        meta: {
          channel,
          eventName,
          event_id: payload?.event_id || payload?.id || `room-updated-${Date.now()}`,
          scope: { room_number: payload?.room_number }
        },
        source,
        timestamp: new Date().toISOString()
      };
      routeToDomainStores(normalized);
      return;
    }

    // 4d️⃣ RAW BOOKING EVENTS ON STAFF CHANNELS
    // Events arriving on {hotelSlug}-staff-bookings or {hotelSlug}-staff-overstays
    // without normalized category/type envelope
    if ((channel?.endsWith('-staff-bookings') || channel?.endsWith('-staff-overstays')) && !eventName?.startsWith('pusher:')) {
      const normalized = {
        category: "room_booking",
        type: eventName, // e.g. booking_created, booking_overstay_flagged, etc.
        payload: payload,
        meta: {
          channel,
          eventName,
          event_id: payload?.event_id || payload?.meta?.event_id || payload?.id || `staff-${Date.now()}`,
          scope: { booking_id: payload?.booking_id || payload?.id }
        },
        source,
        timestamp: payload?.meta?.ts || new Date().toISOString()
      };
      routeToDomainStores(normalized);
      maybeAddToNotificationCenter(normalized);
      return;
    }

    // 5️⃣ GUEST MESSAGE REAL-TIME UPDATE FOR STAFF
    // This is a staff-side notification — the guest's own Pusher client receives
    // message_created directly on the private booking channel via useGuestChat.
    // Route ONLY to staff_chat so chatStore can update the staff conversation list.
    if (channel?.endsWith('-notifications') && eventName === 'new-guest-message' && !eventName?.startsWith('pusher:')) {
      const staffPayload = {
        id: payload?.message_id || payload?.id || `msg-${Date.now()}`,
        message: payload?.guest_message || payload?.message || 'New message',
        sender_id: payload?.guest_id || payload?.sender_id || payload?.guestId || `guest-${Date.now()}`,
        sender: payload?.guest_id || payload?.sender_id || payload?.guestId || `guest-${Date.now()}`,
        sender_name: payload?.sender_name || payload?.guest_name || 'Guest',
        sender_role: 'guest',
        sender_type: 'guest',
        conversation_id: payload?.conversation_id,
        conversation: payload?.conversation_id,
        booking_id: payload?.booking_id,
        room_number: payload?.room_number,
        timestamp: payload?.timestamp || new Date().toISOString(),
        created_at: payload?.timestamp || new Date().toISOString()
      };

      const staffChatEvent = {
        category: 'staff_chat',
        type: 'realtime_staff_chat_message_created',
        payload: staffPayload,
        meta: {
          channel,
          eventName: 'realtime_staff_chat_message_created',
          event_id: payload?.event_id || `guest-to-staff-${Date.now()}`,
          conversation_id: payload?.conversation_id
        },
        source,
        timestamp: payload?.timestamp || new Date().toISOString()
      };

      routeToDomainStores(staffChatEvent);
      return;
    }

    // Backend should send normalized events - log unhandled events
    console.warn('⚠️ Received non-normalized event - backend should send normalized format:', {
      source,
      channel,
      eventName,
      payload,
    });
  } catch (error) {
    console.error('❌ Error handling realtime event:', error, { source, channel, eventName, payload });
  }
}


/**
 * Route events to appropriate domain stores
 * @param {Object} event - Event object with {category, type, payload, meta}
 */
function routeToDomainStores(event) {
  // Handle new normalized format from backend
  if (event.category && event.type) {
    switch (event.category) {
      case "attendance":
        attendanceActions.handleEvent(event);
        break;
      case "staff_chat":
        // Filter out Pusher system events before processing
        if (event.type?.startsWith('pusher:') || event.eventType?.startsWith('pusher:')) {
          // Skip Pusher system events
        } else {
          chatActions.handleEvent(event);
        }
        break;
      case "guest_chat":
        guestChatActions.handleEvent(event);
        // NOTE: Staff conversation list is updated via the separate staff_chat event
        // from the -notifications channel. No cross-domain routing needed here.
        break;
      case "room_service":
        roomServiceActions.handleEvent(event);
        maybeRecordOverviewSignal(event);
        break;
      case "room_booking":
        roomBookingActions.handleEvent(event);
        maybeRecordOverviewSignal(event);
        break;
      case "booking":
        serviceBookingActions.handleEvent(event);
        maybeRecordOverviewSignal(event);
        break;
      case "rooms":
        roomsActions.handleEvent(event);
        break;
      case "staff_notification":
        // Staff notifications are handled by the notification center only
        // No specific store needed - just let it flow to maybeAddToNotificationCenter
        break;
      default:
        break;
    }
    return;
  }

  // All events should now be in NEW format with event.type property
  console.warn('⚠️ Event missing type property - should be pre-normalized:', event);
}

function maybeHandleStaffChatUnreadUpdate(event) {
  if (event.category !== 'staff_chat' || event.type !== 'realtime_staff_chat_unread_updated') {
    return false;
  }

  const payload = event.payload || {};
  const rawConversationId = payload.conversation_id ?? payload.conversationId ?? payload.conversation ?? null;
  const normalizedPayload = {
    conversationId: rawConversationId,
    conversationUnread: payload.conversation_unread ?? payload.unread_count ?? payload.conversationUnread ?? 0,
    totalUnread: payload.total_unread ?? payload.totalUnread ?? null,
    isTotalUpdate:
      Boolean(payload.is_total_update ?? payload.isTotalUpdate) || rawConversationId === null,
    timestamp: payload.updated_at || payload.timestamp || event.timestamp || new Date().toISOString(),
  };

  dispatchUnreadCountsUpdate(normalizedPayload);
  return true;
}

/**
 * Add event to notification center if appropriate
 * @param {Object} event - Event object (new or legacy format)
 */
function maybeAddToNotificationCenter(event) {
  // Only add user-facing notifications, not all events
  const notificationCategories = [
    'staff_chat',
    'guest_chat', 
    'room_service',
    'booking',
    'attendance', // Only for personal attendance notifications
    'staff_notification', // Guest message notifications for staff
    'system' // FCM and other system notifications
  ];
  
  const category = event.category;
  const eventType = event.type || event.eventType;
  
  if (notificationCategories.includes(category)) {
    // For attendance, only notify on personal events (approvals, rejections)
    if (category === 'attendance' && !eventType.includes('approved') && !eventType.includes('rejected')) {
      return; // Skip general attendance updates
    }
    
    // Convert to legacy format for notification system (for now)
    const legacyFormat = {
      category,
      eventType,
      data: event.payload || event.data,
      timestamp: event.meta?.ts || event.timestamp || new Date().toISOString(),
      source: event.meta ? 'pusher' : (event.source || 'pusher'),
      title: generateNotificationTitle(category, eventType),
      message: generateNotificationMessage(category, eventType, event.payload || event.data),
      level: 'info'
    };
    
    addNotificationFromEvent(legacyFormat);
  }
}

/**
 * Generate notification title based on category and type
 */
function generateNotificationTitle(category, eventType) {
  switch (category) {
    case 'attendance': return 'Attendance Update';
    case 'staff_chat': return 'Staff Chat';
    case 'guest_chat': return 'Guest Chat';
    case 'room_service': return 'Room Service';
    case 'booking': return 'Booking Update';
    case 'system': return 'System Notification';
    default: return 'Notification';
  }
}

/**
 * Generate notification message based on category, type, and payload
 */
function generateNotificationMessage(category, eventType, payload) {
  switch (category) {
    case 'attendance':
      return eventType === 'clock_status_updated' ? 'Attendance status updated' : `Attendance ${eventType.replace('_', ' ')}`;
    case 'staff_chat':
      if (eventType === 'realtime_staff_chat_message_created') return 'New message received';
      if (eventType === 'realtime_staff_chat_staff_mentioned') return 'You were mentioned';
      if (eventType === 'realtime_staff_chat_unread_updated') return 'Unread messages updated';
      return `Staff chat ${eventType.replace('realtime_staff_chat_', '').replace('_', ' ')}`;
    case 'guest_chat':
      return eventType === 'message_created' ? 'New guest message' : 
             `Guest chat ${eventType.replace('_', ' ')}`;
    case 'room_service':
      return eventType === 'order_created' ? 'New order received' : 
             eventType === 'order_updated' ? 'Order status updated' :
             `Room service ${eventType.replace('_', ' ')}`;
    case 'booking':
      return eventType === 'booking_created' ? 'New booking received' :
             eventType === 'booking_updated' ? 'Booking updated' :
             eventType === 'booking_cancelled' ? 'Booking cancelled' :
             `Booking ${eventType.replace('_', ' ')}`;
    default:
      return eventType.replace('_', ' ');
  }
}

// Debug function for testing unread updates
if (typeof window !== 'undefined') {
  window.debugRealtimeUnread = (conversationId, unreadCount, totalUnread = null) => {
    handleIncomingRealtimeEvent({
      source: "debug",
      payload: {
        category: "staff_chat",
        type: "realtime_staff_chat_unread_updated", 
        payload: {
          conversation_id: conversationId,
          conversation_unread: unreadCount,
          unread_count: unreadCount,
          total_unread: totalUnread,
          is_total_update: false,
          updated_at: new Date().toISOString()
        },
        meta: {
          event_id: `debug-${Date.now()}`,
          ts: new Date().toISOString()
        }
      }
    });
  };
  
  window.debugTotalUnread = (totalUnread) => {
    handleIncomingRealtimeEvent({
      source: "debug",
      payload: {
        category: "staff_chat",
        type: "realtime_staff_chat_unread_updated",
        payload: {
          is_total_update: true,
          total_unread: totalUnread,
          updated_at: new Date().toISOString()
        },
        meta: {
          event_id: `debug-total-${Date.now()}`,
          ts: new Date().toISOString()
        }
      }
    });
    
    // Force MessengerWidget to update after a short delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('forceMessengerUpdate', { 
        detail: { 
          totalUnread, 
          source: 'debugTotalUnread',
          timestamp: new Date().toISOString()
        } 
      }));
    }, 100);
  };
  
  // Function to completely reset all unread counts
  window.resetAllUnreadCounts = () => {
    // First set total unread to 0
    handleIncomingRealtimeEvent({
      source: "debug",
      payload: {
        category: "staff_chat",
        type: "realtime_staff_chat_unread_updated",
        payload: {
          total_unread: 0,
          updated_at: new Date().toISOString()
        },
        meta: {
          event_id: `debug-reset-total-${Date.now()}`,
          ts: new Date().toISOString()
        }
      }
    });
    
    // Then reset each conversation to 0 (you may need to adjust conversation IDs)
    [100, 101, 102].forEach(conversationId => {
      handleIncomingRealtimeEvent({
        source: "debug",
        payload: {
          category: "staff_chat",
          type: "realtime_staff_chat_unread_updated",
          payload: {
            conversation_id: conversationId,
            conversation_unread: 0,
            unread_count: 0,
            total_unread: 0,
            is_total_update: false,
            updated_at: new Date().toISOString()
          },
          meta: {
            event_id: `debug-reset-conv-${conversationId}-${Date.now()}`,
            ts: new Date().toISOString()
          }
        }
      });
    });
  };
  
  // Debug function to test messenger widget visual updates
  window.testMessengerBadge = (count = 0) => {
    window.debugTotalUnread(count);
    
    setTimeout(() => {
      const badge = document.querySelector('.messenger-widget__badge');
      const header = document.querySelector('.messenger-widget__header');
      
      // Try to force a React re-render by dispatching a custom event
      window.dispatchEvent(new CustomEvent('forceMessengerUpdate', { detail: { count } }));
    }, 1000);
  };
  
  // Quick test functions
  window.setBadge5 = () => window.testMessengerBadge(5);
  window.setBadge0 = () => {
    window.resetAllUnreadCounts();
    setTimeout(() => window.testMessengerBadge(0), 500);
  };
  window.setBadge10 = () => window.testMessengerBadge(10);
  
  // Debug function to check current state
  window.debugCurrentState = () => {
    const badge = document.querySelector('.messenger-widget__badge');
    const header = document.querySelector('.messenger-widget__header');
  };
  
  // Comprehensive test function to check entire badge update chain
  window.testBadgeChain = (count = 5) => {
    // Step 1: Update via Pusher simulation
    window.debugTotalUnread(count);
    
    // Step 2: Check store state after delay
    setTimeout(() => {
      // Step 3: Check DOM elements
      const badge = document.querySelector('.messenger-widget__badge');
      const header = document.querySelector('.messenger-widget__header');
    }, 200);
  };
}