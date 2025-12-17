# Staff Booking Room Assignment + Check-In Implementation Plan

**STATUS: SOURCE OF TRUTH**  
**DATE: December 16, 2025**

## Overview

Extend the existing staff booking system by adding Room Assignment and Check-In capabilities to the current BookingDetailModal. This implementation follows a backend-driven approach with zero legacy code dependencies.

## Hard Bans (Must Obey)

❌ **Do NOT:**
- Import or call any legacy booking API helpers (anything not under current staff namespace path)
- Use old endpoint shapes:
  - `/api/staff/hotels/...` (plural)
  - `/api/staff/.../bookings/...` (non room-bookings)
- Compute availability, readiness, or overlap client-side (no filtering rooms)
- Gate actions using status alone. Only use `booking.flags`
- Reuse old booking detail payload fields (no `guest{}` old shapes). Use canonical objects

✅ **Must Use:**
- Only `/api/staff/hotel/{slug}/room-bookings/...` endpoints as shown by show_urls
- Backend-provided flags for all UI state decisions
- Canonical serializer objects

## Backend Endpoints (Canonical)

All endpoints are staff-only and hotel-scoped:

### 1. Get Booking Detail (Already Used)
```
GET /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/
```

Returns `StaffRoomBookingDetailSerializer` with:
- `party` (primary + companions)
- `in_house`
- `room`
- `flags`
- `status`, `checked_in_at`, `checked_out_at`

**Use as single source of truth for UI state.**

### 2. Get Available Rooms for Assignment
```
GET /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/available-rooms/
```

Returns list of rooms that:
- Are same hotel
- Match booking room_type
- Are bookable (backend-checked)
- Have no overlapping bookings

**Frontend MUST NOT filter this list.**

### 3. Assign / Reassign Room
```
POST /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/safe-assign-room/
```

Body:
```json
{
  "room_id": number,
  "notes": string (optional)
}
```

Returns updated booking detail or structured error:
- `ROOM_OVERLAP_CONFLICT`
- `ROOM_NOT_BOOKABLE`
- `BOOKING_ALREADY_CHECKED_IN`
- `ROOM_TYPE_MISMATCH`

### 4. Unassign Room (Before Check-in Only)
```
POST /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/unassign-room/
```

### 5. Check-in Booking (NEW CORE ACTION)
```
POST /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/check-in/
```

Backend will:
- Validate readiness
- Create in-house Guest records
- Mark room occupied
- Set `checked_in_at`

If backend rejects → show error toast.

## Implementation Steps

### Step 1: Hook Rebuild (No Legacy)

**File:** `hotelmate-frontend/src/hooks/useStaffBookings.js`

Implement only these API functions/mutations (new code, not adapted legacy):

```javascript
// API Functions
getBookingDetail(hotelSlug, bookingId)
fetchAvailableRooms(hotelSlug, bookingId)
safeAssignRoom(hotelSlug, bookingId, roomId, notes?)
unassignRoom(hotelSlug, bookingId)
checkInBooking(hotelSlug, bookingId)
```

#### Caching Strategy

✅ **Cache:**
```javascript
availableRoomsByBookingId[bookingId] = rooms
```

✅ **Invalidate cache on:**
- Assign success
- Unassign success
- Check-in success
- Modal close (optional)

✅ **Refetch after every successful mutation:**
- Booking detail query (always)
- Bookings list query (optional but recommended)

**No time-based cache expiration needed.** Room availability is too dynamic; instead, rely on explicit invalidation + "Reload rooms" button.

#### Query Keys & Refresh Mechanism

**Query Keys:**
```javascript
["staffBookingDetail", hotelSlug, bookingId]
["staffBookingsList", hotelSlug, filters]
```

**After assign/unassign/check-in:**
- Invalidate both keys (or call existing refresh function)
- This prevents "UI didn't update" bugs caused by stale caches

### Step 2: BookingDetailModal - Add Ops Panel (No Redesign)

**File:** `hotelmate-frontend/src/components/BookingDetailModal.jsx`

Add a right-side "Ops Panel" with 3 sections:

#### Section A: Guests (Party)

**Always display:**
- `party.primary`
- `party.companions`

**Editing rule:**
- If backend party write endpoints exist → allow companion edit
- Else → read-only + "Editing companions coming next phase"

⚠️ **No fake form fields that don't save**

#### Section B: Room Assignment

**Lazy load rooms** only when staff clicks "Load available rooms"

