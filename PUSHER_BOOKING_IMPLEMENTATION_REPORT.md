# Pusher Booking Implementation Contract

## Overview
This document defines the **exact** frontend ↔ backend contract for booking-related Pusher events and provides concrete implementation tasks.

## Backend Contract (Current Reality)

### Channels
- **`{hotelSlug}.room-bookings`** - All room booking lifecycle events
- **`{hotelSlug}.rooms`** - Room availability/status changes
- **`{hotelSlug}.booking`** - ⚠️ **DECISION NEEDED**: What exactly goes here?

### Event Naming Convention
- **Pusher Event Names**: `snake_case` (e.g., `booking_cancelled`)
- **Normalized Type**: `eventData.type` matches Pusher event name (e.g., `booking_cancelled`)
- **No dotted names** - stick to backend contract

## Channel Contract Table

### Channel: `{hotelSlug}.room-bookings`

| Pusher Event Name | Normalized Body | Required Payload Fields |
|------------------|----------------|------------------------|
| `booking_created` | `{category: "room_booking", type: "booking_created", payload: {...}, meta: {...}}` | `booking_id`, `status`, `created_at`, `guest_name` |
| `booking_confirmed` | `{category: "room_booking", type: "booking_confirmed", payload: {...}, meta: {...}}` | `booking_id`, `status`, `confirmed_at` |
| `booking_cancelled` | `{category: "room_booking", type: "booking_cancelled", payload: {...}, meta: {...}}` | `booking_id`, `status`, `cancelled_at`, `cancellation_reason` |

### Channel: `{hotelSlug}.rooms`

| Pusher Event Name | Normalized Body | Required Payload Fields |
|------------------|----------------|------------------------|
| `room_status_changed` | `{category: "room", type: "room_status_changed", payload: {...}, meta: {...}}` | `room_id`, `status`, `changed_at` |

### Meta Fields (All Events)
```javascript
meta: {
  event_id: "uuid-string",      // For deduplication
  ts: "2025-12-26T15:48:23Z",   // ISO timestamp
  hotel_slug: "hotel-killarney", // Hotel context
  scope: "staff"                 // Access scope
}
```

## Decision Required: Channel Cleanup

**Current Problem**: `{hotelSlug}.booking` vs `{hotelSlug}.room-bookings` overlap

**Recommendation**: 
- **Keep**: `{hotelSlug}.room-bookings` for ALL room booking events
- **Keep**: `{hotelSlug}.rooms` for room state changes
- **Deprecate**: `{hotelSlug}.booking` OR define its exact non-overlapping purpose

## Implementation Tasks

### Task A: Subscribe + Bind Booking Events
**File**: `RealtimeProvider.jsx` or `channelRegistry.js`

```javascript
// Subscribe to room-bookings channel
const channel = pusher.subscribe(`${hotelSlug}.room-bookings`);

// Bind specific events
channel.bind('booking_created', handleBookingEvent);
channel.bind('booking_confirmed', handleBookingEvent);
channel.bind('booking_cancelled', handleBookingEvent);

function handleBookingEvent(eventData) {
  eventBus.emit('realtime-event', eventData);
}
```

### Task B: Route by {category, type}
**File**: `eventBus.js`

```javascript
// Route events by normalized structure
eventBus.on('realtime-event', (eventData) => {
  if (eventData.category === 'room_booking') {
    bookingStore.applyRealtimeEvent(eventData);
  }
  
  if (eventData.category === 'room') {
    roomStore.applyRealtimeEvent(eventData);  
  }
});
```

### Task C: Dedupe by meta.event_id
**File**: `bookingStore.js` or equivalent

```javascript
const seenEventIds = new Set(); // LRU cache in production

function applyRealtimeEvent(eventData) {
  if (seenEventIds.has(eventData.meta.event_id)) {
    console.warn('[BookingStore] Duplicate event ignored:', eventData.meta.event_id);
    return;
  }
  
  seenEventIds.add(eventData.meta.event_id);
  
  // Process event...
}
```

### Task D: Upsert Booking Rows  
**File**: `bookingStore.js`

```javascript
function applyRealtimeEvent(eventData) {
  const { type, payload } = eventData;
  
  switch (type) {
    case 'booking_created':
      upsertBooking(payload.booking_id, { 
        ...payload,
        status: payload.status.toUpperCase() // Canonical format
      });
      break;
      
    case 'booking_cancelled':
      upsertBooking(payload.booking_id, {
        status: 'CANCELLED',
        cancelled_at: payload.cancelled_at,
        cancellation_reason: payload.cancellation_reason
      });
      break;
  }
  
  // NO refetch triggered by realtime events
}
```

### Task E: UI Notifications
**File**: `bookingStore.js` + toast system

```javascript
function applyRealtimeEvent(eventData) {
  // ... upsert logic above ...
  
  // Toast notifications
  if (eventData.type === 'booking_confirmed') {
    toast.success(`Booking ${payload.booking_id} confirmed`);
  }
  
  if (eventData.type === 'booking_cancelled') {
    toast.info(`Booking ${payload.booking_id} cancelled`);
  }
  
  // Update badge counts from store, not polling
  updateBookingCounts();
}
```

## Required Validation: Debug Panel

**Critical**: Add dev-only logging to catch schema mismatches and double-handling.

**File**: `debug.js` or `eventBus.js`

```javascript
// Dev-only debug switch
const DEBUG_REALTIME = process.env.NODE_ENV === 'development';

function logRealtimeEvent(eventData) {
  if (!DEBUG_REALTIME) return;
  
  console.group('[REALTIME DEBUG]');
  console.log('Channel:', eventData._channel);
  console.log('Pusher Event:', eventData._pusher_event_name);
  console.log('Category:', eventData.category);
  console.log('Type:', eventData.type);
  console.log('Event ID:', eventData.meta?.event_id);
  console.log('Store Mutations:', getStoreMutationCount());
  console.groupEnd();
}

// Call this for every event
eventBus.on('realtime-event', logRealtimeEvent);
```

This logging will instantly reveal:
- ❌ Double-handling (same event_id processed twice)
- ❌ Wrong channel subscription
- ❌ Schema mismatches
- ❌ Missing required fields

## Validation Checklist

Before considering this "done":

- [ ] Backend confirms exact event names (snake_case)
- [ ] Backend confirms payload structure matches tables above
- [ ] Frontend subscribes to correct channels only
- [ ] Event deduplication works with meta.event_id
- [ ] Store updates without triggering refetch
- [ ] Debug panel shows clean event flow
- [ ] No "potential" or "likely" language remains

## Channel Decision Point

**Action Required**: Backend team must decide:

1. **Option A**: Deprecate `{hotelSlug}.booking` channel entirely
2. **Option B**: Define exact non-overlapping purpose for `{hotelSlug}.booking`

Until decided, frontend should only implement `room-bookings` and `rooms` channels.