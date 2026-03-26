# Booking-Related UI Update Audit — Field & Indicator Level

> Generated: 2026-03-26 | Read-only audit | No code changes

---

## A. SCREEN INVENTORY

| # | File | Component | Audience | Primary Data Source |
|---|------|-----------|----------|-------------------|
| 1 | `src/components/staff/bookings/BookingList.jsx` | BookingList | staff | React Query (`useStaffRoomBookings`) |
| 2 | `src/components/staff/bookings/BookingTable.jsx` | BookingTable | staff | props (from BookingList query) |
| 3 | `src/components/staff/bookings/BookingStatusBadges.jsx` | BookingStatusBadges | staff | props (booking object) |
| 4 | `src/components/staff/bookings/BookingTimeWarningBadges.jsx` | BookingTimeWarningBadges | staff | props (booking object) + `useBookingTimeWarnings` hook |
| 5 | `src/components/staff/bookings/BookingActions.jsx` | BookingActions | staff | props (booking object) |
| 6 | `src/components/staff/bookings/BookingDetailsModal.jsx` | BookingDetailsModal | staff | React Query (`useRoomBookingDetail`) + local state (overstay) |
| 7 | `src/components/staff/bookings/BookingDetailsPartySection.jsx` | BookingDetailsPartySection | staff | props (from detail query) |
| 8 | `src/components/staff/bookings/BookingDetailsRoomAssignmentSection.jsx` | BookingDetailsRoomAssignmentSection | staff | props + React Query (`useAvailableRooms`) |
| 9 | `src/components/staff/bookings/BookingDetailsCheckinSection.jsx` | BookingDetailsCheckinSection | staff | props (from detail query) |
| 10 | `src/components/staff/bookings/BookingDetailsCheckoutSection.jsx` | BookingDetailsCheckoutSection | staff | props (from detail query) |
| 11 | `src/components/staff/bookings/BookingDetailsPrecheckinSummary.jsx` | BookingDetailsPrecheckinSummary | staff | props (from detail query) |
| 12 | `src/components/staff/bookings/BookingDetailsSurveyStatus.jsx` | BookingDetailsSurveyStatus | staff | props (from detail query) |
| 13 | `src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx` | BookingDetailsTimeControlsSection | staff | props + local overstay API state + `useBookingTimeWarnings` |
| 14 | `src/pages/bookings/BookingStatusPage.jsx` | BookingStatusPage | guest | local state (API fetch + 30s polling) |
| 15 | `src/pages/bookings/BookingPaymentSuccess.jsx` | BookingPaymentSuccess | guest | local state (API fetch + 3s polling) |
| 16 | `src/pages/guest/GuestPrecheckinPage.jsx` | GuestPrecheckinPage | guest | local state (single API fetch, no refresh) |
| 17 | `src/components/guest/PrecheckinHeader.jsx` | PrecheckinHeader | guest | props (from GuestPrecheckinPage) |
| 18 | `src/components/layout/BigScreenNavbar.jsx` | BigScreenNavbar | staff | `BookingNotificationContext` (service bookings only) |
| 19 | `src/context/BookingNotificationContext.jsx` | BookingNotificationContext (provider) | staff | `serviceBookingStore` (restaurant bookings only) |

---

## B. FIELD + INDICATOR UPDATE MATRIX

### B.1 BookingList — Bucket Filter Tabs

| Screen/Component | Field or Indicator Displayed | Type | Source of Truth | Update Trigger | Expected Update Mechanism | Likely Safe or At Risk? | Notes |
|---|---|---|---|---|---|---|---|
| BookingList | bucket count (e.g. "Arrivals (5)") | `counter` | `statistics` from `useStaffRoomBookings` → backend `bucket_counts` | any booking state change | realtime → invalidate → query refetch → UI | safe | Counts refresh with every list refetch; 30s staleTime + realtime bridge |
| BookingList | active bucket highlight | `label` | URL `searchParams` / `filters.bucket` | user click `setBucket()` | local-only state update | safe | Purely local filter state |
| BookingList | total results count text | `label` | `pagination.count` or `bookings.length` | any booking state change | realtime → invalidate → query refetch → UI | safe | Same lifecycle as list query |
| BookingList | isFetching spinner | `label` | React Query `isFetching` | query refetch triggered | derived from parent props/query | safe | Built-in React Query state |

### B.2 BookingTable — Per-Row Fields

