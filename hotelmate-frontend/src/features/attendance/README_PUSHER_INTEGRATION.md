# Pusher Attendance Integration - Implementation Guide

## Overview
This implementation fixes the frontend Pusher integration to properly handle real-time attendance clock status updates from the backend.

## Backend Event Format
The backend sends events on channel `hotel-{hotel_slug}` with event name `clock-status-updated`:

```javascript
// Event Data Structure
{
  staff_id: 123,
  user_id: 456,
  duty_status: "off_duty" | "on_duty" | "on_break",
  current_status: {
    status: "off_duty" | "on_duty" | "on_break",
    label: "Off Duty" | "On Duty" | "On Break",
    is_on_break: boolean,
    break_start: "2025-12-02T10:30:00Z", // ISO string or null
    total_break_minutes: 15 // number
  }
}
```

## Frontend Flow

### 1. useAttendanceRealtime Hook
- Subscribes to `hotel-{hotelSlug}` channel
- Binds to `clock-status-updated` event
- Normalizes backend data into `{ type, payload }` structure
- Enhanced error handling and logging

### 2. BigScreenNavbar Integration
- Uses `handleAttendanceEvent` to process normalized events
- Validates that updates are for current user (staff_id or user_id match)
- Provides immediate visual feedback with shimmer effect
- Optimistically updates button text using `duty_status`
- Refreshes full staff profile to sync `current_status`

### 3. Button State Logic
- `getClockButtonInfo()` remains the single source of truth
- Uses enhanced `staffProfile.current_status` for accurate button text/color
- Handles all status transitions: off_duty → on_duty → on_break → on_duty

## Testing Checklist

### ✅ Real-time Updates
- [ ] Clock In: Button changes from "Clock In" to "Start Break"
- [ ] Start Break: Button changes to "End Break" with timer
- [ ] End Break: Button changes back to "Start Break"
- [ ] Clock Out: Button changes to "Clock In"

### ✅ Visual Feedback
- [ ] Shimmer effect appears on button during updates
- [ ] Button text updates optimistically before profile refresh
- [ ] No mismatch between button state and actual status

### ✅ Error Handling
- [ ] Wrong user events are ignored
- [ ] Pusher connection errors are logged
- [ ] Malformed events don't crash the UI

## Debugging

### Console Logs to Monitor
```
[Attendance Pusher] 📡 Subscribing to channel: hotel-hotel-killarney
[Attendance Pusher] clock-status-updated event received: { ... }
[BigScreenNav] 🔔 Pusher event received: { type, payload }
[BigScreenNav] 🎯 Is current user? true
[BigScreenNav] 🏷️ Optimistically updating button text to: End Break
[BigScreenNav] 🔄 Refreshing staff profile after Pusher event...
```

### Common Issues
1. **Channel Mismatch**: Ensure backend uses `hotel-{hotel_slug}` format
2. **Event Name**: Must be exactly `clock-status-updated`
3. **User Matching**: Backend must send both `staff_id` and `user_id`
4. **Status Fields**: `duty_status` and `current_status` must be present

## Environment Variables
```env
VITE_PUSHER_KEY=your_pusher_key
VITE_PUSHER_CLUSTER=your_cluster
```

## File Changes
- ✅ `useAttendanceRealtime.js`: Enhanced event binding and normalization
- ✅ `BigScreenNavbar.jsx`: Updated event handling with optimistic updates
- ✅ Added CSS for visual feedback effects

## Integration with Existing Systems
- Face recognition clock actions still trigger profile refresh
- Manual clock actions via API continue to work
- `forceButtonUpdate` state ensures UI consistency
- All existing button logic and permissions remain intact