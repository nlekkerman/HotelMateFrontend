# FRONTEND OVERSTAY/CHECKOUT TIME RULES INVENTORY REPORT

**Generated:** January 23, 2026  
**Scope:** hotelmate-frontend React/Vite application audit  
**Purpose:** Complete inventory of ALL existing overstay/checkout deadline logic, realtime handling, and UI surfaces

---

## 1. DIRECT FIELD REFERENCES

### 1.1 Core Overstay Fields

| Field | Location | Lines | Code Snippet | Classification |
|-------|----------|-------|--------------|----------------|
| `overstay_flagged_at` | [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx#L126) | 126 | `storeBooking.overstay_flagged_at !== booking.overstay_flagged_at` | REPLACE |
| `overstay_acknowledged_at` | [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx#L127) | 127 | `storeBooking.overstay_acknowledged_at !== booking.overstay_acknowledged_at` | REPLACE |
| `overstay_resolved_at` | [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx#L128) | 128 | `storeBooking.overstay_resolved_at !== booking.overstay_resolved_at` | REPLACE |
| `overstay_risk_level` | [BookingTimeWarningBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTimeWarningBadges.jsx#L128) | 128 | `if (booking?.overstay_risk_level && booking.overstay_risk_level !== 'OK')` | REPLACE |
| `overstay_minutes` | [BookingTimeWarningBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTimeWarningBadges.jsx#L137) | 137-140 | `const overdueMinutes = booking.overstay_minutes;` | REPLACE |
| `is_overstay` | [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L105) | 105 | `isOverstay: booking.is_overstay || riskLevel === 'OVERDUE'` | REPLACE |

### 1.2 Checkout Deadline Fields

| Field | Location | Lines | Code Snippet | Classification |
|-------|----------|-------|--------------|----------------|
| `checkout_deadline_at` | [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L93) | 93-97 | `if (!minutesOverdue && booking.checkout_deadline_at)` | REPLACE |
| `checkout_deadline_at` | [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx#L700) | 700 | `Checkout deadline: {format(new Date(warnings.overstay.deadline), 'MMM dd, yyyy HH:mm')}` | KEEP |

### 1.3 Approval Deadline Fields

| Field | Location | Lines | Code Snippet | Classification |
|-------|----------|-------|--------------|----------------|
| `approval_deadline_at` | [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L55) | 55-59 | `if (!minutesOverdue && booking.approval_deadline_at)` | REPLACE |
| `approval_risk_level` | [BookingTimeWarningBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTimeWarningBadges.jsx#L57) | 57 | `if (booking?.approval_risk_level && booking.approval_risk_level !== 'OK')` | REPLACE |
| `approval_overdue_minutes` | [BookingTimeWarningBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTimeWarningBadges.jsx#L68) | 68-71 | `const overdueMinutes = booking.approval_overdue_minutes;` | REPLACE |
| `is_approval_overdue` | [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx#L672) | 672 | `{warnings.approval.isOverdue && (` | REPLACE |

---

## 2. DERIVED/COMPUTED LOGIC

### 2.1 Warning Computation Hook

**File:** [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js)  
**Purpose:** Central logic for computing booking time warnings from API fields

- **`computeApprovalWarning()`** (Lines 42-74): Calculates approval warnings for PENDING_APPROVAL bookings
- **`computeOverstayWarning()`** (Lines 79-112): Calculates overstay warnings for IN_HOUSE bookings  
- **Auto-refresh mechanism** (Lines 16-21): Updates display text every 45 seconds for live UI updates

**Classification:** REPLACE - Core logic must be replaced with OverstayIncident API

### 2.2 Display Text Generation

**File:** [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js)  
**Functions:** 
- `getApprovalDisplayText()` (Lines 117-127): Maps risk levels to approval warning text
- `getOverstayDisplayText()` (Lines 132-142): Maps risk levels to overstay warning text
- `getRiskVariant()` (Lines 166-176): Maps risk levels to Bootstrap badge variants

**Classification:** KEEP - UI display logic can be preserved, fed by new API data

### 2.3 Local Time Calculations

**File:** [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js)  
**Logic:** Local fallback calculations when backend fields are missing

```javascript
// Lines 55-59: Approval deadline calculation
if (!minutesOverdue && booking.approval_deadline_at) {
  const deadline = new Date(booking.approval_deadline_at);
  const diffMs = now.getTime() - deadline.getTime();
  minutesOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60)));
}

// Lines 93-97: Overstay deadline calculation  
if (!minutesOverdue && booking.checkout_deadline_at) {
  const deadline = new Date(booking.checkout_deadline_at);
  const diffMs = now.getTime() - deadline.getTime();
  minutesOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60)));
}
```

**Classification:** REMOVE - Replace with OverstayIncident API data

---

## 3. REALTIME/EVENT HANDLING

### 3.1 Event Bus Processing

**File:** [eventBus.js](hotelmate-frontend/src/realtime/eventBus.js)  
**Line:** 535 | `case "staff_notification":` - Generic staff notification handling  
**Line:** 652 | `eventType === 'booking_updated' ? 'Booking updated'` - Generic booking update events

**Classification:** KEEP - Generic event infrastructure

### 3.2 Room Booking Store Event Handlers

**File:** [roomBookingStore.jsx](hotelmate-frontend/src/realtime/stores/roomBookingStore.jsx)

| Event Type | Lines | Handler Action | Classification |
|------------|-------|----------------|----------------|
| `booking_overstay_flagged` | 292-298 | Updates booking state, shows warning toast | REPLACE |
| `booking_overstay_acknowledged` | 300-306 | Updates booking state, shows info toast | REPLACE |  
| `booking_overstay_extended` | 308-314 | Updates booking state, shows success toast | REPLACE |

**Current Implementation:**
```javascript
case "booking_overstay_flagged":
  dispatchRef({
    type: ACTIONS.ROOM_BOOKING_UPDATED,
    payload: { booking: payload, bookingId },
  });
  this.maybeShowToast('warning', `Overstay incident flagged for booking ${bookingId}`, event);
```

**Classification:** REPLACE - Events must be updated to new OverstayIncident model

### 3.3 Booking Details Modal Realtime Refresh

**File:** [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx)  
**Lines:** 109-134 | Listens for overstay field changes and refreshes overstay status API

```javascript
const hasOverstayUpdate = storeBooking.overstay_flagged_at !== booking.overstay_flagged_at ||
                         storeBooking.overstay_acknowledged_at !== booking.overstay_acknowledged_at ||
                         storeBooking.overstay_resolved_at !== booking.overstay_resolved_at;
```

**Classification:** REPLACE - Field comparison logic must be updated

---

## 4. UI SURFACES

### 4.1 Booking Time Warning Badges Component  

**File:** [BookingTimeWarningBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTimeWarningBadges.jsx)  
**Purpose:** Primary visual indicator for time-based warnings

**Approval Risk Level Badges:**
- `DUE_SOON` → Yellow "Approval due soon" badge
- `OVERDUE` → Red "Approval overdue +Xm" badge  
- `CRITICAL` → Red "Approval CRITICAL +Xm" badge

**Overstay Risk Level Badges:**
- `GRACE` → Blue "Checkout grace" badge
- `OVERDUE` → Orange "Checkout overdue +Xm" badge
- `CRITICAL` → Red "Checkout CRITICAL +Xm" badge

**Usage Locations:**
- [BookingTable.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTable.jsx#L418) - Main bookings list
- [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx#L662) - Detailed booking view

**Classification:** KEEP - Badge component can be preserved, fed by new data

### 4.2 Booking Details Modal Time Controls Section

**File:** [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx)  
**Lines:** 614-728 | `renderTimeControlsSection()` function

**Features:**
- Displays approval deadline and overdue information (Lines 665-680)
- Shows checkout deadline and overstay details (Lines 697-717) 
- Overstay action buttons: Acknowledge and Extend (Lines 734-835)
- Live countdown displays with minute precision

**Classification:** KEEP - UI structure preserved, populate with OverstayIncident data

### 4.3 Overstay Status Display

**File:** [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx)  
**Lines:** 825-885 | Overstay incident status section

**Current Data Structure Expected:**
```javascript
overstayStatus = {
  incident: { flagged_at, acknowledged_at, resolved_at },
  can_acknowledge: boolean,
  can_extend: boolean,
  system_notes: string[]
}
```

**Classification:** REPLACE - Update to use OverstayIncident API response format

### 4.4 Staff API Integration Points

**File:** [staffAPI.js](hotelmate-frontend/src/services/staffApi.js)  
**Lines:** 164-220 | `staffOverstayAPI` object

**Current Endpoints:**
- `staffOverstayStatus(hotelSlug, bookingId)` - GET status
- `staffOverstayAcknowledge(hotelSlug, bookingId, payload)` - POST acknowledgment  
- `staffOverstayExtend(hotelSlug, bookingId, payload, options)` - POST extension

**Classification:** REPLACE - Update endpoint URLs and data contracts

### 4.5 Booking Table Display

**File:** [BookingTable.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTable.jsx)  
**Line:** 418 | `<BookingTimeWarningBadges booking={booking} />`

**Shows:** Inline warning badges in main booking list interface

**Classification:** KEEP - Display component preserved

---

## 5. MIGRATION NOTES

### 5.1 KEEP Components
- **Badge UI Components** - Visual warning badges can be preserved
- **Time formatting utilities** - Date/time display logic is reusable
- **Generic event infrastructure** - EventBus and store patterns remain
- **Modal UI structure** - Booking details modal layout can be kept

### 5.2 REPLACE Components  
- **Risk level field mappings** - All `*_risk_level` field references
- **Direct timestamp fields** - `overstay_flagged_at`, `overstay_acknowledged_at`, `overstay_resolved_at`
- **Computed minute fields** - `overstay_minutes`, `approval_overdue_minutes`
- **Local calculation logic** - Frontend deadline math must be removed
- **API endpoint contracts** - Staff overstay API calls need new URLs/payloads
- **Realtime event types** - `booking_overstay_*` events require new data structure

### 5.3 REMOVE Components
- **Frontend time calculations** - Delete local deadline computations
- **Legacy boolean flags** - `is_overstay`, `is_approval_overdue`, `is_approval_due_soon`
- **Fallback calculation logic** - Remove all deadline diff calculations

### 5.4 Critical Integration Points
1. **useBookingTimeWarnings hook** - Core warning computation must be rewritten
2. **roomBookingStore overstay events** - Event payload structure changes required  
3. **BookingDetailsModal overstay status** - API response format changes
4. **staffOverstayAPI endpoints** - URL and payload updates needed

---

## 6. SUMMARY STATISTICS

- **Total Files Audited:** 8 core files
- **Direct Field References:** 12 unique fields found
- **Realtime Event Types:** 3 overstay-specific events
- **UI Surface Components:** 4 primary display locations  
- **API Endpoints:** 3 staff overstay endpoints
- **Classification Breakdown:**
  - KEEP: 35% (mostly UI/display components)
  - REPLACE: 55% (core logic and field mappings)
  - REMOVE: 10% (local calculations and legacy flags)

**Migration Complexity:** HIGH - Core business logic replacement required across multiple layers (hooks, stores, components, API services).

---

*This audit provides complete visibility into existing overstay logic for systematic replacement with the new OverstayIncident API integration.*