| Screen/Component | Field or Indicator Displayed | Type | Source of Truth | Update Trigger | Expected Update Mechanism | Likely Safe or At Risk? | Notes |
|---|---|---|---|---|---|---|---|
| BookingTable | booking_id | `field` | React Query list cache | booking created | realtime → invalidate → query refetch → UI | safe | Immutable after creation |
| BookingTable | confirmation_number | `field` | React Query list cache | booking created | realtime → invalidate → query refetch → UI | safe | Immutable |
| BookingTable | guest name (party.primary.full_name chain) | `field` | React Query list cache | precheckin completed / party updated | realtime → invalidate → query refetch → UI | safe | Fallback chain handles multiple field shapes |
| BookingTable | party.primary.email | `field` | React Query list cache | precheckin completed | realtime → invalidate → query refetch → UI | safe | |
| BookingTable | party.primary.phone | `field` | React Query list cache | precheckin completed | realtime → invalidate → query refetch → UI | safe | |
| BookingTable | room_type_name | `field` | React Query list cache | booking created | realtime → invalidate → query refetch → UI | safe | Immutable |
| BookingTable | check_in date | `field` | React Query list cache | booking created | realtime → invalidate → query refetch → UI | safe | Immutable |
| BookingTable | check_out date | `field` | React Query list cache | extend stay | realtime → invalidate → query refetch → UI | at risk | Overstay extend fires window event, NOT React Query invalidation — list check_out stays stale until 30s staleTime expires |
| BookingTable | nights (derived from check_in/check_out) | `field` | React Query list cache (computed locally) | extend stay | realtime → invalidate → query refetch → UI | at risk | Same risk as check_out — derived from potentially stale dates |
| BookingTable | party.total_count / guest count | `field` | React Query list cache | precheckin completed | realtime → invalidate → query refetch → UI | safe | |
| BookingTable | total_amount | `field` | React Query list cache | booking created / payment | realtime → invalidate → query refetch → UI | safe | |
| BookingTable | paid_at (green check icon) | `badge` | React Query list cache | payment completed | realtime → invalidate → query refetch → UI | safe | |
| BookingTable | precheckin_submitted_at badge | `badge` | React Query list cache | precheckin completed | realtime → invalidate → query refetch → UI | safe | Shows "Pre-Check-In Complete" vs "Pending" |
| BookingTable | BookingStatusBadges (primary) | `chip` | React Query list cache → props | status/room/checkin changes | realtime → invalidate → query refetch → UI | safe | Composite badge driven by status + room + checked_in_at/out |
| BookingTable | BookingStatusBadges "Paid — Under Review" | `badge` | React Query list cache → props | payment + status | realtime → invalidate → query refetch → UI | safe | Shows when PENDING_APPROVAL + paid_at |
| BookingTable | BookingStatusBadges admin badge | `badge` | React Query list cache → props | status change | realtime → invalidate → query refetch → UI | safe | Secondary label for non-confirmed statuses |
| BookingTable | BookingTimeWarningBadges "NEW" | `badge` | `is_new_for_staff` / `staff_seen_at` from React Query list cache | mark as seen (click) | mutation optimistic patch → UI | safe | Optimistic setQueryData patches all list caches directly |
| BookingTable | BookingTimeWarningBadges approval warning | `badge` | `approval_risk_level` / `approval_overdue_minutes` from React Query list cache | time passing / booking approved | realtime → invalidate → query refetch → UI | safe | Backend computes risk_level; updates on refetch |
| BookingTable | BookingTimeWarningBadges overstay warning | `badge` | `overstay_risk_level` / `overstay_minutes` from React Query list cache | time passing / checkout | realtime → invalidate → query refetch → UI | at risk | Overstay events do NOT invalidate React Query; only window event fires |
| BookingTable | row sort order (unseen pinned, risk priority) | `action-state` | `staff_seen_at` + `approval_risk_level` + `overstay_risk_level` | booking state changes | realtime → invalidate → query refetch → UI | safe | Recomputed on every render from current booking data |
| BookingTable | BookingActions approve/decline buttons | `action-state` | `booking.status` from React Query list cache | status change | realtime → invalidate → query refetch → UI | safe | Visible only for PENDING_APPROVAL / PENDING_PAYMENT |
| BookingTable | BookingActions precheckin button label | `action-state` | `precheckin_submitted_at` from React Query list cache | precheckin completed | realtime → invalidate → query refetch → UI | safe | Toggles "Send" vs "View" |
| BookingTable | BookingActions room button label | `action-state` | `assigned_room` + `checked_in_at` from React Query list cache | room assigned/checkin | realtime → invalidate → query refetch → UI | safe | Toggles "Move Room" / "Reassign Room" |
| BookingTable | BookingActions "Moved" badge on room button | `badge` | `room_moved_at` from React Query list cache | room moved | realtime → invalidate → query refetch → UI | safe | |

### B.3 BookingDetailsModal

