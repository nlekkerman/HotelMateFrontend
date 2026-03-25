# HotelMate Frontend Audit — Booking State Ownership + Realtime Sync

**Date:** 2025-03-25  
**Type:** Read-only architecture audit  
**Scope:** All booking-related frontend state, fetching, mutations, and realtime flows  
**Goal:** Identify why booking-related UI fails to stay in sync, and where the real source of truth conflict is

---

## A. Booking State Owners

| File | Owner Type | Name | Data Held | Read By | Written By | Notes |
|------|-----------|------|-----------|---------|------------|-------|
| `src/realtime/stores/roomBookingStore.jsx` | context (useReducer) | `RoomBookingProvider` / `useRoomBookingState` | `byBookingId: {}`, `list: []`, `lastEventIds: {}` — room bookings indexed by booking_id | `BookingStatusPage`, `BookingDetailsModal` (overstay refresh only), `BookingTable` (dispatch only) | Pusher events via `roomBookingActions.handleEvent()`, `BookingTable` dispatch for mark-as-seen | **Primary for realtime events**, but most staff screens don't read from it. Never seeded from API — only populated by incoming Pusher events. |
| `src/realtime/stores/serviceBookingStore.jsx` | context (useReducer) | `ServiceBookingProvider` / `useServiceBookingState` | `bookingsById: {}`, `todaysBookings: []`, `lastEventTimestamps: {}` — restaurant/porter/trip bookings | `RestaurantBookings`, `DinnerBookingList`, `BookingNotificationContext` | Pusher events via `serviceBookingActions.handleEvent()`, component calls to `serviceBookingActions.initFromAPI()` | Seeded by `initFromAPI()` from components that fetch. Pusher events also write here. Dual-write from two sources creates merge issues. |
| React Query cache | server-state cache | `['staff-room-bookings', hotelSlug, params]` | Paginated room booking list with filters, pagination, bucket counts | `BookingList` → `BookingTable` (via props) | `useStaffRoomBookings` queryFn, optimistic `setQueryData` in mutations | **Primary for staff booking list**. Not connected to roomBookingStore at all. |
| React Query cache | server-state cache | `['staff-room-booking', hotelSlug, bookingId]` | Single booking detail object | `BookingDetailsModal` (via `useRoomBookingDetail`) | `useRoomBookingDetail` queryFn, `invalidateQueries()` after mutations | **Primary for booking detail view**. Not connected to roomBookingStore. |
| `src/pages/bookings/BookingStatusPage.jsx` | component state | `useState(booking)` | Guest's own room booking (fetched via public API + token) | `BookingStatusPage` render | `fetchBookingStatus()` on mount, `useEffect` merge from `roomBookingState` | Local state is primary render source. Attempts to merge from roomBookingStore, but that store is empty for guests (see Section D notes). |
| `src/components/bookings/RestaurantBookings.jsx` | component state | `useState(bookings)` | Service bookings for selected restaurant | `RestaurantBookings` render | `fetchAllPages()` API call on mount | Manually merged with `serviceBookingStore` data. Duplicate-removal by ID. |
| `src/components/bookings/DinnerBookingList.jsx` | component state | `useState(bookings)` | Service bookings for selected restaurant | `DinnerBookingList` render | API fetch on restaurant slug change | Also reads `storeBookings` from `serviceBookingStore` but does not merge them — two separate display paths. |
| `src/components/bookings/BookingsGrid.jsx` | component state | `useState(bookings)` | Timeline grid bookings for restaurant/date | `BookingsGrid` render | Direct `api.get()` fetch | Completely independent fetch. No store connection. No realtime updates. |
| `src/components/bookings/BookingsHistory.jsx` | component state | `useState(history)` | Historical restaurant bookings | `BookingsHistory` render | Direct `api.get()` fetch | Completely independent fetch. No store connection. No realtime updates. |
| `src/context/BookingNotificationContext.jsx` | context (useState) | `BookingNotificationProvider` / `useBookingNotifications` | `hasNewBooking`, `bookingNotifications` (derived from serviceBookingStore) | `BigScreenNavbar` (badge), `Bookings` page (markAllRead) | Derived from `serviceBookingStore.bookingsById` changes | Only monitors service (restaurant) bookings. No room booking notification state. |
| `src/utils/bookingHoldStorage.js` | localStorage | `booking_hold:<hotelSlug>` | `{ bookingId, expiresAt }` — in-progress booking hold | `GuestRoomBookingPage`, `useExpiredBookingHandler` | Guest booking creation flow | Not related to sync issues — only for guest booking creation. |
| `src/utils/guestBookingTokens.js` | localStorage | `guest_booking_token:<bookingId>` | Guest auth token for booking access | `BookingStatusPage` | `writeGuestBookingToken()` | Token management only, not booking data. |

