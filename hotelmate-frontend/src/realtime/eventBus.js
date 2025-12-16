// src/realtime/eventBus.js
import { addNotificationFromEvent } from './stores/notificationsStore.jsx';
import { attendanceActions } from './stores/attendanceStore.jsx';
import { chatActions, dispatchUnreadCountsUpdate } from './stores/chatStore.jsx';
import { guestChatActions } from './stores/guestChatStore.jsx';
import { roomServiceActions } from './stores/roomServiceStore.jsx';
import { serviceBookingActions } from './stores/serviceBookingStore.jsx';
import { roomBookingActions } from './stores/roomBookingStore.jsx';

/**
 * Normalize FCM payload to domain event format
 * @param {Object} fcmPayload - Raw FCM payload from Firebase SDK
 * @returns {Object|null} Normalized event or null if unhandled
 */
function normalizeFcmEvent(fcmPayload) {
  console.log('🔥 [FCM] normalizeFcmEvent called with payload:', JSON.stringify(fcmPayload, null, 2));
  
  const data = fcmPayload?.data || {};
  console.log('🔥 [FCM] Extracted data:', data);
  console.log('🔥 [FCM] Data type:', data.type);
  
  if (data.type === "staff_chat_message") {
    console.log('🔥 [FCM] Normalizing staff_chat_message:', data);
    
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
      console.log('🔥 [FCM] Normalized staff_chat_message:', normalized);
      return normalized;
    } catch (error) {
      console.error('❌ [FCM] Error normalizing staff_chat_message:', error);
      console.error('❌ [FCM] Data causing error:', data);
      return null;
    }
  }
  
  if (data.type === "staff_chat_conversations_with_unread") {
    console.log('🔥 [FCM] Normalizing staff_chat_conversations_with_unread:', data);
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
    console.log('🔥 [FCM] Synthesized spec-compliant unread event:', normalized);
    return normalized;
  }
  
  console.log('🔥 [FCM] No handler found for FCM type:', data.type);
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
    console.log('📡 Incoming realtime event:', { source, channel, eventName, payload });
    
    // 🚨 CATCH ALL REALTIME EVENTS TO DEBUG MISSING MESSAGE EVENTS
    if (eventName?.includes('message') || eventName?.includes('created')) {
      console.log('🚨🚨 [EventBus] MESSAGE-RELATED EVENT DETECTED:', { channel, eventName, payload });
    }
    
    // 🔍 LOG ALL STAFF CHAT EVENTS TO DEBUG MISSING MESSAGES
    if (eventName?.includes('staff_chat') || channel?.includes('staff-chat')) {
      console.log('🔍🔍 [EventBus] ANY STAFF CHAT EVENT:', { source, channel, eventName, payloadKeys: Object.keys(payload || {}) });
    }
    
    // 🔥 DEBUG: Log staff chat events specifically
    if (channel?.includes('staff-chat') && !eventName?.startsWith('pusher:')) {
      console.log('🚨 [EventBus] ===== STAFF CHAT EVENT RECEIVED =====');
      console.log('🔥 [EventBus] Channel:', channel);
      console.log('🔥 [EventBus] Event Name:', eventName);
      console.log('🔥 [EventBus] Full Payload:', JSON.stringify(payload, null, 2));
      console.log('🔥 [EventBus] Payload Type:', typeof payload);
      console.log('🔥 [EventBus] Has category?', !!payload?.category, 'Value:', payload?.category);
      console.log('🔥 [EventBus] Has type?', !!payload?.type, 'Value:', payload?.type);
      console.log('🔥 [EventBus] Has payload.payload?', !!payload?.payload);
      console.log('🔥 [EventBus] Event will be normalized and routed to chatStore');
      
      // 🚨 SPECIAL CHECK FOR MESSAGE EVENTS
      if (eventName === 'realtime_staff_chat_message_created') {
        console.log('🚨🚨🚨 [EventBus] FOUND THE MESSAGE EVENT WE NEED! 🚨🚨🚨');
      } else {
        console.log('🔍 [EventBus] This is NOT a message_created event, looking for that...');
      }
      console.log('🚨 [EventBus] ===================================');
    }

    // 1️⃣ IGNORE PUSHER SYSTEM EVENTS (like pusher:subscription_succeeded)
    if (source === 'pusher' && eventName?.startsWith('pusher:')) {
      if (!import.meta.env.PROD) {
        console.log('🔄 [eventBus] Skipping Pusher system event:', eventName);
      }
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
        console.log('🔥 [EventBus] Using eventName as effectiveType:', effectiveType);
      }

      // FULL normalized - FIXED: Use effectiveType instead of payload.type
      const normalized = {
        category: payload.category,
        type: effectiveType, // 👈 FIXED: Use the effectiveType we calculated
        payload: payload.payload ?? payload.data ?? {},
        meta: payload.meta || { channel, eventName },
        source,
        timestamp: payload.meta?.ts || new Date().toISOString(),
      };
      console.log('🚀 [EventBus] Normalized event with effectiveType:', normalized);
      if (maybeHandleStaffChatUnreadUpdate(normalized)) {
        return;
      }
      routeToDomainStores(normalized);
      maybeAddToNotificationCenter(normalized);
      return;
    }

    // SUPPORT raw Pusher event (e.g. direct message payload) - ALWAYS process staff-chat events
    if (channel?.includes("staff-chat") && eventName?.startsWith("realtime_staff_chat_")) {
        console.log('🔥 [EventBus] Processing RAW staff-chat event:', { eventName, channel, payload });
        const normalized = {
          category: "staff_chat",
          type: eventName,
          payload: payload,           // <---- PAYLOAD IS THE MESSAGE
          meta: { channel, eventName, event_id: payload?.event_id },
          source,
          timestamp: new Date().toISOString()
        };
        console.log('🚀 [EventBus] Normalized staff-chat event:', normalized);
        if (maybeHandleStaffChatUnreadUpdate(normalized)) {
          return;
        }
        routeToDomainStores(normalized);
        maybeAddToNotificationCenter(normalized);
        return;
    }

    // 3️⃣ FCM EVENT NORMALIZATION
    if (source === 'fcm') {
      console.log('🔥 [EventBus] FCM event received - processing:', payload);
      const event = normalizeFcmEvent(payload);

      if (!event) {
        console.warn('⚠️ [EventBus] FCM event ignored - no handler for type:', payload?.data?.type);
        return;
      }

      console.log('🚀 [EventBus] Normalized FCM event:', event);

      if (maybeHandleStaffChatUnreadUpdate(event)) {
        return;
      }

      routeToDomainStores(event);
      maybeAddToNotificationCenter(event);
      return;
    }

    // FALLBACK: Process ANY staff-chat event that doesn't match above patterns
    if (channel?.includes("staff-chat") && eventName && !eventName.startsWith('pusher:')) {
        console.log('🆘 [EventBus] FALLBACK: Processing unmatched staff-chat event:', { eventName, channel, payload });
        const normalized = {
          category: "staff_chat",
          type: eventName,
          payload: payload,
          meta: { channel, eventName, event_id: payload?.event_id || payload?.id },
          source,
          timestamp: new Date().toISOString()
        };
        console.log('🆘 [EventBus] FALLBACK normalized event:', normalized);
        if (maybeHandleStaffChatUnreadUpdate(normalized)) {
          return;
        }
        routeToDomainStores(normalized);
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
    if (!import.meta.env.PROD) {
      console.log('🚏 Routing NEW format event:', event.category, event.type);
    }

    switch (event.category) {
      case "attendance":
        attendanceActions.handleEvent(event);
        break;
      case "staff_chat":
        // Filter out Pusher system events before processing
        if (event.type?.startsWith('pusher:') || event.eventType?.startsWith('pusher:')) {
          if (!import.meta.env.PROD) {
            console.log('🔄 [eventBus] Skipping Pusher system event:', event.type || event.eventType);
          }
        } else {
          console.log('🚀 [EventBus] Routing staff_chat event to chatActions.handleEvent');
          console.log('🚀 [EventBus] Event being routed:', { category: event.category, type: event.type, hasPayload: !!event.payload });
          chatActions.handleEvent(event);
        }
        break;
      case "guest_chat":
        guestChatActions.handleEvent(event);
        break;
      case "room_service":
        console.log('🍽️ [EventBus] Processing room service event:', {
          type: event.type,
          hasPayload: !!event.payload,
          payloadKeys: event.payload ? Object.keys(event.payload) : [],
          orderId: event.payload?.order_id || event.payload?.id,
          roomNumber: event.payload?.room_number,
          status: event.payload?.status
        });
        roomServiceActions.handleEvent(event);
        console.log('✅ [EventBus] Room service event sent to store');
        break;
      case "room_booking":
        roomBookingActions.handleEvent(event);
        break;
      case "booking":
        serviceBookingActions.handleEvent(event);
        break;
      default:
        if (!import.meta.env.PROD) {
          console.log('🚏 Unknown category:', event.category, event);
        }
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

  console.log('📡 [EventBus] Dispatching staff chat unread counts update:', normalizedPayload);
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
      return eventType === 'guest_message_created' ? 'New guest message' : 
             eventType === 'staff_message_created' ? 'Staff reply sent' :
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
    console.log('🧪 DEBUG: Manually triggering realtime_staff_chat_unread_updated event:', { conversationId, unreadCount, totalUnread });
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
    console.log('🧪 DEBUG: Manually triggering total unread update:', { totalUnread });
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
      console.log('🔥 [DEBUG] Dispatching forceMessengerUpdate event');
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
    console.log('🔥 DEBUG: RESETTING ALL UNREAD COUNTS TO ZERO');
    
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
    
    console.log('🔥 DEBUG: All unread counts reset to 0');
  };
  
  // Debug function to test messenger widget visual updates
  window.testMessengerBadge = (count = 0) => {
    console.log('🧪 [DEBUG] Testing messenger badge with count:', count);
    window.debugTotalUnread(count);
    
    setTimeout(() => {
      console.log('🧪 [DEBUG] After 1 second, check if badge updated properly');
      const badge = document.querySelector('.messenger-widget__badge');
      const header = document.querySelector('.messenger-widget__header');
      console.log('🧪 [DEBUG] Badge element:', badge ? `EXISTS (${badge.textContent})` : 'NOT FOUND');
      console.log('🧪 [DEBUG] Header classes:', header?.className || 'HEADER NOT FOUND');
      
      // Try to force a React re-render by dispatching a custom event
      console.log('🧪 [DEBUG] Dispatching custom event to force React update');
      window.dispatchEvent(new CustomEvent('forceMessengerUpdate', { detail: { count } }));
    }, 1000);
  };
  
  // Quick test functions
  window.setBadge5 = () => window.testMessengerBadge(5);
  window.setBadge0 = () => {
    console.log('🚨 Setting badge to 0 - using complete reset');
    window.resetAllUnreadCounts();
    setTimeout(() => window.testMessengerBadge(0), 500);
  };
  window.setBadge10 = () => window.testMessengerBadge(10);
  
  // Debug function to check current state
  window.debugCurrentState = () => {
    console.log('🔍 [DEBUG] Current badge state check:');
    const badge = document.querySelector('.messenger-widget__badge');
    const header = document.querySelector('.messenger-widget__header');
    
    console.log('🎯 Current DOM State:', {
      badgeExists: !!badge,
      badgeText: badge?.textContent || 'NO BADGE',
      badgeVisible: badge ? getComputedStyle(badge).display : 'NO BADGE',
      headerClasses: header?.className || 'NO HEADER',
      headerHasUnreadClass: header?.classList.contains('messenger-widget__header--unread') || false
    });
  };
  
  // Comprehensive test function to check entire badge update chain
  window.testBadgeChain = (count = 5) => {
    console.log(`🧪 [DEBUG] Testing complete badge update chain with count: ${count}`);
    
    // Step 1: Update via Pusher simulation
    console.log('📡 Step 1: Simulating Pusher event...');
    window.debugTotalUnread(count);
    
    // Step 2: Check store state after delay
    setTimeout(() => {
      console.log('📊 Step 2: Checking chatStore state...');
      // This would need access to the store - will be logged by the store itself
      
      // Step 3: Check DOM elements
      console.log('🔍 Step 3: Checking DOM elements...');
      const badge = document.querySelector('.messenger-widget__badge');
      const header = document.querySelector('.messenger-widget__header');
      
      console.log('🎯 Badge Update Test Results:', {
        badgeExists: !!badge,
        badgeText: badge?.textContent,
        badgeVisible: badge && getComputedStyle(badge).display !== 'none',
        headerClasses: header?.className,
        headerHasUnreadClass: header?.classList.contains('messenger-widget__header--unread'),
        expectedBadgeText: count > 99 ? '99+' : count.toString(),
        expectedHeaderClass: count > 0 ? 'Should have messenger-widget__header--unread' : 'Should have main-bg',
        testPassed: badge?.textContent === (count > 99 ? '99+' : count.toString()) && 
                   (count > 0 ? header?.classList.contains('messenger-widget__header--unread') : header?.classList.contains('main-bg'))
      });
    }, 200);
  };
}