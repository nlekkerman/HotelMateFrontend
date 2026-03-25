# HotelMate Frontend — Realtime Channel & Event Alignment Audit

**Date:** 2025-03-25  
**Scope:** Pusher subscriptions, event bindings, eventBus routing, realtime stores  
**Method:** Read-only code audit against backend realtime contract  

---

## A. Channel Coverage Table

| Backend Channel | Subscribed in Frontend? | File | Status | Notes |
|---|---|---|---|---|
| `{hotel_slug}.room-bookings` | Yes | `src/realtime/channelRegistry.js` L63–65 | ✅ Fully subscribed | `bind_global()` routes all events to eventBus → roomBookingStore |
| `{hotel_slug}-staff-bookings` | **No** | — | ❌ **NOT SUBSCRIBED** | Backend emits on this channel; frontend never subscribes. **CRITICAL GAP.** |
| `{hotel_slug}-staff-overstays` | **No** | — | ❌ **NOT SUBSCRIBED** | Backend emits overstay events on dedicated channel; frontend never subscribes. Overstay events are only handled if they arrive on `.room-bookings`. **CRITICAL GAP.** |
| `{hotel_slug}.rooms` | Yes | `src/realtime/channelRegistry.js` L68–70 | ✅ Fully subscribed | `bind_global()` routes to eventBus; raw `room-status-changed` and `room-occupancy-updated` normalized in eventBus |
| `private-guest-booking.{booking_id}` | **No** | — | ❌ **NOT SUBSCRIBED** | Backend guest channel pattern `private-guest-booking.{booking_id}` is never subscribed. Frontend uses a **different** pattern: `private-hotel-{hotelSlug}-guest-chat-booking-{bookingId}` for guest chat only. See Section H. |

### Additional Channels Subscribed (Not in Backend Booking Contract)

| Frontend Channel | File | Purpose |
|---|---|---|
| `{hotelSlug}.attendance` | `channelRegistry.js` L38–40 | Staff clock/duty status |
| `{hotelSlug}.room-service` | `channelRegistry.js` L43–45 | Room service orders |
| `{hotelSlug}.booking` | `channelRegistry.js` L58–60 | Service bookings (restaurant/porter/trips) |
| `{hotelSlug}-guest-messages` | `channelRegistry.js` L73–75 | Hotel-wide guest message notifications |
| `{hotelSlug}.staff-{staffId}-notifications` | `channelRegistry.js` L92–94 | Personal staff notifications |
| `{hotelSlug}.staff-chat.{conversationId}` | `channelRegistry.js` L159+ | Dynamic per-conversation staff chat |
| `private-hotel-{hotelSlug}-guest-chat-booking-{bookingId}` | `channelRegistry.js` L318+ | Guest chat (staff & guest side) |

---

## B. Event Coverage Table

### Booking Events (on `{hotel_slug}.room-bookings`)

| Backend Event | Handled in Frontend? | Location | Status | Action Taken |
|---|---|---|---|---|
| `booking_created` | Yes | `roomBookingStore.jsx` L243 | ✅ | Dispatch `ROOM_BOOKING_CREATED`, toast, invalidate React Query |
| `booking_updated` | Yes | `roomBookingStore.jsx` L276 | ✅ | Dispatch `ROOM_BOOKING_UPDATED`, invalidate React Query |
| `booking_confirmed` | Yes | `roomBookingStore.jsx` L263 | ✅ | Dispatch `ROOM_BOOKING_UPDATED` with status `CONFIRMED` |
| `booking_cancelled` | Yes | `roomBookingStore.jsx` L289 | ✅ | Dispatch `ROOM_BOOKING_CANCELLED`, toast |
| `booking_checked_in` | Yes | `roomBookingStore.jsx` L296 | ✅ | Dispatch `ROOM_BOOKING_CHECKED_IN`, invalidate React Query |
| `booking_checked_out` | Yes | `roomBookingStore.jsx` L303 | ✅ | Dispatch `ROOM_BOOKING_CHECKED_OUT`, invalidate React Query |
| `booking_party_updated` | Yes | `roomBookingStore.jsx` L282 | ✅ | Dispatch `ROOM_BOOKING_PARTY_UPDATED` |
| `booking_payment_required` | Yes | `roomBookingStore.jsx` L250 | ✅ | Dispatch `ROOM_BOOKING_UPDATED` with status `PAYMENT_REQUIRED` |