---

## B. Booking Fetch Paths

| File | Function/Hook/Action | API Client | Endpoint | Populates | Consumed By | Notes |
|------|---------------------|------------|----------|-----------|-------------|-------|
| `src/hooks/useStaffRoomBookings.js` | `useStaffRoomBookings()` | `api` (authenticated) | `GET /staff/hotel/<slug>/room-bookings/?<filters>` | React Query cache `['staff-room-bookings', ...]` | `BookingList` → `BookingTable` (props) | Polls every 3s for transition-state bookings. `staleTime: 30s`. `refetchOnWindowFocus: true`. |
| `src/hooks/useStaffRoomBookingDetail.js` | `useRoomBookingDetail()` | `api` (authenticated) | `GET /staff/hotel/<slug>/room-bookings/<id>/` | React Query cache `['staff-room-booking', ...]` | `BookingDetailsModal` | Fetches full detail including party. |
| `src/hooks/useStaffRoomBookingDetail.js` | `useAvailableRooms()` | `api` (authenticated) | `GET /staff/hotel/<slug>/room-bookings/<id>/available-rooms/` | React Query cache `['staff-available-rooms', ...]` | `BookingDetailsModal` | Enabled only when bookingId present. |
| `src/pages/bookings/BookingStatusPage.jsx` | `fetchBookingStatus()` | `publicAPI` (no auth) | `GET /hotel/<slug>/room-bookings/<id>/?token=...&email=...` | Local `useState(booking)` | `BookingStatusPage` | Guest-facing. One-time fetch on mount. No refetch after initial load except via realtime (which is broken for guests). |
| `src/pages/bookings/GuestRoomBookingPage.jsx` | inline fetches | `publicAPI` | `GET /hotel/<slug>/`, `GET /hotel/<slug>/room-types/`, `POST /hotel/<slug>/room-bookings/` | Local component state | `GuestRoomBookingPage` | Guest booking creation flow. No list fetch. |
| `src/pages/bookings/BookingPaymentSuccess.jsx` | inline fetch | `publicAPI` | `GET /hotel/<slug>/room-bookings/<id>/payment-verify/` | Local component state | `BookingPaymentSuccess` | Payment verification + polling for confirmed status. |
| `src/hooks/usePrecheckinData.js` | `usePrecheckinData()` | `publicAPI` | `GET /hotel/<slug>/precheckin/?token=...` | Local hook state | **Not consumed** — `GuestPrecheckinPage` does inline fetch instead | Dead code. `GuestPrecheckinPage` reimplements this inline. |
| `src/pages/guest/GuestPrecheckinPage.jsx` | inline fetch | `publicAPI` | `GET /hotel/<slug>/precheckin/?token=...` | Local component state | `GuestPrecheckinPage` | Duplicates what `usePrecheckinData` hook already provides. |
| `src/components/bookings/RestaurantBookings.jsx` | `fetchAllPages()` | `api` (authenticated) | `GET /bookings/bookings/?hotel_slug=...&restaurant=...` | Local `useState(bookings)` + `serviceBookingStore` via `initFromAPI()` | `RestaurantBookings` render | Fetches ALL pages then seeds store. Also merges store bookings for display. |
| `src/components/bookings/DinnerBookingList.jsx` | inline fetch | `api` (authenticated) | `GET /guest-booking/<slug>/restaurant/<slug>/` | Local `useState(bookings)` + `serviceBookingStore` via `initFromAPI()` | `DinnerBookingList` render | Fetches, stores locally, AND seeds the realtime store. |
| `src/components/bookings/BookingsGrid.jsx` | `fetchData()` | `api` (authenticated) | `GET /bookings/<slug>/<restaurant>/tables/`, `GET /bookings/guest-booking/<slug>/restaurant/<slug>/` | Local `useState(bookings)`, `useState(tables)` | `BookingsGrid` | Independent fetch. No store sync. No realtime. |
| `src/components/bookings/BookingsHistory.jsx` | `fetchHistory()` | `api` (authenticated) | `GET /bookings/guest-booking/<slug>/restaurant/<slug>/?history=true` | Local `useState(history)` | `BookingsHistory` | Independent fetch. No store sync. No realtime. |
| `src/services/staffApi.js` | `staffOverstayAPI.staffOverstayStatus()` | `api` (authenticated) | `GET /staff/hotel/<slug>/room-bookings/<id>/overstay/status/` | Local `useState(overstayStatus)` in `BookingDetailsModal` | `BookingDetailsModal` | Supplementary data fetched alongside React Query detail. |
| `src/components/bookings/Bookings.jsx` | inline fetch | `api` (authenticated) | `GET /bookings/restaurants/?hotel_slug=...` | Local component state | `Bookings` page | Fetches restaurant list for service booking tab navigation. |

