// src/realtime/debug/debugLogger.js
// Thin helper functions for realtime debug instrumentation.
// All functions no-op safely if the debug store is missing.
// To remove: delete this file + src/realtime/debug/ folder.

import * as store from './realtimeDebugStore.js';

// ─── Channel families we care about ───
const TRACKED_CHANNEL_PATTERNS = [
  '.room-bookings',
  '-staff-bookings',
  '-staff-overstays',
  '.rooms',
  'private-guest-booking.',
];

const TRACKED_EVENT_TYPES = [
  'booking_created',
  'booking_updated',
  'booking_confirmed',
  'booking_cancelled',
  'booking_checked_in',
  'booking_checked_out',
  'booking_party_updated',
  'booking_payment_required',
  'booking_overstay_flagged',
  'booking_overstay_acknowledged',
  'booking_overstay_extended',
  'room_occupancy_updated',
  'room_updated',
  'room_status_changed',
  'room-status-changed',
  'room-occupancy-updated',
];

function isTrackedChannel(channelName) {
  if (!channelName) return false;
  return TRACKED_CHANNEL_PATTERNS.some(p => channelName.includes(p));
}

function isTrackedEvent(eventName) {
  if (!eventName) return false;
  return TRACKED_EVENT_TYPES.some(t => eventName.includes(t));
}

function isRelevant(channel, eventName) {
  return isTrackedChannel(channel) || isTrackedEvent(eventName);
}

// ─── Exported helpers ───

export function logRealtimeSetHotelSlug(slug) {
  try { store?.setHotelSlug(slug); } catch (_) { /* no-op */ }
}

export function logRealtimeSubscription(channelName) {
  try {
    if (isTrackedChannel(channelName)) {
      store?.addSubscription(channelName);
    }
  } catch (_) { /* no-op */ }
}

export function logRealtimeUnsubscription(channelName) {
  try {
    if (isTrackedChannel(channelName)) {
      store?.removeSubscription(channelName);
    }
  } catch (_) { /* no-op */ }
}

/**
 * Log an incoming realtime event. Returns the debug event ID for later updates.
 * Returns null if not tracked.
 */
export function logRealtimeEvent(channel, rawEventName, rawPayload) {
  try {
    if (!isRelevant(channel, rawEventName)) return null;
    const bookingId = rawPayload?.booking_id || rawPayload?.id || rawPayload?.payload?.booking_id || null;
    const roomId = rawPayload?.room_number || rawPayload?.room_id || rawPayload?.payload?.room_number || null;
    return store?.pushEvent({
      channel,
      rawEventName,
      rawPayload,
      bookingId,
      roomId,
    }) ?? null;
  } catch (_) { return null; }
}

/**
 * Log that an event was routed/normalized.
 */
export function logRealtimeRouting(debugEventId, { normalizedCategory, normalizedType, routed = true, ignored = false } = {}) {
  try {
    if (debugEventId == null) return;
    store?.updateEvent(debugEventId, {
      normalizedCategory,
      normalizedType,
      routed,
      ignored,
    });
  } catch (_) { /* no-op */ }
}

/**
 * Log that a store dispatch happened.
 */
export function logRealtimeDispatch(debugEventId, info = {}) {
  try {
    if (debugEventId == null) return;
    store?.updateEvent(debugEventId, {
      dispatchedToStore: true,
      ...info,
    });
  } catch (_) { /* no-op */ }
}

/**
 * Log that React Query invalidation happened.
 */
export function logRealtimeInvalidation(debugEventId, queryFamilies = []) {
  try {
    if (debugEventId == null) return;
    store?.updateEvent(debugEventId, {
      invalidatedQueries: queryFamilies,
    });
  } catch (_) { /* no-op */ }
}

/**
 * Log a realtime error.
 */
export function logRealtimeError(errorMsg, context = {}) {
  try {
    store?.pushError(errorMsg, context);
  } catch (_) { /* no-op */ }
}
