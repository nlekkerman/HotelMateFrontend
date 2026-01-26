# Overstay vs Approval Context-Aware Badge System

## Problem Statement

The current badge system shows confusing "Approval CRITICAL" messages for checked-in guests who are overstaying, when the actual issue is checkout management, not approval management.

**Example Issue**: Guest BK-2026-0005 is checked in (Room 301) but shows "Approval CRITICAL +1250m" - this is misleading since:
- Guest is already approved and checked in
- The real issue is they haven't checked out on time
- Staff needs to manage checkout/overstay, not approval

## ✅ **Implemented Solution**

### Context-Aware Badge Logic

The system now differentiates between two distinct phases:

#### 1. **Pre-Check-In Phase** (Approval Context)
- **Status**: `PENDING_APPROVAL` or similar
- **Check-in Status**: `checked_in_at` is null
- **Badges Show**: "Approval due soon", "Approval overdue", "Approval CRITICAL"
- **Action Needed**: Staff must approve/decline the booking

#### 2. **Post-Check-In Phase** (Overstay/Checkout Context)  
- **Status**: `CONFIRMED` or any status
- **Check-in Status**: `checked_in_at` is present, `checked_out_at` is null
- **Badges Show**: "Checkout grace", "Checkout overdue", "Checkout CRITICAL"
- **Action Needed**: Staff must manage checkout or extend stay

## Code Changes Made

### 1. `useBookingTimeWarnings.js` - Updated Logic
```javascript
// Only show approval warnings for guests who are NOT checked in yet
const isCheckedIn = !!booking.checked_in_at && !booking.checked_out_at;
const shouldShow = !isCheckedIn && (
  booking.status === 'PENDING_APPROVAL' || 
  (booking.approval_risk_level && booking.approval_risk_level !== 'OK')
);
```

### 2. `BookingTimeWarningBadges.jsx` - Context-Aware Badges
- Approval badges only show for non-checked-in guests
- Overstay badges use "Checkout" terminology instead of generic "Overstay"

### 3. Display Text Updates
- `Overstay +120m` → `Checkout overdue +120m`  
- `Overstay CRITICAL +1250m` → `Checkout CRITICAL +1250m`

## Benefits

✅ **Clear Context**: Staff immediately understand what action is needed  
✅ **Better UX**: No more confusion between approval vs checkout management  
✅ **Accurate Terminology**: Badges reflect the actual business process  
✅ **Intuitive Actions**: "Checkout CRITICAL" implies checkout-related actions, not approval  

## Future Enhancements (Suggestions)

### 1. **Enhanced Risk Level Context**
Consider adding booking phase context to risk level calculation:

```javascript
// Enhanced overstay risk for different guest types
const getContextualRiskLevel = (booking, baseRiskLevel) => {
  const isVIP = booking.guest_tier === 'VIP';
  const isLongStay = getDaysDifference(booking.check_in_date, booking.check_out_date) > 7;
  
  if (isVIP && baseRiskLevel === 'OVERDUE') {
    return 'GRACE'; // Give VIP guests more grace time
  }
  
  if (isLongStay && baseRiskLevel === 'CRITICAL') {
    return 'OVERDUE'; // Long-stay guests get different escalation
  }
  
  return baseRiskLevel;
};
```

### 2. **Badge Color Refinement**
```javascript
const getContextualBadgeVariant = (riskLevel, bookingContext) => {
  if (bookingContext === 'checkout') {
    switch (riskLevel) {
      case 'GRACE': return 'info';      // Blue for grace period
      case 'OVERDUE': return 'warning'; // Orange for overdue
      case 'CRITICAL': return 'danger'; // Red for critical
    }
  } else if (bookingContext === 'approval') {
    switch (riskLevel) {
      case 'DUE_SOON': return 'warning';
      case 'OVERDUE': return 'danger';
      case 'CRITICAL': return 'danger';
    }
  }
};
```

### 3. **Smart Action Suggestions**
```javascript
const getContextualActions = (booking, warnings) => {
  if (booking.checked_in_at && warnings.overstay) {
    return [
      { label: 'Checkout Guest', action: 'checkout', primary: true },
      { label: 'Extend Stay', action: 'extend', secondary: true },
      { label: 'Contact Guest', action: 'contact', secondary: true }
    ];
  } else if (warnings.approval) {
    return [
      { label: 'Approve Booking', action: 'approve', primary: true },
      { label: 'Decline Booking', action: 'decline', secondary: true },
      { label: 'Request Info', action: 'request_info', secondary: true }
    ];
  }
};
```

### 4. **Time-Sensitive Badge Icons**
```jsx
const getContextualIcon = (riskLevel, bookingContext) => {
  if (bookingContext === 'checkout') {
    switch (riskLevel) {
      case 'GRACE': return 'door-open';        // Open door for grace
      case 'OVERDUE': return 'exclamation-triangle'; // Warning triangle
      case 'CRITICAL': return 'alarm';         // Alarm for critical
    }
  } else if (bookingContext === 'approval') {
    switch (riskLevel) {
      case 'DUE_SOON': return 'clock-history';
      case 'OVERDUE': return 'exclamation-circle';
      case 'CRITICAL': return 'exclamation-triangle-fill';
    }
  }
};
```

## Testing Scenarios

### Scenario 1: Pre-Check-In Approval
- **Booking**: PENDING_APPROVAL, no `checked_in_at`
- **Expected Badge**: "Approval CRITICAL +120m"
- **Action**: Approve or Decline

### Scenario 2: Checked-In Overstay  
- **Booking**: CONFIRMED, has `checked_in_at`, no `checked_out_at`
- **Expected Badge**: "Checkout CRITICAL +1250m"  
- **Action**: Checkout or Extend

### Scenario 3: Checked-Out Guest
- **Booking**: Any status, has both `checked_in_at` and `checked_out_at`
- **Expected Badge**: No overstay badges shown
- **Action**: None needed

## Migration Notes

- **Backward Compatible**: Existing backend fields work unchanged
- **Graceful Degradation**: Falls back to original text if context detection fails
- **Development Warnings**: Console warnings for unknown risk levels in dev mode
- **No Breaking Changes**: All existing API contracts maintained

---

This implementation provides a much more intuitive and context-appropriate user experience for hotel staff managing bookings across different phases of the guest lifecycle.