---

## C. Booking Mutation Paths

| File | Function/Action | Endpoint | Affected Data | Post-Mutation Sync Strategy | Notes |
|------|----------------|----------|---------------|---------------------------|-------|
| `src/hooks/useStaffRoomBookingDetail.js` | `useSafeAssignRoom()` | `POST .../room-bookings/<id>/safe-assign-room/` or `.../move-room/` | Room assignment | `targeted refetch` | Invalidates `staff-room-bookings`, `staff-room-booking`, `staff-available-rooms` query keys. Does NOT update `roomBookingStore`. |
| `src/hooks/useStaffRoomBookingDetail.js` | `useUnassignRoom()` | `POST .../room-bookings/<id>/unassign-room/` | Room assignment | `targeted refetch` | Same invalidation pattern. Does NOT update `roomBookingStore`. |
| `src/hooks/useStaffRoomBookingDetail.js` | `useCheckInBooking()` | `POST .../room-bookings/<id>/check-in/` | Booking status, room occupancy | `targeted refetch` | Invalidates booking + list queries. Also invalidates rooms cache. Does NOT update `roomBookingStore`. |
| `src/hooks/useStaffRoomBookingDetail.js` | `useCheckOutBooking()` | `POST .../room-bookings/<id>/check-out/` | Booking status, room occupancy | `targeted refetch` | Invalidates booking + list + rooms queries. Does NOT update `roomBookingStore`. |
| `src/hooks/useStaffRoomBookingDetail.js` | `useSendPrecheckinLink()` | `POST .../room-bookings/<id>/send-precheckin-link/` | Party status | `targeted refetch` | Invalidates detail query only. |
| `src/components/staff/bookings/BookingList.jsx` | `acceptBookingMutation` | `POST .../room-bookings/<id>/approve/` | Booking status → CONFIRMED | `mixed` | Does BOTH optimistic `setQueryData` (modifying React Query cache directly) AND `invalidateQueries`. The refetch from invalidation can overwrite the optimistic update before the new data arrives. |
| `src/components/staff/bookings/BookingList.jsx` | `declineBookingMutation` | `POST .../room-bookings/<id>/decline/` | Booking status → CANCELLED | `mixed` | Same mixed pattern: optimistic `setQueryData` + `invalidateQueries`. |
| `src/components/staff/bookings/BookingList.jsx` | `sendPrecheckinMutation` | `POST .../room-bookings/<id>/send-precheckin-link/` | Staff seen status | `mixed` | Optimistic `setQueryData` for seen status + `invalidateQueries`. |
| `src/components/staff/bookings/BookingTable.jsx` | `handleBookingClick` (mark-seen) | `POST .../room-bookings/<id>/mark-seen/` | `staff_seen_at`, `is_new_for_staff` | `mixed` | Dispatches to `roomBookingStore` for optimistic update + fires async API call. **But BookingList reads from React Query, not roomBookingStore**, so the optimistic store update is invisible to the list until React Query refetches. |
| `src/components/staff/bookings/BookingDetailsModal.jsx` | `handleAcknowledgeOverstay()` | `POST .../room-bookings/<id>/overstay/acknowledge/` | Overstay status | `local patch` | Refreshes local `overstayStatus` state. Does not touch React Query or roomBookingStore. |
| `src/components/staff/bookings/BookingDetailsModal.jsx` | `handleExtendStay()` | `POST .../room-bookings/<id>/overstay/extend/` | Stay dates, overstay status | `local patch` | Refreshes local `overstayStatus` state. Does not touch React Query or roomBookingStore. Main booking dates are NOT refreshed after extend. |
| `src/pages/bookings/BookingStatusPage.jsx` | inline cancellation | `POST /hotel/<slug>/room-bookings/<id>/cancel/` (inferred) | Booking status → CANCELLED | `local patch` | Updates local `useState(booking)` only. No store update. No refetch. |
| `src/pages/guest/GuestPrecheckinPage.jsx` | inline precheckin submit | `POST /hotel/<slug>/precheckin/` (inferred) | Party/guest data | `none` | Submits and navigates away. No state reconciliation. |
| `src/components/bookings/DinnerBookingForm.jsx` | dinner booking creation | `POST /guest-booking/<slug>/restaurant/<slug>/` (inferred) | New service booking | `none` | Guest-facing form. Submits and shows confirmation. No store update. Relies on Pusher event to propagate to staff screens. |

