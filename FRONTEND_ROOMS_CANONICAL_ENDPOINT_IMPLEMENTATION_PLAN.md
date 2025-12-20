# Frontend Rooms Canonical Endpoint Implementation Plan

**Date**: December 20, 2025  
**Status**: READY FOR IMPLEMENTATION 🚀  
**Architecture**: Realtime-Only Room State Management (Authoritative)

## Executive Summary

Implement canonical frontend wiring for room operational actions in HotelMate, using the completed realtime roomsStore as the single source of truth. This plan establishes the authoritative realtime-only strategy where all room state changes MUST arrive via `room_updated` events - no optimistic updates, no local state mutations.

## 🔒 Canonical Architecture Decisions (LOCKED)

### ✅ Realtime-Only Reconciliation Strategy
**RULE**: Frontend must NOT apply optimistic room state updates  
**RULE**: All room operational changes MUST arrive via realtime `room_updated` events emitted after DB commit  
**RULE**: API responses are used only for success/error feedback, never for state mutation

### ✅ Frontend Responsibility Scope
1. **API calls**: Fire POST, await response, show success/error toast, do nothing else
2. **State updates**: ONLY via roomsStore reacting to realtime events, no manual merges, no local patches, no speculative UI
3. **Error handling**: Backend error → toast, UI remains unchanged (correct behavior)

### ✅ Why This Architecture Is Correct
Rooms are shared, multi-actor, realtime entities accessed by:
- Housekeeping staff
- Front desk agents  
- Managers
- Automation systems
- Maintenance teams
- External integrations (future)

Optimistic UI creates inconsistent truth across actors. Backend is authoritative source via state machine constraints.

## Canonical Backend Endpoints (DO NOT CHANGE)

### A) Housekeeping Status Updates (Generic)
**Uses room_id**: 
- `POST /api/staff/hotel/{hotel_slug}/housekeeping/rooms/{room_id}/status/`
  - Body: `{ status: "<NEW_STATUS>", note?: "<optional>" }`
- `GET /api/staff/hotel/{hotel_slug}/housekeeping/rooms/{room_id}/status-history/`

### B) Turnover Workflow Actions  
**Uses room_number**:
- `POST /api/staff/hotel/{hotel_slug}/rooms/{room_number}/start-cleaning/`
- `POST /api/staff/hotel/{hotel_slug}/rooms/{room_number}/mark-cleaned/`
- `POST /api/staff/hotel/{hotel_slug}/rooms/{room_number}/inspect/`
- `POST /api/staff/hotel/{hotel_slug}/rooms/{room_number}/mark-maintenance/`
- `POST /api/staff/hotel/{hotel_slug}/rooms/{room_number}/complete-maintenance/`

### C) Guest Operations
**Uses room_number**:
- `POST /api/staff/hotel/{hotel_slug}/rooms/{room_number}/checkin/`
- `POST /api/staff/hotel/{hotel_slug}/rooms/{room_number}/checkout/`

## Implementation Tasks

### Task 1: Create Room Operations API Module
**File**: `hotelmate-frontend/src/api/roomOperations.js`

Create centralized API helper following existing `api.js` patterns:

```javascript
// Housekeeping operations (room_id)
export const updateHousekeepingRoomStatus = (hotelSlug, roomId, { status, note }) => {}
export const getHousekeepingStatusHistory = (hotelSlug, roomId) => {}

// Turnover workflow operations (room_number)
export const startCleaning = (hotelSlug, roomNumber) => {}
export const markCleaned = (hotelSlug, roomNumber) => {}
export const inspectRoom = (hotelSlug, roomNumber) => {}
export const markMaintenance = (hotelSlug, roomNumber) => {}
export const completeMaintenance = (hotelSlug, roomNumber) => {}

// Guest operations (room_number)  
export const checkinRoom = (hotelSlug, roomNumber) => {}
export const checkoutRoom = (hotelSlug, roomNumber) => {}
```

**Requirements**:
- Use `api.post()` with correct URL construction
- Follow existing `buildStaffURL()` pattern
- Include proper error handling
- No state mutation - API calls only

### Task 2: Update RoomDetails Component
**File**: `hotelmate-frontend/src/components/rooms/RoomDetails.jsx`

