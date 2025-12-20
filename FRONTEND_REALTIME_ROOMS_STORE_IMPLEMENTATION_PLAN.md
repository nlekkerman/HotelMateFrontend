# Frontend Realtime Rooms Store + UI Integration Implementation Plan

**Date**: December 20, 2025  
**Status**: Implementation Ready  
**Architecture**: HotelMate Frontend Realtime System

## Context

HotelMate frontend uses a centralized realtime architecture with Pusher events flowing through:
- `realtimeClient.js` (Pusher initialization with token auth) ✅
- `channelRegistry.js` (channel subscriptions → eventBus) ✅  
- `eventBus.js` (event normalization → domain stores) ✅
- Domain stores: attendance, staff_chat, guest_chat, room_service, service_booking, room_booking ✅

**Goal**: Add full realtime support for ROOMS with canonical event handling and UI integration.

## Technical Specifications

### Event Flow Architecture
```
Pusher Channel: {hotel_slug}.rooms
Event Name: "room_updated"
Normalized Payload: {
  category: "rooms",
  type: "room_updated", 
  payload: { room_number, room_status, is_occupied, is_out_of_order, maintenance_required, ... },
  meta: { hotel_slug, event_id, ts, scope: { room_number } }
}
```

### State Structure (Plain JS)
```js
const initialState = {
  byRoomNumber: {}, // { [room_number]: roomSnapshot } 
  list: [], // [room_number, ...] sorted numerically
  lastEventIds: {}, // { [eventId]: true } - object map deduplication
  lastUpdatedAt: null // ISO timestamp
};
```

## Implementation Tasks

### A) Create roomsStore.jsx

**File**: `src/realtime/stores/roomsStore.jsx`

**Requirements**:
- Use `.jsx` extension (not `.js`) following existing pattern
- Plain JS - no TypeScript, no interfaces, no generics, no `as const`
- Follow exact pattern from `roomBookingStore.jsx`
- Use object map deduplication: `lastEventIds: { [eventId]: true }`
- Numeric room sorting: `list.sort((a, b) => Number(a) - Number(b))`

**Actions**:
```js
const ACTIONS = {
  ROOM_UPSERT: 'ROOM_UPSERT',
  ROOM_BULK_REPLACE: 'ROOM_BULK_REPLACE', 
  ROOM_REMOVE: 'ROOM_REMOVE',
  ROOM_RESET: 'ROOM_RESET' // Clear all rooms (hotel switch/logout)
};
```

**Event Handling**:
- Only process: `event.category === "rooms" && event.type === "room_updated"`
- Extract room_number from: `event.meta.scope.room_number || event.payload.room_number`
- Deduplicate via: `event.meta.event_id` 
- Upsert room snapshot (merge existing + payload)
- Update `lastUpdatedAt` timestamp
- Call `ROOM_RESET` when:
  - `hotelSlug` changes in RealtimeProvider or channelRegistry context
  - User logout occurs

**Exports**:
```js
export { RoomsProvider };
export const useRoomsState = () => { /* ... */ };
export const useRoomsDispatch = () => { /* ... */ };
export const roomsActions = { handleEvent };
```

### B) Wire Into RealtimeProvider.jsx

**File**: `src/realtime/RealtimeProvider.jsx`

**Changes**:
- Add `import { RoomsProvider } from './stores/roomsStore.jsx';`
- Add `<RoomsProvider>` to provider tree alongside existing providers
- Keep `RealtimeManager` inside all providers
- Do NOT reorder existing providers

### C) Update eventBus.js Routing

**File**: `src/realtime/eventBus.js`

**Changes**:
- Add `import { roomsActions } from './stores/roomsStore.jsx';`
- Update `routeToDomainStores` switch:
  ```js
  case "rooms": 
    roomsActions.handleEvent(event); 
    break;
  ```
- Do not break existing categories

### D) Subscribe to Rooms Channel

