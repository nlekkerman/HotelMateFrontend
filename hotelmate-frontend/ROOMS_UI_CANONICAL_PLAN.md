# HotelMate Frontend Rooms UI — Canonical Implementation Plan (Dec 2025)

## 1. Realtime is the Source of Truth

- **roomsStore** remains the live operational state for all room data:
  - `room_status`
  - `is_occupied`
  - `maintenance_required`
  - `is_out_of_order`
- All staff actions (status change, check-in/out, maintenance, etc.) update backend, which emits `room_updated` events.
- All open RoomList and RoomDetails views update instantly via Pusher.
- No polling. No manual refresh. No refetch-on-every-realtime-tick. Initial fetch remains; optional fallback refetch after mutations is allowed.

## 2. What to Remove

- ❌ QR printing (all code, hooks, and UI)
- ❌ Bulk checkout checkboxes and selection logic (RoomList, RoomCard, CheckoutRoomsPanel, CheckoutRooms.jsx)
- ❌ Legacy checkout flows (CheckoutRooms.jsx, related routes/imports)
- ❌ Refetch-on-every-realtime-tick in RoomDetails (remove `[roomNumber, realtimeRoom]` dependency; use `[roomNumber]` only)

## 3. What to Keep and Implement

- ✅ RoomList renders from `roomsStore` (live, instant updates)
- ✅ RoomCard shows live status badges and quick status buttons:
  - If `CHECKOUT_DIRTY` → “Start Cleaning” (sets status: `CLEANING_IN_PROGRESS`)
  - If `CLEANED_UNINSPECTED` → “Mark Ready” (sets status: `READY_FOR_GUEST`)
  - If `maintenance_required` → “View Maintenance” (navigates to details)
  - All buttons call: `POST /staff/hotel/{hotelSlug}/rooms/{roomNumber}/status/` with correct `to_status` value (see above)
  - All buttons use `e.stopPropagation()` to prevent navigation
  - Quick actions are role-gated (housekeeping/admin only). Regular front desk sees badges + “Open details”.
- ✅ RoomDetails:
  - Fetches once on mount (`[roomNumber]` dependency)
  - Merges realtime snapshot in a separate effect
  - Shows checkout/check-in buttons (with confirm modal) — details-only, not in list
  - If check-in is blocked because room not ready, show a clear reason in RoomDetails.
  - All status/ops actions use staff endpoints and show toast/alert on success
- ✅ No manual mutation of list after actions; rely on realtime update and fallback refetch if needed

## 4. Bulk Replace Dispatch Fix

- On RoomList fetch success, always update store via:
  - `roomsDispatch({ type: "ROOM_BULK_REPLACE", payload: data.results })`
  - or, if using actions: `roomsActions.bulkReplace(roomsDispatch, data.results)`
- Never call `roomsActions.bulkReplace(data.results)` without dispatch.

## 5. UI/UX Rules

- RoomList: Add ops header (search, status filter, live indicator)
- RoomCard: Remove checkout checkbox, keep and implement status quick actions
- RoomDetails: Add Room Operations panel (status change, maintenance, out-of-order, checkout/check-in)
- All actions: Use canonical staff endpoints, show success/failure feedback, rely on realtime for UI update

---

**WAIT for your cue to begin real implementation.** This plan is now the single source of truth for the HotelMate frontend rooms UI update.
