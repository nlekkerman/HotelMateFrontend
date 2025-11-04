# 🔍 Guest Chat Real-Time Debug Checklist

## Quick Test Steps

### 1. Open Guest Chat
1. Navigate to guest PIN authentication page
2. Enter PIN for a room (e.g., Room 101)
3. Open browser console (F12)
4. Look for these logs:

```
✅ Expected Console Output:
🔧 Initializing guest session: { hotelSlug: "hotel-paradise", roomNumber: "101" }
📡 Guest Pusher channel will be: hotel-paradise-room-101-chat
🔌 Initializing Pusher for guest chat
📡 Channel: hotel-paradise-room-101-chat
✅ Pusher connected successfully
✅ Successfully subscribed to: hotel-paradise-room-101-chat
✅ Guest subscribed to Pusher channel: hotel-paradise-room-101-chat
🔔 Setting up FCM foreground message listener for guest
```

### 2. Send Message from Reception
1. In another browser/tab, log in as reception staff
2. Navigate to chat with the guest room (Room 101)
3. Send a message: "Hello, how can I help you?"

### 3. Check Guest Browser
**IMMEDIATELY check guest browser console:**

```
✅ Expected Console Output (on message receive):
📨 Received event "new-staff-message": {id: 123, message: "Hello...", ...}
📨 New staff message received by guest: {id: 123, message: "Hello...", ...}
✅ Adding new staff message to UI: 123
🔔 FCM foreground message received: {...}
```

**Expected UI Behavior:**
- ✅ Message appears instantly in chat window
- ✅ Toast notification appears (top-right)
- ✅ No page refresh needed
- ✅ Scroll to bottom automatically

---

## Troubleshooting Guide

### ❌ Issue 1: No Pusher Logs
**Symptoms:**
- No "Initializing Pusher" logs
- No "Successfully subscribed" logs

**Possible Causes:**
1. `isGuest` flag not set
2. `hotelSlug` or `roomNumber` missing
3. Guest session not initialized

**Debug:**
```javascript
// Add to ChatWindow.jsx temporarily
console.log('DEBUG:', { 
  isGuest, 
  hotelSlug, 
  roomNumber, 
  guestPusherChannel 
});
```

**Solution:**
- Ensure navigation includes `isGuest: true` in state
- Check URL params contain hotel slug
- Verify room number is passed correctly

---

### ❌ Issue 2: Pusher Connects But No Messages
**Symptoms:**
- ✅ "Successfully subscribed" appears
- ❌ No "Received event" when staff sends message

**Possible Causes:**
1. Wrong channel name
2. Backend not triggering event
3. Event handler not bound

**Debug Steps:**

**A. Check Channel Name:**
```javascript
// Should match backend format: {hotel-slug}-room-{room-number}-chat
console.log('Guest channel:', guestPusherChannel);
// Example: "hotel-paradise-room-101-chat"
```

**B. Check Backend Logs:**
Look for these in your backend terminal:
```
✅ Pusher triggered: guest_channel=hotel-paradise-room-101-chat, event=new-staff-message
```

**C. Check Pusher Dashboard:**
1. Go to https://dashboard.pusher.com/
2. Select your app
3. Go to "Debug Console"
4. Send message from staff
5. Watch for events in real-time
6. Should see: `new-staff-message` event on `hotel-paradise-room-101-chat`

**Solution:**
- If backend logs are missing → Backend issue
- If dashboard shows event but guest doesn't receive → Frontend subscription issue
- If no event in dashboard → Backend Pusher config issue

---

### ❌ Issue 3: Pusher Disconnects After Few Seconds
**Symptoms:**
- ✅ "Successfully subscribed" appears
- ❌ "Guest disconnected from Pusher" appears shortly after
- ❌ Pattern repeats (connect/disconnect loop)

**Cause:**
Component re-rendering causing Pusher to reconnect

**Solution:**
✅ Already fixed in `useGuestPusher` hook
- Event handlers stored in ref
- Only re-subscribes when `channelName` changes

**Verify Fix:**
```javascript
// Should NOT see repeated disconnect/reconnect logs
// Should see ONLY once:
✅ Guest subscribed to Pusher channel: hotel-paradise-room-101-chat

// Should NOT see (unless navigating away):
🔌 Guest disconnected from Pusher channel: hotel-paradise-room-101-chat
```

---

### ❌ Issue 4: No FCM Notifications
**Symptoms:**
- ✅ Pusher message received (console shows it)
- ✅ Message appears in UI
- ❌ No toast notification
- ❌ No "FCM foreground message" log

**Possible Causes:**
1. FCM not initialized
2. No FCM token saved
3. Backend not sending FCM
4. Service worker not registered

**Debug Steps:**

**A. Check FCM Setup:**
```javascript
// In guest browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service workers:', registrations);
  // Should show firebase-messaging-sw.js
});
```

**B. Check FCM Permission:**
```javascript
console.log('Notification permission:', Notification.permission);
// Should be "granted"
```

**C. Check FCM Token:**
Look for this log during PIN authentication:
```
✅ FCM token saved successfully for guest chat
```

**D. Check Backend FCM:**
Backend should log:
```
✅ FCM sent to guest in room 101 for message from staff
```