**File**: `src/realtime/channelRegistry.js`

**Changes**:
- Add `{hotelSlug}.rooms` to base channels subscription list
- Same style as: attendance, room-service, booking, room-bookings
- Global event binding already routes to eventBus (no extra logic needed)

**Important**: Do NOT subscribe to rooms channel in per-page components

### E) UI Integration

#### RoomList.jsx Integration
**File**: `src/components/staff/RoomList.jsx`

**Approach**:
1. After API fetch success → dispatch `ROOM_BULK_REPLACE` to roomsStore
2. Build render array: `const rooms = roomsState.list.map(n => roomsState.byRoomNumber[n]).filter(Boolean);`
3. Render from store rooms array when available  
4. Fallback to API response if store empty (safety)
5. Use `useRoomsState()` hook for store access

#### RoomDetails.jsx Integration  
**File**: `src/components/staff/RoomDetails.jsx`

**Approach**:
1. Use `room_number` param to read from roomsStore for instant updates
2. Still fetch room details via API for deep fields
3. Merge realtime room snapshot into detail UI when available
4. Primary operational state updates live via store

#### RoomCard.jsx Integration
**File**: `src/components/staff/RoomCard.jsx` 

**Approach**:
- No direct changes needed if RoomList supplies room data from store
- Receives live data through props automatically

## Development Guidelines

### Error Handling
- Graceful degradation if realtime connection fails
- Continue using React Query for API fetching as fallback
- No polling implementation needed

### State Synchronization  
- API bulk replace is **authoritative** on initial load
- After load: realtime upserts applied (deduped via `meta.event_id`)
- Optional later: compare timestamps if available

### Performance
- Keep all rooms in memory (fast enough)
- Filtering/search stays in component state  
- No room pagination needed in store

### Debugging (Dev Mode Only)
- Console logs guarded by `!import.meta.env.PROD`
- Log when roomsStore handles `room_updated`
- Log when bulk replace occurs
- Optional: `window.debugRoomsStore()` helper

## Testing Checklist

- [ ] Room status changes appear instantly in RoomList
- [ ] Room details update live in RoomDetails view  
- [ ] Channel subscription to `{hotel_slug}.rooms` works
- [ ] Event deduplication via `meta.event_id` functions
- [ ] Fallback to API fetch when store empty
- [ ] No breaking changes to existing room components
- [ ] Dev console logs show room events (dev mode only)

## Architecture Constraints

### DO NOT DO
- ❌ Create new "Rooms Dashboard" page
- ❌ Create second rooms list for housekeeping  
- ❌ Move rooms into roomBookingStore
- ❌ Invent new event types
- ❌ Add websocket libraries or new realtime clients
- ❌ Use TypeScript types, interfaces, or generics
- ❌ Subscribe to rooms channel in per-page components

### MUST DO  
- ✅ Use `.jsx` extension for store file
- ✅ Follow exact `roomBookingStore.jsx` pattern
- ✅ Use object map for `lastEventIds: {}`
- ✅ Handle only `category: "rooms"` events  
- ✅ Maintain existing realtime architecture
- ✅ Keep API fetching as fallback mechanism

## Files to Modify

1. **NEW**: `src/realtime/stores/roomsStore.jsx`
2. **UPDATE**: `src/realtime/RealtimeProvider.jsx`  
3. **UPDATE**: `src/realtime/eventBus.js`
4. **UPDATE**: `src/realtime/channelRegistry.js`
5. **UPDATE**: `src/components/staff/RoomList.jsx`
6. **UPDATE**: `src/components/staff/RoomDetails.jsx`

## Success Criteria

- Room operational state updates appear instantly across all room UI components
- Zero manual refresh required for room status changes  
- Seamless integration with existing realtime architecture
- Backward compatibility with current API-based room management
- Clean separation between realtime state and detailed room data

---

**Ready for Implementation** - All technical specifications defined and constraints documented.