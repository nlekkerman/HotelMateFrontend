# BookingDetailsModal INVENTORY & REFACTOR PLAN

Generated on: January 26, 2026

## PHASE 0 — INVENTORY (Complete Analysis)

### User Operations Inventory

Based on thorough examination of [hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx), here are **ALL** user operations currently supported:

#### ✅ Room Assignment Operations
- **Assign Room** (new bookings) — handler: `handleAssignRoom` — no confirmation modal — success: toast notification — API: `useSafeAssignRoom` mutation
- **Move Room** (in-house guests) — handler: `handleAssignRoom` (same handler, different mode) — no confirmation modal — success: toast notification — API: `useSafeAssignRoom` mutation (with reason required)
- **Unassign Room** — handler: `handleUnassignRoom` — no confirmation modal — success: toast notification — API: `useUnassignRoom` mutation

#### ✅ Check-in/Check-out Operations
- **Check-in** — handler: `handleCheckIn` — no confirmation modal — success: toast notification — API: `useCheckInBooking` mutation
- **Check-out** — handler: `handleCheckOut` — no confirmation modal — success: toast notification — API: `useCheckOutBooking` mutation

#### ✅ Guest Communication
- **Send Pre-check-in Link** — handler: `handleSendPrecheckinLink` — no confirmation modal — success: toast notification — API: `useSendPrecheckinLink` mutation

#### ✅ Overstay Management
- **Acknowledge Overstay** — handler: `handleAcknowledgeOverstay` — modal: `StaffConfirmationModal` (showAcknowledgeModal) — success: toast notification — API: `staffOverstayAPI.staffOverstayAcknowledge`
- **Extend Stay** — handler: `handleExtendStay` — modal: `StaffConfirmationModal` (showExtendModal) — success: toast notification — API: `staffOverstayAPI.staffOverstayExtend`

#### ❌ NOT IMPLEMENTED Operations
Searched extensively for these keywords and **confirmed NOT implemented**:
- **Approve booking** - mentioned in suggestions but no handler/button
- **Decline/Reject booking** - mentioned in suggestions but no handler/button  
- **Cancel booking** - no handler/button found
- **No-show booking** - no handler/button found

### Detailed Operation Analysis

#### Room Assignment Details
- **Flags**: `booking.flags.can_assign_room`, `booking.flags.can_unassign_room`
- **Party Gates**: Disabled when `!booking.party_complete` with tooltip showing missing guest count
- **UI State**: `showRoomAssignment`, `selectedRoomId`, `assignmentNotes`, `reason`
- **Validation**: Requires reason for moves (in-house guests), validates party completeness
- **Realtime**: Query invalidations handled by mutation hooks

#### Check-in/Check-out Details  
- **Flags**: `booking.flags.can_check_in`
- **Prerequisites**: Check-in requires assigned room, shows room assignment if missing
- **UI State**: No special state management beyond mutation loading states
- **Realtime**: Query invalidations handled by mutation hooks

#### Overstay Management Details
- **Backend Integration**: Uses `staffOverstayAPI` for incident management
- **UI State**: Complex state with `overstayStatus`, multiple modals, extend modes, conflict handling
- **Realtime**: Listens for `overstayStatusRefresh` events, auto-refreshes incident status
- **Conflict Resolution**: Handles room conflicts with suggested alternatives

### Modal Components Used
1. **StaffConfirmationModal** (2 instances):
   - Acknowledge Overstay modal (`showAcknowledgeModal`)
   - Extend Stay modal (`showExtendModal`)
2. **No StaffSuccessModal usage found** - all success feedback via toast notifications
3. **StaffInputModal imported but not used** in current implementation

### API Integration Points
- **Staff Room Booking Hooks**: `useRoomBookingDetail`, `useAvailableRooms`, `useSafeAssignRoom`, etc.
- **Staff Overstay API**: Direct API calls to `staffOverstayAPI`
- **Realtime**: `useRoomBookingState` hook + event bus listeners
- **Query Management**: React Query invalidations handled within mutation hooks

### Current File Structure Issues
- **Massive 1,984-line monolith** with multiple complex responsibilities
- **Mixed concerns**: Room assignment, check-in/out, overstay management, UI rendering all in one file
- **Complex state management**: 15+ state variables for modals, forms, and UI
- **Deeply nested render functions** with complex conditional logic

