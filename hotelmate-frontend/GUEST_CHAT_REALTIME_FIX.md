# Guest Chat Real-Time Messages Fix

## 🐛 Problems Identified
1. Guests were not receiving messages from reception in real-time (required manual refresh)
2. FCM notifications were not appearing in the foreground (when chat tab is open)

## 🔍 Root Causes

### Issue 1: Pusher Disconnecting/Reconnecting
The `useGuestPusher` hook had **`eventHandlers` in its dependency array**, causing it to:

1. **Disconnect and reconnect** every time the parent component re-rendered
2. **Miss Pusher events** that arrived during the disconnect/reconnect cycle
3. **Only fetch messages on page refresh** via the API

### Issue 2: Wrong Channel Name Source
The guest Pusher channel was retrieved from `guestSession.getPusherChannel()` which:
- Relied on backend response data (`pusher_channel` field)
- Was `null` initially because `guestSession` was set in a `useEffect` after first render
- Caused Pusher subscription to fail silently

### Issue 3: No FCM Foreground Listener
The ChatWindow component was NOT listening for FCM messages when the tab is open:
- FCM tokens were being saved during PIN authentication ✅
- Backend was sending FCM notifications ✅
- But frontend had no listener for foreground messages ❌

### What Was Happening:
```
1. Guest opens chat → Pusher subscribes ✅
2. ChatWindow re-renders (state update) → eventHandlers recreated
3. useGuestPusher detects dependency change → Runs cleanup → Disconnects ❌
4. Reception sends message → Backend triggers Pusher event
5. Event arrives but guest is disconnected → Message missed ❌
6. useGuestPusher re-subscribes → Too late ❌
7. Guest refreshes page → API loads all messages ✅
```

## ✅ Solutions Implemented

### 1. Fixed `useGuestPusher` Hook
**File:** `src/hooks/useGuestPusher.js`

**Changes:**
- ✅ Removed `eventHandlers` from dependency array (only `channelName` remains)
- ✅ Used `useRef` to store latest event handlers without triggering re-subscriptions
- ✅ Added wrapper functions that call the latest handler version
- ✅ Added comprehensive logging for debugging
- ✅ Added Pusher connection and subscription event listeners

**Key Fix:**
```javascript
// Store event handlers in ref
const eventHandlersRef = useRef(eventHandlers);

// Update ref when handlers change (doesn't trigger re-subscription)
useEffect(() => {
  eventHandlersRef.current = eventHandlers;
}, [eventHandlers]);

// Only re-subscribe when channel name changes
useEffect(() => {
  // ... Pusher setup
  
  // Bind with wrapper that uses latest handler
  channelRef.current.bind(event, (data) => {
    console.log(`📨 Received event "${event}":`, data);
    eventHandlersRef.current[event]?.(data);
  });
  
  return () => {
    // Cleanup
  };
}, [channelName]); // ← Only channelName, NOT eventHandlers
```

### 2. Fixed Channel Name Calculation
**File:** `src/components/chat/ChatWindow.jsx`

**Problem:** Channel name was coming from `guestSession.getPusherChannel()` which was undefined initially.

**Solution:** Compute channel name directly from `hotelSlug` and `roomNumber`:
```javascript
// Compute channel directly (always available)
const guestPusherChannel = isGuest && hotelSlug && roomNumber 
  ? `${hotelSlug}-room-${roomNumber}-chat` 
  : null;

// Use computed channel instead of session data
useGuestPusher(
  guestPusherChannel, // ✅ Direct channel: hotel-paradise-room-101-chat
  {
    'new-staff-message': handleNewStaffMessage,
    'new-message': handleNewMessage,
  }
);
```

### 3. Updated ChatWindow Component
**File:** `src/components/chat/ChatWindow.jsx`

**Changes:**
- ✅ Imported `useCallback` from React
- ✅ Wrapped event handlers in `useCallback` to prevent recreation
- ✅ Added better logging to track message receipt
- ✅ Added duplicate message detection logging
- ✅ Added computed `guestPusherChannel` variable

**Key Fix:**
```javascript
// Stable event handlers that don't recreate on every render
const handleNewStaffMessage = useCallback((data) => {
  console.log('📨 New staff message received by guest:', data);
  // ... handle message
}, [guestSession]);

const handleNewMessage = useCallback((data) => {
  console.log('💬 New message received by guest:', data);
  // ... handle message
}, []);
```

### 4. Added FCM Foreground Message Listener
**File:** `src/components/chat/ChatWindow.jsx`

