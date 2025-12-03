# Pusher Attendance Events - Complete Documentation

## Overview
This document outlines ALL Pusher events used for attendance/clock management across the HotelMate frontend. This is what the backend needs to fire for real-time updates.

## 📡 **Core Pusher Configuration**

### Channel Format
```
hotel-{hotel_slug}
```
**Example:** `hotel-hotel-killarney`

### Environment Variables Required
```env
VITE_PUSHER_KEY=your_pusher_key
VITE_PUSHER_CLUSTER=your_cluster
```

---

## 🎯 **Primary Attendance Events**

### 1. **`clock-status-updated`** - MAIN EVENT
**File:** `useAttendanceRealtime.js`, `BigScreenNavbar.jsx`
**When Backend Should Fire:** Every time staff clock in/out, start/end break, or any status change

```javascript
// Backend Event Structure
{
  staff_id: 123,
  user_id: 456,
  duty_status: "off_duty" | "on_duty" | "on_break",
  current_status: {
    status: "off_duty" | "on_duty" | "on_break",
    label: "Off Duty" | "On Duty" | "On Break",
    is_on_break: boolean,
    break_start: "2025-12-02T10:30:00Z" | null,
    total_break_minutes: 15
  }
}
```

**Frontend Response:**
- Visual shimmer effect on clock button
- Refreshes staff profile via `/staff/{hotel_slug}/me/`
- Updates button states across all components

---

## 🚨 **Additional Attendance Events**

### 2. **`attendance-unrostered-request`**
**When to Fire:** Staff clocks in without being scheduled
```javascript
{
  staff_id: 123,
  user_id: 456,
  action: "unrostered_clock_in",
  message: "Staff member clocked in without being rostered"
}
```

### 3. **`attendance-break-warning`**
**When to Fire:** Staff should take a break (time-based rules)
```javascript
{
  staff_id: 123,
  user_id: 456,
  minutes_worked: 240,
  suggested_action: "take_break"
}
```

### 4. **`attendance-overtime-warning`**
**When to Fire:** Staff approaching/exceeding overtime hours
```javascript
{
  staff_id: 123,
  user_id: 456,
  hours_worked: 8.5,
  overtime_threshold: 8,
  warning_type: "overtime"
}
```

### 5. **`attendance-hard-limit-warning`**
**When to Fire:** Staff reached maximum work hours
```javascript
{
  staff_id: 123,
  user_id: 456,
  hours_worked: 12,
  max_hours: 12,
  action_required: "must_clock_out"
}
```

### 6. **`clocklog-approved`**
**When to Fire:** Manager approves unrostered clock-in
```javascript
{
  clocklog_id: 789,
  staff_id: 123,
  approved_by: 456,
  status: "approved"
}
```

### 7. **`clocklog-rejected`**
**When to Fire:** Manager rejects unrostered clock-in
```javascript
{
  clocklog_id: 789,
  staff_id: 123,
  rejected_by: 456,
  status: "rejected",
  reason: "Not scheduled for this shift"
}
```

### 8. **`clocklog-created`**
**When to Fire:** New clock entry created
```javascript
{
  clocklog_id: 789,
  staff_id: 123,
  action: "clock_in" | "clock_out" | "break_start" | "break_end",
  timestamp: "2025-12-02T10:30:00Z"
}
```

### 9. **`clocklog-updated`**
**When to Fire:** Existing clock entry modified
```javascript
{
  clocklog_id: 789,
  staff_id: 123,
  updated_fields: ["end_time", "break_minutes"],
  updated_by: 456
}
```

---

## 🎭 **Face Recognition Events**

### Custom Window Events (Not Pusher)
These are fired by face recognition system:

```javascript
// Frontend fires these, backend listens
window.dispatchEvent(new CustomEvent('face-clock-action-success', {
  detail: {
    action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end',
    hotelSlug: 'hotel-killarney',
    data: { /* face recognition result */ }
  }
}));
```

---

## 📍 **Where Pusher Events Are Used**

### 1. **BigScreenNavbar.jsx** (Navigation Bar)
- **Hook Used:** `useAttendanceRealtime(hotelIdentifier, handleAttendanceEvent)`
- **Events Listened:** ALL attendance events
- **Response:** 
  - Visual button feedback (shimmer)
  - Refreshes staff profile
  - Updates clock button state

