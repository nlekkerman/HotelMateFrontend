# STAFF FRONTEND OVERSTAY COMPLIANCE AUDIT REPORT

## AUDIT SCOPE
This audit verifies if the STAFF frontend matches the overstay specification:
- Europe/Dublin noon rule (12:00 PM hotel time on checkout day)
- Badge: "Checkout CRITICAL +XXXXm" minutes overdue  
- Booking status flow: CONFIRMED -> IN_HOUSE -> OVERSTAY -> COMPLETED
- Overstay incidents shown in BookingDetails (detected_at, status, acknowledgements/extensions)
- Realtime updates via Pusher; duration refresh ~ every 10 minutes

---

## 1) BADGE CALCULATION

### Minutes Overdue Formula
**Location:** [BookingTimeWarningBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTimeWarningBadges.jsx#L137-L150)
```jsx
case 'OVERDUE':
  const overdueMinutes = booking.overstay_minutes;
  displayText = overdueMinutes 
    ? `Checkout overdue +${overdueMinutes}m`
    : 'Checkout overdue';
  variant = 'warning';
  break;
case 'CRITICAL':
  const criticalMinutes = booking.overstay_minutes;
  displayText = criticalMinutes 
    ? `Checkout CRITICAL +${criticalMinutes}m`
    : 'Checkout CRITICAL';
  variant = 'danger';
  break;
```

**Computation Source:** Backend field `booking.overstay_minutes` - NO frontend calculation
**Formula:** Frontend displays pre-computed minutes from backend API

### Risk Level Thresholds
**Location:** [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L114-L125)
```javascript
function getOverstayDisplayText(riskLevel, minutesOverdue = 0) {
  switch (riskLevel) {
    case 'GRACE': return 'Checkout grace';
    case 'OVERDUE': return `Checkout overdue +${minutesOverdue}m`;
    case 'CRITICAL': return `Checkout CRITICAL +${minutesOverdue}m`;
    default: return null;
  }
}
```

**Thresholds:** 
- OK: No badge displayed
- GRACE: Blue "Checkout grace" badge
- OVERDUE: Orange "Checkout overdue +XXXXm" badge  
- CRITICAL: Red "Checkout CRITICAL +XXXXm" badge

### Timezone Handling
**Status:** ❌ **NO TIMEZONE LOGIC FOUND**
- No Europe/Dublin timezone calculations in frontend
- No noon (12:00 PM) rule implementation
- Frontend relies entirely on backend `checkout_deadline_at` ISO string
- **Comment in UI:** [BookingDetailsTimeControlsSection.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx#L252): "Backend has not flagged overstay incident yet (flagging occurs at 12:00 hotel time)"

---

## 2) IN-HOUSE / STATUS GATES

### In-House Determination
**Location:** [BookingStatusBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingStatusBadges.jsx#L5-L6)
```jsx
const isInHouse = (booking) => !!booking?.checked_in_at && !booking?.checked_out_at;
const isCheckedOut = (booking) => !!booking?.checked_out_at;
```

**Logic:** Based on `checked_in_at` and `checked_out_at` timestamps, NOT status field
**Used in:** 
- [BookingDetailsTimeControlsSection.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx#L133): `const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;`
- [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L77): `const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;`

### Overstay State Determination
**Location:** [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L77-L82)
```javascript
function computeOverstayWarning(booking, now) {
  const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
  const shouldShow = isInHouse || 
                    (booking.overstay_risk_level && booking.overstay_risk_level !== 'OK');
  
  if (!shouldShow) return null;
```

**Conditions for Overstay Warning Display:**
1. Guest is in-house (`checked_in_at` exists AND `checked_out_at` is null), OR
2. Backend `overstay_risk_level` is not 'OK' (covers cases where guest is flagged but not in-house)

### Action Button Conditions
**Location:** [BookingDetailsTimeControlsSection.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx#L133-L156)
```jsx
const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
const hasOverstayWarning = !!warnings.overstay;
const isOverstayFlagged = warnings.overstay?.flaggedAt;
const isAcknowledged = warnings.overstay?.acknowledgedAt;

const showAcknowledge = isInHouse && hasOverstayWarning && isOverstayFlagged && !isAcknowledged;
const showExtend = isInHouse && hasOverstayWarning;
```

**Acknowledge Button Shows When:**
- Guest is in-house AND has overstay warning AND is flagged AND not yet acknowledged

**Extend Button Shows When:**
- Guest is in-house AND has overstay warning

### Status Flow Handling
**❌ NO EXPLICIT STATUS FLOW LOGIC**
- Frontend does not enforce CONFIRMED -> IN_HOUSE -> OVERSTAY -> COMPLETED flow
- Status determination is purely timestamp-based (`checked_in_at`/`checked_out_at`)
- Backend `status` field is displayed but not used for overstay logic

---

## 3) INCIDENT DATA SOURCE

### Incident Data Loading
**Location:** [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx#L97-L109)
```jsx
const fetchOverstayStatus = async () => {
  if (!booking?.booking_id || !hotelSlug) return;
  
  console.log('[BookingDetailsModal] Fetching overstay status for:', booking.booking_id);
  setIsLoadingOverstayStatus(true);
  try {
    const response = await staffOverstayAPI.staffOverstayStatus(hotelSlug, booking.booking_id);
    console.log('[BookingDetailsModal] Overstay status response:', response.data);
    setOverstayStatus(response.data);
  } catch (error) {
    console.warn('[BookingDetailsModal] Failed to fetch overstay status:', error);
  }
}
```

**API Endpoint:** [staffApi.js](hotelmate-frontend/src/services/staffApi.js#L171): `GET /staff/api/v1/{hotelSlug}/room-bookings/{bookingId}/overstay/status/`

### Response Shape Used by UI
**Location:** [BookingDetailsTimeControlsSection.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx#L205-L245)
```jsx
{overstayStatus.incident ? (
  <>
    <Badge 
      bg={
        overstayStatus.incident.status === 'OPEN' ? 'danger' :
        overstayStatus.incident.status === 'ACKNOWLEDGED' ? 'warning' :
        overstayStatus.incident.status === 'RESOLVED' ? 'success' :
        'secondary'
      }
    >
      {overstayStatus.incident.status}
    </Badge>
    
    // Display fields:
    {overstayStatus.incident.expected_checkout_date}
    {overstayStatus.incident.detected_at}
    {overstayStatus.incident.hours_overdue}
  </>
)}
```

**Expected Response Structure:**
```javascript
{
  incident: {
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED',
    expected_checkout_date: "2026-01-26T12:00:00Z",
    detected_at: "2026-01-26T12:15:00Z", 
    hours_overdue: 2.5
  }
}
```

### Rendering Locations
**detected_at:** [BookingDetailsTimeControlsSection.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx#L233-L237)
**status:** [BookingDetailsTimeControlsSection.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx#L205-L215)
**extensions:** ❌ **NOT IMPLEMENTED** - Only acknowledgements are handled

---

## 4) REALTIME / REFRESH

### Pusher Event Subscriptions
**Channel:** [channelRegistry.js](hotelmate-frontend/src/realtime/channelRegistry.js#L63): `${hotelSlug}.room-bookings`

**Events Subscribed:**
- `booking_overstay_flagged`
- `booking_overstay_acknowledged`  
- `booking_overstay_extended`

### Event Handler Actions
**Location:** [roomBookingStore.jsx](hotelmate-frontend/src/realtime/stores/roomBookingStore.jsx#L292-L310)
```jsx
case "booking_overstay_flagged":
  this.emitOverstayRefresh(bookingId);
  this.maybeShowToast('warning', `Overstay incident flagged for booking ${bookingId}`, event);
  break;

case "booking_overstay_acknowledged":
  this.emitOverstayRefresh(bookingId);
  this.maybeShowToast('info', `Overstay acknowledged for booking ${bookingId}`, event);
  break;

case "booking_overstay_extended":
  this.emitOverstayRefresh(bookingId);
  this.maybeShowToast('success', `Stay extended for booking ${bookingId}`, event);
  break;
```

**Refresh Mechanism:** [roomBookingStore.jsx](hotelmate-frontend/src/realtime/stores/roomBookingStore.jsx#L325-L332)
```jsx
emitOverstayRefresh(bookingId) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('overstayStatusRefresh', { 
      detail: { bookingId } 
    }));
  }
}
```

### BookingDetailsModal Refresh
**Location:** [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx#L134-L144)
```jsx
const handleOverstayRefresh = (event) => {
  if (event.detail?.bookingId === booking.booking_id) {
    refreshOverstayStatus(); // Re-calls staffOverstayAPI.staffOverstayStatus
  }
};

window.addEventListener('overstayStatusRefresh', handleOverstayRefresh);
```

### Duration Refresh Timer
**❌ NO 10-MINUTE TIMER FOUND**
- Frontend uses 45-second refresh for warning text: [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L16-L20)
- No specific ~10 minute duration refresh mechanism
- Backend data is only refreshed on Pusher events, not periodic timer

---

## 5) MISMATCH RISKS

### Scenario: checked_in_at exists but status is CONFIRMED
**UI Behavior:** 
- Overstay badges will show based on `isInHouse = !!checked_in_at && !checked_out_at` 
- Status badge shows "IN-HOUSE · Room X" regardless of status field
- **Risk:** UI treats guest as in-house even if backend status hasn't updated to IN_HOUSE

**Code:** [BookingStatusBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingStatusBadges.jsx#L27): `const isGuestInHouse = isInHouse(booking);`

### Scenario: incident exists but UI doesn't read it  
**UI Behavior:**
- Separate overstay status API call may fail
- UI falls back to frontend warning computation
- **Fallback message:** [BookingDetailsTimeControlsSection.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx#L258-L264): "Unable to load backend overstay status" but "Frontend time warnings available"

**Code:** [BookingDetailsTimeControlsSection.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx#L261-L264)

---

## COMPLIANCE RESULTS

### ✅ PASS: Badge Format
- Badge displays "Checkout CRITICAL +XXXXm" format correctly
- Uses backend `overstay_minutes` field for minute calculation

### ❌ FAIL: Europe/Dublin Noon Rule
- **Location:** No timezone handling found in frontend
- **Issue:** Frontend relies entirely on backend `checkout_deadline_at` field
- **Expected:** Local timezone conversion and noon rule enforcement in UI

### ❌ FAIL: Status Flow Enforcement
- **Location:** No explicit CONFIRMED -> IN_HOUSE -> OVERSTAY -> COMPLETED validation
- **Issue:** Frontend uses timestamp logic only, ignores status progression
- **Expected:** UI should enforce proper status transitions

### ✅ PASS: BookingDetails Incident Display  
- Shows detected_at, status, and acknowledgements correctly
- **Minor Issue:** Extensions display not fully implemented

### ❌ FAIL: 10-Minute Duration Refresh
- **Location:** Only 45-second refresh cycle found
- **Issue:** No ~10 minute duration refresh mechanism
- **Expected:** Periodic duration updates separate from Pusher events

### ✅ PASS: Realtime Pusher Updates
- Subscribes to correct overstay events
- Refreshes overstay status API on events
- Shows appropriate toast notifications

---

## CRITICAL FINDINGS SUMMARY

1. **NO TIMEZONE HANDLING:** Frontend cannot enforce Europe/Dublin noon rule locally
2. **NO STATUS FLOW:** Missing CONFIRMED->IN_HOUSE->OVERSTAY->COMPLETED enforcement  
3. **WRONG REFRESH INTERVAL:** 45 seconds instead of ~10 minutes for duration updates
4. **INCOMPLETE EXTENSIONS:** Extension data display not fully implemented

**Overall Compliance:** 50% (3/6 requirements met)