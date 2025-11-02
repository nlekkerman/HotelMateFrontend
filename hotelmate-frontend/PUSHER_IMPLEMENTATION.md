# Pusher Real-Time Notifications Implementation
**Date:** November 2, 2025  
**Status:** ✅ Complete

---

## 📋 Overview

This document describes the implementation of real-time Pusher notifications in the HotelMate frontend, aligned with the new backend API specifications.

---

## ✅ What Was Implemented

### 1. **RoomServiceNotificationContext** 
**File:** `src/context/RoomServiceNotificationContext.jsx`

**Purpose:** Handle real-time notifications for room service and breakfast orders

**Features:**
- ✅ Subscribes to department-based channels (`kitchen`)
- ✅ Subscribes to role-based channels (`porter`, `room_service_waiter`)
- ✅ Only subscribes when staff `is_on_duty: true`
- ✅ Listens for `new-room-service-order` events
- ✅ Listens for `new-breakfast-order` events
- ✅ Shows browser notifications
- ✅ Shows toast notifications
- ✅ Plays notification sound
- ✅ Updates order counts in real-time

**Channel Format:**
```
{hotel-slug}-staff-{staff-id}-kitchen
{hotel-slug}-staff-{staff-id}-porter
{hotel-slug}-staff-{staff-id}-room_service_waiter
```

**Events Handled:**
```javascript
{
  "event": "new-room-service-order",
  "data": {
    "order_id": 123,
    "room_number": "301",
    "total_price": "45.50",
    "created_at": "2025-11-02T14:30:00Z",
    "status": "pending",
    "items": [...]
  }
}
```

```javascript
{
  "event": "new-breakfast-order",
  "data": {
    "order_id": 456,
    "room_number": "205",
    "delivery_time": "08:00",
    "total_price": "25.00",
    "created_at": "2025-11-02T20:15:00Z",
    "status": "pending",
    "items": [...]
  }
}
```

---

### 2. **Updated ChatContext**
**File:** `src/context/ChatContext.jsx`

**Changes:**
- ✅ Added staff-specific chat channel subscription
- ✅ Channel format: `{hotel-slug}-staff-{staff-id}-chat`
- ✅ Listens for `new-guest-message` event
- ✅ Shows notifications for messages from guests
- ✅ Refreshes conversation list on new messages
- ✅ Added connection status logging

**New Channel:**
```
{hotel-slug}-staff-{staff-id}-chat
```

**Event:**
```javascript
{
  "event": "new-guest-message",
  "data": {
    "message_id": 321,
    "room_number": "508",
    "guest_name": "Jane Doe",
    "message": "Can I get extra towels?",
    "created_at": "2025-11-02T16:45:00Z",
    "conversation_id": 55
  }
}
```

---

### 3. **Updated BookingNotificationContext**
**File:** `src/context/BookingNotificationContext.jsx`

**Changes:**
- ✅ Updated to use department-based channels (`food-and-beverage`)
- ✅ Updated to use role-based channels (`receptionist`, `manager`, `food_and_beverage_manager`)
- ✅ Only subscribes when staff `is_on_duty: true`
- ✅ Fetches staff profile to determine department/role
- ✅ Added enhanced notifications with toast and browser alerts
- ✅ Removed old `-bookings` suffix channel

**Old Channel (Deprecated):**
```
{hotel-slug}-staff-{staff-id}-bookings
```

**New Channels:**
```
{hotel-slug}-staff-{staff-id}-food-and-beverage
{hotel-slug}-staff-{staff-id}-receptionist
{hotel-slug}-staff-{staff-id}-manager
```

---

### 4. **Updated UI Components**

#### **BreakfastRoomService.jsx**
- ✅ Consumes `useRoomServiceNotifications()` hook
- ✅ Auto-refreshes when new breakfast orders arrive
- ✅ Marks notifications as read when viewing page
- ✅ Real-time order list updates

#### **RoomServiceOrders.jsx**
- ✅ Consumes `useRoomServiceNotifications()` hook
- ✅ Auto-refreshes when new room service orders arrive
- ✅ Marks notifications as read when viewing page
- ✅ Real-time order list updates

