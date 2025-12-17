# FRONTEND BOOKING PAYLOAD — PARTY CANONICAL CONTRACT

**Status**: Canonical  
**Backend Ready**: ✅  
**Frontend Migration**: Phase 4C

**Frontend Contract**: Guest identity and guest count must be derived from booking.party only. All legacy guest fields removed by serializer refactor must not be referenced anywhere in frontend code.

## 🎯 Objective

Refactor the React frontend to align with the backend canonical booking payload where:

```
RoomBooking.party
```

is the single source of truth for:
- guest identity
- guest counts  
- party completeness

## 🧱 Canonical Data Contract

```javascript
party: {
  primary: {
    id,
    role,
    first_name,
    last_name,
    full_name,
    email,
    phone,
    is_staying
  } | null,
  companions: BookingGuest[],
  total_count: number
}
```

### Removed / Invalid Fields

Frontend must never use:
- `primary_guest`
- `guest_name`
- `primary_guest_name`
- `.adults`
- `.children`
- `total_party_size`

## 🔍 Search & Destroy Checklist

**Explicit repo-wide search required for these strings and delete/replace all usages:**

- [ ] `primary_guest`
- [ ] `guest_name`
- [ ] `primary_guest_name`
- [ ] `.adults`
- [ ] `.children`  
- [ ] `total_party_size`

## 🛠️ Implementation Steps

### 1) Core booking hooks

**Files:**
- `useBookings.js`
- `useBookingDetails.js`

**Rules:**
- Do NOT expose `guest_name`
- Expose raw `party`
- Guest count = `party.total_count`
- Hooks must return null-safe data

### 2) Staff booking UI

**Files:**
- `BookingTable.jsx`
- `BookingDetailsModal.jsx`

**Rules:**
- Display name derived inline using consistent UI label strategy
- Guest count: `booking.party?.total_count ?? 0`
- Never assume `party.primary` exists

### 3) In-house guest logic

**Files:**
- `GuestList.jsx`
- any in-house related components

**Rule:**
```javascript
const inHouse = booking.checked_in_at ? booking.in_house : null;
```
Never render in-house guests if not checked in.

### 4) Guest-facing booking flow

**Files:**
- `GuestRoomBookingPage.jsx`
- `BookingConfirmation.jsx`
- `BookingPaymentSuccess.jsx`

**Rules:**
- Remove all usage of `adults` / `children`
- Use `party.total_count` for display only
- Party data may be incomplete → UI must tolerate it

## 🏷️ Consistent UI Label Strategy

**All components must use this exact fallback pattern:**

```javascript
const displayName = booking.party?.primary?.full_name ?? 
  (booking.party?.primary?.first_name && booking.party?.primary?.last_name 
    ? `${booking.party.primary.first_name} ${booking.party.primary.last_name}` 
    : "Primary guest missing");
```

No component should invent its own variant.

## 💬 Chat System (Explicitly Deferred)

- Chat components may still reference legacy guest name logic
- Do NOT refactor chat in this phase
- If needed, add local adapters inside chat only
- No shared utilities reintroducing `guest_name`

## 🛡️ Safety Rules

- `party.primary` may be null
- `party.total_count` may be 0
- UI must not crash in either case
- No derived guest fields stored globally

## ✅ Success Criteria

- Frontend compiles with zero references to removed fields
- Booking list & detail screens render correctly  
- Precheckin + staff flows behave correctly
- No duplicate guest representations exist in state or props