**Solution:**
- If no service worker → Check `/firebase-messaging-sw.js` exists
- If permission not granted → User denied notification permission
- If no token saved log → FCM token retrieval failed
- If backend not sending → Backend FCM config issue

---

### ❌ Issue 5: Message Appears But Toast Doesn't
**Symptoms:**
- ✅ Pusher message received
- ✅ Message appears in UI
- ❌ No toast notification

**Cause:**
FCM foreground listener not catching message

**Debug:**
```javascript
// Check if FCM listener is set up:
// Look for this log in console:
🔔 Setting up FCM foreground message listener for guest
```

**Solution:**
- Ensure `isGuest` is true
- Check Firebase config in `.env`
- Verify `messaging` object is initialized

---

## Environment Variables Checklist

Verify these in `.env`:
```bash
# Pusher (Required for real-time)
VITE_PUSHER_KEY=your_pusher_key
VITE_PUSHER_CLUSTER=your_cluster

# Firebase (Required for notifications)
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

**Check if loaded:**
```javascript
console.log('Pusher Key:', import.meta.env.VITE_PUSHER_KEY);
console.log('Pusher Cluster:', import.meta.env.VITE_PUSHER_CLUSTER);
console.log('VAPID Key:', import.meta.env.VITE_FIREBASE_VAPID_KEY);
```

---

## Full Working Example

### Guest Opens Chat:
```
Console Output:
--------------
🔧 Initializing guest session: {hotelSlug: "hotel-paradise", roomNumber: "101"}
📡 Guest Pusher channel will be: hotel-paradise-room-101-chat
💾 Guest session saved: {room_number: "101", hotel_slug: "hotel-paradise", ...}
🔌 Initializing Pusher for guest chat
📡 Channel: hotel-paradise-room-101-chat
✅ Pusher connected successfully
✅ Successfully subscribed to: hotel-paradise-room-101-chat
✅ Guest subscribed to Pusher channel: hotel-paradise-room-101-chat
🔔 Setting up FCM foreground message listener for guest
```

### Staff Sends Message:
```
Guest Console Output:
--------------------
📨 Received event "new-staff-message": {
  id: 123,
  message: "Hello, how can I help you?",
  sender_type: "staff",
  staff_info: {name: "John Doe", ...}
}
📨 New staff message received by guest: {...}
✅ Adding new staff message to UI: 123
🔔 FCM foreground message received: {...}
```

### Guest UI:
```
✅ Message appears instantly: "Hello, how can I help you?"
✅ Toast appears: "John Doe: Hello, how can I help you?"
✅ Chat scrolls to bottom
✅ Staff info updated in header
```

---

## Backend Verification

When staff sends message, backend should log:

```python
# Django Backend Console
✅ Message created with ID: 123
✅ Pusher triggered: guest_channel=hotel-paradise-room-101-chat, event=new-staff-message, message_id=123
✅ FCM sent to guest in room 101 for message from staff
✅ Pusher triggered for new message: channel=hotel-paradise-conversation-45-chat, message_id=123
```

If these logs are missing, the issue is in the backend, not frontend.

---

## Network Tab Verification

1. Open browser DevTools → Network tab
2. Filter: `WS` (WebSocket)
3. Should see connection to Pusher:
   - `wss://ws-{cluster}.pusher.com/...`
   - Status: `101 Switching Protocols`
   - Size: `(pending)` (stays open)

4. Select the WebSocket connection
5. Go to "Messages" tab
6. When staff sends message, should see incoming frame:
```json
{
  "event": "new-staff-message",
  "channel": "hotel-paradise-room-101-chat",
  "data": "{\"id\":123,\"message\":\"Hello...\"}"
}
```

---

## Final Verification Checklist

Run through this list:

- [ ] Guest can open chat and see PIN auth
- [ ] Guest enters PIN successfully
- [ ] Console shows Pusher subscription logs
- [ ] Console shows FCM listener setup
- [ ] Staff sends message
- [ ] Guest console shows "Received event" log
- [ ] Guest console shows "Adding new staff message" log
- [ ] Message appears in UI instantly (no refresh)
- [ ] Toast notification appears
- [ ] Chat scrolls to bottom
- [ ] Staff info shown in header
- [ ] No disconnection logs appear
- [ ] WebSocket stays connected

If ALL checkboxes are ✅ → **Everything is working!** 🎉

If ANY are ❌ → Use troubleshooting guide above

---

## Contact Backend Team

If after all debugging you determine the issue is backend-related, share:

1. **What's working:**
   - ✅ Frontend Pusher subscription (show console logs)
   - ✅ Channel name matches expected format
   - ✅ Event handlers bound correctly

2. **What's missing:**
   - ❌ No Pusher event received
   - ❌ No backend logs showing Pusher trigger
   - ❌ No event in Pusher Dashboard

3. **Expected channel and event:**
   - Channel: `{hotel-slug}-room-{room-number}-chat`
   - Event: `new-staff-message`
   - Example: `hotel-paradise-room-101-chat` / `new-staff-message`

4. **Share this document:** `PUSHER_DEBUG_GUIDE.md`