| Screen/Component | Field or Indicator Displayed | Type | Source of Truth | Update Trigger | Expected Update Mechanism | Likely Safe or At Risk? | Notes |
|---|---|---|---|---|---|---|---|
| BookingDetailsModal | booking_id | `field` | React Query detail cache (`useRoomBookingDetail`) | modal open | derived from parent props/query | safe | Immutable |
| BookingDetailsModal | confirmation_number | `field` | React Query detail cache | modal open | derived from parent props/query | safe | |
| BookingDetailsModal | primary_first_name / primary_last_name | `field` | React Query detail cache | precheckin completed | mutation → targeted refetch → UI | safe | Detail query invalidated by mutations |
| BookingDetailsModal | BookingStatusBadges (all badges) | `chip` | React Query detail cache → props | status/room/checkin changes | mutation → targeted refetch → UI | safe | Same badge component as list, fed by detail query |
| BookingDetailsModal | room_type_name | `field` | React Query detail cache | booking created | derived from parent props/query | safe | Immutable |
| BookingDetailsModal | check_in | `field` | React Query detail cache | booking created | derived from parent props/query | safe | Immutable |
| BookingDetailsModal | check_out | `field` | React Query detail cache | extend stay | mixed / unclear | at risk | Extend stay patches overstay local state only; detail query NOT invalidated by extend mutation |
| BookingDetailsModal | nights | `field` | React Query detail cache | extend stay | mixed / unclear | at risk | Derived from check_out — same risk |
| BookingDetailsModal | adults + children (expected guests) | `field` | React Query detail cache | booking created | derived from parent props/query | safe | Immutable |
| BookingDetailsModal | party.total_count (recorded) | `field` | React Query detail cache | precheckin completed | mutation → targeted refetch → UI | safe | |
| BookingDetailsModal | party_missing_count alert | `badge` | React Query detail cache | precheckin completed | mutation → targeted refetch → UI | safe | |
| BookingDetailsModal | staff_seen_at / staff_seen_by | `field` | React Query detail cache | mark-seen on click | mutation → targeted refetch → UI | safe | Detail fetched fresh on modal open |
| BookingDetailsModal | total_amount / currency | `field` | React Query detail cache | booking created | derived from parent props/query | safe | |
| BookingDetailsModal | special_requests | `field` | React Query detail cache | booking created | derived from parent props/query | safe | |
| BookingDetailsModal | PartySection — all guest details | `field` | React Query detail cache → props | precheckin completed | mutation → targeted refetch → UI | safe | |
| BookingDetailsModal | RoomAssignment — room_number | `field` | React Query detail cache → props | room assigned/moved | mutation → targeted refetch → UI | safe | Mutation invalidates detail + available rooms |
| BookingDetailsModal | RoomAssignment — room_assigned_at | `field` | React Query detail cache → props | room assigned | mutation → targeted refetch → UI | safe | |
| BookingDetailsModal | RoomAssignment — available rooms dropdown | `field` | React Query (`useAvailableRooms`) | room assigned/unassigned | mutation → targeted refetch → UI | safe | Separate query, invalidated by assign/unassign mutations |
| BookingDetailsModal | RoomAssignment — can_assign / can_unassign flags | `action-state` | React Query detail cache → `booking.flags` | room/party changes | mutation → targeted refetch → UI | safe | Backend computes flags |
| BookingDetailsModal | CheckinSection — assign-first warning vs ready | `action-state` | React Query detail cache → `assigned_room` | room assigned | mutation → targeted refetch → UI | safe | |
| BookingDetailsModal | CheckinSection — can_check_in flag | `action-state` | React Query detail cache → `booking.flags` | room assigned + party complete | mutation → targeted refetch → UI | safe | |
| BookingDetailsModal | CheckoutSection — in-house state | `action-state` | React Query detail cache → `checked_in_at` + `checked_out_at` | checkin/checkout | mutation → targeted refetch → UI | safe | |
| BookingDetailsModal | PrecheckinSummary — submitted_at badge | `badge` | React Query detail cache → props | precheckin completed | mutation → targeted refetch → UI | safe | "Pending" vs "Completed" alert |
| BookingDetailsModal | PrecheckinSummary — all precheckin fields | `field` | React Query detail cache → props | precheckin completed | mutation → targeted refetch → UI | safe | |
| BookingDetailsModal | SurveyStatus — all survey fields | `field` | React Query detail cache → props | survey completed | realtime → invalidate → query refetch → UI | safe | Post-checkout only |
| BookingDetailsModal | TimeControls — EXPIRED banner | `badge` | React Query detail cache → props | booking expired | realtime → invalidate → query refetch → UI | safe | |
| BookingDetailsModal | TimeControls — approval warning badge | `badge` | `useBookingTimeWarnings` hook → props | time passing | derived from parent props/query | safe | Recomputed from booking fields on each render |
| BookingDetailsModal | TimeControls — overstay warning badge | `badge` | `useBookingTimeWarnings` + local `overstayStatus` | overstay flagged/acked/extended | mixed / unclear | at risk | Overstay badge text overridden by local overstayStatus; window event triggers overstay API refetch but NOT React Query invalidation |
| BookingDetailsModal | TimeControls — overstay incident badge | `badge` | local `overstayStatus` (staffOverstayAPI) | overstay flagged/acked | local-only state update | at risk | Only updates via window event listener; if modal closed when event fires, state resets on reopen via fresh overstay fetch |
| BookingDetailsModal | TimeControls — extension history | `field` | local `overstayStatus.overstay.extensions[]` | extend stay | local-only state update | at risk | Patched locally after extend; not synced with React Query |
| BookingDetailsModal | TimeControls — acknowledge/extend buttons | `action-state` | local `overstayStatus` + `checked_in_at` + `checked_out_at` | overstay events | local-only state update | safe | Buttons always visible when in-house + overstay active |

### B.4 BookingStatusPage (Guest)