---

## D. Booking Realtime Subscriptions

| File | Provider/Hook/Component | Channel Pattern | Event Name | State Updated | Update Strategy | Cleanup Correct? | Notes |
|------|------------------------|----------------|------------|---------------|----------------|------------------|-------|
| `src/realtime/channelRegistry.js` | `subscribeBaseHotelChannels` | `<hotelSlug>.room-bookings` | `*` (bind_global) | `roomBookingStore` via eventBus routing | `store patch` | `yes` | Global binding routes ALL events on this channel to `handleIncomingRealtimeEvent`. Cleanup function unbinds + unsubscribes. **Only active for authenticated (staff) sessions** — guests don't get subscriptions. |
| `src/realtime/channelRegistry.js` | `subscribeBaseHotelChannels` | `<hotelSlug>.booking` | `*` (bind_global) | `serviceBookingStore` via eventBus routing | `store patch` | `yes` | Service bookings channel. Same cleanup pattern. Only active for auth'd sessions. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_created` | `roomBookingStore.ROOM_BOOKING_CREATED` | `store patch` | `yes` | Creates new entry in `byBookingId`, adds to list. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_confirmed` | `roomBookingStore.ROOM_BOOKING_UPDATED` | `store patch` | `yes` | Merges payload into existing entry. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_updated` | `roomBookingStore.ROOM_BOOKING_UPDATED` | `store patch` | `yes` | General update merge. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_party_updated` | `roomBookingStore.ROOM_BOOKING_PARTY_UPDATED` | `store patch` | `yes` | Party data merge. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_cancelled` | `roomBookingStore.ROOM_BOOKING_CANCELLED` | `store patch` | `yes` | Status update merge. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_checked_in` | `roomBookingStore.ROOM_BOOKING_CHECKED_IN` | `store patch` | `yes` | Check-in status merge. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_checked_out` | `roomBookingStore.ROOM_BOOKING_CHECKED_OUT` | `store patch` | `yes` | Check-out status merge. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_expired` | `roomBookingStore.ROOM_BOOKING_UPDATED` | `store patch` | `yes` | Treated as general update. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_overstay_flagged` | None (window event) | `none` | `yes` | Emits `CustomEvent('overstayStatusRefresh')` on `window`. Does NOT patch roomBookingStore. BookingDetailsModal listens for this event and refetches overstay status. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_overstay_acknowledged` | None (window event) | `none` | `yes` | Same window event pattern as flagged. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_overstay_extended` | None (window event) | `none` | `yes` | Same window event pattern. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | `booking_payment_required` | `roomBookingStore.ROOM_BOOKING_UPDATED` | `store patch` | `yes` | Adds synthesized `PAYMENT_REQUIRED` status. |
| `src/realtime/eventBus.js` | `routeToDomainStores` | (routed from channelRegistry) | Service booking events (`booking_created`, `booking_updated`, etc.) | `serviceBookingStore` | `store patch` | `yes` | Routed by `category: "booking"`. Handles both new format and legacy event names (`new_dinner_booking`, `table_assigned`, etc.). |
| `src/pages/bookings/BookingStatusPage.jsx` | `useEffect` on `roomBookingState` | N/A (reads from context) | N/A (watches `byBookingId` changes) | Local `useState(booking)` | `local patch` | `unclear` | Merges store data into local state via spread (`{...prevBooking, ...storeBooking}`). **DEAD CODE for guests** — Pusher subscriptions require auth, so `roomBookingStore` is never populated in guest sessions. This entire realtime merge path never fires. |
| `src/components/staff/bookings/BookingDetailsModal.jsx` | `useEffect` on `window.overstayStatusRefresh` | N/A (custom window event) | `overstayStatusRefresh` | Local `useState(overstayStatus)` | `targeted refetch` | `yes` | Refetches overstay status from API on custom event. Only fires when modal is open for the matching bookingId. |

