# FCM Notification Testing Guide 🔔

## Quick Start Testing

### 1. Add FCM Test Panel to Your App

Add the test panel to any page (e.g., staff chat page):

```jsx
import FCMTestPanel from '@/staff_chat/components/FCMTestPanel';

function StaffChatPage() {
  return (
    <div>
      {/* Your existing content */}
      
      {/* Add test panel - can be toggled with a button */}
      <FCMTestPanel />
    </div>
  );
}
```

### 2. Basic Testing Steps

1. **Open the app** in your browser
2. **Look for the FCM Test Panel** on the page
3. **Click "Request Permission"** - browser will ask for notification permission
4. **Click "Get FCM Token"** - retrieves and saves token to backend
5. **Click "Test Notification"** - shows a browser notification
6. **Open browser console (F12)** - check for FCM logs

---

## Detailed Testing Scenarios

### Scenario 1: New User Setup ✅

**Steps:**
1. Open app as a logged-in staff member
2. Check permission status - should show "DEFAULT"
3. Click "Request Permission"
4. Browser prompts - click "Allow"
5. Status changes to "GRANTED"
6. Click "Get FCM Token"
7. Token appears in the panel
8. Check console for: `✅ FCM token saved to backend successfully!`

**Expected Backend Call:**
```
POST /api/staff/save-fcm-token/
Headers: Authorization: Token {your_token}
Body: { "fcm_token": "..." }
```

**Verify in Backend:**
- Check staff record has `fcm_token` field populated
- Run: `python manage.py shell`
```python
from staff.models import Staff
staff = Staff.objects.get(id=YOUR_STAFF_ID)
print(staff.fcm_token)  # Should show token
```

---

### Scenario 2: Send Staff Chat Message 💬

**Setup:**
- User A and User B both have FCM tokens saved
- User A is **offline** (app closed or different device)
- User B sends message to User A

**Steps:**
1. User B opens staff chat
2. User B sends message to User A
3. Backend should send FCM notification to User A
4. User A receives notification on device

**Backend Logs to Check:**
```
📤 Sending FCM notification to staff ID: X
✅ FCM notification sent successfully
```

**Notification Data Format:**
```json
{
  "notification": {
    "title": "John Smith",
    "body": "Hey, can you check this?"
  },
  "data": {
    "type": "staff_chat_message",
    "conversation_id": "7",
    "sender_id": "42",
    "sender_name": "John Smith",
    "hotel_slug": "hilton-downtown",
    "click_action": "/staff-chat/hilton-downtown/conversation/7"
  }
}
```

---

### Scenario 3: @Mention Notification 🔔

**High Priority Test:**

**Steps:**
1. User A is offline
2. User B mentions User A in group chat: `@John can you help?`
3. Backend detects mention
4. Sends HIGH PRIORITY FCM to User A

**Expected Notification:**
```json
{
  "notification": {
    "title": "Sarah mentioned you",
    "body": "@John can you help?"
  },
  "data": {
    "type": "staff_chat_mention",
    "priority": "high",
    "conversation_id": "7",
    "sender_id": "15",
    "mentioned_staff_id": "42"
  }
}
```

**Verification:**
- Notification appears even if phone is on DND (high priority)
- Makes sound/vibration
- Opens app to specific conversation when clicked

---

### Scenario 4: Read Receipt Test 👀

**Steps:**
1. User A sends message to User B
2. User B opens conversation
3. Messages auto-marked as read (intersection observer)
4. Backend broadcasts `messages-read` event via Pusher
5. User A sees read receipts in real-time

**Check:**
- User A sees blue checkmarks on their messages
- Avatars of readers appear below message
- Pusher event logged in console

---

### Scenario 5: Foreground vs Background 📱

#### **Foreground (App Open):**
1. User A has app open
2. User B sends message
3. Notification appears as browser notification
4. AND/OR in-app toast/alert
5. Message appears in conversation immediately via Pusher

#### **Background (App Closed):**
1. User A closes app
2. User B sends message
3. Notification appears as system notification
4. User A clicks notification
5. App opens to conversation

**Service Worker Logs:**
```
[SW] Background message received
[SW] Notification clicked
[SW] Opening staff chat: /staff-chat/hilton/conversation/7
```

---

## Testing with Backend

### Test FCM from Django Shell

```python
# Start Django shell
python manage.py shell

# Import FCM utils
from staff_chat.fcm_utils import send_new_message_notification

# Get staff members
from staff.models import Staff
staff_a = Staff.objects.get(id=1)
staff_b = Staff.objects.get(id=2)

# Create test conversation and message
from staff_chat.models import StaffConversation, StaffChatMessage
conversation = StaffConversation.objects.first()

# Send test notification
send_new_message_notification(
    message_text="Test notification from Django shell!",
    sender=staff_a,
    conversation=conversation,
    recipients=[staff_b]
)
```

