# Staff Room Bookings Source of Truth

Single source of truth for Staff Room Bookings frontend implementation, aligned to verified backend behavior. No backend changes allowed.

## Scope

Components and files in scope for this implementation:

- `src/components/staff/bookings/BookingTable.jsx` - List table with Party column
- `src/components/staff/bookings/BookingDetailsModal.jsx` - Detail modal with party info and pre-check-in link
- `src/hooks/useStaffRoomBookingDetail.js` - Detail hook with send pre-check-in link mutation
- `src/pages/staff/BookingManagement.css` - Minimal styling additions

## Canonical Data Model (Frontend View)

### List Response (Variable Fields)
```javascript
{
  booking_id: "BK-2025-0003",    // BK string ID (required)
  adults: 2,                     // (required for fallback)
  children: 1,                   // (required for fallback)
  // Optional party fields (may not be present):
  party_complete?: boolean,
  party_missing_count?: integer,
  party?: { total_party_size: 3 }
  // ... other booking fields
}
```

**Critical Rule**: List payload may NOT include party fields. Frontend must not assume they exist.

### Detail Response (Expected Fields)
```javascript
{
  booking_id: "BK-2025-0003",           // BK string ID (always present)
  party: {                             // (expected in detail, but handle null)
    primary: { first_name, last_name, full_name, email, phone },
    companions: [{ first_name, last_name, full_name }],
    total_party_size: 3
  },
  party_complete: false,               // (expected, fallback to false)
  party_missing_count: 2,              // (expected, fallback to 0)
  primary_first_name: "John",          // (fallback fields)
  primary_last_name: "Doe",
  booker_first_name?: "Jane",          // (optional booker)
  booker_last_name?: "Smith",
  booker_email?: "jane@example.com",
  // ... other booking fields
}
```

**Defensive Rule**: Modal must not crash if `party.primary` is null/missing. Show "Not provided yet" fallback.

## Canonical Endpoints

### Staff Bookings List
```
GET /api/staff/hotel/{hotel_slug}/room-bookings/
```

**Step 0** is NOT to confirm the endpoint exists. Step 0 is to confirm whether BookingManagement currently uses:
- `/room-bookings/` (standard list), or  
- `/room-bookings/safe/` (assignment-focused list)

and ensure query keys match whichever is used.

### Enhanced Staff Bookings List (Safe)
```
GET /api/staff/hotel/{hotel_slug}/room-bookings/safe/
```
**Note**: BookingManagement may use this endpoint for assignment-focused filters. If the UI uses it, list query keys must match it.

### Available Rooms (for assignment)
```
GET /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/available-rooms/
```

### Safe Assign Room (preferred assignment endpoint)
```
POST /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/safe-assign-room/
```
**Note**: This endpoint enforces party completeness and may return `{ code: "PARTY_INCOMPLETE" }`.

### Unassign Room
```
POST /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/unassign-room/
```

### Party Management (staff) - Future-Proof
```
GET /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/party/
POST /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/party/companions/
```
**Note**: Not required for this phase.

### Staff Booking Detail
```
GET /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/
```

### Send Pre-Check-In Link
```
POST /api/staff/hotel/{hotel_slug}/room-bookings/{booking_id}/send-precheckin-link/
```

**Response**: `{ sent_to: "email@example.com", expires_at: "...", booking_id: "BK-..." }`

### BK ID Rule
- All `booking_id` values are BK strings (e.g., "BK-2025-0003")
- Use `booking_id` field everywhere, not numeric `id`
- URL paths use `{booking_id}` parameter with BK string

## UI Rules

### Table Party Column
- **If list includes `party_complete` field**:
  - `party_complete === true` → Green "Complete" badge
  - `party_complete === false` → Yellow "Missing {party_missing_count}" badge
- **If list does NOT include party fields**:
  - Neutral "Details" badge (truth lives in detail modal)

### Guests Column Precedence
1. **Primary**: Use `party.total_party_size` if available in list response
2. **Fallback**: Use `adults + children` calculation
3. **Never guess**: Don't calculate totals if party object exists but total_party_size missing
4. **Missing total display**: If `party` exists but `total_party_size` missing → show "—" or "Unknown" (do not fallback to adults+children)

