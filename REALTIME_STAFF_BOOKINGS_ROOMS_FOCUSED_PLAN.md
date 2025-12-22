# Realtime Staff Frontend Implementation - Focused Plan

## Current State Analysis
- Frontend has established Pusher + eventBus + domain stores architecture
- Channel registry MUST use these canonical channels:
  - **`{hotelSlug}.rooms`** - Room operational status events (room-status-changed)
  - **`{hotelSlug}.room-bookings`** - Room booking lifecycle events (check-in/out)
- EventBus normalizes events into `{category, type, payload, meta}` envelope format
- roomsStore handles `room_updated` events but NOT `room_status_changed`
- roomBookingStore exists with event handling infrastructure

## Booking Events Expectation
**Booking check-in/out events MUST arrive normalized as `{ category: 'room_booking', type: 'booking_checked_in|booking_checked_out' }` — if they don't, eventBus normalization is required.**

## Specific Implementation Tasks

### 1. Room Status Event Normalization
**Problem**: Raw `room-status-changed` events from `{hotelSlug}.rooms` channel don't match expected `room_updated` type
**Solution**: Add normalization mapping in eventBus.js

```javascript
// In eventBus.js normalization
if (channel.includes('.rooms') && eventName === 'room-status-changed') {
  return {
    category: "rooms",
    type: "room_status_changed", // New type for roomsStore
    payload: originalPayload,
    meta: { ...extractedMeta }
  };
}
```

### 2. RoomsStore Handler Extension
**Problem**: roomsStore only handles `room_updated` events, ignores `room_status_changed`
**Solution**: Add new case in existing handleEvent method

```javascript
// In roomsStore.jsx handleEvent
case "room_status_changed":
  const { room_number, new_status } = event.payload;
  dispatchRef({ 
    type: 'ROOM_UPSERT', 
    payload: { 
      roomSnapshot: { room_status: new_status }, 
      roomNumber: room_number 
    }
  });
  break;
```

### 3. Booking Event Verification
**Need to check**: Do booking check-in/out events arrive as:
- `{category: "room_booking", type: "booking_checked_in"}`
- `{category: "room_booking", type: "booking_checked_out"}`

**If not normalized correctly**: Add similar normalization in eventBus.js

### 4. Event Payload Example Needed
**Request**: Paste one real console log line for booking check-in event showing:
- channel name
- eventName  
- payload keys

This will determine if booking normalization is needed.

## Implementation Constraints
- ✅ Use existing channels (no new subscriptions)
- ✅ Use existing event deduplication (meta.event_id)
- ✅ Follow existing store patterns (ROOM_UPSERT, handleEvent)
- ❌ No query invalidation loops
- ❌ No new Pusher client modifications
- ❌ No room assignment event handling (keep silent)

## Expected Result
- Room status changes (`OCCUPIED`, `CHECKOUT_DIRTY`, etc.) update instantly across all staff tabs
- Booking check-in/out timestamps update instantly in booking lists and modals
- All existing functionality preserved
- Events processed once via deduplication