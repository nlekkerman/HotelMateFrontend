# Debugging Guest Deletion Sync Issue

## Problem Statement
Guest UI is NOT updated when staff deletes messages, but staff UI IS updated when guest deletes.

## Hypothesis: Frontend Subscription Issue

### Key Questions to Answer
1. ✅ Is `guestDeletionChannel` being created with valid values?
2. ✅ Are the event handlers (`handleContentDeleted`, `handleAttachmentDeleted`) defined correctly?
3. ✅ Is `useGuestPusher` receiving the correct channel configuration?
4. ❓ Is Pusher actually subscribing to the deletion channel?
5. ❓ Are events being received by the Pusher client?
6. ❓ Are event handlers being called when events arrive?

## Debug Steps

### Step 1: Verify Channel Configuration ✅
Added logging to show:
- Channel names being created
- Event handlers being attached
- Handler types and names

**Check Console For:**
```javascript
// Look for this log
🔍 [DEBUG] Channel 3: {
  name: "{hotel}-room-{number}-deletions",
  events: ["content-deleted", "attachment-deleted"],
  eventHandlers: [...]
}
```

### Step 2: Verify Pusher Subscription
**In useGuestPusher.js**, check for:
```
✅ Successfully subscribed to: {hotel}-room-{number}-deletions
```

If you DON'T see this, the subscription failed!

### Step 3: Verify Event Reception
When staff deletes a message, check guest console for:
```
📨 [PUSHER EVENT] Received "content-deleted" on channel "{hotel}-room-{number}-deletions"
```

If you DON'T see this, backend isn't broadcasting or channel name mismatch!

### Step 4: Verify Handler Execution
After event is received, check for:
```
🗑️🔴 [DELETION CHANNEL] ==================== START ====================
🗑️🔴 [DELETION CHANNEL] content-deleted event received!
```

If you DON'T see this, the handler isn't being called!

## Debugging Checklist

### A. Guest Side (When Staff Deletes)
1. Open guest UI in browser
2. Open DevTools console
3. Filter logs by: `DELETION` or `PUSHER`
4. Look for:
   - [ ] `🔍 Guest Pusher Channels Debug:` - Shows deletionChannel is created
   - [ ] `🔍 [DEBUG] Channel 3:` - Shows deletion channel config
   - [ ] `🚨 [DELETION CHANNEL CONFIG]` - Verifies handlers exist
   - [ ] `✅ Successfully subscribed to: {hotel}-room-{number}-deletions`
   - [ ] When deletion happens: `📨 [PUSHER EVENT] Received "content-deleted"`
   - [ ] `🗑️🔴 [DELETION CHANNEL] content-deleted event received!`
   - [ ] `🗑️ [PUSHER] Message deletion event received:`
   - [ ] `✅ [PUSHER] Message deletion handled successfully`

### B. Staff Side (When Staff Deletes)
1. Open staff UI that initiated deletion
2. Check console for deletion API call
3. Check that Pusher broadcasts message

### C. Backend Verification
1. Check backend logs for:
   ```
   Broadcasting content-deleted to channel: {hotel}-room-{number}-deletions
   Event data: {...}
   ```
2. Verify channel name matches frontend exactly
3. Verify event name is `content-deleted` (not `message-deleted`)

## Common Issues & Solutions

### Issue 1: Channel Not Created
**Symptom:** `deletionChannelReady: false` in logs

**Causes:**
- `isGuest` is false
- `hotelSlug` is null/undefined
- `roomNumber` is null/undefined

**Solution:** Check guest session data, verify room context

### Issue 2: Subscription Failed
**Symptom:** No "Successfully subscribed" message

**Causes:**
- Pusher credentials invalid
- Channel name format incorrect
- Network issues

**Solution:** 
- Verify VITE_PUSHER_KEY and VITE_PUSHER_CLUSTER
- Check channel naming matches backend exactly

### Issue 3: Events Not Received
**Symptom:** Subscription succeeded but no events

**Causes:**
- Backend not broadcasting to correct channel
- Channel name mismatch (typo, casing, formatting)
- Backend not sending `content-deleted` event

**Solution:**
- Compare channel names: frontend subscription vs backend broadcast
- Check backend logs for broadcast confirmation
- Verify event name is exactly `content-deleted`

### Issue 4: Handler Not Called
**Symptom:** Event received but handler doesn't execute

**Causes:**
- Handler reference outdated (stale closure)
- Handler not in events object
- Event name mismatch

**Solution:**
- Check `eventHandlersRef.current` in useGuestPusher
- Verify event name spelling exactly matches

## Channel Name Format Verification

### Frontend Expected Format:
```javascript
// Room channel
{hotelSlug}-room-{roomNumber}-chat

// Conversation channel  
{hotelSlug}-conversation-{conversationId}-chat

// Deletion channel
{hotelSlug}-room-{roomNumber}-deletions
```

### Backend Must Broadcast To:
```python
# Deletion channel
f"{hotel_slug}-room-{room_number}-deletions"

# Event name
"content-deleted"

# Event data
{
    "message_id": 123,
    "deleted_by": "staff",
    "original_sender": "guest",
    "staff_id": 456,
    "staff_name": "John Doe",
    "timestamp": "2024-01-15T10:30:00Z",
    "hard_delete": False
}
```

## Next Actions

1. **Test in Browser:**
   - Open guest UI
   - Watch console during staff deletion
   - Screenshot console logs showing issue

2. **Check Backend:**
   - Verify deletion channel broadcast
   - Check event data format
   - Confirm channel name format

3. **Compare:**
   - Frontend subscription channel name
   - Backend broadcast channel name
   - Must match EXACTLY (case-sensitive!)

## Test Scenarios

### Test 1: Fresh Guest Session
1. Start fresh guest session (clear localStorage)
2. Join chat
3. Send message as guest
4. Delete message as staff
5. **Expected:** Guest UI updates immediately with "Message removed by staff"
6. **Check logs for:** All debug markers above

### Test 2: Existing Guest Session
1. Reload guest page (session persists)
2. Verify channels reconnect
3. Staff deletes message
4. **Expected:** Guest UI updates
5. **Check:** Re-subscription logs

### Test 3: Staff Deletes Staff Message
1. Staff sends message
2. Staff deletes own message
3. **Expected:** Guest sees "Message deleted"
4. **Check:** Context is correct

## Quick Debug Commands

```javascript
// In guest browser console, check Pusher state:
window.pusher = /* get reference from useGuestPusher */
console.log('Pusher channels:', Object.keys(window.pusher.channels.channels));
console.log('Deletion channel:', window.pusher.channels.channels['{hotel}-room-{number}-deletions']);

// Check if channel exists
const deletionChannel = window.pusher.channels.channels['{hotel}-room-{number}-deletions'];
if (deletionChannel) {
  console.log('Subscribed:', deletionChannel.subscribed);
  console.log('Bound events:', Object.keys(deletionChannel.callbacks._callbacks || {}));
}
```