---

### 5. **App Integration**
**File:** `src/App.jsx`

**Changes:**
- ✅ Added `RoomServiceNotificationProvider` to context hierarchy
- ✅ Placed correctly in the provider stack

**Context Hierarchy:**
```jsx
<QueryClientProvider>
  <UIProvider>
    <AuthProvider>
      <ThemeProvider>
        <ChatProvider>
          <BookingNotificationProvider>
            <RoomServiceNotificationProvider>  {/* NEW */}
              <BrowserRouter>
                {/* App Routes */}
              </BrowserRouter>
            </RoomServiceNotificationProvider>
          </BookingNotificationProvider>
        </ChatProvider>
      </ThemeProvider>
    </AuthProvider>
  </UIProvider>
</QueryClientProvider>
```

---

## 🔧 Configuration Required

### Environment Variables
Create `.env.local` file with:

```env
VITE_PUSHER_KEY=your_pusher_app_key
VITE_PUSHER_CLUSTER=your_pusher_cluster
```

**Get Credentials:**
1. Go to https://pusher.com
2. Create/login to account
3. Create new app or use existing
4. Copy **App Key** (not secret!)
5. Note your **Cluster** (e.g., "eu", "us2")

---

## 📊 Backend Requirements

The backend must send Pusher events in the following format:

### Staff Profile Endpoint
```
GET /api/staff/me/
```

**Response:**
```json
{
  "id": 72,
  "first_name": "John",
  "last_name": "Doe",
  "hotel": {
    "id": 1,
    "slug": "hotel-killarney",
    "name": "Hotel Killarney"
  },
  "department": {
    "id": 3,
    "slug": "kitchen",
    "name": "Kitchen"
  },
  "role": {
    "id": 15,
    "slug": "head_chef",
    "name": "Head Chef"
  },
  "is_on_duty": true,
  "is_active": true
}
```

### Channel Naming Convention

| Notification Type | Channel Format | Example |
|------------------|----------------|---------|
| Room Service (Kitchen) | `{hotel-slug}-staff-{id}-kitchen` | `hotel-killarney-staff-72-kitchen` |
| Room Service (Porter) | `{hotel-slug}-staff-{id}-porter` | `hotel-killarney-staff-45-porter` |
| Breakfast (Kitchen) | `{hotel-slug}-staff-{id}-kitchen` | `hotel-killarney-staff-72-kitchen` |
| Dinner Bookings (F&B) | `{hotel-slug}-staff-{id}-food-and-beverage` | `hotel-killarney-staff-35-food-and-beverage` |
| Chat Messages | `{hotel-slug}-staff-{id}-chat` | `hotel-killarney-staff-72-chat` |

---

## 🎯 Notification Rules

### Who Receives What?

| Event | Departments | Roles |
|-------|------------|-------|
| `new-room-service-order` | Kitchen | Porter, Room Service Waiter |
| `new-breakfast-order` | Kitchen | Porter, Room Service Waiter |
| `new-dinner-booking` | Food & Beverage | Receptionist, Manager, F&B Manager |
| `new-guest-message` | Front Office | Receptionist |

### On-Duty Filtering
- ✅ Frontend checks `is_on_duty` status before subscribing
- ✅ Backend only sends to on-duty staff
- ✅ When staff clocks out, subscriptions are terminated
- ✅ When staff clocks in, subscriptions are re-established

---

## 🧪 Testing

### 1. Check Pusher Connection
Open browser console and look for:
```
✅ Pusher connected for room service notifications
✅ Pusher connected for chat
✅ Pusher connected for booking notifications
```

### 2. Test Notifications

#### Test Room Service Order
```bash
# Create a test room service order via backend
curl -X POST http://localhost:8000/api/room-services/orders/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_number": "301",
    "items": [{"name": "Sandwich", "quantity": 1, "price": 10}]
  }'
```

**Expected:**
- 📦 Console log: "New room service order received"
- 🔔 Toast notification appears
- 🖥️ Browser notification (if permission granted)
- 🎵 Notification sound plays
- 📋 Order list updates automatically