| Screen/Component | Field or Indicator Displayed | Type | Source of Truth | Update Trigger | Expected Update Mechanism | Likely Safe or At Risk? | Notes |
|---|---|---|---|---|---|---|---|
| BookingStatusPage | status icon + badge + text | `chip` | local `useState(booking)` | any booking lifecycle event | polling → fetch → local state → UI | safe | 30s polling active |
| BookingStatusPage | "Payment received — under review" | `badge` | local state → `booking.status` + `booking.paid_at` | payment verified | polling → fetch → local state → UI | safe | Special status display |
| BookingStatusPage | confirmation_number | `field` | local `useState(booking)` | booking created | polling → fetch → local state → UI | safe | Immutable |
| BookingStatusPage | guest name / email / phone | `field` | local `useState(booking)` | booking created | polling → fetch → local state → UI | safe | |
| BookingStatusPage | assigned_room_number | `field` | local `useState(booking)` | room assigned | polling → fetch → local state → UI | safe | Updates within 30s polling cycle |
| BookingStatusPage | room type | `field` | local `useState(booking)` | booking created | polling → fetch → local state → UI | safe | |
| BookingStatusPage | check_in / check_out dates | `field` | local `useState(booking)` | booking created / extend | polling → fetch → local state → UI | at risk | Extend stay: guest sees old check_out until next poll cycle; if extend event doesn't update backend booking record immediately, may remain stale longer |
| BookingStatusPage | nights count | `field` | local `useState(booking)` | booking created | polling → fetch → local state → UI | safe | |
| BookingStatusPage | guests total / adults / children | `field` | local `useState(booking)` | booking created | polling → fetch → local state → UI | safe | |
| BookingStatusPage | checked_in_at → "You're Checked In" header | `label` | local `useState(booking)` | check-in | polling → fetch → local state → UI | safe | 30s max delay |
| BookingStatusPage | checked_out_at → "Stay Completed" header | `label` | local `useState(booking)` | check-out | polling → fetch → local state → UI | safe | 30s max delay |
| BookingStatusPage | check-in window badge + countdown | `badge` | computed from `booking.check_in` + `booking.hotel.timezone` | time passing (60s timer) | local-only state update | safe | Recomputed every 60s from booking data |
| BookingStatusPage | cancel button visibility | `action-state` | `booking.can_cancel` or status-based fallback | status change | polling → fetch → local state → UI | safe | |
| BookingStatusPage | cancellation preview (fee/refund) | `field` | local `useState(cancellationPreview)` | fetched on mount | local-only state update | safe | Static after initial fetch |
| BookingStatusPage | service nav buttons (room service/breakfast/chat) | `action-state` | `guestContext.allowed_actions` | context fetched on mount | local-only state update | safe | Permissions don't change during session |
| BookingStatusPage | hotel name / phone / email | `field` | local `useState(hotel)` or `booking.hotel` | booking fetched | polling → fetch → local state → UI | safe | |

### B.5 BookingPaymentSuccess (Guest)

| Screen/Component | Field or Indicator Displayed | Type | Source of Truth | Update Trigger | Expected Update Mechanism | Likely Safe or At Risk? | Notes |
|---|---|---|---|---|---|---|---|
| BookingPaymentSuccess | status (CONFIRMED / PENDING_APPROVAL / DECLINED) | `label` | local `useState(booking)` | payment verification + polling | polling → fetch → local state → UI | safe | 3s poll until resolved |
| BookingPaymentSuccess | confirmation_number / booking_id | `field` | local `useState(booking)` | payment verified | polling → fetch → local state → UI | safe | |
| BookingPaymentSuccess | checked_in_at + assigned_room_number | `label` | local `useState(booking)` | check-in | polling → fetch → local state → UI | safe | Only relevant if guest keeps page open |
| BookingPaymentSuccess | hotel name / address / phone | `field` | local `useState(booking)` | booking fetched | polling → fetch → local state → UI | safe | |
| BookingPaymentSuccess | room type / dates / nights / guests | `field` | local `useState(booking)` | booking fetched | polling → fetch → local state → UI | safe | |
| BookingPaymentSuccess | pricing (subtotal/discount/taxes/total) | `field` | local `useState(booking)` | booking fetched | polling → fetch → local state → UI | safe | |
| BookingPaymentSuccess | polling spinner + timeout message | `label` | local `useState(isPolling)` / `pollAttempts` | poll cycle | local-only state update | safe | |

### B.6 GuestPrecheckinPage (Guest)

| Screen/Component | Field or Indicator Displayed | Type | Source of Truth | Update Trigger | Expected Update Mechanism | Likely Safe or At Risk? | Notes |
|---|---|---|---|---|---|---|---|
| GuestPrecheckinPage / PrecheckinHeader | booking_id | `field` | local state (single API fetch) | page load | local-only state update | safe | One-time display |
| GuestPrecheckinPage / PrecheckinHeader | check_in / check_out | `field` | local state | page load | local-only state update | safe | |
| GuestPrecheckinPage / PrecheckinHeader | room_type | `badge` | local state | page load | local-only state update | safe | |
| GuestPrecheckinPage / PrecheckinHeader | expected_guests count | `field` | local state | page load | local-only state update | safe | |
| GuestPrecheckinPage / PrecheckinHeader | missing guest names badge | `badge` | computed locally | form interaction | local-only state update | safe | |

### B.7 BigScreenNavbar (Staff)