**Changes:**
- ✅ Imported `messaging` and `onMessage` from Firebase
- ✅ Added FCM listener `useEffect` for guests
- ✅ Shows toast notification when message received
- ✅ Logs FCM message receipt for debugging

**New Code:**
```javascript
// FCM foreground message listener for guests
useEffect(() => {
  if (!isGuest) return;

  console.log('🔔 Setting up FCM foreground message listener for guest');
  
  // Listen for foreground FCM messages (when tab is open)
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('🔔 FCM foreground message received:', payload);
    
    const data = payload.data;
    if (data && data.message_id) {
      const staffName = data.staff_name || 'Hotel Staff';
      const messageText = data.message || 'New message';
      
      toast.info(`${staffName}: ${messageText.substring(0, 50)}...`, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  });

  return () => unsubscribe();
}, [isGuest]);
```

## 🧪 Testing

### Before the Fix:
1. Guest opens chat
2. Reception sends message
3. **Message doesn't appear** ❌
4. **No notification** ❌
5. Guest refreshes page
6. Message appears ✅

### After the Fix:
1. Guest opens chat
2. Reception sends message
3. **Message appears instantly** ✅ (no refresh needed)
4. **Toast notification appears** ✅
5. **Chat scrolls to bottom** ✅

### Console Logs to Verify:
When guest opens chat:
```
🔧 Initializing guest session: {hotelSlug: "hotel-paradise", roomNumber: "101"}
📡 Guest Pusher channel will be: hotel-paradise-room-101-chat
🔌 Initializing Pusher for guest chat
📡 Channel: hotel-paradise-room-101-chat
✅ Pusher connected successfully
✅ Successfully subscribed to: hotel-paradise-room-101-chat
✅ Guest subscribed to Pusher channel: hotel-paradise-room-101-chat
🔔 Setting up FCM foreground message listener for guest
```

When reception sends message:
```
📨 Received event "new-staff-message": {message: "Hello!", id: 123, ...}
📨 New staff message received by guest: {message: "Hello!", ...}
✅ Adding new staff message to UI: 123
🔔 FCM foreground message received: {data: {message_id: "123", ...}}
```

### How to Test:
1. Open guest chat in one browser (or incognito)
2. Open reception chat in another browser
3. Send message from reception to guest
4. **Message should appear immediately** without refresh
5. **Toast notification should appear** in top-right
6. Check browser console for the logs above

## 🔧 Technical Details

### Pusher Channel Structure
According to the backend (see `PUSHER_DEBUG_GUIDE.md`):

**Channel:** `{hotel_slug}-room-{room_number}-chat`  
**Events:**
- `new-staff-message` - When staff sends to guest (primary event)
- `new-message` - General message event (backup)

**Example:**
```
Channel: hotel-paradise-room-101-chat
Event: new-staff-message
Data: {
  id: 123,
  message: "Hello!",
  sender_type: "staff",
  staff_info: { name: "John", ... }
}
```

### Why This Fix Works

**Problem:** Dependencies in `useEffect` trigger cleanup and re-run
```javascript
useEffect(() => {
  // Setup
  return () => cleanup(); // ← Runs when dependencies change
}, [dependency1, dependency2]); // ← Change triggers cleanup
```

**Solution:** Use refs for values that shouldn't trigger re-subscription
```javascript
const valueRef = useRef(value);

// Update ref without triggering effect
useEffect(() => {
  valueRef.current = value;
}, [value]);

// Effect only re-runs when truly needed
useEffect(() => {
  // Use valueRef.current
}, [onlyEssentialDep]);
```

## 📝 Files Modified

1. ✅ `src/hooks/useGuestPusher.js` - Fixed dependency array and added logging
2. ✅ `src/components/chat/ChatWindow.jsx` - Used useCallback, fixed channel name, added FCM listener

## 🎯 Result

- ✅ Guest receives messages in real-time via Pusher
- ✅ Guest receives toast notifications via FCM (foreground)
- ✅ No manual refresh needed
- ✅ Pusher connection stays stable
- ✅ Better debugging with console logs
- ✅ No duplicate message handling
- ✅ Browser notifications work (when tab not focused)
- ✅ Toast notifications work (when tab is focused)

## 🚀 Next Steps

If issues persist, check:
1. **Backend Pusher logs** - Ensure events are being triggered
2. **Pusher Dashboard** - Verify events are sent
3. **Browser console** - Look for subscription and message logs
4. **Network tab** - Check WebSocket connection to Pusher

Refer to `PUSHER_DEBUG_GUIDE.md` for comprehensive debugging steps.
