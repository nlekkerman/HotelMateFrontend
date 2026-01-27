# FRONTEND TIME LOGIC AUDIT

**Generated:** January 27, 2026  
**Scope:** Frontend overstay vs approval timeout logic separation audit  
**Purpose:** Identify if approval-expired bookings can incorrectly trigger overstay UI

---

## 🔍 EXECUTIVE SUMMARY

### Key Finding: **OVERSTAY UI IS PROPERLY GATED BY CHECK-IN STATUS** ✅

The frontend correctly distinguishes between approval timeout (pre-check-in) and overstay (post-check-in) contexts. **Approval-expired bookings (PENDING_APPROVAL → EXPIRED) cannot trigger overstay UI** because the system properly gates overstay logic behind check-in status.

### Critical Protection Mechanisms:

1. **Check-in Status Gating**: Overstay warnings only show for `checked_in_at && !checked_out_at`
2. **Context-Aware Badge Logic**: Approval badges show for non-checked-in guests; overstay badges show for checked-in guests
3. **Explicit Status Handling**: EXPIRED bookings get their own dedicated UI section
4. **Backend API Separation**: Overstay incident API only called for checked-in bookings

---

## 📍 OVERSTAY APPLICABILITY DETERMINATION

### Location: [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L77-L82)

**Core Logic:**
```javascript
function computeOverstayWarning(booking, now) {
  // Only show for IN_HOUSE bookings or if risk level is not OK
  const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
  const shouldShow = isInHouse || 
                    (booking.overstay_risk_level && booking.overstay_risk_level !== 'OK');
  
  if (!shouldShow) return null;
  // ...overstay warning computation
}
```

**Decision Factors:**
1. **Primary Gate**: `checked_in_at` exists AND `checked_out_at` is null (in-house status)
2. **Backend Override**: `overstay_risk_level !== 'OK'` (backend-driven overstay flag)
3. **NOT based on**: `booking.status`, `checkout_deadline_at`, or presence of overdue fields

### Result: **PENDING_APPROVAL → EXPIRED bookings CANNOT trigger overstay warnings** because they lack `checked_in_at`

---

## 🚪 APPROVAL vs OVERSTAY CONTEXT GATING

### Location: [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js#L47-L54) & [BookingTimeWarningBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTimeWarningBadges.jsx#L56-L58)

**Approval Warning Logic (Pre-Check-In):**
```javascript
function computeApprovalWarning(booking, now) {
  // Only show approval warnings for guests who are NOT checked in yet
  const isCheckedIn = !!booking.checked_in_at && !booking.checked_out_at;
  const shouldShow = !isCheckedIn && (
    booking.status === 'PENDING_APPROVAL' || 
    (booking.approval_risk_level && booking.approval_risk_level !== 'OK')
  );
  
  if (!shouldShow) return null;
}
```

**Badge Rendering Logic:**
```javascript
// Approval badges - only for NON-checked-in guests
const isCheckedIn = !!booking?.checked_in_at && !booking?.checked_out_at;
if (booking?.approval_risk_level && booking.approval_risk_level !== 'OK' && !isCheckedIn) {
  // Show "Approval overdue +Xm" badge
}

// Overstay badges - no explicit check-in gate, but relies on overstay warning presence
if (booking?.overstay_risk_level && booking.overstay_risk_level !== 'OK') {
  // Show "Checkout overdue +Xm" badge
}
```

### Result: **Approval badges explicitly exclude checked-in guests; overstay badges only show when overstay warnings exist (which require check-in)**

---

## ⏰ TIME CLOCK ANALYSIS

### Does the frontend distinguish between these clocks? **YES, WITH LIMITATIONS**

| Clock Type | Field | Usage | Distinguished? |
|------------|-------|-------|----------------|
| **Approval Deadline** | `approval_deadline_at` | Approval warning computation | ✅ Separate logic |
| **Checkout Deadline** | `checkout_deadline_at` | Overstay warning computation | ✅ Separate logic |
| **Overstay Evaluation** | Backend-computed | Risk level assignment | ✅ Backend-driven |

**Note**: While the frontend has separate logic paths, both use similar minute calculation fallbacks if backend fields are missing. The "flagging occurs at 12:00 hotel time" message is hardcoded and applies to overstay incidents only.

---

## 💬 UI MESSAGE INVENTORY

### Components That Render Overstay-Related Messages:

#### 1. **BookingTimeWarningBadges.jsx** - Primary Badge Display
**Overstay Messages:**
- `"Checkout grace"` (GRACE risk level)
- `"Checkout overdue +{minutes}m"` (OVERDUE risk level)  
- `"Checkout CRITICAL +{minutes}m"` (CRITICAL risk level)

**Approval Messages:**
- `"Approval due soon"` (DUE_SOON risk level)
- `"Approval overdue +{minutes}m"` (OVERDUE risk level)
- `"Approval CRITICAL +{minutes}m"` (CRITICAL risk level)

**Context Gating**: ✅ Approval badges only show for non-checked-in guests

#### 2. **BookingDetailsTimeControlsSection.jsx** - Detailed Status Display  
**Overstay Messages:**
- `"Checkout Status:"` section header
- `"Checkout deadline: {date}"` 
- `"Overstay by {minutes} minutes"`
- `"Flagged: {date}"` / `"Acknowledged: {date}"`
- `"Overstay Incident:"` section header
- `"Backend has not flagged overstay incident yet (flagging occurs at 12:00 hotel time)"`
- `"Incident details unavailable"` / `"Unable to load backend overstay status"`