### Overstay Events (backend channel: `{hotel_slug}-staff-overstays`)

| Backend Event | Handled in Frontend? | Location | Status | Notes |
|---|---|---|---|---|
| `booking_overstay_flagged` | ⚠️ Partially | `roomBookingStore.jsx` L322 | ⚠️ **Channel mismatch** | Handler exists in roomBookingStore, but backend sends on `{hotel_slug}-staff-overstays` which is **never subscribed**. Will only work if backend also sends on `.room-bookings`. |
| `booking_overstay_acknowledged` | ⚠️ Partially | `roomBookingStore.jsx` L328 | ⚠️ **Channel mismatch** | Same issue: handler exists, but dedicated channel not subscribed. |
| `booking_overstay_extended` | ⚠️ Partially | `roomBookingStore.jsx` L334 | ⚠️ **Channel mismatch** | Same issue. |

### Room Events (on `{hotel_slug}.rooms`)

| Backend Event | Handled in Frontend? | Location | Status | Notes |
|---|---|---|---|---|
| `room_occupancy_updated` | ⚠️ Name mismatch | `eventBus.js` L358 | ⚠️ **Event name mismatch** | Backend emits `room_occupancy_updated` (underscores). Frontend listens for `room-occupancy-updated` (hyphens). Will **NOT** match if backend uses underscores. If backend sends with hyphens, it works — mapped to `room_updated` type in roomsStore. |
| `room_updated` | ⚠️ Indirect only | `roomsStore.jsx` L234 | ⚠️ | `room_updated` is handled in roomsStore, but raw Pusher events go through eventBus normalization. The eventBus only has explicit handlers for `room-status-changed` and `room-occupancy-updated`. A raw `room_updated` event from Pusher would only be handled if the backend sends it in normalized `{category, type, payload}` format. |

---

## C. Missing Channels (CRITICAL)

### 1. `{hotel_slug}-staff-bookings` — ❌ NOT SUBSCRIBED

- **Backend emits** booking events on this channel for staff consumption
- **Frontend** subscribes to `{hotel_slug}.room-bookings` (dot-separated) instead
- **Impact:** If backend sends certain booking events exclusively on `-staff-bookings`, they will be silently dropped
- **Severity:** HIGH

### 2. `{hotel_slug}-staff-overstays` — ❌ NOT SUBSCRIBED

- **Backend emits** `booking_overstay_flagged`, `booking_overstay_acknowledged`, `booking_overstay_extended` on this dedicated channel
- **Frontend** has handlers in `roomBookingStore.jsx` but never subscribes to the channel
- **Impact:** Overstay events are never received unless backend also broadcasts them on `.room-bookings`
- **Severity:** HIGH

### 3. `private-guest-booking.{booking_id}` — ❌ NOT SUBSCRIBED

- **Backend contract** specifies guest-facing booking events on `private-guest-booking.{booking_id}`
- **Frontend** uses `private-hotel-{hotelSlug}-guest-chat-booking-{bookingId}` — a completely different pattern, used for **guest chat** only, not booking lifecycle events
- **Impact:** Guest-facing booking status updates (confirmed, payment_required, etc.) are never received via realtime on the guest side
- **Severity:** HIGH (for guest experience)

---

## D. Missing Events (CRITICAL)

All 8 core booking events **have handlers** in `roomBookingStore.jsx`. However, their delivery depends on the channel subscription issues above.