---

## E. Key Findings

### 1. **[HIGH]** Room booking realtime store is disconnected from all staff rendering screens

**Files:** `roomBookingStore.jsx`, `useStaffRoomBookings.js`, `BookingList.jsx`, `BookingDetailsModal.jsx`

`roomBookingStore` receives all Pusher events and maintains an up-to-date `byBookingId` map. However, the staff booking list (`BookingList`) renders exclusively from React Query cache (`useStaffRoomBookings`), and the booking detail modal (`BookingDetailsModal`) renders exclusively from React Query cache (`useRoomBookingDetail`). **No staff screen reads booking display data from the realtime store.** The realtime store is maintained but its data goes unused for staff rendering. This means all Pusher events are processed but produce no visible UI updates on staff screens.

**Smallest fix area:** realtime subscription → React Query cache bridge (invalidate React Query keys when roomBookingStore receives events)

---

### 2. **[HIGH]** Guest booking status page has dead realtime code path

**Files:** `BookingStatusPage.jsx`, `roomBookingStore.jsx`, `channelRegistry.js`, `RealtimeProvider.jsx`

`BookingStatusPage` reads from `useRoomBookingState()` and has a `useEffect` that merges store data into local `useState(booking)`. However, `RealtimeManager` in `RealtimeProvider` only subscribes to Pusher channels when a user is authenticated (`user.hotel_slug` or `selectedHotel.slug`). Guests viewing `BookingStatusPage` are unauthenticated, so no Pusher channels are subscribed. The `roomBookingStore` remains at its initial empty state. **The entire realtime merge on the guest status page is dead code** — guests never receive live updates after the initial page load.

**Smallest fix area:** component — either add a guest-specific Pusher subscription or implement polling for guest status page.

---

### 3. **[HIGH]** Mark-as-seen optimistic update targets wrong state layer

**Files:** `BookingTable.jsx`, `roomBookingStore.jsx`, `BookingList.jsx`

