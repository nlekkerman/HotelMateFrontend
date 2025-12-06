// src/realtime/eventBus.js
import { addNotificationFromEvent } from './stores/notificationsStore.jsx';
import { attendanceActions } from './stores/attendanceStore.jsx';
import { chatActions } from './stores/chatStore.jsx';
import { guestChatActions } from './stores/guestChatStore.jsx';
import { roomServiceActions } from './stores/roomServiceStore.jsx';
import { bookingActions } from './stores/bookingStore.jsx';

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

    // 1️⃣ IGNORE PUSHER SYSTEM EVENTS (like pusher:subscription_succeeded)
    if (source === 'pusher' && eventName?.startsWith('pusher:')) {
      if (!import.meta.env.PROD) {
        console.log('🔄 [eventBus] Skipping Pusher system event:', eventName);
      }
      return; // ⬅️ nothing else, no warning, no routing
    }

    // 2️⃣ NEW FORMAT (backend-normalized)
    if (
      payload &&
      typeof payload === 'object' &&
      payload.category &&
      (payload.type || payload.eventType) &&
      (payload.payload || payload.data)
    ) {
      const normalized = {
        category: payload.category,
        type: payload.type || payload.eventType,
        eventType: payload.eventType || payload.type,
        payload: payload.payload || payload.data,
        data: payload.data || payload.payload,
        source: payload.source || source,
        timestamp: payload.timestamp || new Date().toISOString(),
        meta: payload.meta || { channel, eventName },
      };

      routeToDomainStores(normalized);
      maybeAddToNotificationCenter(normalized);
      return;
    }

    // 3️⃣ (Optional) if you *still* want legacy support, call normalizePusherEvent/normalizeFCMEvent here.
    // Right now you just warn:

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
  if (event.category && event.type && event.payload) {
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
          chatActions.handleEvent(event);
        }
        break;
      case "guest_chat":
        guestChatActions.handleEvent(event);
        break;
      case "room_service":
        roomServiceActions.handleEvent(event);
        break;
      case "booking":
        bookingActions.handleEvent(event);
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
      return `Staff ${eventType.replace('_', ' ')}`;
    case 'staff_chat':
      return eventType === 'message_created' ? 'New message received' : `Message ${eventType.replace('_', ' ')}`;
    case 'guest_chat':
      return eventType === 'guest_message_created' ? 'New guest message' : `Guest chat ${eventType.replace('_', ' ')}`;
    case 'room_service':
      return `Order ${eventType.replace('_', ' ')}`;
    case 'booking':
      return `Booking ${eventType.replace('_', ' ')}`;
    default:
      return `${eventType.replace('_', ' ')}`;
  }
}