| Event | Handler Exists? | Will It Fire? | Why |
|---|---|---|---|
| `booking_overstay_flagged` | ✅ Yes (`roomBookingStore.jsx:322`) | ❌ **No** (unless duplicated on `.room-bookings`) | Dedicated channel `{slug}-staff-overstays` not subscribed |
| `booking_overstay_acknowledged` | ✅ Yes (`roomBookingStore.jsx:328`) | ❌ **No** (unless duplicated on `.room-bookings`) | Same reason |
| `booking_overstay_extended` | ✅ Yes (`roomBookingStore.jsx:334`) | ❌ **No** (unless duplicated on `.room-bookings`) | Same reason |
| `room_occupancy_updated` | ⚠️ Mapped | ⚠️ **Depends on naming** | eventBus checks `room-occupancy-updated` (hyphens). If backend sends `room_occupancy_updated` (underscores), it won't match the raw handler. Only works if event arrives in normalized `{category, type}` format. |

---

## E. Payload Mismatches

### 1. Booking ID Field Name

| Context | Frontend Expects | Notes |
|---|---|---|
| `roomBookingStore.extractBookingId()` | `meta.scope.booking_id` → `payload.booking_id` → `payload.id` | Triple fallback chain; should work if backend sends any of these |
| `serviceBookingStore.handleEvent()` | `payload.booking_id` → `payload.id` | Two fallbacks |

**Assessment:** Frontend uses generous fallbacks (`booking_id`, `id`, `meta.scope.booking_id`). Low risk of mismatch unless backend sends booking ID in a completely different field.

### 2. Normalized vs Raw Event Format

The eventBus handles two formats:

1. **Normalized** (preferred): `{ category, type, payload, meta }` — routed via `routeToDomainStores()`
2. **Raw** Pusher events: eventBus has hardcoded handlers for specific raw event names like `room-status-changed`, `room-occupancy-updated`, `new-guest-message`

**Risk:** If backend switches from sending raw event names to normalized format (or vice versa), some events may not route correctly. The room events are particularly vulnerable — `room-status-changed` (hyphenated raw) vs `room_status_changed` (normalized type) are handled by different code paths.

### 3. Overstay Events

Overstay handlers in `roomBookingStore.jsx` call `emitOverstayRefresh(bookingId)` — they emit a `CustomEvent` on `window` rather than updating store state directly. This assumes a `BookingDetailsModal` is listening. If no modal is open, the overstay event is acknowledged via toast but **no state update occurs**.

### 4. Room Events — Hyphen vs Underscore

| Backend Event Name (contract) | EventBus Raw Handler Checks For | Normalized Type Sent to Store |
|---|---|---|
| `room_occupancy_updated` | `room-occupancy-updated` (hyphens) | `room_updated` |
| `room_updated` | (no raw handler) | `room_updated` |

**Risk:** If backend sends `room_occupancy_updated` as raw Pusher event name (underscores), the eventBus raw handler on L358 (`=== 'room-occupancy-updated'`) will NOT match. The event will only be processed if backend sends it in normalized `{category: "rooms", type: "room_updated"}` format.

---

## F. Key Findings

### Finding 1 — `{hotel_slug}-staff-bookings` Channel Not Subscribed
- **Severity:** HIGH
- **File:** `src/realtime/channelRegistry.js`
- **Impact:** If backend emits any booking events exclusively on this channel, frontend misses them completely. Frontend only subscribes to `{hotel_slug}.room-bookings` (dot separator) and `{hotel_slug}.booking` (service bookings).

### Finding 2 — `{hotel_slug}-staff-overstays` Channel Not Subscribed
- **Severity:** HIGH
- **File:** `src/realtime/channelRegistry.js`
- **Impact:** All three overstay events (`flagged`, `acknowledged`, `extended`) have working handlers in `roomBookingStore.jsx` but the delivery channel is never subscribed. Handlers are dead code unless backend duplicates events on `.room-bookings`.

