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
    
    // ✅ NEW: Check if payload is already in normalized format from backend
    if (payload && typeof payload === 'object' && payload.category && payload.type && payload.payload) {
      // Backend already sending normalized events - use directly
      console.log('📦 Using pre-normalized event from backend:', payload);
      routeToDomainStores(payload);
      maybeAddToNotificationCenter(payload);
      return;
    }
    
    // Legacy event handling for backward compatibility
    const normalized = normalizeEvent({ source, channel, eventName, payload });
    
    if (normalized) {
      routeToDomainStores(normalized);
      maybeAddToNotificationCenter(normalized);
    }
  } catch (error) {
    console.error('❌ Error handling realtime event:', error, { source, channel, eventName, payload });
  }
}

/**
 * Normalize events from different sources into a common format
 * @param {Object} params - Event parameters
 * @returns {Object} Normalized event object
 */
function normalizeEvent({ source, channel, eventName, payload }) {
  const timestamp = new Date().toISOString();
  
  // Handle FCM events
  if (source === 'fcm') {
    return normalizeFCMEvent(payload, timestamp);
  }
  
  // Handle Pusher events by channel and event type
  if (source === 'pusher' && channel && eventName) {
    return normalizePusherEvent(channel, eventName, payload, timestamp);
  }
  
  // Default fallback for unknown events
  return {
    category: 'system',
    eventType: 'unknown_event',
    data: payload,
    timestamp,
    source,
    title: 'Unknown Event',
    message: `Received ${source} event: ${eventName || 'unknown'}`,
    level: 'info'
  };
}

/**
 * Normalize FCM payload to standard event format
 */
function normalizeFCMEvent(payload, timestamp) {
  // Extract notification data from FCM payload
  const notification = payload.notification || {};
  const data = payload.data || {};
  
  // Try to determine category from FCM data
  let category = 'system';
  let eventType = 'fcm_message';
  
  if (data.type === 'chat' || data.category === 'staff_chat') {
    category = 'staff_chat';
    eventType = 'new_message';
  } else if (data.type === 'attendance' || data.category === 'attendance') {
    category = 'attendance';
    eventType = 'attendance_notification';
  } else if (data.type === 'room_service') {
    category = 'room_service';
    eventType = 'order_notification';
  }
  
  return {
    category,
    eventType,
    data: { ...data, notification },
    timestamp,
    source: 'fcm',
    title: notification.title || 'Notification',
    message: notification.body || 'You have a new notification',
    level: 'info'
  };
}

/**
 * Normalize Pusher events based on channel and event patterns
 */