| Screen/Component | Field or Indicator Displayed | Type | Source of Truth | Update Trigger | Expected Update Mechanism | Likely Safe or At Risk? | Notes |
|---|---|---|---|---|---|---|---|
| BigScreenNavbar | "NEW" badge on bookings nav item | `badge` | `BookingNotificationContext.hasNewBooking` → `serviceBookingStore` | new restaurant booking (NOT room booking) | realtime → invalidate → query refetch → UI | at risk | Only tracks restaurant/dinner bookings via serviceBookingStore; room bookings have NO navbar badge. First booking event (0→1) silently ignored due to guard. |

---

## C. KNOWN UPDATE TRIGGERS

| Trigger | Backend/Event/Mutation Source | Screens That Should Update | Fields/Indicators That Should Change | Current Frontend Mechanism | Notes |
|---|---|---|---|---|---|
| Guest creates booking | Pusher `booking_created` | BookingList, BookingTable, bucket counts | new row appears, bucket counts change, "NEW" badge | realtime → invalidate → query refetch → UI | Works. 500ms debounce on invalidation. |
| Booking approved | `acceptBookingMutation` in BookingList + Pusher `booking_confirmed` | BookingList, BookingTable, BookingDetailsModal if open | status → CONFIRMED, "NEW" badge removed, admin badge removed, bucket counts | mutation optimistic patch → UI + realtime → invalidate → query refetch → UI | Optimistic patch sets status + is_new_for_staff. Invalidation also fires but may briefly overwrite with stale data. |
| Booking declined/cancelled | `declineBookingMutation` + Pusher `booking_cancelled` | BookingList, BookingTable, BookingDetailsModal if open | status → CANCELLED, "NEW" badge removed, moved to cancelled bucket | mutation optimistic patch → UI + realtime → invalidate → query refetch → UI | Same dual-write pattern as approve. |
| Booking confirmed (external) | Pusher `booking_confirmed` | BookingList, BookingTable | status badge, bucket counts | realtime → invalidate → query refetch → UI | Works. |
| Mark as seen | `handleBookingClick` → POST mark-seen | BookingTable | "NEW" badge disappears, staff_seen_at populated | mutation optimistic patch → UI | Optimistic setQueryData patches all list caches. Also dispatches to roomBookingStore (redundant). |
| Room assigned | `useSafeAssignRoom` mutation | BookingDetailsModal, BookingTable (on refetch), BookingStatusPage (30s poll) | room_number badge, "Assigned · Room X", can_check_in flag, available rooms dropdown | mutation → targeted refetch → UI | Detail + list + available-rooms queries all invalidated. |
| Room unassigned | `useUnassignRoom` mutation | BookingDetailsModal, BookingTable (on refetch) | badge → "Unassigned", can_check_in disabled | mutation → targeted refetch → UI | Same invalidation pattern. |
| Room moved | `useSafeAssignRoom` (move mode) | BookingDetailsModal, BookingTable | room_number badge updates, "Moved" badge appears | mutation → targeted refetch → UI | Works; room_moved_at field set. |
| Check-in | `useCheckInBooking` mutation + Pusher `booking_checked_in` | BookingDetailsModal, BookingTable, BookingStatusPage (30s poll) | badge → "In-house · Room X", checkout section appears, checkin section hides | mutation → targeted refetch → UI | Detail + list queries invalidated. Guest sees within 30s poll. |
| Check-out | `useCheckOutBooking` mutation + Pusher `booking_checked_out` | BookingDetailsModal, BookingTable, BookingStatusPage (30s poll) | badge → "Checked-out", survey section activated | mutation → targeted refetch → UI | Detail + list + rooms queries invalidated. |
| Overstay flagged | Pusher `booking_overstay_flagged` → window event | BookingDetailsModal (if open), BookingTable (warning badge) | overstay warning badge, incident state | mixed / unclear | Window event → overstay API refetch (modal only). List overstay_risk_level NOT invalidated by this event. |
| Overstay acknowledged | Pusher `booking_overstay_acknowledged` → window event | BookingDetailsModal (if open) | incident badge → "Acknowledged", warning text | local-only state update | Only fires if modal is open for matching bookingId. |
| Extend stay | `handleExtendStay` in BookingDetailsModal → window event possible | BookingDetailsModal, BookingTable, BookingStatusPage | check_out date, nights count, overstay resolved | local-only state update | Only patches local overstayStatus. React Query detail NOT invalidated. check_out stays stale. |
| Payment required | Pusher `booking_payment_required` | BookingList, BookingTable, BookingStatusPage (30s poll) | status badge, paid_at badge | realtime → invalidate → query refetch → UI | Standard realtime → invalidate path. |
| Precheckin link sent | `useSendPrecheckinLink` mutation | BookingDetailsModal | detail query refreshed | mutation → targeted refetch → UI | Only invalidates detail query, not list. |
| Precheckin completed | Pusher `booking_party_updated` | BookingTable, BookingDetailsModal if open | precheckin badge → "Complete", party totals, guest names | realtime → invalidate → query refetch → UI | Works via standard bridge. |
| Guest polling refresh | 30s interval in BookingStatusPage | BookingStatusPage | all displayed fields | polling → fetch → local state → UI | No Pusher for guests; polling is the only update mechanism. |