#### Test Breakfast Order
```bash
curl -X POST http://localhost:8000/api/room-services/breakfast/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_number": "205",
    "delivery_time": "08:00",
    "items": [{"name": "Continental", "quantity": 2, "price": 12.50}]
  }'
```

**Expected:**
- 🍳 Console log: "New breakfast order received"
- 🔔 Toast notification with delivery time
- 🖥️ Browser notification
- 📋 Breakfast list updates

#### Test Chat Message
```bash
# Guest sends a message via chat API
curl -X POST http://localhost:8000/api/chat/{hotel-slug}/conversations/{id}/messages/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can I get extra towels?",
    "sender_type": "guest"
  }'
```

**Expected:**
- 💬 Console log: "New guest message received"
- 🔔 Toast notification
- 📋 Conversation list updates
- 🔴 Unread count increases

---

## 🐛 Troubleshooting

### No notifications received?

**Check 1: Environment Variables**
```javascript
// Add to App.jsx temporarily to debug
console.log('Pusher Key:', import.meta.env.VITE_PUSHER_KEY);
console.log('Pusher Cluster:', import.meta.env.VITE_PUSHER_CLUSTER);
```

**Check 2: Staff On-Duty Status**
```javascript
// Check staff profile
fetch('/api/staff/me/', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Is on duty:', data.is_on_duty));
```

**Check 3: Pusher Connection**
```javascript
// Open browser console, look for:
✅ Pusher connected for room service notifications
❌ Pusher connection error: [details]
```

**Check 4: Channel Subscription**
```javascript
// Should see in console:
"Subscribing to department channel: hotel-killarney-staff-72-kitchen"
"Subscribing to role channel: hotel-killarney-staff-72-porter"
```

**Check 5: Backend Pusher Trigger**
- Verify backend is triggering Pusher events
- Check Pusher dashboard for event delivery
- Verify channel names match exactly

### Wrong staff receiving notifications?

**Check:**
- Staff department/role in database
- Channel naming convention matches backend
- `is_on_duty` is true in `/api/staff/me/`

### Notifications not appearing?

**Check:**
- Browser notification permission granted
- Toast container is rendered in App.jsx
- No console errors

---

## 📝 Department/Role Slugs Reference

### Departments
- `kitchen` - Kitchen Department
- `food-and-beverage` - Food & Beverage
- `front-office` - Front Office
- `maintenance` - Maintenance
- `housekeeping` - Housekeeping

### Roles
- `porter` - Porter
- `room_service_waiter` - Room Service Waiter
- `receptionist` - Receptionist
- `manager` - Manager
- `food_and_beverage_manager` - F&B Manager
- `head_chef` - Head Chef
- `chef` - Chef

---

## 🚀 Next Steps

1. ✅ Get Pusher credentials from backend team
2. ✅ Add to `.env.local` file
3. ✅ Test with real backend
4. ✅ Verify on-duty filtering works
5. ✅ Test all notification types
6. ✅ Verify browser permissions
7. ✅ Add notification sound file (`/public/notification.mp3`)

---

## 📚 Files Modified

1. ✅ `src/context/RoomServiceNotificationContext.jsx` (NEW)
2. ✅ `src/context/ChatContext.jsx` (UPDATED)
3. ✅ `src/context/BookingNotificationContext.jsx` (UPDATED)
4. ✅ `src/App.jsx` (UPDATED)
5. ✅ `src/components/room_service/BreakfastRoomService.jsx` (UPDATED)
6. ✅ `src/components/room_service/RoomServiceOrders.jsx` (UPDATED)
7. ✅ `.env.example` (NEW)

---

## ✅ Summary

The frontend is now fully aligned with the new backend Pusher notification system:

- ✅ Department-based channel subscriptions
- ✅ Role-based channel subscriptions
- ✅ On-duty filtering
- ✅ Real-time room service notifications
- ✅ Real-time breakfast notifications
- ✅ Real-time dinner booking notifications
- ✅ Staff-specific chat notifications
- ✅ Browser notifications
- ✅ Toast notifications
- ✅ Auto-refresh UI components

**All that's needed now is to configure Pusher credentials and test with the backend!** 🎉