### Modal Party Rendering Structure
1. **Party Status Banner** (top of modal body)
   - **Placement**: Render as `<Alert>` at top of modal body, above all Guest/Party blocks
   - If `party_complete === false`: Warning "Missing {party_missing_count} guest name(s). Request guest details."
   - If `party_complete === true`: Success message or omit banner
2. **Primary Guest Block**
   - Use `party.primary` fields (first_name, last_name, full_name, email, phone)
   - Fallback to `primary_first_name` / `primary_last_name` if party.primary missing
3. **Booker Block** (only if booker fields present)
   - Display `booker_*` fields when available
4. **Companions Block**
   - List `party.companions[]` with names only

### Button Placement
- **"Request guest details"**: Near Party Status Banner (contextual to the problem)
- **"Assign room"**: Keep in existing modal footer location

## UI Gating Rules

### Room Assignment Blocking
- **Disable** "Assign room" and "Confirm & assign" buttons when `party_complete === false`
- **Tooltip text**: "Missing {party_missing_count} guest name(s). Send pre-check-in link first."
- **Visual state**: Button disabled with muted styling
- **Mutation rule**: Room assignment mutation must call `safe-assign-room/` (not `assign-room/`) unless existing UI is proven to use `assign-room/`

### Pre-Check-In Link Button
- **Always available** regardless of party status
- **Disabled state**: Show spinner and disable during API call
- **Button text**: "Request guest details"

## Error Handling Rules

### Party Incomplete Backend Error
- **Error code**: `{ code: "PARTY_INCOMPLETE" }`
- **Action**: Show error toast, keep modal open, don't proceed with assignment
- **Toast message**: "Cannot assign room. Missing guest information. Send pre-check-in link first."

### Send Link Success/Failure
- **Success toast**: "Pre-check-in link sent to {sent_to}" (use response.sent_to field)
- **Failure toast**: "Failed to send pre-check-in link. Please try again."
- **Loading state**: Disable button with spinner during mutation

### TanStack Query Integration
- **Detail query key**: `["staff-room-booking", hotelSlug, bookingId]`
- **List query key**: `["staff-room-bookings", hotelSlug, filtersHash]`
- **Safe list query key** (if used): `["staff-room-bookings-safe", hotelSlug, filtersHash]`
- **Available rooms query key**: `["staff-available-rooms", hotelSlug, bookingId]`
- **After send link success**: Invalidate detail query (and optionally list if it contains party fields)
- **After successful assign/unassign**:
  - Invalidate detail key: `["staff-room-booking", hotelSlug, bookingId]`
  - Invalidate available rooms key: `["staff-available-rooms", hotelSlug, bookingId]`
  - Invalidate list key used by the page (standard or safe list)
- Use existing patterns for cache invalidation
- Follow existing error handling patterns in hooks

## Implementation Checklist

- [ ] Investigate list vs detail payload structure (Step 0)
- [ ] Add Party column to BookingTable.jsx with conditional logic
- [ ] Fix Guests column precedence in BookingTable.jsx
- [ ] Refactor party rendering in BookingDetailsModal.jsx (4 sections)
- [ ] Add party status banner to BookingDetailsModal.jsx
- [ ] Create useSendPrecheckinLink mutation in useStaffRoomBookingDetail.js
- [ ] Add "Request guest details" button to modal
- [ ] Implement room assignment gating (disable buttons)
- [ ] Add tooltip for disabled assign buttons
- [ ] Handle PARTY_INCOMPLETE error in room assignment
- [ ] Add success/failure toasts for send link
- [ ] Add minimal CSS for party badges and disabled states
- [ ] Test with bookings having incomplete parties
- [ ] Test with bookings having complete parties
- [ ] Verify BK string IDs used throughout

## UI Enhancement Rules

### Staff-Friendly Micro-UX
- **Primary CTA**: If party incomplete, show single prominent "Request guest details" button next to warning banner
- **Inline Confirmation**: After sending link, show inline confirmation "Link sent to {sent_to}, expires at {expires_at}" using response fields
- **Table Row Indicators**: Add subtle icon/badge in table if party incomplete (only if list payload supports `party_complete` field)

## Non-Goals

- Guest pre-check-in page implementation (out of scope)
- Backend serializer changes (forbidden)
- Complete UI redesign (preserve existing patterns)
- Guest-facing functionality (staff-only scope)