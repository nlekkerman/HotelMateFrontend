# 🔥 Frontend Booking Refactor Plan - ZERO Confusion Implementation

This document outlines the complete refactor plan to eliminate confusion between RoomBooking vs ServiceBooking vs GuestBookingPage domains.

## 🎯 Objectives

- **ZERO ambiguity** in naming between room bookings vs service bookings
- **Clear separation** of realtime event channels and routing  
- **Proper domain isolation** for different booking types
- **Guest booking flow** clearly identified as room-specific

## 📊 Current State Analysis

### Current Files & Structure
```
src/realtime/stores/bookingStore.jsx          # SERVICE bookings (restaurant/porter/trips)
src/pages/bookings/BookingPage.jsx            # GUEST room booking flow  
src/realtime/channelRegistry.js               # Subscribes to ${hotelSlug}.booking only
src/realtime/eventBus.js                      # Routes "booking" category to bookingActions
src/realtime/RealtimeProvider.jsx             # Wraps with BookingProvider
```

### Current Naming Confusion
- `bookingStore.jsx` handles restaurant bookings but sounds like room bookings
- `BookingPage.jsx` is for guest room reservations but sounds generic
- No separation between room booking vs service booking event streams
- Single "booking" category routes to restaurant/service store

## 🔄 Refactor Implementation Plan

### Step 1: Rename Service Booking Store
**File**: `src/realtime/stores/bookingStore.jsx` → `src/realtime/stores/serviceBookingStore.jsx`

**Changes**:
- Move file to new name
- Rename exports:
  - `BookingProvider` → `ServiceBookingProvider`
  - `useBookingState` → `useServiceBookingState` 
  - `useBookingDispatch` → `useServiceBookingDispatch`
  - `bookingActions` → `serviceBookingActions`
- Update file header comment
- Keep all logic identical (restaurant/service booking focus)

**Affected Imports**:
- `src/realtime/RealtimeProvider.jsx`
- `src/realtime/eventBus.js`
- Any component using these hooks (need to search)

### Step 2: Create Room Booking Store  
**File**: `src/realtime/stores/roomBookingStore.jsx` (NEW)

**State Structure**:
```javascript
{
  byBookingId: { [bookingId]: booking },    // Room booking objects indexed by booking_id
  list: [bookingId, ...],                   // Newest first ordering for display
  lastEventIds: { [eventId]: true }        // Deduplication via meta.event_id
}
```

**Event Handling**:
- **Channel**: `${hotel_slug}.room-bookings` ⚠️ (backend uses snake_case)
- **Category**: `"room_booking"`
- **Event Processing**:
  - `booking_created` → upsert booking, move to front of list
  - `booking_updated` → upsert booking (merge with existing)  
  - `booking_party_updated` → upsert booking (full party update)
  - `booking_checked_in` → upsert booking (set checked_in_at)
  - `booking_checked_out` → upsert booking (set status=COMPLETED)
  - `booking_cancelled` → upsert booking (set status=CANCELLED, keep record)
- **Healing Events** (console.debug only):
  - `integrity_healed`, `party_healed`, `guests_healed` → log and ignore

**Deduplication Logic**:
- Use `event.meta.event_id` for deduplication (not timestamp)
- Skip processing if `event_id` already seen
- Clean up old event IDs when cache > 1000 entries

**Booking ID Source**:
- Priority: `meta.scope.booking_id` → `payload.booking_id` → `payload.id`
- All room booking events guaranteed to have booking_id in scope

**Exports**:
- `RoomBookingProvider`
- `useRoomBookingState`  
- `useRoomBookingDispatch`
- `roomBookingActions.handleEvent(event)`

### Step 3: Update Channel Subscriptions
**File**: `src/realtime/channelRegistry.js`

**Changes**:
- Keep existing: `${hotelSlug}.booking` (service bookings - restaurant/porter/trips)
- Add new: `${hotelSlug}.room-bookings` (room bookings - guest accommodations)  
- Both route through same global handler: `handleIncomingRealtimeEvent()`

**⚠️ Important**: Backend uses snake_case `hotel_slug` in channel names, but frontend likely uses camelCase `hotelSlug` variable. Need to ensure proper conversion when subscribing:
```javascript
// Frontend hotelSlug → backend hotel_slug channel format
const roomBookingChannel = `${hotelSlug}.room-bookings`;
```

### Step 4: Update Event Bus Routing
**File**: `src/realtime/eventBus.js`

**Import Changes**:
```javascript
import { serviceBookingActions } from './stores/serviceBookingStore.jsx';
import { roomBookingActions } from './stores/roomBookingStore.jsx';
```

**Routing Changes**:
```javascript
switch(event.category) {
  case "room_booking":
    roomBookingActions.handleEvent(event);
    break;
  case "booking":      
    serviceBookingActions.handleEvent(event);
    break;
}
```

### Step 5: Update Realtime Provider
**File**: `src/realtime/RealtimeProvider.jsx`

**Changes**:
- Replace `BookingProvider` → `ServiceBookingProvider`
- Add `RoomBookingProvider` to provider stack
- Update import statements

### Step 6: Rename Guest Booking Page
**File**: `src/pages/bookings/BookingPage.jsx` → `src/pages/bookings/GuestRoomBookingPage.jsx`

**Changes**:
- Move file to new name
- Rename component: `BookingPage` → `GuestRoomBookingPage`
- Update component display name and comments
- Keep all behavior identical (HTTP-first, no realtime)