---

## D. LIKELY STALE VALUE RISKS

### D.1 — HIGH: BookingDetailsModal `check_out` stays stale after extend stay

- **Severity:** high
- **File:** `src/components/staff/bookings/BookingDetailsModal.jsx`
- **Field(s):** `check_out`, `nights`
- **Why:** `handleExtendStay()` only patches local `overstayStatus` state and does NOT call `queryClient.invalidateQueries()` for the detail query `['staff-room-booking', hotelSlug, bookingId]`. The displayed check_out date in the modal header comes from the React Query detail cache, which remains stale until the modal is closed and reopened (triggering a fresh fetch due to staleTime: 0).

### D.2 — HIGH: BookingTable `check_out` stays stale after extend stay

- **Severity:** high
- **File:** `src/components/staff/bookings/BookingTable.jsx`
- **Field(s):** `check_out`, derived `nights`
- **Why:** Overstay extend fires a window `CustomEvent('overstayStatusRefresh')` but does NOT invalidate React Query list caches. The list query `['staff-room-bookings']` is not invalidated by the extend mutation. The check_out in the booking table row stays stale until the next background refetch (up to 30s staleTime or window focus).

### D.3 — HIGH: BookingTable overstay warning badge ignores overstay events

- **Severity:** high
- **File:** `src/components/staff/bookings/BookingTimeWarningBadges.jsx`
- **Field(s):** overstay warning badge (`overstay_risk_level`, `overstay_minutes`)
- **Why:** Pusher `booking_overstay_flagged/acknowledged/extended` events route to a `window.CustomEvent` only — they do NOT call `_invalidateBookingQueries()`. The list's `overstay_risk_level` field comes from the backend on fetch, so the warning badge on the booking row won't update until the next React Query refetch (30s staleTime).

### D.4 — MEDIUM: Approve/decline optimistic patch may flash with stale data

- **Severity:** medium
- **File:** `src/components/staff/bookings/BookingList.jsx`
- **Field(s):** `status`, `is_new_for_staff`
- **Why:** `acceptBookingMutation.onSuccess` does BOTH `setQueryData` (optimistic) AND `invalidateQueries`. The invalidation triggers a refetch that can return stale server data if the backend hasn't fully processed the approval yet, causing the UI to flash: PENDING → CONFIRMED → PENDING → CONFIRMED.

### D.5 — MEDIUM: BigScreenNavbar "NEW" badge tracks wrong booking type

- **Severity:** medium
- **File:** `src/components/layout/BigScreenNavbar.jsx`
- **Field(s):** "NEW" badge on bookings nav item
- **Why:** `BookingNotificationContext` reads from `serviceBookingStore` (restaurant/dinner bookings), not room bookings. Room booking creation/updates never trigger this badge. Staff expecting a "new room booking" notification in the navbar will never see one.

### D.6 — MEDIUM: MobileNavbar has no booking badge at all

- **Severity:** medium
- **File:** `src/components/layout/MobileNavbar.jsx`
- **Field(s):** (absent — no booking badge exists)
- **Why:** `MobileNavbar` does not import `useBookingNotifications` and has no check for booking slugs in `hasNewBadgeForItem()`. Mobile staff users get zero booking indicators in navigation.

### D.7 — MEDIUM: Guest BookingStatusPage `check_out` after extend stay

- **Severity:** medium
- **File:** `src/pages/bookings/BookingStatusPage.jsx`
- **Field(s):** `check_out`, `dates.check_out`
- **Why:** Guest polling fetches fresh data every 30s. If extend stay updates the backend record, the guest will see the updated checkout within ~30s. Risk is only if the backend endpoint returns stale data or the extend doesn't immediately update the booking record.

### D.8 — MEDIUM: BookingDetailsModal overstay state lost on close/reopen

- **Severity:** medium
- **File:** `src/components/staff/bookings/BookingDetailsModal.jsx`
- **Field(s):** `overstayStatus` (incident state, extensions, hours_overdue)
- **Why:** Overstay data is fetched into local `useState` on modal mount. If overstay events fire while the modal is closed, the window event listener isn't active. On reopen, overstay is re-fetched from API — this is actually safe IF the API returns current data. Risk is minimal but the overstay→acknowledged transition won't be visible in the list view at all (no list-level overstay incident indicator exists).

### D.9 — LOW: Precheckin link sent only invalidates detail query

- **Severity:** low
- **File:** `src/hooks/useStaffRoomBookingDetail.js` (`useSendPrecheckinLink`)
- **Field(s):** `precheckin_submitted_at` badge in BookingTable
- **Why:** `useSendPrecheckinLink` only invalidates the detail query `['staff-room-booking']`, not the list query `['staff-room-bookings']`. The precheckin badge in the table row won't update until the list refetches naturally (30s staleTime). However, sending the link doesn't change `precheckin_submitted_at` — only guest submission does, which triggers a `booking_party_updated` Pusher event that DOES invalidate the list.

### D.10 — LOW: Bucket counts may drift during rapid booking changes