### Finding 3 — Guest Booking Channel Pattern Mismatch
- **Severity:** HIGH
- **File:** `src/realtime/channelRegistry.js` L318+
- **Impact:** Backend contract says `private-guest-booking.{booking_id}`. Frontend subscribes to `private-hotel-{hotelSlug}-guest-chat-booking-{bookingId}` — different pattern, different purpose (chat only, not booking lifecycle).

### Finding 4 — Room Event Name Format Mismatch (Hyphens vs Underscores)
- **Severity:** MEDIUM
- **Files:** `src/realtime/eventBus.js` L337, L358
- **Impact:** Backend contract says `room_occupancy_updated` (underscores). EventBus raw handler checks for `room-occupancy-updated` (hyphens). If backend sends underscored names as raw Pusher events, they won't match.

### Finding 5 — `room_updated` Has No Raw EventBus Handler
- **Severity:** MEDIUM
- **File:** `src/realtime/eventBus.js`
- **Impact:** A raw `room_updated` Pusher event (not wrapped in normalized format) will fall through to the "non-normalized event" warning log. Only works if backend sends in `{category: "rooms", type: "room_updated"}` format.

### Finding 6 — Overstay Events Only Emit Window CustomEvent, No Store Update
- **Severity:** LOW
- **File:** `src/realtime/stores/roomBookingStore.jsx` L322–336
- **Impact:** Overstay handlers call `emitOverstayRefresh(bookingId)` which dispatches a `window.CustomEvent`. If no `BookingDetailsModal` is open listening for `overstayStatusRefresh`, the overstay state is only reflected via React Query invalidation (which requires network roundtrip).

### Finding 7 — Frontend Handles Events Not in Backend Contract
- **Severity:** LOW
- **Files:** `src/realtime/stores/roomBookingStore.jsx` L310, L338–340
- **Impact:** Frontend handles `booking_expired`, `integrity_healed`, `party_healed`, `guests_healed` — these are not in the provided backend contract. They may be valid backend events not listed in the contract, or dead code.

### Finding 8 — Service Booking Handles Legacy Event Names
- **Severity:** LOW
- **File:** `src/realtime/stores/serviceBookingStore.jsx` L280–295
- **Impact:** `serviceBookingStore` handles `new_dinner_booking`, `new_booking`, `booking_seated`, `table_assigned`, `table_changed`, `booking_table_changed` — these may be legacy event names. Not harmful but adds dead code if backend no longer emits them.

### Finding 9 — Dual Event Format Creates Fragile Routing
- **Severity:** MEDIUM
- **File:** `src/realtime/eventBus.js`
- **Impact:** `handleIncomingRealtimeEvent()` handles both normalized `{category, type}` events AND raw Pusher event names via hardcoded `if` checks. Any new backend event that isn't in normalized format AND doesn't have an explicit raw handler will be silently dropped with only a console warning.

### Finding 10 — No Backend Channel for Service Bookings Audit
- **Severity:** LOW
- **File:** `src/realtime/channelRegistry.js` L58
- **Impact:** Frontend subscribes to `{hotelSlug}.booking` for service bookings. This channel is not listed in the backend booking contract provided. May be a separate domain not covered by this audit.

---

## G. Minimal Fix Direction

| # | Issue | Fix Type | Description |
|---|---|---|---|
| 1 | Missing `{slug}-staff-bookings` channel | **Add missing subscription** | Add `pusher.subscribe(\`${hotelSlug}-staff-bookings\`)` in `channelRegistry.js` with `bind_global()` routing to eventBus |
| 2 | Missing `{slug}-staff-overstays` channel | **Add missing subscription** | Add `pusher.subscribe(\`${hotelSlug}-staff-overstays\`)` in `channelRegistry.js` with `bind_global()` routing to eventBus |
| 3 | Guest booking channel pattern mismatch | **Backend alignment required** | Confirm with backend which channel pattern is actually used: `private-guest-booking.{booking_id}` or `private-hotel-{slug}-guest-chat-booking-{bookingId}`. Either frontend subscription or backend emission must be updated. |
| 4 | Room event name hyphens vs underscores | **Normalize payload** | In eventBus raw handlers, check for both `room-occupancy-updated` AND `room_occupancy_updated`. Or: ensure backend always sends normalized format. |
| 5 | `room_updated` no raw handler | **Add missing event handler** | Add raw handler in eventBus for `room_updated` (or `room-updated`) to normalize and route to roomsStore. Or: confirm backend always sends normalized. |
| 6 | Overstay events — no direct store update | No code change needed | Current design (CustomEvent + React Query invalidation) is acceptable if overstay data freshness via polling/invalidation is sufficient. |
| 7 | `booking_expired` / healing events | **Remove dead listener** (if confirmed unused) | Verify with backend whether these events are emitted. If not, remove handlers to reduce confusion. If yes, add to backend contract. |
| 8 | Legacy service booking events | **Remove dead listener** (if confirmed unused) | Verify `new_dinner_booking`, `booking_seated`, etc. are still emitted by backend. |

