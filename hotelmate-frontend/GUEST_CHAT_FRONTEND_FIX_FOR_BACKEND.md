# Guest Chat Frontend Fix Summary for Backend Team

## What Was Fixed (Frontend)

### 1. Service Worker Registration (FCM)
- Previously, the frontend always registered the Firebase service worker from the production URL (`https://hotelsmates.com/firebase-messaging-sw.js`), even in local/dev environments.
- This caused FCM notifications to fail in development and for local guest testing.
- **Now:** The frontend dynamically registers the service worker:
  - Uses `/firebase-messaging-sw.js` for localhost and LAN IPs
  - Uses `https://hotelsmates.com/firebase-messaging-sw.js` for production
- This ensures FCM notifications work in both dev and prod.

### 2. Pusher Channel Subscription
- Guest chat now always subscribes to the correct channel format: `{hotelSlug}-room-{roomNumber}-chat`.
- Channel name is computed directly from URL/props, not from backend session data.
- This prevents missed messages due to delayed session initialization.

### 3. Pusher Subscription Stability
- Fixed a bug where the Pusher subscription would disconnect/reconnect on every component re-render (caused by unstable event handler references).
- Now uses stable event handlers and only re-subscribes when the channel name changes.

### 4. FCM Foreground Listener
- Added a foreground FCM listener in the guest chat window.
- Guests now receive toast notifications for new messages even when the chat tab is open.

## Why This Matters for Backend
- You can now reliably test FCM and Pusher events in local/dev environments.
- Guests will always be subscribed to the correct channel and receive real-time updates.
- No more missed messages or broken notifications due to service worker path issues.

## How to Test (Backend)
1. Open guest chat on local/dev (e.g., http://localhost:5174)
2. Send message from staff/reception
3. Guest should see message instantly and receive a toast notification
4. Check browser console for logs:
   - Service worker registered from correct path
   - Pusher subscription logs
   - FCM foreground message logs

## Key Files Changed
- `src/utils/fcm.js` (service worker registration logic)
- `src/components/chat/ChatWindow.jsx` (Pusher and FCM logic)
- `src/hooks/useGuestPusher.js` (Pusher subscription stability)

---

If you need to test backend FCM or Pusher events, you can now do so locally without production service worker conflicts.
