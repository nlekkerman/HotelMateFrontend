# Booking Process Audit - Payment vs Status Logic

**Date**: January 20, 2026  
**Backend Change**: Payment can now be completed while booking is still PENDING_APPROVAL

## New Semantic Requirements

**CRITICAL**: UI must treat `paid_at` as payment state, not `status`

- ✅ **PENDING_APPROVAL + paid_at** = "Payment received — under review"
- ❌ **PENDING_APPROVAL without paid_at** = Still awaiting payment

---

## 🚨 Issues Found

### 1. Status Label Mappings

#### ❌ BookingStatusPage.jsx - Lines 233-240
```jsx
case "pending_approval":
case "pending approval":
case "pending":
  return {
    color: "warning",
    icon: "clock-history",
    text: "Awaiting Approval",  // ❌ WRONG - doesn't consider paid_at
  };
```

**Problem**: Shows "Awaiting Approval" regardless of payment status  
**Fix**: Check `paid_at` and show "Payment received — under review" when paid

---

### 2. Payment Success Page Assumptions

#### ✅ BookingPaymentSuccess.jsx - Line 336
```jsx
const isConfirmed = normalizedStatus === 'CONFIRMED' || Boolean(booking?.paid_at); // Legacy fallback
```

**Status**: CORRECT - Already checks `paid_at` as fallback

#### ✅ BookingPaymentSuccess.jsx - Lines 383-396
```jsx
) : isPendingApproval ? (
  <>
    <h1 className="display-6 fw-bold text-primary mb-2">Payment Authorized ✅</h1>
    <p className="lead text-muted mb-3">
      Your card has been authorized. The hotel will review and confirm your booking.
    </p>
```

**Status**: CORRECT - Already shows "Payment Authorized" for PENDING_APPROVAL

#### ✅ Lines 476-486
```jsx
<div className="fw-bold text-primary mb-2">Payment Authorized - Awaiting Hotel Confirmation</div>
<div className="mb-2">
  <small className="text-primary d-block mb-1">✓ No charge will be captured unless the booking is accepted</small>
```

**Status**: NEEDS UPDATE - Says "No charge will be captured" but now payment CAN be captured during PENDING_APPROVAL

---

### 3. Guest Booking Status Page Logic

#### ❌ BookingStatusPage.jsx - Lines 433-442
```jsx
const allowedStatuses = [
  "CONFIRMED",
  "PENDING_APPROVAL",
  "DECLINED",
  // ... other statuses
];
```

**Problem**: Lists PENDING_APPROVAL but doesn't differentiate payment state in UI
**Status**: Needs `paid_at` awareness in display logic

---

### 4. Staff Booking List Badges/Filters

#### ✅ BookingStatusBadges.jsx - Lines 67-72
```jsx
const showAdminBadge =
  !isInHouse && !isCheckedOut && status && status !== 'CONFIRMED';

const adminBadge = showAdminBadge ? (
  <Badge bg="secondary" className="me-1">
    {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
  </Badge>
) : null;
```

**Status**: PARTIALLY CORRECT - Shows status badge but doesn't indicate payment state

#### ✅ BookingTable.jsx - Lines 224-232
```jsx
{booking.paid_at && (
  <div className="paid-indicator">
    <i className="bi bi-check-circle-fill text-success me-1"></i>
    <span className="small text-success">Paid</span>
  </div>
)}
```

**Status**: EXCELLENT - Already shows paid indicator correctly

#### ❌ FilterControls.jsx - Lines 13-25
```jsx
const getStatusLabel = (status) => {
  switch (status) {
    case 'PENDING_PAYMENT':
      return `Pending Payment (${stats.pending})`;
    // No specific handling for PENDING_APPROVAL + paid_at
  }
};
```

**Problem**: No distinction for paid PENDING_APPROVAL vs unpaid

---

### 5. UI Assumptions About PENDING_APPROVAL = Unpaid

#### ❌ BookingActions.jsx - Lines 25-26
```jsx
const canApprove = booking.status === 'PENDING_APPROVAL' || booking.status === 'PENDING_PAYMENT';
const canDecline = booking.status === 'PENDING_APPROVAL' || booking.status === 'PENDING_PAYMENT';
```

**Problem**: Assumes PENDING_APPROVAL means needs approval AND payment  
**Fix**: Should work correctly since both states can be approved

#### ❌ useBookingManagement.js - Lines 214-216
```jsx
arrivals: bookings.filter(b => {
  const isToday = new Date(b.check_in).toDateString() === new Date().toDateString();
  return isToday && !b.checked_in_at && (b.status === 'CONFIRMED' || b.status === 'PENDING_APPROVAL');
}).length,
```

**Problem**: Includes PENDING_APPROVAL in arrivals regardless of payment status  
**Question**: Should unpaid PENDING_APPROVAL be in arrivals?

---

## 📋 Required Changes

### HIGH PRIORITY (UI Correctness)

1. **BookingStatusPage.jsx** - Update PENDING_APPROVAL status display:
   ```jsx
   case "pending_approval":
     if (booking?.paid_at) {
       return {
         color: "primary", 
         icon: "check-circle",
         text: "Payment received — under review"
       };
     }
     return {
       color: "warning",
       icon: "clock-history", 
       text: "Awaiting Approval"
     };
   ```

2. **BookingPaymentSuccess.jsx** - Fix misleading copy (Line 485):
   ```jsx
   // OLD: "No charge will be captured unless the booking is accepted"  
   // NEW: "Payment authorized - charge captured only after hotel approval"
   ```

### MEDIUM PRIORITY (UX Enhancement)

3. **BookingStatusBadges.jsx** - Add payment indicator for PENDING_APPROVAL:
   ```jsx
   if (status === 'PENDING_APPROVAL' && booking.paid_at) {
     return <Badge bg="primary">Paid - Under Review</Badge>;
   }
   ```

4. **FilterControls.jsx** - Consider separate filter for paid vs unpaid pending bookings

### LOW PRIORITY (Business Logic Review)

5. **useBookingManagement.js** - Review arrivals calculation:
   - Should paid PENDING_APPROVAL be in today's arrivals?
   - Should unpaid PENDING_APPROVAL be in arrivals?

---

## 🧪 Test Cases Required

1. **PENDING_APPROVAL + paid_at = true**
   - ✅ Shows "Payment received — under review" 
   - ✅ Payment success page shows "Payment Authorized"
   - ✅ Staff sees paid indicator

2. **PENDING_APPROVAL + paid_at = null**
   - ✅ Shows "Awaiting Approval"
   - ✅ No payment indicators

3. **Status transitions**
   - PENDING_PAYMENT → PENDING_APPROVAL (with paid_at)
   - PENDING_APPROVAL → CONFIRMED
   - PENDING_APPROVAL → DECLINED (with refund)

---

## 🔧 Implementation Notes

- Most components already check `paid_at` correctly
- Primary issue is status display logic that ignores payment state
- BookingTable.jsx already has excellent paid_at indicator
- FilterControls might need business logic clarification

**Status**: Ready for implementation - changes are localized and well-defined.