**Route Updates**:
- `src/App.jsx`: Update import and element reference
- Any other route files using this component

### Step 7: Update All Imports
**Files to Update**:
- `src/App.jsx` - BookingPage import and route
- `src/realtime/RealtimeProvider.jsx` - Provider imports  
- `src/realtime/eventBus.js` - Actions import
- Any components using booking hooks (search needed)

## 🔍 Files Requiring Changes

### Core Realtime Files
1. `src/realtime/stores/bookingStore.jsx` → `src/realtime/stores/serviceBookingStore.jsx`
2. `src/realtime/stores/roomBookingStore.jsx` (NEW)
3. `src/realtime/channelRegistry.js`
4. `src/realtime/eventBus.js`  
5. `src/realtime/RealtimeProvider.jsx`

### Page Files
1. `src/pages/bookings/BookingPage.jsx` → `src/pages/bookings/GuestRoomBookingPage.jsx`
2. `src/App.jsx`

### Import Updates (To Be Discovered)
- Search for: `bookingStore`, `BookingProvider`, `useBookingState`, `useBookingDispatch`, `bookingActions`
- Search for: `BookingPage` import usage
- Update all found references

## 🎢 Backend Event Mapping (Updated from Contracts)

### Room Bookings  
- **Channel**: `${hotel_slug}.room-bookings` ⚠️ (snake_case hotel_slug from backend)
- **Category**: `"room_booking"`  
- **Core Events**: 
  - `booking_created` - New room booking created
  - `booking_updated` - Booking details modified 
  - `booking_party_updated` - Party members added/removed/modified
  - `booking_cancelled` - Booking cancelled by guest or staff
  - `booking_checked_in` - Guest checked into assigned room
  - `booking_checked_out` - Guest checked out, booking completed
- **Healing Events** (ignore/debug only):
  - `integrity_healed` - Auto-heal service fixes
  - `party_healed` - Party integrity issues resolved
  - `guests_healed` - Guest data reconciled

### Service Bookings (Restaurant/Porter/Trips)
- **Channel**: `${hotel_slug}.booking` 
- **Category**: `"booking"`
- **Events**: `booking_created`, `booking_updated`, `booking_cancelled`, `booking_seated`, `table_changed`

## ✅ Acceptance Criteria

1. **No file named `bookingStore.jsx`** exists anymore
2. **No component named `BookingPage`** exists anymore  
3. **Room bookings** only subscribe to `${hotelSlug}.room-bookings`
4. **Service bookings** only subscribe to `${hotelSlug}.booking`
5. **"room_booking" category** routes only to `roomBookingActions`
6. **"booking" category** routes only to `serviceBookingActions`  
7. **Guest flow** unchanged except for naming (still HTTP-first)
8. **All imports updated** throughout the application
9. **No broken references** after refactor

## 🚀 Implementation Order

1. Create room booking store (NEW file)
2. Rename service booking store + update exports  
3. Update channel registry subscriptions
4. Update event bus routing + imports
5. Update realtime provider  
6. Rename guest booking page + update routes
7. Search & update all imports across app
8. Test realtime events route correctly
9. Verify guest booking flow still works

## 🔧 Testing Checklist

**Realtime Event Routing**:
- [ ] Service booking events (`category: "booking"`) route to serviceBookingStore
- [ ] Room booking events (`category: "room_booking"`) route to roomBookingStore  
- [ ] Events from `${hotelSlug}.booking` channel route to serviceBookingActions
- [ ] Events from `${hotelSlug}.room-bookings` channel route to roomBookingActions

**Event Processing**:
- [ ] `meta.event_id` deduplication works in both stores
- [ ] Room booking healing events are logged but not processed
- [ ] Booking ID extraction works from `meta.scope.booking_id` → `payload.booking_id` → `payload.id`
- [ ] Event ordering handles out-of-order arrivals gracefully

**UI Integration**:
- [ ] Guest room booking page renders correctly with new component name
- [ ] No console errors about missing imports
- [ ] All existing service booking functionality preserved
- [ ] Channel subscriptions established for both domains

**Backend Contract Compliance**:
- [ ] Room booking events contain full staff serializer payload
- [ ] Event envelope matches contract: category, type, payload, meta structure
- [ ] Status changes follow lifecycle rules: PENDING_PAYMENT → CONFIRMED → CHECKED_IN → COMPLETED

## 📝 Implementation Notes

**Backend Contract Compliance**:
- Room booking events use `category: "room_booking"` (NOT `"booking"`)
- Channel naming: `${hotel_slug}.room-bookings` with snake_case from backend
- Event deduplication via `meta.event_id` UUID (not timestamp-based)
- Payload always contains full staff serializer data
- Healing events should be ignored in UI processing (debug log only)

**Domain Separation**:
- **No logic changes** in existing service booking flows - only renaming for clarity
- **Guest booking page stays HTTP-first** - no realtime integration per requirements
- **Clear separation** enables future room booking realtime features without conflicts
- **Backward compatibility** maintained for all existing restaurant/service booking features

**Event Processing Rules**:
- Booking ID priority: `meta.scope.booking_id` → `payload.booking_id` → `payload.id`
- Status changes must follow backend lifecycle: PENDING_PAYMENT → CONFIRMED → CHECKED_IN → COMPLETED
- Cancelled bookings kept in store with `status: "CANCELLED"` (don't delete records)
- Out-of-order events handled via timestamp comparison (`meta.ts`)