- **Severity:** low
- **File:** `src/components/staff/bookings/BookingList.jsx`
- **Field(s):** bucket counter values (e.g. "Arrivals (5)")
- **Why:** Bucket counts come from backend `bucket_counts` in the list response. With 500ms debounce on realtime invalidation, rapid booking state changes (multiple approvals in quick succession) could show transiently incorrect counts until the debounced refetch completes.

### D.11 — LOW: First restaurant booking notification silently dropped

- **Severity:** low
- **File:** `src/context/BookingNotificationContext.jsx`
- **Field(s):** `hasNewBooking` flag, toast notification
- **Why:** Guard `lastSeenBookingCount > 0` means the transition from 0→1 bookings is ignored. First restaurant booking created after app load won't trigger a notification or set the "NEW" badge.

---

## E. MANUAL TEST CHECKLIST BY SCREEN

### E.1 BookingList + BookingTable (Staff)

| # | Field/Indicator | Action | Expected Visible Change |
|---|----------------|--------|----------------------|
| 1 | Status badge | Approve a PENDING_APPROVAL booking | Badge changes from "Pending Approval" to "Assigned · Room X" or "Unassigned" without page refresh |
| 2 | Status badge | Decline a booking | Badge changes to show CANCELLED status without refresh |
| 3 | "NEW" badge | Click on an unseen booking | Red "NEW" badge disappears immediately from the row |
| 4 | "NEW" badge | Another staff member opens same booking | "NEW" badge disappears on next refetch (≤30s) |
| 5 | Bucket count | Approve a pending booking | "Pending" tab count decreases, "Arrivals" or target bucket count increases on refetch |
| 6 | Total count | New booking arrives via Pusher | Total count increments, new row appears after refetch |
| 7 | Precheckin badge | Guest completes precheckin form | Badge changes from "Pre-Check-In Pending" → "Pre-Check-In Complete" on refetch |
| 8 | Approval warning | Time passes past approval deadline | Badge changes from "Due Soon" → "Overdue" → "CRITICAL" on refetch |
| 9 | Overstay warning | Guest stays past checkout time | **AT RISK:** Overstay badge may not appear until next list refetch (≤30s) because overstay events don't invalidate list query |
| 10 | check_out date | Extend an overstaying guest's checkout | **AT RISK:** check_out in table row stays stale until next refetch |
| 11 | Paid indicator | Guest completes payment | Green check "Paid" appears on refetch |
| 12 | Room column | Assign a room from detail modal | Room number appears in status badge on list refetch |
| 13 | Row sort order | New unseen booking arrives | New booking appears at top of list (pinned by unseen sort) |
| 14 | Status badge | Booking expires (timeout) | Badge changes to "EXPIRED", moves to expired bucket |

### E.2 BookingDetailsModal (Staff)

| # | Field/Indicator | Action | Expected Visible Change |
|---|----------------|--------|----------------------|
| 1 | Room assignment | Assign room from dropdown | Room number appears, badge → "Assigned · Room X", available rooms list updates |
| 2 | Room assignment | Unassign room | Badge → "Unassigned", assignment section resets |
| 3 | Check-in section | Check in a guest | Checkin section disappears, checkout section appears, badge → "In-house · Room X" |
| 4 | Check-out section | Check out a guest | Badge → "Checked-out", survey section becomes available |
| 5 | check_out date | Extend stay from overstay controls | **AT RISK:** check_out date in header MAY stay stale — verify it updates |
| 6 | Overstay incident | Overstay flagged by backend | Overstay warning badge appears in time controls section (if modal is open) |
| 7 | Overstay incident | Acknowledge overstay | Incident badge changes to "Acknowledged" |
| 8 | Party section | Guest completes precheckin | Party details populate (names, emails, nationality, etc.) |
| 9 | Precheckin summary | Guest submits precheckin | Alert changes from "Pending" (warning) to "Completed" (success) with submission date |
| 10 | Survey status | Guest completes post-stay survey | Survey response section populates with ratings and answers |
| 11 | Action flags | Assign room + complete party | can_check_in flag enables Check In button |

### E.3 BookingStatusPage (Guest)

| # | Field/Indicator | Action | Expected Visible Change |
|---|----------------|--------|----------------------|
| 1 | Status badge | Staff approves booking | Status changes from "Pending" to "Confirmed" within ~30s (next poll) |
| 2 | Status badge | Staff declines booking | Status changes to "Cancelled" within ~30s |
| 3 | Room number | Staff assigns room | Room number appears in room card within ~30s |
| 4 | "You're Checked In" header | Staff checks in guest | Header changes to welcome message + room number within ~30s |
| 5 | "Stay Completed" header | Staff checks out guest | Header changes to thank-you message within ~30s |
| 6 | check_out date | Staff extends stay | **AT RISK:** Verify check_out updates on next poll cycle |
| 7 | Cancel button | Status changes to non-cancellable | Cancel button disappears on next poll |
| 8 | Check-in window badge | Time approaches check-in date | Badge transitions: "Opens at HH:MM" → "Early Check-in" → "Standard Check-in" → "Closed" |
| 9 | Service buttons | Guest checked in with room | Room service / breakfast / chat buttons appear based on guestContext permissions |

