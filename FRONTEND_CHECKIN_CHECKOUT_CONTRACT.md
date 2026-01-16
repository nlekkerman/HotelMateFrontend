# Frontend Contract Check: Check-in/Check-out → Rooms + Bookings Realtime

**Architecture Status**: Ready for realtime-first check-in/check-out implementation with minimal gaps

---

## 1. UI Screens That Must Update Instantly After Check-in/out

### Current Screen Inventory:

| Screen | Path | Store Dependency | Update Pattern |
|--------|------|------------------|----------------|
| **Rooms List** | `/housekeeping` | `roomsStore` ✅ | Realtime via `room_updated`/`room_status_changed` |
| **Room Details** | `/rooms/:roomNumber` | `roomsStore` ✅ | Realtime via `room_updated`/`room_status_changed` |
| **Housekeeping Dashboard** | `/housekeeping` | `roomsStore` ✅ | Realtime via `room_updated`/`room_status_changed` |
| **Housekeeping Room Details** | `/housekeeping/:roomNumber` | `roomsStore` ✅ | Realtime via `room_updated`/`room_status_changed` |
| **Booking List** | `/bookings` | `roomBookingStore` ✅ | Realtime via `booking_checked_in`/`booking_checked_out` |
| **Booking Details Modal** | `BookingDetailsModal` | `roomBookingStore` ✅ | Realtime via `booking_checked_in`/`booking_checked_out` |
| **Guest Booking Status** | `/booking-status/:bookingId` | Local state + Pusher ⚠️ | Custom Pusher channel `guest-booking-checked-in` |

### ⚠️ **Coupling Issues Found**:
- Guest booking status page uses **direct Pusher channels** instead of canonical stores
- Some room components may read booking data directly from `roomsStore.guests_in_room` field (check coupling)

---

## 2. Store Architecture & Source of Truth

### Canonical Store Mapping:

| Domain | Store | Source of Truth | Key Fields |
|--------|-------|----------------|------------|
| **Rooms** | `roomsStore` ✅ **CANONICAL** | `byRoomNumber[room_number]` | `room_status`, `is_occupied`, `guests_in_room`, `maintenance_required` |
| **Bookings** | `roomBookingStore` ✅ **CANONICAL** | `byBookingId[booking_id]` | `status`, `checked_in_at`, `checked_out_at`, `assigned_room_number` |
| **Guests/Party** | Derived from `roomBookingStore` ✅ | `booking.party`, `booking.guest_name` | Party info is booking domain data |
| **Housekeeping** | `housekeepingStore` ⚠️ | **COMPUTED** from `roomsStore` | Dashboard counts only, no primary data |

### ✅ **Correct Architecture**:
- `roomsStore` owns room state (`room_status`, `is_occupied`)  
- `roomBookingStore` owns booking state (`checked_in_at`, `checked_out_at`, `assigned_room_number`)
- No cross-store data pollution detected

### ⚠️ **Potential Coupling**:
- Check if any screens read `roomsStore.guests_in_room` - this should come from `roomBookingStore`
- Guest booking status page bypasses stores entirely

---

## 3. Current Realtime Event Subscriptions

### Active Channel Subscriptions (from `channelRegistry.js`):
```javascript
// Core hotel channels (staff app)
`${hotelSlug}.rooms`                    // → room_updated, room_status_changed  
`${hotelSlug}.room-bookings`            // → booking_checked_in, booking_checked_out
`${hotelSlug}-guest-messages`           // → new-guest-message  
`${hotelSlug}.staff-${staffId}-notifications` // → personal staff events
```

### Event Bus Routing (from `eventBus.js`):
```javascript
// Rooms events
"rooms" → roomsActions.handleEvent()
  - room_updated                     ✅ IMPLEMENTED
  - room_status_changed              ✅ IMPLEMENTED
  
// Booking events  
"room_booking" → roomBookingActions.handleEvent()
  - booking_checked_in               ✅ IMPLEMENTED
  - booking_checked_out              ✅ IMPLEMENTED
  - booking_created, booking_updated ✅ IMPLEMENTED
```

### ✅ **Deduplication**:
- Global `meta.event_id` deduplication implemented
- LRU cleanup (1000 event limit)

### ⚠️ **Guest Booking Channel Gap**:
```javascript
// Guest-facing channels (bypasses eventBus)
channel.bind("guest-booking-checked-in", function(data) { ... })
channel.bind("guest-booking-checked-out", function(data) { ... })
```
**Issue**: Guest booking page doesn't use canonical stores

---

## 4. Proposed Check-in/out UX Flow

### ✅ **Current Implementation Pattern** (from `BookingDetailsModal.jsx`):
```javascript
// NO optimistic updates ✅
const handleCheckIn = async () => {
  try {
    await checkInMutation.mutateAsync({ bookingId, roomNumber });
    toast.success('Checking in...');  
    // ✅ UI updates only when realtime event arrives
  } catch (error) {
    toast.error('Check-in failed');
  }
};
```

### ✅ **Canonical UX Flow**:
1. **User clicks check-in/out button**
2. **API call** → `POST /staff/hotel/{slug}/room-bookings/{id}/check-in/`
3. **Button disabled** + **spinner** while request in flight  
4. **Toast**: "Processing check-in... waiting for confirmation"
5. **Backend processes** → triggers realtime events
6. **Frontend receives** → `booking_checked_in` + `room_updated` events
7. **UI updates** → room status changes, booking status updates
8. **Toast**: "✅ Check-in completed"

