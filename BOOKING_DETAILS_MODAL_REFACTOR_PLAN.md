# STAFF BOOKINGS CODEBASE AUDIT

Generated on: January 26, 2026

## Section 1: Existing Modals

### System-Wide Staff Modals (Generic)
- `src/components/staff/modals/StaffConfirmationModal.jsx` - Generic confirmation modal with preset support
  - Used in: BookingDetailsModal.jsx (overstay operations), BookingActions.jsx (approve/decline)
- `src/components/staff/modals/StaffInputModal.jsx` - Generic input modal with localStorage support
  - Used in: BookingActions.jsx (imported but usage unknown)
- `src/components/staff/modals/StaffSuccessModal.jsx` - Generic success modal with auto-close support  
  - Used in: BookingList.jsx (imported but usage unknown)

### Booking-Specific Modals
- `src/components/staff/bookings/BookingDetailsModal.jsx` - Main booking details modal (1,984 lines)
  - Operations: All booking operations (room assignment, check-in/out, overstay management)
  - Used in: BookingTable.jsx

### Other Staff Modals
- `src/components/staff/ClockModal.jsx` - Staff clock-in/out modal
  - Operations: Staff time tracking

## Section 2: Existing Alerts

### INLINE ONLY - Alert components exist only inside BookingDetailsModal.jsx:
- **Variant "warning"**: Pre-check-in pending alert, party status banner, expired booking alert
- **Variant "success"**: Pre-check-in completed alert, survey status alert  
- **Variant "danger"**: Booking expired alert, extend validation errors
- **Variant "info"**: Survey available alert
- **Variant "secondary"**: Survey not available alert, no incident alert

**NO EXTRACTED ALERT COMPONENTS EXIST**

## Section 3: Existing Sections / Panels

### Badge Components (Extracted)
- `src/components/staff/bookings/BookingStatusBadges.jsx` - 3-badge system for booking status
- `src/components/staff/bookings/BookingTimeWarningBadges.jsx` - Time-sensitive warning badges (NEW, approval, overstay)

### Action Components (Extracted)  
- `src/components/staff/bookings/BookingActions.jsx` - Action buttons for booking operations (approve, decline, send precheckin/survey)

### List/Table Components (Extracted)
- `src/components/staff/bookings/BookingTable.jsx` - Booking data table with details modal trigger
- `src/components/staff/bookings/BookingList.jsx` - Booking list view
- `src/components/staff/bookings/FilterControls.jsx` - Booking filter controls

### INLINE ONLY - Section functions exist only inside BookingDetailsModal.jsx:
- `renderTimeControlsSection()` - Time warnings, approval deadlines, overstay indicators
- `renderPrecheckinSummary()` - Pre-check-in completion status and data
- `renderSurveyStatus()` - Survey completion and sending status
- `renderPartyStatusBanner()` - Missing guest information banner
- `renderPrimaryGuest()` - Primary guest information display
- `renderBooker()` - Booker information display  
- `renderCompanions()` - Companion guest information display
- `renderRoomAssignmentSection()` - Room assignment/move operations with all UI
- `renderCheckInSection()` - Check-in operations and requirements
- `renderCheckOutSection()` - Check-out operations

**NO EXTRACTED SECTION/PANEL COMPONENTS EXIST**

## Section 4: Existing Staff System Modals

### Generic Staff Modal System
- `src/components/staff/modals/StaffConfirmationModal.jsx` - Confirmation operations
- `src/components/staff/modals/StaffInputModal.jsx` - Text input operations  
- `src/components/staff/modals/StaffSuccessModal.jsx` - Success notifications
- `src/components/staff/modals/StaffModals.css` - Shared styling for staff modals

### Modal Usage Patterns
- **BookingDetailsModal.jsx**: Uses StaffConfirmationModal for overstay acknowledgment and extend stay
- **BookingActions.jsx**: Uses StaffConfirmationModal and StaffInputModal for approve/decline operations
- **BookingTable.jsx**: Uses BookingDetailsModal as details popup
- **BookingList.jsx**: Imports StaffSuccessModal (usage unclear)

## Section 5: Duplicates

### Modal Management Duplication
- BookingDetailsModal.jsx manages own modal state: `showAcknowledgeModal`, `showExtendModal`
- BookingActions.jsx manages own modal state: `showPrecheckinModal`, `showSurveyModal`, `showApproveModal`, `showDeclineModal`  
- BookingTable.jsx manages own modal state: `showDetailsModal`

### No Component Logic Duplication Found
- Each component handles different operations
- No duplicate implementations of same functionality

## Section 6: Inline-only UI in BookingDetailsModal.jsx

### Render Functions (All inline, no extracted components)
- `renderTimeControlsSection()` - Complex warning display with action buttons
- `renderPrecheckinSummary()` - Pre-check-in data parsing and display  
- `renderSurveyStatus()` - Survey state management and display
- `renderPartyStatusBanner()` - Party completion validation with send link button
- `renderPrimaryGuest()` - Guest data display with fallbacks
- `renderBooker()` - Booker information conditional display
- `renderCompanions()` - Companion list with precheckin data
- `renderRoomAssignmentSection()` - Complete room assignment/move interface with form validation
- `renderCheckInSection()` - Check-in button with room requirement logic  
- `renderCheckOutSection()` - Check-out button for in-house guests

### UI State Management (All inline)
- Room assignment: `showRoomAssignment`, `selectedRoomId`, `assignmentNotes`, `reason`
- Overstay management: `overstayStatus`, `showAcknowledgeModal`, `showExtendModal`, extend mode variables
- Form validation: `reasonError`, `extendValidationError`, `extendConflictError`

### Business Logic (All inline)
- Party completion validation
- In-house status detection  
- Room assignment vs move mode detection
- Overstay incident management
- Conflict resolution handling
- Realtime status refresh logic

**TOTAL INLINE LOGIC: ~1,500 lines of UI rendering, state management, and business logic inside BookingDetailsModal.jsx**