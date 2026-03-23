# Frontend Cleanup Backlog

Logged after the localStorage / Pusher migration pass (March 2026).

**Priority order:**
1. Repeated `mark_as_read` calls — wasting requests now
2. Stale FCM token cleanup — degrading notifications now
3. Private-channel migration — coordinated work, easier to break, do after backend auth verification

---

## 1. Repeated `mark_as_read` calls (P1)

**Problem:** The frontend is hammering the `mark_as_read` endpoint repeatedly — likely firing on every render, focus bounce, or duplicate popup effect instead of once per conversation open.

**Desired behavior:**
- Mark as read **once** when conversation becomes active and visible.
- Mark again **only** if new unread messages arrive after that point.
- Do **not** mark on every render, focus bounce, or duplicate popup effect.

**Action items:**
- Audit call sites: search for `mark_as_read` or `mark-as-read` across `src/staff_chat/` and `src/realtime/`.
- Gate the call with a ref/flag (`hasMarkedRef`) to skip duplicate calls within the same mount cycle.
- Re-arm the flag only when genuinely new unread messages arrive while the conversation is already visible.

---

## 2. Stale FCM token cleanup (P2)

**Trigger:** Push notifications failed for staff 36.

**Problem:** When a staff member logs out or their FCM token is rotated, the old token remains saved against their profile on the backend. Subsequent pushes target the stale token and silently fail. The system is trying to text a dead SIM card.

**Action items:**
- Backend: On push failure (HTTP 404/410 from FCM), delete the stored token for that staff member and stop retrying.
- Backend: On FCM "unregistered" / invalid-token failure, null the stored token immediately and log a sanitized invalidation event (staff ID + event type only — do not log the raw full token).
- Frontend: `FirebaseService.deleteFCMToken()` already sends `{ fcm_token: null }` on logout. Verify the backend handler actually nullifies the record.
- Add a token-refresh listener (`onMessage` / `onTokenRefresh`) that re-saves whenever FCM rotates the token.

---

## 3. Legacy channel naming dependency (P3)

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
- **Current successful realtime behavior must NOT be treated as proof that private-channel auth is working; the current flow still relies on legacy public channel names.**

**Action items:**
- Backend: Implement or verify `/api/pusher/auth` for private channel authorization.
- Resolve the `Bearer` vs `Token` auth prefix (see flag in `src/staff_chat/hooks/usePusher.js`).
- Migrate channel names to `private-` prefix in a single coordinated deploy.