When staff clicks a booking, `BookingTable.handleBookingClick` dispatches `ROOM_BOOKING_UPDATED` to `roomBookingStore` as an optimistic update for `staff_seen_at` and `is_new_for_staff`. However, `BookingList` renders bookings from React Query (`useStaffRoomBookings`), not from `roomBookingStore`. The optimistic update goes to a store that no rendering component reads. The "NEW" badge removal is invisible until React Query refetches (up to 30s staleTime + window focus).

**Smallest fix area:** mutation follow-up flow — use `queryClient.setQueryData` instead of store dispatch for the optimistic update.

---

### 4. **[MEDIUM]** Accept/decline mutations race optimistic updates with invalidation

**Files:** `BookingList.jsx`

`acceptBookingMutation` and `declineBookingMutation` both do optimistic `queryClient.setQueryData()` AND then `queryClient.invalidateQueries()` in the same `onSuccess` handler. The invalidation triggers a background refetch that may overwrite the optimistic update with stale server data (the server may not have finished processing the status change when the refetch fires). This can cause the UI to briefly show the updated status, then flash back to the old status, then update again when fresh data arrives.

**Smallest fix area:** mutation follow-up flow — remove `invalidateQueries` and rely on either the optimistic update alone (with Pusher event as eventual confirmation) or use `invalidateQueries` only with a small delay.

---

### 5. **[MEDIUM]** Service booking triple-source rendering

**Files:** `RestaurantBookings.jsx`, `DinnerBookingList.jsx`, `serviceBookingStore.jsx`, `BookingsGrid.jsx`, `BookingsHistory.jsx`

Service booking data lives in three places simultaneously: local component `useState`, `serviceBookingStore` (context), and independent fetches in sub-components (`BookingsGrid`, `BookingsHistory`). `RestaurantBookings` manually deduplicates by merging local state + store state. `DinnerBookingList` reads from both but renders them separately. `BookingsGrid` and `BookingsHistory` fetch independently and have zero realtime or store connection. A realtime event that updates `serviceBookingStore` will NOT appear in `BookingsGrid` or `BookingsHistory`.

**Smallest fix area:** store — make `serviceBookingStore` the single source, or migrate to React Query for service bookings too.

---

### 6. **[MEDIUM]** Booking detail extend-stay does not refresh booking dates

**Files:** `BookingDetailsModal.jsx`

After a successful `handleExtendStay()`, only the overstay status is refreshed (`refreshOverstayStatus()`). The main booking detail (`useRoomBookingDetail` React Query data) is NOT invalidated or refetched. The modal continues to display the old `check_out` date until the user closes and reopens it, or until a Pusher event triggers (which updates roomBookingStore, not React Query). The backend reports a 409 "not checked-in" error in some cases because the frontend's stale booking data diverges from the backend's updated state.

**Smallest fix area:** mutation follow-up flow — add `queryClient.invalidateQueries(['staff-room-booking', hotelSlug, bookingId])` after successful extend.

---

### 7. **[MEDIUM]** BookingNotificationContext relies on store population by page visit

**Files:** `BookingNotificationContext.jsx`, `serviceBookingStore.jsx`, `RestaurantBookings.jsx`, `DinnerBookingList.jsx`

`BookingNotificationContext` derives `hasNewBooking` from `serviceBookingStore.bookingsById` count changes. But the store is only populated when a component calls `serviceBookingActions.initFromAPI()` — which only happens when a user visits `RestaurantBookings` or `DinnerBookingList` pages. If staff never visits the dinner booking page in their session, the store starts empty and the notification badge count comparison (`currentBookingCount > lastSeenBookingCount && lastSeenBookingCount > 0`) requires a non-zero initial count to detect new bookings. Realtime Pusher events can add to the store, but without initial seed data, the first booking event sets count from 0→1 while `lastSeenBookingCount` is still 0, so the `lastSeenBookingCount > 0` guard prevents the notification.

**Smallest fix area:** context — remove the `lastSeenBookingCount > 0` guard, or seed the store on app initialization.

---

### 8. **[MEDIUM]** roomBookingStore event payload may not match React Query data shape