**Current State**: Already has realtime store integration via `useRoomsState()`

**Changes Required**:

#### A) Status Change Dropdown → Housekeeping Endpoint
```javascript
// Replace current status change logic
const handleStatusChange = async (newStatus, note) => {
  try {
    setIsUpdatingStatus(true);
    await updateHousekeepingRoomStatus(hotelSlug, room.id, { 
      status: newStatus, 
      note 
    });
    toast.success(`Room ${room.room_number} status update requested`);
    setShowStatusModal(false);
    // NO roomsActions.upsert() - wait for realtime event
  } catch (error) {
    toast.error(getErrorMessage(error));
  } finally {
    setIsUpdatingStatus(false);
  }
};
```

#### B) Check-in Button → Canonical Endpoint
```javascript
const handleCheckin = async () => {
  // Visible only when room status is "READY_FOR_GUEST"
  try {
    setIsCheckingIn(true);
    await checkinRoom(hotelSlug, room.room_number);
    toast.success(`Room ${room.room_number} check-in initiated`);
    // NO local state mutation - wait for realtime event
  } catch (error) {
    toast.error(getErrorMessage(error));
  } finally {
    setIsCheckingIn(false);
  }
};
```

#### C) Check-out Button → Canonical Endpoint  
```javascript
const handleCheckout = async () => {
  // Visible only when room status is "OCCUPIED"
  try {
    setIsCheckingOut(true);
    await checkoutRoom(hotelSlug, room.room_number);
    toast.success(`Room ${room.room_number} check-out initiated`);
    // NO local state mutation - wait for realtime event
  } catch (error) {
    toast.error(getErrorMessage(error));
  } finally {
    setIsCheckingOut(false);
  }
};
```

### Task 3: Update RoomCard Quick Actions
**File**: `hotelmate-frontend/src/components/rooms/RoomCard.jsx`

**Replace** current status change logic with **turnover-specific actions**:

#### Remove Generic Status Dropdown
- Remove `handleStatusChange` function
- Remove status dropdown UI

#### Add Turnover Action Buttons
```javascript
const turnoverActions = [
  {
    name: 'Start Cleaning',
    action: () => startCleaning(hotelSlug, room.room_number),
    visible: room.room_status === 'CHECKOUT_DIRTY',
    color: 'primary'
  },
  {
    name: 'Mark Cleaned', 
    action: () => markCleaned(hotelSlug, room.room_number),
    visible: room.room_status === 'CLEANING_IN_PROGRESS',
    color: 'success'
  },
  {
    name: 'Inspect Room',
    action: () => inspectRoom(hotelSlug, room.room_number), 
    visible: room.room_status === 'CLEANED_UNINSPECTED',
    color: 'info'
  },
  {
    name: 'Mark Maintenance',
    action: () => markMaintenance(hotelSlug, room.room_number),
    visible: ['READY_FOR_GUEST', 'AVAILABLE'].includes(room.room_status),
    color: 'warning'
  },
  {
    name: 'Complete Maintenance',
    action: () => completeMaintenance(hotelSlug, room.room_number),
    visible: room.room_status === 'MAINTENANCE_REQUIRED',
    color: 'success'
  }
];
```

#### Implement Action Handler
```javascript
const handleTurnoverAction = async (actionFn, actionName) => {
  try {
    setIsUpdating(true);
    await actionFn();
    toast.success(`${actionName} initiated for room ${room.room_number}`);
    // NO local state mutation - wait for realtime event
  } catch (error) {
    toast.error(getErrorMessage(error));
  } finally {
    setIsUpdating(false);
  }
};
```

### Task 4: Enhanced Error Handling
**File**: `hotelmate-frontend/src/utils/errorHandling.js` (new)

Create user-friendly error message mapping:

```javascript
export const getErrorMessage = (error) => {
  const serverMessage = error.response?.data?.message || error.response?.data?.error;
  
  // Map common room operation errors
  const errorMappings = {
    'invalid_transition': 'Invalid room status transition. Please refresh and try again.',
    'room_occupied': 'Cannot perform this action - room is currently occupied.',
    'room_not_ready': 'Room must be Ready For Guest to check in.',
    'room_not_occupied': 'Room is not occupied, cannot check out.',
    'maintenance_required': 'Room requires maintenance before this action.',
    'permission_denied': 'You do not have permission to perform this action.'
  };
  
  // Check for known error patterns
  for (const [key, message] of Object.entries(errorMappings)) {
    if (serverMessage?.toLowerCase().includes(key.replace('_', ' '))) {
      return message;
    }
  }
  
  // Fallback to server message or generic error
  return serverMessage || 'An unexpected error occurred. Please try again.';
};
```

### Task 5: Room ID Resolution Strategy
**Challenge**: Housekeeping endpoints need `room_id`, but UI components primarily work with `room_number`

**Solution**: Ensure room data includes `id` field from API responses

**Files to verify**:
- `RoomList.jsx` - API response includes `id` field
- `RoomDetails.jsx` - Merge logic preserves `id` from API room data
- `roomsStore.jsx` - Store maintains `id` field in room snapshots

### Task 6: Loading State Management  
**Strategy**: Show loading indicators until realtime confirmation arrives

**Implementation**:
```javascript
// Use loading states for user feedback
const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
const [isCheckingIn, setIsCheckingIn] = useState(false);
const [isCheckingOut, setIsCheckingOut] = useState(false);

// Disable buttons during operations
disabled={isUpdatingStatus || isCheckingIn || isCheckingOut}
```

**UX Consideration**: Loading states clear on API response, not waiting for realtime event to avoid indefinite spinners if event is delayed.

## Success Criteria

### ✅ Endpoint Compliance
- [ ] All room operations use canonical backend endpoints
- [ ] No calls to invalid `/rooms/{room_number}/status/` endpoint
- [ ] Proper parameter mapping (room_id vs room_number)

### ✅ Realtime-Only Architecture  
- [ ] No optimistic UI updates in any component
- [ ] All room state changes arrive via `room_updated` events
- [ ] API responses used only for success/error feedback
- [ ] roomsStore remains single source of truth

### ✅ User Experience
- [ ] Room status changes appear instantly via realtime
- [ ] Clear success/error feedback via toast notifications
- [ ] Loading states during API calls
- [ ] Context-appropriate actions based on room status

### ✅ Error Handling
- [ ] User-friendly error messages for common failures
- [ ] Graceful degradation when API calls fail
- [ ] No broken UI states from failed operations

## Technical Integration Points

### Existing Realtime Infrastructure (COMPLETE ✅)
- `roomsStore.jsx` - State management and event processing
- `RealtimeProvider.jsx` - Provider chain integration  
- `eventBus.js` - Event routing to roomsStore
- `channelRegistry.js` - Channel subscription to `{hotel_slug}.rooms`

### Required New Components
- `roomOperations.js` - Centralized API functions
- `errorHandling.js` - Error message utilities
- Updated room components with canonical endpoint integration

## Testing Strategy

### Unit Testing
- [ ] API functions call correct endpoints with proper parameters
- [ ] Error handling returns appropriate user messages
- [ ] Loading states update correctly during operations

### Integration Testing  
- [ ] Room actions trigger correct API calls
- [ ] Success responses show appropriate toasts
- [ ] Error responses display user-friendly messages
- [ ] Realtime events update UI after operations

### End-to-End Testing
- [ ] Complete room status workflows via UI
- [ ] Multi-user scenarios with concurrent room operations
- [ ] Network failure recovery and retry behavior

---

## Implementation Sequence

### Phase 1: Foundation
1. Create `roomOperations.js` API module
2. Create `errorHandling.js` utilities
3. Update `RoomDetails.jsx` with canonical endpoints

### Phase 2: Quick Actions
1. Update `RoomCard.jsx` with turnover actions
2. Remove generic status dropdown from cards
3. Test turnover workflow end-to-end

### Phase 3: Validation & Polish
1. Verify room ID resolution works correctly
2. Test error scenarios and user feedback
3. Validate realtime reconciliation timing

---

**READY FOR IMPLEMENTATION** ✅

This plan establishes the canonical room operations architecture with realtime-only state management. All technical decisions are locked and implementation can proceed with confidence in the architectural approach.