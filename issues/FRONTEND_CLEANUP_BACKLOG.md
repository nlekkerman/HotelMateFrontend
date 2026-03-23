# Frontend Cleanup Backlog

Logged after the localStorage / Pusher migration pass (March 2026).

---

## 1. Stale FCM token cleanup

**Trigger:** Push notifications failed for staff 36.

**Problem:** When a staff member logs out or their FCM token is rotated, the old token remains saved against their profile on the backend. Subsequent pushes target the stale token and silently fail.

**Action items:**
- Backend: On push failure (HTTP 404/410 from FCM), delete the stored token for that staff member and stop retrying.
- Frontend: `FirebaseService.deleteFCMToken()` already sends `{ fcm_token: null }` on logout. Verify the backend handler actually nullifies the record.
- Add a token-refresh listener (`onMessage` / `onTokenRefresh`) that re-saves whenever FCM rotates the token.

---

## 2. Repeated `mark_as_read` calls

**Problem:** The frontend is hammering the `mark_as_read` endpoint repeatedly — likely firing on every render or every incoming message instead of once per conversation open.

**Action items:**
- Audit call sites: search for `mark_as_read` or `mark-as-read` across `src/staff_chat/` and `src/realtime/`.
- Debounce or gate the call: fire once when a conversation is opened, and again only when new unread messages arrive while the conversation is already visible.
- Consider a ref/flag (`hasMarkedRef`) to skip duplicate calls within the same mount cycle.

---

## 3. Legacy channel naming dependency

**Confirmed:** The current frontend subscribes to **public** Pusher channel names, not private channels.

**Examples observed:**
```
no-way-hotel-conversation-102-chat
no-way-hotel-staff-35-notifications
```

**Implications:**
- These are public channels — any client with the app key can subscribe.
- Migration to `private-` prefixed channels requires backend auth-endpoint support (`/api/pusher/auth`) and a coordinated frontend + backend deploy.
- `usePusher.js` already configures an `authEndpoint` and `Bearer` auth header, but it is **not yet wired to private channels**.
- Do **not** rename channels until the backend Pusher auth endpoint is verified and the `Bearer` vs `Token` prefix mismatch (flagged in `usePusher.js`) is resolved.

**Action items:**
- Backend: Implement or verify `/api/pusher/auth` for private channel authorization.
- Resolve the `Bearer` vs `Token` auth prefix (see flag in `src/staff_chat/hooks/usePusher.js`).
- Migrate channel names to `private-` prefix in a single coordinated deploy.
