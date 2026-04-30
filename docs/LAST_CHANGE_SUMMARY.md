# Last Change Summary

**Commit:** `ae7950a150885fdcba93e7993055803583214c33`
**Author:** nlekkerman
**Date:** Mon Apr 27 17:03:54 2026 +0100
**Subject:** feat: Implement RBAC for booking management actions across components

## Overview

Wired Phase 1 backend-driven RBAC (`useCan` from `@/rbac`) into 9 booking and room
management components. Replaced the legacy `usePermissions().isSuperStaffAdmin`
flag and ad-hoc `override_conflicts` checks with canonical action keys
(`bookings.<action>`, `rooms.<action>`, `housekeeping.<action>`) so the UI gates
buttons and panels purely on the authority list returned by the backend.

## Files Changed (9 files, +86 / −20)

### `hotelmate-frontend/src/components/bookings/BookingManagementDashboard.jsx`
- Imported `useCan` and added `canManageRules = can('bookings', 'manage_rules')`.
- Renders a permission-denied alert (with `bi-shield-lock` icon) when the user
  lacks `bookings.manage_rules`, blocking access to cancellation policy,
  approval cutoff, and checkout time configuration.

### `hotelmate-frontend/src/components/rooms/RoomDetails.jsx`
- Added panel-level visibility flag `canManageRooms` derived from the union of:
  `housekeeping.transition`, `rooms.inspect`, `rooms.maintenance_flag`,
  `rooms.maintenance_clear`, `rooms.checkout_destructive`,
  `housekeeping.status_override`.
- Added `canUseManagerOverride` (alias for `housekeeping.status_override`) to
  gate the elevated red-themed manager override UX.

### `hotelmate-frontend/src/components/rooms/RoomList.jsx`
- Removed `usePermissions().isSuperStaffAdmin`; replaced with
  `useCan().canAny('rooms', ['inventory_create', 'inventory_update',
  'inventory_delete', 'type_manage'])`.
- "Manage" entry-point link and the empty-state CTA now appear only when the
  user holds at least one inventory or type-management action.

### `hotelmate-frontend/src/components/staff/bookings/BookingActions.jsx`
- Replaced `bookings.override_conflicts` gate on Approve/Decline with explicit
  `bookings.update` (Approve) and `bookings.cancel` (Decline) keys.
- Added `bookings.communicate` gate to the Survey button (removed prior
  `TODO(RBAC)` placeholder comment).

### `hotelmate-frontend/src/components/staff/bookings/BookingDetailsCheckinSection.jsx`
- Added `bookings.checkin` gate on the "Check In Guest" button.
- Added `bookings.assign_room` gate on the "Assign Room First" prerequisite button.

### `hotelmate-frontend/src/components/staff/bookings/BookingDetailsCheckoutSection.jsx`
- Added `bookings.checkout` gate on the "Check Out Guest" button.

### `hotelmate-frontend/src/components/staff/bookings/BookingDetailsRoomAssignmentSection.jsx`
- Added `bookings.assign_room` gate on:
  - The unassign room button (in addition to existing `flags.can_unassign_room`).
  - The change-room button.
  - Both confirm-assignment buttons (initial assignment and change-assignment flows).

### `hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx`
- Added `bookings.resolve_overstay` gate on the Acknowledge Overstay button.
- Added `bookings.extend` gate on the Extend Stay button.

### `hotelmate-frontend/src/components/staff/bookings/BookingTable.jsx`
- Added `bookings.update` gate on the auto "mark seen" mutation that fires when
  a row is opened. Users without update authority no longer trigger the
  optimistic `staff_seen_at` write.

## RBAC Action Keys Introduced/Used

| Domain        | Action Key             | Used In                                     |
| ------------- | ---------------------- | ------------------------------------------- |
| bookings      | `manage_rules`         | BookingManagementDashboard                  |
| bookings      | `update`               | BookingActions (approve), BookingTable      |
| bookings      | `cancel`               | BookingActions (decline)                    |
| bookings      | `communicate`          | BookingActions (survey)                     |
| bookings      | `checkin`              | BookingDetailsCheckinSection                |
| bookings      | `checkout`             | BookingDetailsCheckoutSection               |
| bookings      | `assign_room`          | Checkin + RoomAssignment sections           |
| bookings      | `resolve_overstay`     | TimeControlsSection                         |
| bookings      | `extend`               | TimeControlsSection                         |
| rooms         | `inventory_create/update/delete`, `type_manage` | RoomList         |
| rooms         | `inspect`, `maintenance_flag`, `maintenance_clear`, `checkout_destructive` | RoomDetails |
| housekeeping  | `transition`, `status_override` | RoomDetails                        |

## Notes

- The previous `bookings.override_conflicts` check was retired from approval/
  decline gating in favor of the canonical `update` / `cancel` actions.
- `usePermissions().isSuperStaffAdmin` is no longer used in `RoomList.jsx`;
  authority comes solely from the backend `user.rbac.*.actions.*` payload.
- All gates are additive — existing booking flag checks
  (`flags.can_check_in`, `flags.can_unassign_room`, `party_complete`, etc.) are
  preserved and combined with the RBAC checks via boolean AND.
