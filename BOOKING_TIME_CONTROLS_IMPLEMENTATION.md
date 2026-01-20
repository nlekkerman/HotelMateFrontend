# Booking Time Controls - Frontend Implementation

## Overview

This implementation adds frontend support for the new "Booking Time Controls" backend system in HotelMate. The system displays approval and overstay warnings in near-real-time and properly handles EXPIRED bookings.

## Key Features

✅ **Approval Warnings**: Shows when bookings need staff approval  
✅ **Overstay Warnings**: Shows when guests exceed checkout deadline  
✅ **EXPIRED Status**: Handles auto-expired bookings with disabled actions  
✅ **Real-time Updates**: Uses existing Pusher system for live updates  
✅ **Local Ticking**: Updates warning text every 45 seconds without API calls  
✅ **Graceful Degradation**: Works even if backend fields are missing  

## Files Modified/Created

### New Files
- `src/hooks/useBookingTimeWarnings.js` - Core warning logic with local ticking
- `src/components/staff/bookings/BookingTimeWarningBadges.jsx` - Warning badge components
- `src/utils/bookingTimeControlsTests.js` - Test utilities

### Modified Files
- `src/components/staff/bookings/BookingTable.jsx` - Added Warnings column
- `src/components/staff/bookings/BookingDetailsModal.jsx` - Added Time Controls section
- `src/components/staff/bookings/BookingStatusBadges.jsx` - Added EXPIRED status
- `src/components/staff/bookings/BookingActions.jsx` - Disabled actions for EXPIRED
- `src/realtime/stores/roomBookingStore.jsx` - Added booking_expired event

## Backend Data Contract

The frontend expects these fields from staff booking serializers:

### Approval Warnings
```javascript
{
  approval_deadline_at: "2025-01-20T15:30:00Z", // ISO string or null
  is_approval_due_soon: true,                    // boolean
  is_approval_overdue: false,                    // boolean  
  approval_overdue_minutes: 0,                   // number
  approval_risk_level: "DUE_SOON"               // "OK" | "DUE_SOON" | "OVERDUE" | "CRITICAL"
}
```

### Overstay Warnings
```javascript
{
  checkout_deadline_at: "2025-01-20T11:00:00Z", // ISO string
  is_overstay: false,                            // boolean
  overstay_minutes: 0,                           // number
  overstay_risk_level: "OK",                     // "OK" | "GRACE" | "OVERDUE" | "CRITICAL"
  overstay_flagged_at: null,                     // ISO string or null
  overstay_acknowledged_at: null                 // ISO string or null
}
```

### EXPIRED Status
```javascript
{
  status: "EXPIRED",                             // includes new status
  expired_at: "2025-01-20T14:00:00Z",          // ISO string
  auto_expire_reason_code: "APPROVAL_TIMEOUT"   // string (optional)
}
```

## UI Components

### 1. Booking List Warnings Column

- Added "Warnings" column to booking table
- Shows compact badges for approval and overstay warnings
- Tooltips provide detailed information
- Updates every 45 seconds via `useBookingTimeWarnings` hook

### 2. Booking Detail Time Controls Section

- New card section showing detailed warning information
- EXPIRED banner when booking is auto-expired
- Approval and overstay status with deadlines
- Placeholder buttons for future overstay actions (disabled)

### 3. Status Badge Updates

- EXPIRED status shows dark badge with clock icon
- Existing badge logic preserved for compatibility

### 4. Action Button Handling

- All booking actions disabled when status is EXPIRED
- Shows "Actions disabled - booking expired" message
- Approve/Decline buttons respect EXPIRED status

## Real-time Updates

### Pusher Events
- `booking_updated` - General booking updates (merges all fields)
- `booking_expired` - Specific EXPIRED status change (shows toast)
- Existing events continue to work

### Local Ticking
- `useBookingTimeWarnings` hook updates display text every 45 seconds
- Uses local time calculations for smooth minute counters
- Prefers backend fields when available
- No additional API calls

## Risk Level Mapping

| Risk Level | Badge Variant | Usage |
|------------|---------------|--------|
| OK | hidden | No warnings shown |
| DUE_SOON | warning (yellow) | Approval deadline approaching |
| GRACE | info (blue) | Checkout grace period |
| OVERDUE | danger (red) | Past deadline |
| CRITICAL | danger (red) | Urgent attention needed |

## Error Handling

- **Missing Fields**: Logs warnings in development, continues gracefully
- **Invalid Dates**: Falls back to safe defaults
- **API Failures**: Uses cached data, local calculations
- **Network Issues**: Local ticking continues

## Testing

Use the test utilities in `src/utils/bookingTimeControlsTests.js`:

```javascript
import { runAllTests, testBookings } from '@/utils/bookingTimeControlsTests';

// Run in browser console
runAllTests();

// Use test data
console.table(testBookings);
```

## Performance Considerations

- **Minimal Re-renders**: Hooks use `useMemo` and controlled intervals
- **No API Spam**: Local calculations prevent excessive backend calls  
- **Efficient Updates**: Pusher events merge data instead of refetching
- **Small Bundle**: Components lazy-load toast library

## Future Enhancements

1. **Overstay Actions**: Enable "Acknowledge" and "Extend Stay" buttons when backend is ready
2. **Batch Operations**: Handle multiple bookings with warnings
3. **Push Notifications**: Mobile alerts for critical warnings
4. **Custom Deadlines**: Staff override of system deadlines
5. **Analytics**: Dashboard for warning trends

## Troubleshooting

### Warnings Not Showing
1. Check browser console for missing field warnings
2. Verify backend is sending new serializer fields
3. Test with `logMissingWarningFields()` in development

### Real-time Not Working  
1. Check Pusher connection in Network tab
2. Verify `booking_expired` events are being sent
3. Test with manual event dispatch

### Performance Issues
1. Check if too many bookings are rendering
2. Verify interval cleanup in useEffect
3. Monitor memory usage with browser DevTools

---

**Status**: ✅ Ready for testing  
**Last Updated**: January 20, 2026  
**Backend Dependencies**: New serializer fields, `booking_expired` Pusher events