function normalizePusherEvent(channel, eventName, payload, timestamp) {
  // Attendance events
  if (channel.includes('hotel-') && (eventName === 'clock-status-updated' || eventName === 'clock-status-changed' || eventName === 'attendance_update')) {
    return {
      category: 'attendance',
      eventType: eventName,
      data: payload,
      timestamp,
      source: 'pusher',
      title: 'Attendance Update',
      message: `Staff ${eventName.replace('-', ' ')}`,
      level: 'info'
    };
  }
  
  // Personal attendance events
  if (channel.includes('attendance-hotel-') && channel.includes('-staff-')) {
    return {
      category: 'attendance',
      eventType: eventName.includes('approved') ? 'timesheet-approved' : 
                eventName.includes('rejected') ? 'timesheet-rejected' : 
                'personal-attendance-update',
      data: payload,
      timestamp,
      source: 'pusher',
      title: 'Attendance Status',
      message: `Your timesheet was ${eventName.includes('approved') ? 'approved' : 'updated'}`,
      level: eventName.includes('approved') ? 'success' : 'info'
    };
  }

  // Additional attendance events from useAttendanceRealtime patterns
  if (channel.includes('hotel-') && (
    eventName.includes('attendance-') || 
    eventName.includes('clocklog-') ||
    eventName === 'clock-status-changed'
  )) {
    let normalizedEventType = eventName;
    
    // Map specific event types to normalized ones
    if (eventName === 'clocklog-approved') normalizedEventType = 'log-approved';
    else if (eventName === 'clocklog-rejected') normalizedEventType = 'log-rejected';
    else if (eventName === 'clocklog-created') normalizedEventType = 'log-created';
    else if (eventName === 'clocklog-updated') normalizedEventType = 'log-updated';
    else if (eventName === 'attendance-unrostered-request') normalizedEventType = 'unrostered-request';
    else if (eventName === 'attendance-break-warning') normalizedEventType = 'break-warning';
    else if (eventName === 'attendance-overtime-warning') normalizedEventType = 'overtime-warning';
    else if (eventName === 'attendance-hard-limit-warning') normalizedEventType = 'hard-limit';

    return {
      category: 'attendance',
      eventType: normalizedEventType,
      data: payload,
      timestamp,
      source: 'pusher',
      title: 'Attendance Update',
      message: `Staff ${eventName.replace('-', ' ')}`,
      level: 'info'
    };
  }
  
  // Staff chat events - improved channel detection for staff chat
  if (channel.includes('staff-chat-hotel-') || 
      (channel.includes('-staff-') && channel.includes('-notifications')) ||
      (channel.includes('-staff-conversation-')) ||
      (channel.includes('.staff-chat.'))) {
    
    // Normalize event names to match chatStore expectations
    let normalizedEventType = eventName;
    if (eventName === 'new-message' || eventName === 'message') {
      normalizedEventType = 'new_message';
    } else if (eventName === 'message-created') {
      normalizedEventType = 'message_created';
    } else if (eventName === 'message-updated' || eventName === 'message-edited') {
      normalizedEventType = 'message_edited';
    } else if (eventName === 'message-deleted') {
      normalizedEventType = 'message_deleted';
    } else if (eventName === 'read-receipt' || eventName === 'messages-read' || eventName === 'message-read') {
      normalizedEventType = 'read_receipt';
    } else if (eventName === 'conversation-updated') {
      normalizedEventType = 'conversation_update';
    } else if (eventName === 'typing') {
      normalizedEventType = 'typing_indicator';
    }
    
    return {
      category: 'staff_chat',
      eventType: normalizedEventType,
      data: payload,
      timestamp,
      source: 'pusher',
      title: 'Staff Chat',
      message: eventName === 'new-message' ? 'New message received' : `Message ${eventName}`,
      level: 'info'
    };
  }
  
  // Room Service Events - Enhanced to handle multiple channel patterns
  if (channel.includes('room-service-hotel-') ||
      (channel.includes('-staff-') && (
        channel.includes('-kitchen') || 
        channel.includes('-food-and-beverage') ||
        channel.includes('-porter') ||
        channel.includes('-room_service_waiter')
      )) ||
      (channel.includes('kitchen-hotel-')) ||
      (channel.includes('breakfast-hotel-'))) {
    
    // Normalize room service event types
    let normalizedEventType = eventName;
    if (eventName === 'new-room-service-order') {
      normalizedEventType = 'order_created';
    } else if (eventName === 'new-breakfast-order') {
      normalizedEventType = 'order_created';
    } else if (eventName === 'order-status-update') {
      normalizedEventType = 'order_status_changed';
    } else if (eventName === 'order-accepted') {
      normalizedEventType = 'order_status_changed';
    } else if (eventName === 'order-preparing') {
      normalizedEventType = 'order_status_changed';
    } else if (eventName === 'order-ready') {
      normalizedEventType = 'order_status_changed';
    } else if (eventName === 'order-delivered') {
      normalizedEventType = 'order_status_changed';
    } else if (eventName === 'order-cancelled') {
      normalizedEventType = 'order_status_changed';
    }
    
    return {
      category: 'room_service',
      eventType: normalizedEventType,
      data: payload,
      timestamp,
      source: 'pusher',
      title: 'Room Service',
      message: `Order ${eventName.replace('-', ' ')}`,
      level: eventName.includes('completed') || eventName.includes('delivered') ? 'success' : 'info'
    };
  }
  
  // Guest chat events - Enhanced detection based on actual channel patterns
  if (channel.includes('-room-') && channel.includes('-chat') ||
      channel.includes('-conversation-') && channel.includes('-chat') ||
      channel.includes('-room-') && channel.includes('-deletions')) {
    
    // Extract room number and conversation ID from channel name
    let hotelSlug = null;
    let conversationId = null;
    let roomNumber = null;
    
    // Parse hotel slug
    const hotelMatch = channel.match(/^([^-]+)-/);
    if (hotelMatch) {
      hotelSlug = hotelMatch[1];
    }
    
    // Parse room channel: ${hotelSlug}-room-${roomNumber}-chat
    const roomMatch = channel.match(/-room-(\d+)-chat$/);
    if (roomMatch) {
      roomNumber = roomMatch[1];
    }
    
    // Parse conversation channel: ${hotelSlug}-conversation-${conversationId}-chat
    const convMatch = channel.match(/-conversation-(\d+)-chat$/);
    if (convMatch) {
      conversationId = parseInt(convMatch[1]);
    }
    
    // Parse deletion channel: ${hotelSlug}-room-${roomNumber}-deletions
    const deletionMatch = channel.match(/-room-(\d+)-deletions$/);
    if (deletionMatch) {
      roomNumber = deletionMatch[1];
    }
    
    // Normalize event types based on actual backend event names
    let normalizedEventType = eventName;
    let messageId = null;
    
    if (eventName === 'new-staff-message' || eventName === 'staff-message-created') {
      normalizedEventType = 'staff_message_created';
      messageId = payload?.id || payload?.message_id;
    } else if (eventName === 'new-message' || eventName === 'guest-message-created') {
      normalizedEventType = 'guest_message_created';
      messageId = payload?.id || payload?.message_id;
    } else if (eventName === 'messages-read-by-staff' || eventName === 'guest-message-read') {
      normalizedEventType = 'message_read';
      messageId = payload?.message_id || payload?.id;
    } else if (eventName === 'staff-message-read') {
      normalizedEventType = 'message_read';
      messageId = payload?.message_id || payload?.id;
    } else if (eventName === 'staff-assigned') {
      normalizedEventType = 'conversation_updated';
    } else if (eventName === 'message-deleted' || eventName === 'message-removed') {
      normalizedEventType = 'message_deleted';
      messageId = payload?.message_id || payload?.id;
    } else if (eventName === 'content-deleted') {
      normalizedEventType = 'message_content_deleted';
      messageId = payload?.message_id || payload?.id;
    } else if (eventName === 'attachment-deleted') {
      normalizedEventType = 'message_attachment_deleted';
      messageId = payload?.message_id || payload?.id;
    }
    
    return {
      category: 'guest_chat',
      eventType: normalizedEventType,
      hotelSlug,
      conversationId: conversationId || payload?.conversation_id,
      messageId: messageId,
      roomNumber,
      data: payload,
      timestamp,
      source: 'pusher',
      rawEvent: { channelName: channel, eventName, rawData: payload },
      title: 'Guest Chat',
      message: eventName === 'new-staff-message' ? 'New staff message' : 
               eventName === 'new-message' ? 'New guest message' : 
               `Guest chat ${eventName.replace('-', ' ')}`,
      level: 'info'
    };
  }
  
  // Gallery events
  if (channel.includes('gallery-hotel-')) {
    return {
      category: 'gallery',
      eventType: eventName,
      data: payload,
      timestamp,
      source: 'pusher',
      title: 'Gallery Update',
      message: `Gallery ${eventName.replace('-', ' ')}`,
      level: 'info'
    };
  }
  
  // Booking Events - Enhanced to handle multiple channel patterns  
  if (channel.includes('booking-hotel-') ||
      channel.includes('restaurant-booking-hotel-') ||
      (channel.includes('-staff-') && (
        channel.includes('-food-and-beverage') ||
        channel.includes('-receptionist') ||
        channel.includes('-manager') ||
        channel.includes('-food_and_beverage_manager')
      ))) {
    
    // Normalize booking event types
    let normalizedEventType = eventName;
    if (eventName === 'new-dinner-booking') {
      normalizedEventType = 'booking_created';
    } else if (eventName === 'new-booking') {
      normalizedEventType = 'booking_created';
    } else if (eventName === 'booking-confirmed') {
      normalizedEventType = 'booking_updated';
    } else if (eventName === 'booking-cancelled') {
      normalizedEventType = 'booking_cancelled';
    } else if (eventName === 'table-assigned') {
      normalizedEventType = 'booking_seated';
    } else if (eventName === 'table-changed') {
      normalizedEventType = 'booking_table_changed';
    }
    
    return {
      category: 'booking',
      eventType: normalizedEventType,
      data: payload,
      timestamp,
      source: 'pusher',
      title: 'Booking Update',
      message: `Booking ${eventName.replace('-', ' ')}`,
      level: eventName.includes('confirmed') ? 'success' : 'info'
    };
  }
  
  // Hotel offers (general hotel channel)
  if (channel.includes('hotel-') && (eventName.includes('offer-') || eventName === 'offer-image-updated')) {
    return {
      category: 'offer',
      eventType: eventName,
      data: payload,
      timestamp,
      source: 'pusher',
      title: 'Hotel Offer',
      message: `Offer ${eventName.replace('offer-', '').replace('-', ' ')}`,
      level: 'info'
    };
  }
  
  // Default fallback
  return {
    category: 'system',
    eventType: eventName,
    data: payload,
    timestamp,
    source: 'pusher',
    title: 'System Update',
    message: `${eventName.replace('-', ' ')}`,
    level: 'info'
  };
}

/**
 * Route events to appropriate domain stores
 * @param {Object} event - Event object (either new format with {category, type, payload, meta} or legacy)
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
        chatActions.handleEvent(event);
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

  // Legacy format handling (for backward compatibility)
  if (event.eventType) {
    if (!import.meta.env.PROD) {
      console.log('🚏 Routing LEGACY format event:', event.category, event.eventType);
    }

    switch (event.category) {
      case "attendance":
        attendanceActions.handleEvent(event);
        break;
      case "staff_chat":
        chatActions.handleEvent(event);
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
        break;
    }
  }
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
    'attendance' // Only for personal attendance notifications
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