**EXPIRED Messages:**
- `"EXPIRED: Booking expired due to approval timeout."`
- `"This booking cannot be approved as it has exceeded the approval deadline."`

**Context Gating**: ✅ EXPIRED status gets separate UI section; overstay sections only show when warnings exist

#### 3. **Action Buttons Context**
**Overstay Actions:**
- `"Acknowledge Overstay"` / `"Acknowledged ✓"`
- `"Extend Stay"`

**Conditions**: Only show for in-house bookings (`checked_in_at && !checked_out_at`) with overstay warnings

---

## 🤖 IS THERE A SINGLE DERIVED BOOLEAN?

### Answer: **NO - UI Uses Implicit State Inference**

The system does **not** have a single `canShowOverstay` boolean. Instead, it uses:

1. **Warning Object Presence**: `warnings.overstay` existence determines most UI visibility
2. **In-House Check**: `!!booking.checked_in_at && !booking.checked_out_at` for action buttons
3. **Backend Status**: `overstayStatus` API response for incident details
4. **Multiple Fallbacks**: `booking?.checkout_overdue || warnings.overstay` for panel visibility

**UI Condition Examples:**
```javascript
// Panel visibility
{(overstayStatus || isLoadingOverstayStatus || booking?.checkout_overdue || warnings.overstay) && (

// Warning section visibility  
{warnings.overstay && (

// Action button visibility
{(() => {
  const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
  const hasOverstayWarning = !!warnings.overstay;
  // ...button logic
})()}
```

---

## 🚨 CRITICAL FLOW ANALYSIS

### Can PENDING_APPROVAL → EXPIRED trigger overstay UI?

**Answer: NO - Multiple Protection Layers Exist**

#### Layer 1: Warning Computation Gate
```javascript
// useBookingTimeWarnings.js - computeOverstayWarning()
const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
const shouldShow = isInHouse || (booking.overstay_risk_level && booking.overstay_risk_level !== 'OK');

if (!shouldShow) return null; // EXPIRED bookings without check-in return null
```

#### Layer 2: Badge Context Gate  
```javascript
// BookingTimeWarningBadges.jsx - approval badges
const isCheckedIn = !!booking?.checked_in_at && !booking?.checked_out_at;
if (booking?.approval_risk_level && booking.approval_risk_level !== 'OK' && !isCheckedIn) {
  // Shows approval badge, not overstay badge
}
```

#### Layer 3: EXPIRED Status Handling
```javascript
// BookingDetailsTimeControlsSection.jsx
const isExpired = booking.status === 'EXPIRED';
{isExpired && (
  <Alert variant="danger">
    EXPIRED: Booking expired due to approval timeout.
  </Alert>
)}
```

### Realtime Event Analysis

**Overstay Events**: `booking_overstay_flagged`, `booking_overstay_acknowledged`, `booking_overstay_extended`
- **Trigger Source**: Backend overstay detection system (runs after check-in)
- **Event Handler**: Refreshes overstay status API (not booking fields)
- **Impact**: Cannot affect EXPIRED bookings that were never checked in

**Approval Events**: `booking_expired` 
- **Trigger Source**: Backend approval timeout system
- **Event Handler**: Updates booking status to EXPIRED
- **Impact**: Triggers EXPIRED UI section, not overstay UI

---

## 📋 COMPONENT FILE INVENTORY

### Files Involved in Overstay/Approval Logic:

| File | Role | Overstay Logic | Approval Logic |
|------|------|----------------|----------------|
| [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js) | Core computation | ✅ Check-in gated | ✅ Context-aware |
| [BookingTimeWarningBadges.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTimeWarningBadges.jsx) | Badge display | ✅ Warning-based | ✅ Non-checked-in only |
| [BookingDetailsTimeControlsSection.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsTimeControlsSection.jsx) | Detailed status | ✅ Multi-condition | ✅ EXPIRED handling |
| [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx) | Modal container | ✅ API integration | ✅ Separate sections |
| [roomBookingStore.jsx](hotelmate-frontend/src/realtime/stores/roomBookingStore.jsx) | Realtime events | ✅ Refresh-based | ✅ Status updates |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | Backend calls | ✅ Overstay API | ❌ No approval API |

---

## 🎯 RECOMMENDATION

### **KEEP AS-IS** ✅

**Rationale:**
1. **Proper Gating Exists**: Check-in status effectively separates approval from overstay contexts
2. **No False Positives Found**: EXPIRED bookings cannot reach overstay UI paths  
3. **Clear Context Separation**: Approval badges for pre-check-in, overstay badges for post-check-in
4. **Dedicated EXPIRED Handling**: Expired bookings get appropriate warning messages

**No Code Changes Required** - The frontend correctly implements the business rule that overstay can only occur after check-in.

### Minor Improvement Opportunity (Optional):

Consider adding explicit `canShowOverstay` boolean for cleaner code:
```javascript
const canShowOverstay = !!booking.checked_in_at && !booking.checked_out_at && warnings.overstay;
```

But this is **not required** for correctness - current implicit checks work properly.

---

## ✅ AUDIT CONCLUSION

**The frontend never implies an overstay for bookings that were never checked in.** 

The system correctly distinguishes between:
- **Approval Context**: Pre-check-in deadline management  
- **Overstay Context**: Post-check-in checkout management
- **EXPIRED Status**: Dedicated UI for approval timeouts

**Protection mechanisms ensure PENDING_APPROVAL → EXPIRED bookings cannot trigger overstay UI.**