### Check FCM Token in Database

```sql
-- PostgreSQL
SELECT id, first_name, last_name, 
       CASE 
         WHEN fcm_token IS NOT NULL THEN 'Has Token'
         ELSE 'No Token'
       END as token_status,
       LENGTH(fcm_token) as token_length
FROM staff_staff
WHERE is_active = true;
```

---

## Troubleshooting

### ❌ "FCM not supported"
**Cause:** Browser doesn't support service workers or messaging
**Fix:** 
- Use Chrome, Firefox, or Edge (latest versions)
- Ensure HTTPS (localhost is OK for dev)
- Check `navigator.serviceWorker` exists

### ❌ Permission denied
**Cause:** User clicked "Block" or browser settings block notifications
**Fix:**
- Chrome: Settings → Privacy → Site Settings → Notifications → Allow
- Firefox: Preferences → Privacy → Permissions → Notifications
- Reset permission: Clear site data and retry

### ❌ Token not saving to backend
**Cause:** Auth token missing or API error
**Fix:**
- Check `localStorage.getItem('user')` has `token` field
- Verify `/api/staff/save-fcm-token/` endpoint exists
- Check network tab for 401/403 errors
- Ensure staff is authenticated

### ❌ Notifications not received
**Cause:** Multiple possible issues
**Check:**
1. FCM token in database: `staff.fcm_token` populated?
2. Backend FCM configuration: Firebase service account key set?
3. Service worker registered: Check `chrome://serviceworker-internals/`
4. Console errors: Look for FCM errors
5. Firebase project settings: Correct project ID?

### ❌ Service worker not registering
**Cause:** Path issues or cache
**Fix:**
```javascript
// Clear all service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});

// Reload page and retry
location.reload();
```

---

## Advanced Testing

### Test Multiple Notification Types

```python
# In Django shell
from staff_chat.fcm_utils import *

# Test new message
send_new_message_notification(...)

# Test mention
send_mention_notification(
    mentioned_staff=staff_b,
    sender=staff_a,
    message_text="@John check this",
    conversation=conversation
)

# Test file attachment
send_file_attachment_notification(
    sender=staff_a,
    conversation=conversation,
    file_count=3,
    recipients=[staff_b]
)
```

### Monitor Pusher Events

```javascript
// In browser console
const pusher = new Pusher('YOUR_KEY', { cluster: 'mt1' });
const channel = pusher.subscribe('hilton-staff-conversation-7');

channel.bind('messages-read', (data) => {
  console.log('📖 Read receipt:', data);
});

channel.bind('new-message', (data) => {
  console.log('💬 New message:', data);
});
```

---

## Production Checklist

Before deploying to production:

- [ ] VAPID key configured (`VITE_FIREBASE_VAPID_KEY`)
- [ ] Firebase service account key on backend
- [ ] HTTPS enabled (required for FCM)
- [ ] Service worker accessible at `/firebase-messaging-sw.js`
- [ ] Backend FCM endpoint tested: `/api/staff/save-fcm-token/`
- [ ] Notification icons/badges correct
- [ ] Deep linking works (click notification → correct page)
- [ ] Pusher credentials configured
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (Android, iOS)
- [ ] Error logging configured

---

## Expected Console Output

### ✅ Successful FCM Setup
```
🔑 Auth token found: Token abc123...
🌐 API URL: http://localhost:8000/api/staff/save-fcm-token/
✅ Service Worker registered
FCM Token obtained: eXample...
✅ FCM token saved to backend successfully!
📊 Response: { success: true, message: "FCM token saved" }
```

### ✅ Receiving Notification (Foreground)
```
Foreground message received: {
  notification: { title: "John Smith", body: "Hello!" },
  data: { type: "staff_chat_message", conversation_id: "7" }
}
```

### ✅ Service Worker (Background)
```
[SW] Background message received: {...}
[SW] Notification clicked: staff_chat_message
[SW] Opening staff chat: /staff-chat/hilton/conversation/7
```

---

## Quick Test Commands

```bash
# Backend - Test FCM from Django
python manage.py shell
>>> from staff_chat.fcm_utils import send_new_message_notification
>>> # ... send test notification

# Frontend - Check service worker
# Open: chrome://serviceworker-internals/
# Look for: firebase-messaging-sw.js

# Frontend - Check IndexedDB
# Open DevTools → Application → IndexedDB → firebase-*

# Frontend - Test notification permission
# DevTools Console:
Notification.permission  // Should be "granted"
```

---

## Support

For issues:
1. Check browser console for errors
2. Verify backend logs for FCM sends
3. Check `staff.fcm_token` in database
4. Test with FCMTestPanel component
5. Review Firebase Console → Cloud Messaging

---

**Last Updated:** November 12, 2025  
**Version:** 1.0  
**Status:** Ready for Testing