**Dropdown items** exactly as returned by backend `available-rooms` endpoint

**Room summary** uses only the fields currently present:
- `room_number`
- `is_occupied`
- `is_active`
- `is_out_of_order`

⚠️ **No `room_status` badge unless backend sends it**

**Disable assignment UI if:**
- `flags.is_checked_in === true`

**Include inline error message area** under the controls (in addition to toast).

#### Section C: Check-In

**Render button only if:**
- `flags.can_check_in === true`

**On click:**
1. POST check-in
2. Toast success/fail
3. Refetch booking detail on success

### Step 3: Defensive Rendering (No Silent Failures)

**If `booking.flags` missing:**
- Disable all actions (assign/unassign/check-in/party edit)
- Show message: "Booking data incomplete — refresh / contact dev"
- `console.warn` once

This prevents "UI works but backend broken" situations.

## Required Response Shapes (Minimal Contract)

**Lock the expected minimal response shapes to prevent frontend guessing:**

### booking.flags (Required Fields)
```javascript
{
  "is_checked_in": boolean,
  "can_check_in": boolean,
  "can_edit_party": boolean
}
```

### booking.party (Required Fields)
```javascript
{
  "primary": { /* guest object */ },
  "companions": [ /* array of guest objects */ ]
}
```

### available-rooms Items (Required Fields)
```javascript
[
  {
    "id": number,
    "room_number": string,
    // ... other fields as provided by backend
  }
]
```

**Implementation must be deterministic** - no guessing missing fields.

## UI State Rules (Backend-Driven)

Use ONLY backend flags:

**From `flags`:**
- `is_checked_in`
- `can_check_in`
- `can_check_out`
- `can_edit_party`

**From booking:**
- `status`
- `checked_in_at`
- `checked_out_at`

❌ **Do NOT infer state from status alone**  
❌ **Do NOT hide buttons by guessing**

## Required UI Sections

### 🔹 Section A — Guests (Booking Party)

Use `party` from backend:
- Show PRIMARY guest (read-only name)
- Show COMPANIONS (editable)
- Allow editing only if `flags.can_edit_party === true`

⚠️ Guest records (Guest) are NOT created yet. This is still pre-check-in.

### 🔹 Section B — Room Assignment

Use `room` + assignment endpoints.

**If `room === null`:**
- Show "Assign Room"
- Load rooms via `available-rooms` endpoint
- Dropdown + Assign button

**If room exists:**
- Show room number
- Status badges: `occupied`, `active / out_of_order`
- Buttons: Reassign (if not checked in), Unassign (if not checked in)
- Disable all assignment buttons if `flags.is_checked_in === true`

### 🔹 Section C — Check-In (PRIMARY ACTION)

Show Check-In button ONLY if:
- `flags.can_check_in === true`

When clicked:
1. POST to `/check-in/`
2. On success: refetch booking detail, show "Checked in successfully"
3. On failure: show backend error message

⚠️ **Do NOT create guests on frontend**  
⚠️ **Do NOT guess readiness**  
Backend decides everything.

## Error Handling Strategy

### Toast Messages (Primary)
- All success/error notifications
- Immediate attention for staff

### Inline Messages (Persistent Context)
- Under room assignment controls
- Show backend error messages for:
  - `ROOM_OVERLAP_CONFLICT`
  - `ROOM_NOT_BOOKABLE`
  - `ROOM_TYPE_MISMATCH`
  - `BOOKING_ALREADY_CHECKED_IN`

Keep both; don't choose one.

## Acceptance Criteria

✅ **Staff can:**
- Open booking
- Edit party (pre-check-in) *if endpoints exist*
- Assign / reassign / unassign room
- Check in booking

✅ **All booking ops calls hit only:**
- `/api/staff/hotel/{slug}/room-bookings/...`
- No old endpoints, no old response shapes

✅ **Frontend never:**
- Assigns dirty rooms
- Double-books
- Creates guests
- Checks in without backend approval
- Uses frontend availability logic
- Gates actions except via `booking.flags`

✅ **After assign/unassign/check-in:**
- Booking detail visibly updates via refetch
- Available rooms cache invalidated
- Success/error feedback provided

## Final Rules

1. **Backend decides. Frontend reflects.**
2. **If backend says no — frontend says no.**
3. **No legacy code dependencies.**
4. **No silent failures — defensive rendering always.**
5. **Cache invalidation over time-based expiration.**

---

*This document serves as the source of truth for implementation. Any deviations must be documented and approved.*