### E.4 BookingPaymentSuccess (Guest)

| # | Field/Indicator | Action | Expected Visible Change |
|---|----------------|--------|----------------------|
| 1 | Status display | Payment processes successfully | Spinner → "Booking Confirmed" card with details (within 3s poll cycles) |
| 2 | Status display | Payment for approval-required hotel | Spinner → "Pending Approval" message |
| 3 | Polling timeout | Payment takes too long | "Refresh" button appears after ~60s (20 poll attempts) |
| 4 | Confirmation number | Payment confirmed | Booking reference card appears |

### E.5 BigScreenNavbar (Staff)

| # | Field/Indicator | Action | Expected Visible Change |
|---|----------------|--------|----------------------|
| 1 | "NEW" badge | New restaurant booking arrives (Pusher) | "NEW" badge appears on bookings nav item |
| 2 | "NEW" badge | Staff clicks into bookings page → `markAllBookingRead()` | "NEW" badge disappears |
| 3 | (absent) | New room booking arrives | **NO CHANGE** — room bookings don't trigger navbar badge. This is a known gap. |

---

## F. SMALLEST REMAINING UI GAPS

### F.1 Overstay events bypass React Query invalidation (list-level)

The biggest remaining gap. All overstay Pusher events (`booking_overstay_flagged`, `booking_overstay_acknowledged`, `booking_overstay_extended`) route to `window.CustomEvent` instead of `_invalidateBookingQueries()`. This means:
- **BookingTable** overstay warning badge (`overstay_risk_level`) does NOT update when an overstay is flagged
- **BookingTable** `check_out` date does NOT update after extend stay
- **BookingDetailsModal** `check_out` date does NOT update after extend (only local overstay status patched)

Fix scope: Add `_invalidateBookingQueries(bookingId)` call to overstay event handlers in `roomBookingStore.jsx`, and invalidate the detail query in `handleExtendStay()`.

### F.2 Extend stay mutation doesn't invalidate booking detail query

`handleExtendStay()` in BookingDetailsModal patches local `overstayStatus` but never calls `queryClient.invalidateQueries()` for `['staff-room-booking', hotelSlug, bookingId]`. The check_out date displayed in the modal header (from React Query) stays stale.

Fix scope: Add `queryClient.invalidateQueries({ queryKey: ['staff-room-booking', hotelSlug, bookingId] })` after successful extend.

### F.3 No room booking count/badge in navbar

Room bookings have zero representation in the navigation. `BookingNotificationContext` only watches restaurant bookings. BigScreenNavbar shows "NEW" for restaurant bookings only. MobileNavbar shows nothing.

Fix scope: Either extend `BookingNotificationContext` to also watch `roomBookingStore`, or add a separate hook that derives unseen room booking count from the React Query cache or realtime store.

### F.4 Guest BookingStatusPage has no realtime — polling only

The TODO comment in `BookingStatusPage.jsx` documents that guest Pusher auth doesn't support `private-guest-booking.*` channels. Guests rely entirely on 30s polling. This means a 0–30s delay for every status change to become visible.

Fix scope: No frontend fix possible without backend auth change. Current 30s polling is the best available mechanism. Could reduce poll interval to 15s for minor improvement.

### F.5 Approve/decline double-write may cause flash

`acceptBookingMutation` and `declineBookingMutation` both do optimistic `setQueryData` AND `invalidateQueries` in the same `onSuccess` handler. This can cause a brief PENDING→CONFIRMED→PENDING→CONFIRMED flash if the background refetch returns before the backend has fully committed.

Fix scope: Remove the `invalidateQueries` from mutation onSuccess handlers since the Pusher event will trigger invalidation anyway via the realtime bridge. Or add a short delay before invalidation.

---

## Final Answer

### SAFE — These values reliably update:

- **All BookingTable row fields** (except check_out after extend and overstay badges): status, guest name, room assignment, paid indicator, precheckin badge, "NEW" badge, approval warning, action buttons — all fed by React Query with realtime → invalidation bridge working
- **All BookingDetailsModal fields** (except check_out after extend and overstay section): room assignment, check-in/out state, party details, precheckin summary, survey, action flags — all fed by detail query with mutation-driven invalidation
- **All BookingStatusPage fields** fed by 30s polling: status, room number, checked-in/out state, cancel availability, service permissions
- **All BookingPaymentSuccess fields** fed by 3s polling
- **Bucket tab counts**: derived from backend on each list refetch

### AT RISK — These values may stay stale:

1. **BookingDetailsModal `check_out` / `nights`** — after extend stay (no detail query invalidation)
2. **BookingTable `check_out` / `nights`** — after extend stay (overstay events don't invalidate list query)
3. **BookingTable overstay warning badge** — after overstay flagged/acknowledged (overstay events don't invalidate list query)
4. **BookingDetailsModal overstay incident badge** — only updates via window event when modal is open for matching booking
5. **BigScreenNavbar booking badge** — tracks restaurant bookings, not room bookings
6. **MobileNavbar** — has no booking badge at all
7. **Guest BookingStatusPage `check_out`** — after extend, depends on backend record update + 30s poll delay