---

## H. Guest Realtime Support Check

### Does frontend subscribe to `private-guest-booking.{booking_id}`?

**NO.**

The backend contract specifies guest booking events on `private-guest-booking.{booking_id}`. This channel is **never subscribed** anywhere in the frontend codebase.

### What does the frontend subscribe to for guests?

The frontend subscribes to `private-hotel-{hotelSlug}-guest-chat-booking-{bookingId}` — this is a **guest chat** channel, not a booking lifecycle channel. It is used for:
- Guest-to-staff messaging (`subscribeToGuestChatBooking()`)
- Staff joining guest conversations (`subscribeStaffToGuestChatBooking()`)

Both functions are in `src/realtime/channelRegistry.js` (L318+ and L310+).

### Guest booking realtime status

- **Guest does NOT receive realtime booking lifecycle events** (confirmed, cancelled, checked_in, etc.)
- **No polling fallback** for guest booking status was found in this audit scope
- Guest chat messaging IS supported via the `private-hotel-*` channel pattern

---

## I. Channel Naming Mismatches

| Backend Channel | Frontend Channel | Match? | Issue |
|---|---|---|---|
| `{slug}.room-bookings` | `${hotelSlug}.room-bookings` | ✅ Match | — |
| `{slug}-staff-bookings` | *(not subscribed)* | ❌ | Frontend never subscribes to this hyphen-separated staff channel |
| `{slug}-staff-overstays` | *(not subscribed)* | ❌ | Frontend never subscribes to this channel |
| `{slug}.rooms` | `${hotelSlug}.rooms` | ✅ Match | — |
| `private-guest-booking.{booking_id}` | `private-hotel-${hotelSlug}-guest-chat-booking-${bookingId}` | ❌ **Completely different pattern** | Frontend channel is for chat, backend channel is for booking lifecycle |

---

## Final Verdict

> **Are frontend realtime subscriptions and event handlers fully aligned with backend emissions?**

### **NO — There are 3 critical channel gaps and 1 medium event naming mismatch.**

**Summary of divergences:**

1. **`{slug}-staff-bookings`** — Backend channel, never subscribed by frontend
2. **`{slug}-staff-overstays`** — Backend channel, never subscribed. Overstay handlers exist but are unreachable via this channel.
3. **`private-guest-booking.{booking_id}`** — Backend guest channel, never subscribed. Frontend uses an entirely different channel pattern for guest chat only.
4. **Room event names** — Backend uses underscores (`room_occupancy_updated`), eventBus raw handlers use hyphens (`room-occupancy-updated`). Will silently fail if backend sends raw (non-normalized) events.

**What IS aligned:**
- `{slug}.room-bookings` — ✅ Correctly subscribed, all 8 booking lifecycle events handled
- `{slug}.rooms` — ✅ Correctly subscribed, room_updated and room_status_changed handled (with caveat on naming format)
- Event deduplication — ✅ Robust via `meta.event_id`
- React Query invalidation — ✅ Booking events properly trigger cache invalidation
- Toast notifications — ✅ Rate-limited, context-aware