```javascript
// Key handler in BigScreenNavbar
const handleAttendanceEvent = (event) => {
  const { type, payload } = event || {};
  
  if (type === "clock-status-updated" && payload) {
    // Check if event is for current user
    const isCurrentUser = 
      (user?.staff_id && payload.staff_id === user.staff_id) ||
      (user?.id && payload.user_id === user.id);
    
    if (isCurrentUser) {
      // Add visual feedback
      document.querySelector(".clock-btn")?.classList.add("updating");
      
      // Refresh profile data
      fetchStaffProfile();
    }
  }
};
```

### 2. **useAttendanceRealtime.js** (Hook)
- **Channel:** `hotel-${hotelSlug}`
- **Events Bound:** All 9 attendance events listed above
- **Function:** Normalizes backend events to `{ type, payload }` format

```javascript
// Event binding in hook
channel.bind("clock-status-updated", (data) => {
  onEvent({
    type: "clock-status-updated",
    payload: data
  });
});
```

### 3. **Staff Profile Pages**
- **API Call:** `GET /staff/{hotel_slug}/me/`
- **When Refreshed:** After every Pusher event
- **Data Used:** `current_status` object for button states

### 4. **Clock Modal/Options**
- **Files:** `ClockModal.jsx`, clock actions utilities
- **Events:** Listen for `clockStatusChanged` window events
- **Purpose:** Manual clock actions trigger profile refresh

---

## 🔄 **Data Flow**

```
1. Staff Action (Clock In/Out/Break)
     ↓
2. Backend Updates Database
     ↓
3. Backend Fires Pusher Event → hotel-{hotel_slug} channel
     ↓
4. Frontend useAttendanceRealtime Hook Receives Event
     ↓
5. Event Normalized to { type, payload }
     ↓
6. BigScreenNavbar handleAttendanceEvent Processes
     ↓
7. Visual Feedback + Profile Refresh
     ↓
8. UI Updates with New Status
```

---

## ✅ **Critical Backend Requirements**

### **MUST Fire These Events:**
1. **`clock-status-updated`** - After EVERY status change
2. **`clocklog-created`** - When new clock entries created
3. **`attendance-unrostered-request`** - For unscheduled clock-ins

### **Event Timing:**
- Fire AFTER database update (not before)
- Include both `staff_id` and `user_id` in payload
- Ensure `duty_status` and `current_status` are consistent

### **Channel Format:**
- EXACTLY: `hotel-{hotel_slug}`
- Example: `hotel-hotel-killarney` (NOT `hotel-killarney`)

### **Required Payload Fields:**
```javascript
{
  staff_id: number,      // REQUIRED - staff table ID
  user_id: number,       // REQUIRED - user table ID  
  duty_status: string,   // REQUIRED - current status
  current_status: object // REQUIRED - enhanced status object
}
```

---

## 🐛 **Testing Checklist**

### **For Backend Developer:**
1. [ ] Fire `clock-status-updated` on clock in
2. [ ] Fire `clock-status-updated` on clock out  
3. [ ] Fire `clock-status-updated` on break start
4. [ ] Fire `clock-status-updated` on break end
5. [ ] Include correct `staff_id` and `user_id`
6. [ ] Use correct channel name format
7. [ ] Ensure `duty_status` matches `current_status.status`

### **Frontend Verification:**
```javascript
// Console logs to watch for:
"[Attendance Pusher] 📡 Subscribing to channel: hotel-hotel-killarney"
"[Attendance Pusher] clock-status-updated event received: { ... }"
"[BigScreenNav] 🔔 Pusher event received: { type, payload }"
"[BigScreenNav] ✅ Status update for current user, processing..."
"[BigScreenNav] 🔄 Refreshing staff profile after Pusher event..."
```

---

## 🚀 **Real-time Updates Work When:**
- Backend fires events on correct channel
- Events include required user identification
- Frontend receives events and refreshes profile data
- Profile API returns updated `current_status`
- Button states recalculate based on new status

**The system is designed to handle ALL attendance scenarios with real-time visual feedback!**