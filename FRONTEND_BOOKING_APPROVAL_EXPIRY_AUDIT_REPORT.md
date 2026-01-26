# FRONTEND BOOKING APPROVAL + EXPIRY AUDIT REPORT

**Audit Date:** January 26, 2025  
**Focus:** How booking approval and expiry is interpreted and displayed, especially for SAME-DAY bookings  
**Objective:** Ensure frontend does NOT prematurely hide or kill bookings that staff can still approve

---

## 1. STATUS INTERPRETATION

### 1.1 How Frontend Treats `status = EXPIRED`

**File:** [src/components/staff/bookings/BookingStatusBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingStatusBadges.jsx#L35)

```jsx
// Handle EXPIRED status first
if (status === 'EXPIRED') {
  primaryBadge = (
    <Badge bg="dark" className="me-1 text-white">
      <i className="bi bi-clock-history me-1"></i>
      EXPIRED
    </Badge>
  );
}
```

**Interpretation:** 
- EXPIRED bookings display a **dark badge** with clock icon
- Status is treated as the **primary badge** (takes precedence over other badges)
- Visual treatment suggests "dead/inactive" state

### 1.2 Is EXPIRED Assumed Fully Dead/Un-actionable?

**File:** [src/components/staff/bookings/BookingActions.jsx](hotelmate-frontend/src/components/staff/bookings/BookingActions.jsx#L32-L35)

```jsx
// Disable all actions if booking is expired
const isExpired = booking.status === 'EXPIRED';
const effectiveCanApprove = canApprove && !isExpired;
const effectiveCanDecline = canDecline && !isExpired;
const effectiveCanSendPrecheckin = canSendPrecheckin && !isExpired;
```

**Answer:** **YES** - EXPIRED is treated as fully dead/un-actionable:
- ALL booking actions are disabled when `status === 'EXPIRED'`
- Shows message: "Actions disabled - booking expired" ([line 91-95](hotelmate-frontend/src/components/staff/bookings/BookingActions.jsx#L91-L95))

### 1.3 Are There Cases Where EXPIRED Still Shows in Booking Lists?

**Analysis:**
- No explicit filtering found that excludes EXPIRED bookings from lists
- **EXPIRED bookings will appear in booking lists** if returned by backend API
- Non-operational status filtering only excludes: `['DRAFT', 'PENDING_PAYMENT', 'CANCELLED_DRAFT']` ([realtime store](hotelmate-frontend/src/realtime/stores/roomBookingStore.jsx#L17))
- EXPIRED is NOT in the excluded list

**Answer:** **YES** - EXPIRED bookings appear in booking lists but with disabled actions

---

## 2. APPROVAL VISIBILITY

### 2.1 For `PENDING_APPROVAL` Bookings

#### Badges Shown:

**File:** [src/pages/bookings/BookingStatusPage.jsx](hotelmate-frontend/src/pages/bookings/BookingStatusPage.jsx#L243-L254)

```jsx
case "pending_approval":
case "pending approval":
case "pending":
  if (booking?.paid_at) {
    return {
      color: "primary",
      icon: "check-circle",
      text: "Payment received — under review",
    };
  }
  return {
    color: "warning",
    icon: "clock-history", 
    text: "Awaiting Approval",
  };
```

**Badge Logic:**
- **With payment:** Blue "Payment received — under review" badge
- **Without payment:** Yellow "Awaiting Approval" badge

**File:** [src/components/staff/bookings/BookingTimeWarningBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTimeWarningBadges.jsx)

Time-sensitive warning badges based on:
- `approval_risk_level`: "OK" | "DUE_SOON" | "OVERDUE" | "CRITICAL"
- `is_approval_due_soon`: boolean
- `is_approval_overdue`: boolean
- `approval_overdue_minutes`: number

#### Actions Available:

**File:** [src/components/staff/bookings/BookingActions.jsx](hotelmate-frontend/src/components/staff/bookings/BookingActions.jsx#L25-L26)

```jsx
const canApprove = booking.status === 'PENDING_APPROVAL' || booking.status === 'PENDING_PAYMENT';
const canDecline = booking.status === 'PENDING_APPROVAL' || booking.status === 'PENDING_PAYMENT';
```

**Available Actions:**
- ✅ **Approve** button (green)
- ✅ **Decline** button (red)
- ❌ Pre-checkin actions (only for CONFIRMED)

### 2.2 Same-Day PENDING_APPROVAL Treatment

**Analysis:**
- NO special frontend logic found for same-day vs future PENDING_APPROVAL bookings
- Same-day bookings receive **identical treatment** to future bookings
- Time warnings are based on `approval_deadline_at` field from backend, NOT check-in date

**Answer:** Same-day PENDING_APPROVAL bookings are treated **identically** to future bookings

---

## 3. BADGE LOGIC

### 3.1 Fields Controlling Approval-Related Badges

**Primary Status Badge:**
- **Field:** `booking.status` 
- **File:** [BookingStatusBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingStatusBadges.jsx)

**Time Warning Badges:**
- **Fields from Backend Contract:** ([BOOKING_TIME_CONTROLS_IMPLEMENTATION.md](BOOKING_TIME_CONTROLS_IMPLEMENTATION.md#L34-L43))
  ```javascript
  {
    approval_deadline_at: "2025-01-20T15:30:00Z", // ISO string or null
    is_approval_due_soon: true,                    // boolean
    is_approval_overdue: false,                    // boolean  
    approval_overdue_minutes: 0,                   // number
    approval_risk_level: "DUE_SOON"               // "OK" | "DUE_SOON" | "OVERDUE" | "CRITICAL"
  }
  ```

**Badge Control Logic:**
- `status` controls primary badge
- Backend approval timing fields control warning badges
- Local timestamp calculations for "minutes overdue" display

### 3.2 Approval Warning Concepts

**File:** [src/hooks/useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L46-L73)

```jsx
function computeApprovalWarning(booking, now) {
  // Only show approval warnings for guests who are NOT checked in yet
  const isCheckedIn = !!booking.checked_in_at && !booking.checked_out_at;
  const shouldShow = !isCheckedIn && (
    booking.status === 'PENDING_APPROVAL' || 
    (booking.approval_risk_level && booking.approval_risk_level !== 'OK')
  );
  
  if (!shouldShow) return null;

  const riskLevel = booking.approval_risk_level || 'OK';
  const minutesOverdue = booking.approval_overdue_minutes || 0;

  return {
    riskLevel,
    deadline: booking.approval_deadline_at,
    minutesOverdue: minutesOverdue || 0,
    isDueSoon: booking.is_approval_due_soon || riskLevel === 'DUE_SOON',
    isOverdue: booking.is_approval_overdue || riskLevel === 'OVERDUE' || riskLevel === 'CRITICAL'
  };
}
```

**Concepts Supported:**
- ✅ **Approval due soon** (warning level)
- ✅ **Approval overdue** (danger level)
- ❌ **Approval expired (hard stop)** - NOT differentiated from overdue

**Missing:** No concept of "hard expiration" vs "soft overdue" - both treated as actionable warnings

---

## 4. BOOKING LIST FILTERING

### 4.1 Are EXPIRED Bookings Filtered Out?

**Analysis of Filtering Logic:**

**File:** [src/hooks/useBookingManagement.js](hotelmate-frontend/src/hooks/useBookingManagement.js#L63-L75)

```javascript
switch (filterValue) {
  case 'pending':
    params.append('status', 'PENDING_PAYMENT,PENDING_APPROVAL');
    break;
  case 'confirmed':
    params.append('status', 'CONFIRMED');
    break;
  case 'completed':
    params.append('status', 'COMPLETED');
    break;
  case 'cancelled':
    params.append('status', 'CANCELLED');
    break;
  case 'history':
    params.append('status', 'COMPLETED,CANCELLED,CHECKED_OUT');
    break;
}
```

**Statistics Calculation:** [lines 206-221](hotelmate-frontend/src/hooks/useBookingManagement.js#L206-L221)

```javascript
return {
  total: bookings.length,
  pending: bookings.filter(b => b.status === 'PENDING_PAYMENT' || b.status === 'PENDING_APPROVAL').length,
  pendingPayment: bookings.filter(b => b.status === 'PENDING_PAYMENT').length,
  pendingApproval: bookings.filter(b => b.status === 'PENDING_APPROVAL').length,
  confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
  cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
  completed: bookings.filter(b => b.status === 'COMPLETED' || b.checked_out_at != null).length,
  // ... other buckets
};
```

**Answer:** **NO** - EXPIRED bookings are NOT filtered out:
- No status filter specifically excludes EXPIRED
- EXPIRED bookings appear in "All" view
- EXPIRED not counted in any filter category statistics
- Will appear as "orphaned" bookings not counted in filter buttons

### 4.2 Risk: Same-Day Unapproved Bookings Hidden?

**Risk Assessment:**
- ❌ **LOW RISK** for filtering - EXPIRED bookings still visible in "All" view
- ✅ **HIGH RISK** for actions - EXPIRED bookings show but cannot be acted upon
- ⚠️ **MEDIUM RISK** for statistics - EXPIRED bookings not counted, may confuse staff

---

## 5. ACTION SAFETY

### 5.1 Can Staff Still Approve EXPIRED Bookings?

**Frontend Analysis:**

**File:** [BookingActions.jsx](hotelmate-frontend/src/components/staff/bookings/BookingActions.jsx#L32-L35)

```jsx
const isExpired = booking.status === 'EXPIRED';
const effectiveCanApprove = canApprove && !isExpired;
const effectiveCanDecline = canDecline && !isExpired;
```

**Answer:** **NO** - Frontend prevents approval of EXPIRED bookings

### 5.2 Is This Frontend-Only or Backend-Enforced?

**Backend Integration Analysis:**

**File:** [useBookingManagement.js](hotelmate-frontend/src/hooks/useBookingManagement.js#L251-L261)

```javascript
// Handle HTTP 409 (booking expired) specifically
if (error.response?.status === 409) {
  // Show specific error message from backend
  const errorMessage = error.response?.data?.message || 'Booking expired due to approval timeout and cannot be approved.';
  toast.error(errorMessage);
  
  // Refresh the booking state to reflect EXPIRED status
  queryClient.invalidateQueries({
    queryKey: ['staff-room-bookings', hotelSlug]
  });
}
```

**Answer:** **BOTH** - Frontend + Backend enforced:
- Frontend disables approve/decline buttons for EXPIRED
- Backend returns HTTP 409 if somehow approval attempted on EXPIRED
- Frontend shows specific error message and refreshes booking list

---

## 6. MISMATCH RISKS

### 6.1 Critical Mismatch Scenarios

#### Scenario 1: Same-Day PENDING_APPROVAL → EXPIRED Transition
```
Timeline:
- 10:00 AM: Guest books same-day room, pays, status = PENDING_APPROVAL
- 11:30 AM: Backend auto-expires booking due to approval timeout
- 11:31 AM: Staff tries to approve → Frontend shows EXPIRED, actions disabled
- Result: Staff cannot approve even if business rules allow same-day flexibility
```

#### Scenario 2: Race Condition During Approval
```
Timeline:
- Staff clicks "Approve" on PENDING_APPROVAL booking
- Backend processes expiration during approval attempt
- Frontend receives 409 error, booking refreshes as EXPIRED
- Result: Approval lost, booking now un-actionable from frontend
```

#### Scenario 3: Backend Grace Period vs Frontend Strict Rules
```
Backend Logic: EXPIRED bookings may still be approvable within X minutes
Frontend Logic: EXPIRED = dead, no actions allowed
Result: Backend-actionable bookings appear dead in frontend
```

### 6.2 Specific Same-Day Issues

**Issue:** [useExpiredBookingHandler.js](hotelmate-frontend/src/hooks/useExpiredBookingHandler.js#L43-L44)

```javascript
const isExpiredStatus = useCallback((status) => {
  return status === 'CANCELLED_DRAFT'; // ⚠️ Only checks CANCELLED_DRAFT, not EXPIRED
}, []);
```

**CRITICAL BUG:** The `isExpiredStatus` function only checks for `CANCELLED_DRAFT` but NOT `EXPIRED` status!

**This means:**
- Guest-facing expired booking handler may not trigger for EXPIRED bookings
- Staff-facing components handle EXPIRED correctly
- Inconsistent expiration handling between guest and staff views

---

## 7. RECOMMENDATIONS

### 7.1 Immediate Fixes

1. **Fix Expired Status Handler Bug:**
   ```javascript
   // File: useExpiredBookingHandler.js
   const isExpiredStatus = useCallback((status) => {
     return status === 'CANCELLED_DRAFT' || status === 'EXPIRED';
   }, []);
   ```

2. **Add EXPIRED to Statistics:**
   ```javascript
   // File: useBookingManagement.js - statistics calculation
   expired: bookings.filter(b => b.status === 'EXPIRED').length,
   ```

3. **Add EXPIRED Filter Category:**
   ```jsx
   // Add filter button for viewing EXPIRED bookings
   <button className="btn btn-outline-warning btn-sm">
     Expired ({statistics.expired || 0})
   </button>
   ```

### 7.2 Same-Day Booking Safety

1. **Add Grace Period Concept:**
   - Check for `can_still_be_approved` backend field
   - Show warning instead of full disable for recent EXPIRED

2. **Enhanced Warning Display:**
   ```jsx
   {isExpired && booking.can_still_be_approved && (
     <Alert variant="warning">
       <strong>EXPIRED</strong> but may still be approvable within grace period
     </Alert>
   )}
   ```

3. **Backend Field Dependencies:**
   - `expired_at`: timestamp when booking expired
   - `auto_expire_reason_code`: why it expired
   - `can_still_be_approved`: boolean for grace period
   - `grace_period_expires_at`: when grace period ends

### 7.3 Action Safety Improvements

1. **Conditional Action Disable:**
   ```javascript
   const canStillApprove = booking.status === 'EXPIRED' && booking.can_still_be_approved;
   const effectiveCanApprove = (canApprove && !isExpired) || canStillApprove;
   ```

2. **Enhanced Error Handling:**
   - Distinguish between "hard expired" and "grace period expired"
   - Show specific error messages for different expiration types

---

## 8. SUMMARY

### Current State:
- ✅ EXPIRED bookings display in lists with disabled actions
- ✅ Frontend and backend both enforce expiration restrictions
- ✅ Clear visual indicators for EXPIRED status
- ❌ No concept of grace periods or same-day flexibility
- ❌ Bug in guest-facing expired status detection
- ❌ EXPIRED bookings not counted in filter statistics

### Risk Level: **MEDIUM-HIGH**

**Primary Risk:** Frontend may be **more restrictive** than backend business rules allow, especially for same-day bookings where quick approval might still be acceptable.

**Recommended Action:** Implement grace period concept and enhanced backend field support to prevent premature killing of actionable bookings.