**Files:** `roomBookingStore.jsx`, `useStaffRoomBookings.js`

The `roomBookingStore` reducer merges Pusher event payloads directly via `{ ...existingBooking, ...booking }`. The payload shape from Pusher events is whatever the backend sends in the event, which may be a subset of fields (e.g., just `{ booking_id, status, guest_name }`). Meanwhile, `useStaffRoomBookings` processes fetched data to add normalized fields (`guest_email`, `guest_phone`, `guest_name`, `room_type_name`, etc.) that the Pusher payload may not include. If these two sources were ever merged, the Pusher data could overwrite normalized fields with `undefined`. This is currently latent because they aren't merged, but becomes critical if Finding #1 is fixed by bridging the two.

**Smallest fix area:** store — any future bridge must avoid naive shallow merge; should only update known fields from event payload.

---

### 9. **[LOW]** `usePrecheckinData` and `usePrecheckinForm` hooks are dead code

**Files:** `src/hooks/usePrecheckinData.js`, `src/hooks/usePrecheckinForm.js`, `src/pages/guest/GuestPrecheckinPage.jsx`

Both hooks exist but `GuestPrecheckinPage` implements all precheckin data fetching and form management inline. The hooks are never imported by any component. This is not a sync issue but indicates incomplete refactoring that may cause confusion when fixing related flows.

**Smallest fix area:** component — either use the hooks or remove them.

---

### 10. **[LOW]** Multiple event deduplication layers with no shared state

**Files:** `eventBus.js`, `roomBookingStore.jsx`

Event deduplication is implemented independently in three places: `eventBus.js` (global `globalProcessedEventIds` Set), `roomBookingStore.jsx` (module-level `globalProcessedEventIds` Set + `roomBookingActions._processedEventIds` Set), and `serviceBookingStore.jsx` (`_processedEventIds` Set). Each maintains its own LRU-style cleanup at 1000 entries. An event deduplicated in `eventBus.js` would never reach the stores, but the stores also maintain their own dedup. The `roomBookingStore.jsx` has TWO overlapping dedup mechanisms (the module-level Set is declared but never checked in the action handler path — only used inside the reducer which doesn't check it). This creates unnecessary memory overhead but is unlikely to cause user-visible bugs.

**Smallest fix area:** store — consolidate dedup to eventBus only (low priority).

---

## F. Smallest Safe Fix Path

### Primary Issue Classification

**Multiple issues combined**, but with a clear dominant pattern:

The root cause is **disconnected state systems**. The codebase has two parallel booking data architectures:

1. **React Query** (server-state cache) — used by all staff rendering screens
2. **Context/useReducer stores** (realtime event state) — fed by Pusher but read by almost no rendering screens

These two systems were built to serve different purposes but were never connected. Realtime events update the store; mutations trigger React Query refetches. Neither system tells the other when it has new data.

### Smallest Safe Fix Direction

**Bridge realtime events into React Query cache invalidation.** This is the smallest change that fixes the dominant problem:

1. When `roomBookingActions.handleEvent()` successfully processes an event, call `queryClient.invalidateQueries({ queryKey: ['staff-room-bookings'] })` and/or `queryClient.invalidateQueries({ queryKey: ['staff-room-booking', hotelSlug, bookingId] })`. This requires making `queryClient` accessible to the store (e.g., via a module-level reference set during app init).

2. Fix `BookingTable` mark-as-seen to use `queryClient.setQueryData` instead of dispatching to `roomBookingStore`.

3. For the guest `BookingStatusPage`, add a polling interval (e.g., 60s) via the public API since Pusher events are unavailable to guests.

These three changes address Findings #1, #2, and #3 without restructuring the architecture. The existing store can remain as a secondary event log; it just also needs to signal React Query to refetch when relevant data arrives.

**Do not** remove either system or attempt to make the stores the primary rendering source. React Query's caching, pagination, and server-state management are correct for the staff list/detail views. The fix is to connect the two via cache invalidation, not to replace one with the other.