### ⚠️ **Missing Button Implementations**:
- Room-centric check-out button exists (`RoomDetails.jsx`, `HousekeepingRoomDetails.jsx`)  
- Booking-centric check-in button exists (`BookingDetailsModal.jsx`)
- **Need**: Booking-centric check-out button

---

## 5. Required Backend Event Payload Structure

### **Room Events** (via `${hotelSlug}.rooms`):
```javascript
// room_updated event
{
  category: "rooms",
  type: "room_updated", 
  payload: {
    room_number: "101",           // REQUIRED - Store key
    room_status: "OCCUPIED",      // REQUIRED  
    is_occupied: true,            // REQUIRED
    guests_in_room: ["John Doe"], // OPTIONAL - Guest context
    maintenance_required: false,   // OPTIONAL
    is_out_of_order: false,      // OPTIONAL
    last_status_change: "2025-01-16T10:30:00Z"
  },
  meta: {
    event_id: "evt_123",          // REQUIRED - Deduplication
    scope: { room_number: "101" }
  }
}

// room_status_changed event  
{
  category: "rooms",
  type: "room_status_changed",
  payload: {
    room_number: "101",           // REQUIRED
    to_status: "CHECKOUT_DIRTY",  // REQUIRED
    is_occupied: false,           // OPTIONAL
    timestamp: "2025-01-16T10:30:00Z"
  }
}
```

### **Booking Events** (via `${hotelSlug}.room-bookings`):
```javascript  
// booking_checked_in event
{
  category: "room_booking", 
  type: "booking_checked_in",
  payload: {
    booking_id: "BK-2025-001",         // REQUIRED - Store key
    status: "IN_HOUSE",                // REQUIRED
    assigned_room_number: "101",       // REQUIRED  
    checked_in_at: "2025-01-16T10:30:00Z", // REQUIRED
    guest_name: "John Doe",            // REQUIRED
    party: [...],                      // OPTIONAL - Full party details
  },
  meta: {
    event_id: "evt_124"                // REQUIRED
  }
}

// booking_checked_out event
{
  category: "room_booking",
  type: "booking_checked_out", 
  payload: {
    booking_id: "BK-2025-001",        // REQUIRED
    status: "COMPLETED",              // REQUIRED  
    checked_out_at: "2025-01-16T15:30:00Z", // REQUIRED
    assigned_room_number: "101"       // REQUIRED (for context)
  }
}
```

---

## 6. Event Reconciliation Strategy

### **Expected Event Sequence**:
```
CHECK-IN:
1. booking_checked_in    (booking → IN_HOUSE)
2. room_updated          (room → OCCUPIED, is_occupied: true)

CHECK-OUT:  
1. booking_checked_out   (booking → COMPLETED)
2. room_status_changed   (room → CHECKOUT_DIRTY, is_occupied: false)
```

### ✅ **Out-of-Order Safety**:
- Both stores are **independent** with separate keys (`room_number` vs `booking_id`)
- No cross-store dependencies
- Event deduplication via `meta.event_id` handles replays

### **UI Consistency**:
- Both events should arrive **within 2-3 seconds**
- If only one event arrives, UI shows **partial state** (acceptable)
- User can **refresh** if events seem stuck

---

## 7. Acceptance Test Checklist

### **Check-in Test** ✅:
- [ ] **Room becomes OCCUPIED** in rooms list/details  
- [ ] **`is_occupied: true`** in room data
- [ ] **Booking becomes IN_HOUSE** in booking list
- [ ] **`checked_in_at` timestamp** set in booking
- [ ] **Guest appears in room context** (if `guests_in_room` provided)
- [ ] **Housekeeping dashboard counts** update automatically
- [ ] **All without page refresh**

### **Check-out Test** ✅:
- [ ] **Room becomes CHECKOUT_DIRTY** in rooms list/details
- [ ] **`is_occupied: false`** in room data  
- [ ] **Booking becomes COMPLETED** in booking list
- [ ] **`checked_out_at` timestamp** set in booking
- [ ] **Guest removed from room context**
- [ ] **Housekeeping status** moves to dirty queue
- [ ] **All without page refresh**

---

## Frontend Deliverables Summary

### ✅ **Already Implemented**:
- `roomsStore` as canonical room truth
- `roomBookingStore` as canonical booking truth  
- Realtime event routing via `eventBus.js`
- Room-centric check-out buttons with realtime-only updates
- Booking-centric check-in button with realtime-only updates

### ⚠️ **Implementation Gaps**:
1. **Guest booking status page** needs to use canonical stores instead of direct Pusher
2. **Booking-centric check-out button** missing (only room-centric exists)
3. **Event payload validation** - ensure backend sends all required fields

### 🔧 **Recommended Fixes**:

#### 1. Standardize Guest Booking Status Page
```javascript
// Replace direct Pusher with store consumption
const { booking } = useRoomBookingState(); // ← Use canonical store
// Remove: channel.bind("guest-booking-checked-in", ...)
```

#### 2. Add Booking Check-out Button
```javascript
// In BookingDetailsModal.jsx - add check-out action
const handleCheckOut = async () => {
  await checkOutMutation.mutateAsync({ bookingId });
  toast.success('Processing check-out...');
};
```

#### 3. Backend Event Contract
```javascript
// Ensure backend always sends these fields:
room_updated: { room_number, room_status, is_occupied }
booking_checked_in: { booking_id, status, assigned_room_number, checked_in_at }  
booking_checked_out: { booking_id, status, checked_out_at }
```

---

## Conclusion

**Frontend is 90% ready** for realtime check-in/out with proper single-source architecture. Main gaps are minor UX inconsistencies and one guest page that bypasses the canonical stores.

**Estimated effort**: 2-3 hours to close gaps + test end-to-end realtime flow.