## PHASE 1 — REFACTOR PLAN

### Extraction Strategy

#### 1. Container + Hook Pattern
- **BookingDetailsContainer.jsx** - Main orchestrator, data fetching, modal state management
- **useBookingDetails.js** - Custom hook consolidating all booking-related state and API calls

#### 2. Feature-Based Section Components
Based on existing `render*Section()` functions:

- **BookingInfoSection.jsx** - Basic booking info, status badges, pricing
- **BookingPartySection.jsx** - Primary guest, booker, companions display  
- **BookingTimeControlsSection.jsx** - Time warnings, approval deadlines, overstay indicators
- **BookingRoomSection.jsx** - Room assignment/move operations with all related UI
- **BookingCheckinSection.jsx** - Check-in operations and precheckin summary
- **BookingCheckoutSection.jsx** - Check-out operations
- **BookingOverstaySection.jsx** - Overstay incident display and basic actions

#### 3. Operation-Specific Components  
For complex operations requiring their own state:

- **RoomAssignmentPanel.jsx** - Complete room assignment/move interface
- **OverstayActionPanels.jsx** - Acknowledge and extend stay operations

#### 4. Shared Infrastructure
- **BookingOperationModal.jsx** - Generic modal wrapper for booking operations
- **BookingActionButton.jsx** - Reusable button with party-gating, tooltips, loading states

### New Files to Create

#### Core Container & Hook
1. `BookingDetailsContainer.jsx` - Main modal shell, coordinates all sections
2. `hooks/useBookingDetails.js` - Consolidated state and API management

#### Section Components (7 files)
3. `sections/BookingInfoSection.jsx` - Basic info display
4. `sections/BookingPartySection.jsx` - Guest/party information  
5. `sections/BookingTimeControlsSection.jsx` - Warnings and time-based controls
6. `sections/BookingRoomSection.jsx` - Room-related operations
7. `sections/BookingCheckinSection.jsx` - Check-in flow
8. `sections/BookingCheckoutSection.jsx` - Check-out flow  
9. `sections/BookingOverstaySection.jsx` - Overstay status display

#### Operation Panels (2 files)
10. `operations/RoomAssignmentPanel.jsx` - Room assignment/move interface
11. `operations/OverstayActionPanels.jsx` - Overstay management operations

#### Shared Components (2 files)  
12. `shared/BookingOperationModal.jsx` - Generic modal wrapper
13. `shared/BookingActionButton.jsx` - Smart button component

### Move Room Implementation Status

**CONFIRMED**: Move room functionality **IS IMPLEMENTED** in current code.

**Current Implementation**:
- Uses same `handleAssignRoom` handler with different mode detection
- Detects in-house status via `!!booking.checked_in_at && !booking.checked_out_at`
- Requires reason field for moves (validation: `setReasonError('Reason is required for room moves')`)
- Button text changes: "Move Room" vs "Assign Room"  
- Uses same API endpoint: `useSafeAssignRoom` mutation

**Refactor Plan**:
- Extract to `RoomAssignmentPanel.jsx` with clear assign vs move modes
- Keep existing functionality intact, just organize better
- **NO stub needed** - feature is fully implemented

### Implementation Priority

1. **Phase 1**: Extract core container and basic sections (files 1-4)
2. **Phase 2**: Extract operation sections (files 5-9)  
3. **Phase 3**: Extract complex operation panels (files 10-11)
4. **Phase 4**: Create shared components (files 12-13)
5. **Phase 5**: Final cleanup and testing

### Success Criteria

- ✅ All 8 current operations preserved exactly
- ✅ No changes to API calls or realtime behavior
- ✅ Modal state management simplified
- ✅ Each file under 200 lines
- ✅ Clear separation of concerns
- ✅ Improved maintainability and testability
- ✅ Preserved party-gating and flags-driven behavior

### Architecture Benefits

- **Maintainability**: Each operation in focused, single-purpose component
- **Testability**: Isolated components easier to unit test
- **Reusability**: Section components could be used in other booking contexts
- **Performance**: Potential for more granular re-rendering
- **Developer Experience**: Much easier to locate and modify specific functionality