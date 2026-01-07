# Guest Chat Realtime Debug Guide

## Backend Logs Analysis ✅

Your backend is working correctly:
- ✅ Event sent to: `private-hotel-hotel-killarney-guest-chat-booking-BK-2026-0001`
- ✅ Event name: `realtime_event`
- ✅ Pusher confirmed the event was sent
- ✅ Message ID: 846

## Frontend Code Analysis ✅

The frontend code in `channelRegistry.js` is also correct:
- ✅ Subscribes to: `private-hotel-${hotelSlug}-guest-chat-booking-${bookingId}`
- ✅ Listens for: `realtime_event`
- ✅ Uses guest token authentication

## Debugging Steps

### Step 1: Run Debug Scripts

1. **Load the debug script in browser console:**
   ```javascript
   // Copy and paste the content of debug_guest_chat_realtime.js into browser console
   ```

2. **Test specific channel:**
   ```javascript
   debugSpecificChannel('BK-2026-0001')
   ```

3. **Check status:**
   ```javascript
   guestChatUtils.checkStatus()
   ```

### Step 2: Check Common Issues

#### Issue 1: Token Not Found in URL
```javascript
// Check if guest token is in URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
console.log('Guest token:', token ? 'Found' : 'Missing');
```

#### Issue 2: Pusher Not Initialized
```javascript
// Check if Pusher is loaded
console.log('Pusher library loaded:', typeof window.Pusher !== 'undefined');
```

#### Issue 3: Auth Endpoint Issues
```javascript
// Test auth endpoint directly
testPusherAuth('BK-2026-0001')
```

#### Issue 4: Environment Variables Missing
```javascript
// Check Pusher config
console.log('Pusher Key:', import.meta?.env?.VITE_PUSHER_KEY ? 'Set' : 'Missing');
console.log('Pusher Cluster:', import.meta?.env?.VITE_PUSHER_CLUSTER ? 'Set' : 'Missing');
```

### Step 3: Manual Subscription Test

```javascript
// Test manual subscription
const token = new URLSearchParams(window.location.search).get('token');
if (token && typeof subscribeToGuestChatBooking !== 'undefined') {
  const cleanup = subscribeToGuestChatBooking({
    hotelSlug: 'hotel-killarney',
    bookingId: 'BK-2026-0001',
    guestToken: token,
    eventName: 'realtime_event'
  });
  console.log('Manual subscription created');
}
```

### Step 4: Monitor Network Traffic

1. Open DevTools → Network tab
2. Filter for "pusher" or "auth"
3. Send a chat message
4. Look for:
   - Auth requests to `/api/pusher/auth`
   - WebSocket connections to pusher
   - Any failed requests

### Step 5: Check WebSocket Messages

1. Open DevTools → Network tab → WS (WebSocket)
2. Find the Pusher WebSocket connection
3. Look for incoming messages when you send chat
4. Should see a message with event `realtime_event`

## Expected Flow

1. **Guest opens chat page with token in URL**
2. **Frontend calls `subscribeToGuestChatBooking()`**
3. **Creates Pusher client with auth endpoint**
4. **Subscribes to `private-hotel-hotel-killarney-guest-chat-booking-BK-2026-0001`**
5. **Backend sends message → Pusher → Frontend receives `realtime_event`**

## Common Solutions

### Solution 1: Auth Endpoint Configuration
If auth is failing, check the auth endpoint URL in guestRealtimeClient.js:

```javascript
// Should be full URL for guest auth
authEndpoint: 'https://your-backend-url.com/api/pusher/auth'
```

### Solution 2: Token Parameter
Ensure the token is sent correctly to the auth endpoint:

```javascript
auth: {
  params: { token } // Token must be included
}
```

### Solution 3: CORS Issues
If auth endpoint returns CORS errors, check backend CORS configuration for `/api/pusher/auth`

### Solution 4: Private Channel Permissions
Backend must validate the guest token has permission to access the specific booking channel.

## Debug Commands Reference

```javascript
// 1. Check current status
guestChatUtils.checkStatus()

// 2. Show all events
guestChatUtils.showEvents()

// 3. Show only pusher events  
guestChatUtils.showEvents('pusher')

// 4. Force subscription test
guestChatUtils.forceSubscription('BK-2026-0001')

// 5. Test specific channel from logs
debugSpecificChannel('BK-2026-0001')

// 6. Test auth endpoint
testPusherAuth('BK-2026-0001')

// 7. Clear event history
guestChatUtils.clearEvents()

// 8. Cleanup test instances
cleanupTestPusher()
```

## Success Indicators

When working correctly, you should see:
- ✅ "Test Pusher connected" in console
- ✅ "Successfully subscribed to: private-hotel-hotel-killarney-guest-chat-booking-BK-2026-0001"
- ✅ "REALTIME_EVENT received" when messages are sent
- ✅ Network tab shows successful auth requests
- ✅ WebSocket tab shows incoming pusher messages

## Failure Indicators

Common failure patterns:
- ❌ "Subscription failed" → Auth issues
- ❌ "Token missing" → URL parameter issue
- ❌ "Pusher connection error" → Config/network issue
- ❌ "404 on /api/pusher/auth" → Backend endpoint issue
- ❌ No WebSocket connection → Library/config issue

## Next Steps

1. Run the debug scripts and check console output
2. Test the specific channel with your exact booking ID
3. Monitor network tab for auth requests
4. Share the console output from the debug scripts

The backend is sending events correctly, so the issue is likely in the frontend subscription setup or authentication process.