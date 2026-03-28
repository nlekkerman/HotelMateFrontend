# Guest → Staff Chat System — Full Audit

**Date:** 2026-03-28  
**Scope:** Guest-facing chat widget, realtime layer, state management, UX  
**Stack:** React + TanStack Query + Zustand (useReducer) + Pusher + Bootstrap CSS  

---

## 1. CHAT FLOW — Full Lifecycle

### Sequence

1. **Widget loads** — `GuestChatPortal.jsx` reads `hotel_slug` + `token` from URL query params.
2. **Token persisted** — `persistGuestToken(token)` saves raw token to `localStorage` so it survives refreshes.
3. **Bootstrap** — `useGuestChat()` fires a TanStack `useQuery` → `guestChatAPI.getChatBootstrap(hotelSlug, token)`.
   - `GET /api/guest/hotel/{slug}/chat/context?token=RAW_TOKEN`
   - Response validated against `REQUIRED_BOOTSTRAP_FIELDS` + `REQUIRED_NESTED_PATHS`.
4. **Contract stored** — On success, the hook extracts: `chatSession`, `conversationId`, `channelName`, `events`, `pusherConfig`, `permissions`.
   - `guestChatActions.setContext(contract, dispatch)` pushes into `guestChatStore`.
5. **Messages fetched** — Second `useQuery` fires once `chatSession` is non-null → `guestChatAPI.getMessages(hotelSlug, chatSession, { limit: 50 })`.
   - Merge strategy: Map-based dedup, preserves existing realtime messages + unresolved optimistic entries.
6. **Pusher subscription** — `useEffect` in `useGuestChat` creates a guest Pusher client (`createGuestPusherClient`) using bootstrap config, subscribes to `channelName`, binds `events.message_created` + `events.message_read`.
7. **On `pusher:subscription_succeeded`** — `syncMessages()` is called (refetch + merge), connection state → `connected`.

### ⚠️ What breaks if `chatSession` is null?

| Scenario | Impact |
|---|---|
| Bootstrap fails (network, 401, 404, 500) | `chatSession` stays `null`. Messages query is disabled (`enabled: !!(chatSession && hotelSlug)`). Pusher setup effect bails (`if (!chatSession || …) return`). Widget shows error screen. **Safe — no crash.** |
| Bootstrap returns but missing `chat_session` | `validateBootstrapContract()` throws. TanStack query records the error. Widget shows error. **Safe.** |
| Race: realtime event arrives before bootstrap completes | Cannot happen — subscription doesn't start until `chatSession` is set. **Safe.** |
| `chatSession` expires mid-session | All subsequent API calls get 401. `sendMessage` mutation triggers `onError` marking message as `failed`. **BUT: no automatic re-bootstrap or session refresh exists.** The user is stuck with a `failed` state until they reload the page. |

**CRITICAL GAP:** No session renewal mechanism. If the backend expires `chat_session` (e.g., TTL-based), the guest is silently broken until a full page reload re-bootstraps.

---

## 2. STATE MODEL

### All State Atoms

| State | Location | Source | Update Triggers | Notes |
|---|---|---|---|---|
| `contract` | `useGuestChat` (TanStack cache) | API bootstrap | Once on mount, cached 5min (`staleTime`) | Immutable after bootstrap |
| `chatSession` | Derived from `contract` | API bootstrap | Same as contract | Used for all auth headers |
| `conversationId` | Derived from `contract` | API bootstrap | Same as contract | Single conversation per guest |
| `messages[]` | `useGuestChat` local `useState` | API + Realtime + Optimistic | Fetch, realtime event, send, load-older, sync | **Primary display source** |
| `sendingMessages[]` | `useGuestChat` local `useState` | Optimistic UI | `onMutate` (add), `onSuccess` (remove), `onError` (mark failed) | Separate from `messages[]` |
| `connectionState` | `useGuestChat` local `useState` | Pusher events | `connected`, `connecting`, `disconnected`, `failed` | Drives `ConnectionStatus` UI |
| `guestChatStore.messagesByConversationId` | `guestChatStore` (useReducer) | API init + realtime dispatch | `INIT_MESSAGES_FOR_CONVERSATION`, `GUEST_MESSAGE_RECEIVED`, `STAFF_MESSAGE_SENT`, `MESSAGE_READ_UPDATE` | **Parallel copy** |
| `guestChatStore.conversationsById` | `guestChatStore` (useReducer) | API + realtime | `INIT_CONVERSATIONS_FROM_API`, `CONVERSATION_CREATED`, metadata updates | Staff-side also writes here via `ChatContext` |
| `guestChatStore.context` | `guestChatStore` | Bootstrap contract | `SET_CONTEXT` | Stored once |
| `guestChatStore.activeConversationId` | `guestChatStore` | `ChatContext` | `SET_ACTIVE_CONVERSATION` | Not set by `useGuestChat` directly |
| `processedEventIds` | `useGuestChat` `useRef(Set)` | Realtime events | On each event | Dedup for event-level IDs |
| `processedMessageIds` | `useGuestChat` `useRef(Set)` | API fetch + realtime | On each message | Dedup for message-level IDs |
| `guestChatActions._processedEventIds` | Module-level `Set` | Realtime events | On each `handleEvent` call | **Third dedup layer** |
| `realtimeDiag` | `useGuestChat` `useRef` | Internal | Updated on every event | Debug panel only |

### ⚠️ Stale / Duplicated State

1. **DUPLICATED MESSAGES: `messages[]` (hook) vs `guestChatStore.messagesByConversationId`**  
   The hook maintains its own `messages[]` via `useState` AND pushes into `guestChatStore` via `initMessagesForConversation`. Both are independently updated by realtime events. The hook's `handleMessageCreated` does TWO things: updates local `setMessages` AND calls `guestChatActions.handleEvent`. The store's reducer independently deduplicates and sorts.
   
   **Risk:** If any code reads from `guestChatStore.messagesByConversationId` (e.g., `ChatContext`, `useGuestChatStore` hook), it may show different messages than the widget (which reads from the hook's local `messages[]`). The two can drift apart, especially during error scenarios where one update succeeds and the other doesn't.

2. **TRIPLE DEDUPLICATION** — Three independent dedup sets exist:
   - `processedEventIds` (useRef in hook) — event_id level
   - `processedMessageIds` (useRef in hook) — message.id level
   - `guestChatActions._processedEventIds` (module global) — event_id + fallback level
   
   The module-global set persists across component unmount/remount, while the useRef sets reset. This means after a hot-module reload or remount, the hook's refs are fresh but the module global still has old IDs → **messages could be dropped** if the same event_id is redelivered.

3. **`ChatContext` re-creates conversations from `guestChatStore.context`** — It synthesizes a "guestConversation" object from the bootstrap context and pushes it into both `conversations` state AND `guestChatStore` via `initFromAPI`. This is a third source of truth for conversation metadata.

---

## 3. MESSAGE FLOW

### SEND

```
User types → MessageInput.handleSubmit → useGuestChat.sendMessage()
  → sendMessageMutation.mutate({ message, replyTo, clientMessageId: uuid() })
    → onMutate: add to sendingMessages[] with status='sending', id='sending-{clientMessageId}'
    → mutationFn: guestChatAPI.sendMessage(hotelSlug, chatSession, { message, client_message_id, reply_to })
    → onSuccess: 
        1. Extract confirmedMsg from response
        2. Add confirmedMsg to messages[] (if not already present)
        3. Add confirmedMsg.id to processedMessageIds
        4. Remove from sendingMessages[]
    → onError: mark sendingMessage as status='failed'
```

**Optimistic update?** — YES, but in a separate array (`sendingMessages[]`), not in `messages[]`. The widget merges them at render time: `[...messages, ...sendingMessages].sort(...)`. This is a good pattern — avoids reconciliation complexity.

**Duplicate prevention?** — YES, `client_message_id` (UUIDv4) sent to backend for server-side dedup. On the client, `processedMessageIds` prevents the Pusher echo from being re-added.

**Retry on failure?** — YES. `retryMessage()` generates a NEW `clientMessageId` and re-submits. The old failed entry is removed.

### ⚠️ Problem: Retry generates a new `client_message_id`

When retrying, a **new** `client_message_id` is generated. If the original request actually succeeded (network timeout but server processed it), the retry will create a **duplicate message on the server** unless the backend also deduplicates by message content + timestamp (unlikely). The old `client_message_id` is lost.

### RECEIVE

```
Pusher event → channel.bind(events.message_created, wrappedCreated)
  → handleMessageCreatedRef.current(evt)
    → Event dedup (processedEventIds by event_id)
    → Message dedup (processedMessageIds by msg.id)
    → Clear matching sendingMessage (by client_message_id for guest-sent)
    → setMessages: add if not duplicate, sort
    → guestChatActions.handleEvent → guestChatStore reducer (GUEST_MESSAGE_RECEIVED or STAFF_MESSAGE_SENT)
```

**Merge vs Replace:** MERGE strategy everywhere. API fetch merges into existing via Map. Realtime appends. `syncMessages()` also merges. Never a full replace.

### ⚠️ Ordering Issues

- Sorting uses `new Date(a.timestamp || a.created_at)` — handles both field names.
- Tie-breaking: `(a.id || 0) - (b.id || 0)` — assumes server IDs are sequential. If backend uses UUIDs instead of auto-increment integers, this tie-break is meaningless (NaN comparison).
- **guestChatStore sorts by `createdAt`** (camelCase), while the hook sorts by `timestamp || created_at` (snake_case). If message normalization is inconsistent, the two arrays could have different orderings.

### ⚠️ Missing Deduplication Edge Case

The `eventBus.js` also routes `guest_chat` events to `guestChatActions.handleEvent()` (line 560). This means for events arriving through the booking channel, the store gets TWO dispatches:
1. From `useGuestChat`'s direct Pusher binding
2. From `eventBus.js` → `routeToDomainStores` → `guestChatActions.handleEvent`

The module-global `_processedEventIds` set deduplicates this at the store level, but the hook's `setMessages` is called only from the direct binding, so the hook state and store state can process the same event through different paths. If the event arrives through `eventBus` first (possible if the guest messages channel fires before the private booking channel), the store gets it, but the hook's `setMessages` doesn't — causing a desync between widget display and store.

---

## 4. REALTIME HANDLING

### Channel Subscription

**Guest side:** `useGuestChat` creates a dedicated Pusher client (`createGuestPusherClient`) per chat session. This client is separate from the staff Pusher client. Channel pattern: `private-hotel-{hotelSlug}-guest-chat-booking-{bookingId}` (from bootstrap `channel_name`).

**Staff side:** `channelRegistry.js` subscribes to `{hotelSlug}-guest-messages` (hotel-wide) which fires `new-guest-message` when any guest sends a message. Additionally, the `ChatContext` + `chatStore` handle guest chat events routed through `eventBus`.

### Event Handling

| Event | Handler | Updates |
|---|---|---|
| `events.message_created` (from bootstrap) | `handleMessageCreated` in `useGuestChat` | `messages[]`, `sendingMessages[]`, `guestChatStore` |
| `events.message_read` (from bootstrap) | `handleMessageRead` in `useGuestChat` | `guestChatStore` (MESSAGE_READ_UPDATE) |
| `pusher:subscription_succeeded` | inline | `connectionState → 'connected'`, triggers `syncMessages()` |
| `pusher:subscription_error` | inline | `connectionState → 'failed'` |
| `connected` (Pusher connection) | inline | `connectionState → 'connected'` |
| `disconnected` (Pusher connection) | inline | `connectionState → 'disconnected'` |
| `error` (Pusher connection) | inline | `connectionState → 'failed'` |

### ⚠️ Events NOT handled

1. **`conversation_created`** — The `guestChatStore` reducer has a handler, but the Pusher binding in `useGuestChat` does NOT bind this event. It only binds `events.message_created` and `events.message_read`. If the backend fires `conversation_created` on the guest channel, it falls through to the global `bind_global` debug handler and is logged but **never processed**.

2. **`message_deleted`** — The store has `GUEST_CHAT_MESSAGE_DELETED` action, but no Pusher binding exists for this event in `useGuestChat`. Deleted messages remain visible to the guest until page reload.

3. **`message_edited`** — Same as above. Store has `GUEST_CHAT_MESSAGE_EDITED` but no Pusher binding. Edited messages show stale content.

4. **`unread_updated`** — The store handles it, but no binding in the hook. The guest-side unread count never updates from realtime — only from API responses.

5. **`conversation_updated`** — Store handles it, no binding.

6. **Typing indicators** — No event defined, no binding, no handler. Not in the contract.

### ⚠️ Events handled but NOT updating UI

`message_read` is dispatched to `guestChatStore.MESSAGE_READ_UPDATE`, which updates `readByStaff` / `readByGuest` on individual messages in the store. **However**, the widget's `MessageBubble` component does NOT read these fields. It only renders `message.status` for `pending`/`failed`/`sending` states. There is **no read receipt visualization** (no checkmarks, no "seen" indicator) in the guest widget.

---

## 5. READ RECEIPTS & BADGES

### When messages are marked as read

**Guest marks read:** `useGuestChat.markRead()` → `guestChatAPI.markRead(hotelSlug, chatSession, conversationId)` → `guestChatActions.markConversationReadForGuest()`.

**Problem:** `markRead()` is exposed via the hook's public API but **never called automatically**. The widget (`GuestChatWidget.jsx`) does not call `markRead` on mount, on focus, on scroll-to-bottom, or on any other trigger. It is a dead function.

**Staff marks read:** `markRoomConversationRead()` API + `MARK_CONVERSATION_READ_FOR_STAFF` action exist. The `message_read` realtime event updates individual message flags.

### How unread badge is calculated

- `guestChatStore.conversationsById[id].unreadCountForGuest` — incremented when a non-guest message arrives while conversation is not active (`isActive` check in reducer).
- `guestChatStore.conversationsById[id].unreadCountForStaff` — incremented when a guest message arrives.

**Problem:** `activeConversationId` in `guestChatStore` is only ever set by `ChatContext`, not by the guest widget. For a guest, `activeConversationId` may remain `null` → **every incoming staff message increments `unreadCountForGuest`** even though the guest is actively viewing the chat.

### Where badges are shown

- **Widget:** No badge. No unread count display in `GuestChatWidget.jsx`.
- **Header/Navigation:** No guest-facing badge.
- **Staff side:** `ChatSidebar` shows unread counts. `StaffChatFloatingButton` shows total.

### ⚠️ Desync Risks

1. `markRead` is never called → `unreadCountForGuest` grows forever.
2. `activeConversationId` never set for guest → all messages counted as unread.
3. If staff marks messages read on the backend, the `message_read` event updates individual message `readByStaff` flags, but the widget doesn't display them.
4. `unreadCountForStaff` is managed client-side by incrementing on `GUEST_MESSAGE_RECEIVED`. If the guest reconnects and gets a `syncMessages`, the count is NOT reset or reconciled from the server.

---

## 6. UI FEATURES SUPPORT

| Feature | Status | Notes |
|---|---|---|
| Text messages | ✅ SUPPORTED | Full send/receive with optimistic UI |
| Images / Attachments | ❌ NOT IMPLEMENTED | `MessageBubble` only renders `message.message` text. No attachment rendering. `sendMessage` API only sends `{ message, client_message_id, reply_to }` — no file upload. Staff-side has full attachment support via `FileUpload`, `MessageAttachments`. |
| Reply/thread UI | ⚠️ PARTIAL | API supports `reply_to` field. `sendMessage` passes it. But widget `MessageInput` has no reply-to UI. No way for guest to select a message to reply to. No `ReplyPreview` in guest widget. |
| Reactions | ❌ NOT IMPLEMENTED | Staff side has `ReactionPicker`, `ReactionsList`. Guest widget has nothing. |
| Typing indicator | ❌ NOT IMPLEMENTED | No event, no UI, no handler anywhere in the guest flow. |
| Seen status (double tick) | ❌ NOT IMPLEMENTED | `message_read` event is handled but `MessageBubble` does not render any read/delivered indicators. Only `pending`, `sending`, `failed` states are shown. |
| Message editing | ❌ NOT IMPLEMENTED (guest side) | Store has the handler but no UI trigger, no Pusher binding, no API endpoint in `guestChatAPI`. |
| Message deletion | ❌ NOT IMPLEMENTED (guest side) | Same — store handler exists, nothing else. |
| Load older messages | ✅ SUPPORTED | Pagination via `before` cursor. Button at top of messages list. |
| Connection status indicator | ✅ SUPPORTED | `ConnectionStatus` component with 4 states. |
| Debug panel | ✅ SUPPORTED | `ChatDebugPanel` in-widget + `ChatRealtimeDebugPanel` page-level (dev only). |

---

## 7. ERROR HANDLING

### Missing chatSession

- **Guard in API layer:** Every function in `guestChatAPI.js` throws if `chatSession` is null/undefined. ✅
- **Guard in hook:** `useQuery` for messages has `enabled: !!(chatSession && hotelSlug)`. ✅
- **Guard in Pusher:** Setup effect returns early if `!chatSession`. ✅
- **Guard in widget:** Shows loading state while bootstrap pending, error state if bootstrap fails. ✅
- **Verdict:** Well-guarded. ✅

### Failed sendMessage

- `onError` marks the optimistic entry as `status: 'failed'` in `sendingMessages[]`. ✅
- `MessageBubble` renders a retry button for failed messages. ✅
- `retryMessage()` removes the failed entry and re-submits with new `clientMessageId`. ✅
- **Missing:** No notification/toast to the user beyond the inline retry button. No auto-retry.

### Realtime disconnect

- Pusher client binds `connected`, `disconnected`, `error` events. ✅
- `ConnectionStatus` component shows visual indicator. ✅
- On `pusher:subscription_succeeded` after reconnect, `syncMessages()` is called to catch up. ✅
- **Missing:** No exponential backoff on auth errors. If Pusher auth fails (session expired), `connectionState` goes to `failed` and stays there. No re-bootstrap attempt.
- **Missing:** No `connecting` → timeout → `failed` transition. If the connection hangs indefinitely in `connecting`, the user sees "Connecting..." forever with no escape.

### Bootstrap errors

- HTTP status-specific friendly messages (401/403 → "session expired", 404, 5xx). ✅
- TanStack retry: 3 attempts. ✅
- **Missing:** No retry button on the error screen. User must manually reload.

---

## 8. MULTI-DEVICE / REFRESH

### User refreshes page

1. `GuestChatPortal` reads params from URL.
2. `persistGuestToken` saves to localStorage (redundant if already saved).
3. Full re-bootstrap happens (fresh `useQuery`).
4. New Pusher client created.
5. Messages re-fetched.
6. **Works correctly.** TanStack `staleTime: 5min` means if refreshed within 5min the bootstrap response is cached. Messages have `staleTime: 30s`.

**Issue:** The old Pusher instance from the previous mount should be cleaned up by the effect return, but `guestRealtimeClient.js` uses a module-level `Map` cache (`pusherInstances`). On HMR or same-session remount, `createGuestPusherClient` returns the **cached old instance** (keyed by `chatSession:authEndpoint`). If `chatSession` is the same (bootstrap cached), the old potentially-disconnected Pusher instance is reused. No health check on reuse.

### Opens chat on another device

- Second device does its own bootstrap → gets same or new `chatSession`.
- If **same** `chatSession`: both devices receive Pusher events. Messages stay in sync via realtime. ✅
- If **different** `chatSession`: both work independently. No cross-device read sync since `markRead` is never called.
- **No "read on another device" sync mechanism** — messages read on device A remain "unread" on device B's state.

### Connection drops and reconnects

- Pusher has built-in reconnection logic.
- `syncMessages()` called on `pusher:subscription_succeeded` (which fires after reconnect). ✅
- **Gap in sync window:** Messages sent by guest during disconnect are in `sendingMessages[]` with status `sending`. They will timeout/fail in the mutation. But the mutation has no timeout — TanStack Query's default is no timeout. The message stays in `sending` state indefinitely if the API call hangs.

---

## 9. PERFORMANCE

### Re-renders

- `MessageBubble` is a plain function component (not memoized). Every state update to `messages[]` or `sendingMessages[]` re-renders the entire list.
- `MessagesList` re-sorts `[...messages, ...sendingMessages]` on every render — O(n log n) per render.
- `GuestChatWidget` is the parent of all. Any state change (`messages`, `sendingMessages`, `connectionState`, etc.) causes a full widget re-render including all children.
- **For moderate message counts (< 200), this is fine. For large histories, this will be slow.**

### Large message lists

- `loadOlderMessages` adds 50 messages per page. After several "load older" presses, the list grows.
- No virtualization (`react-window`, `react-virtuoso`). All messages are in the DOM.
- Sort runs on every merge / every render.
- `processedMessageIds` and `processedEventIds` Sets grow unbounded. The store's `_processedEventIds` has a 1000-entry LRU cleanup, but the hook's Refs do not.

### Debug panel overhead

- `ChatDebugPanel` renders in production (no DEV guard). It's hidden by default (toggle button), but the component is still mounted and receiving all props.
- `ChatRealtimeDebugPanel` is lazy-loaded and DEV-only (code-split). ✅
- `DEBUG_REALTIME = true` is hardcoded in `useGuestChat.js` line 26 — `console.log` on every event **in production**. This is a performance and information leak issue.
- `chatDebugLogger.js` processes every event even in production (no-ops if store is missing, but still runs the function calls, string operations, JSON.stringify for payload preview).

### Key metrics

| Metric | Value | Risk |
|---|---|---|
| Components per message | 1 (`MessageBubble`, not memoized) | Medium |
| Sorts per state update | 1-2 (messages + merge) | Low-Medium |
| DOM nodes per message | ~5-8 | Low |
| Dedup set growth | Unbounded in hook, LRU in store | Low (memory) |
| Console.log in production | Every Pusher event | High (perf + info leak) |

---

## 10. FINAL VERDICT

### ✅ What works well

1. **Bootstrap contract validation** — Strict schema check before any operation proceeds. Clear error messages on missing fields. Defense-in-depth.
2. **Session-based auth model** — Raw token used only once for bootstrap. All subsequent calls use session header. Clean separation.
3. **Optimistic message sending** — Separate `sendingMessages[]` array with proper reconciliation. Clean pattern that avoids complex rollback logic.
4. **Deduplication** — Multi-layer dedup (event ID + message ID + store-level) prevents most duplicate rendering.
5. **Connection state UI** — Visual indicator for connection health. `syncMessages()` on reconnect to catch missed messages.
6. **API layer guards** — Every API function validates inputs before making requests. No silent failures.
7. **Error UI** — Status-specific friendly error messages. Not just "something went wrong".
8. **Token persistence** — `localStorage` fallback ensures page refresh works.
9. **Pusher client caching** — One instance per session, avoids connection leaks on remount.

### ⚠️ What is fragile

1. **Dual message state** — Hook's `messages[]` and `guestChatStore.messagesByConversationId` can drift apart. Any consumer reading from the wrong source gets stale data.
2. **`activeConversationId` never set for guest** — Unread counting logic in the store is broken for the guest perspective.
3. **Module-global dedup set vs hook-level refs** — Different lifecycles cause subtle issues on remount/HMR.
4. **No session renewal** — If `chatSession` expires, the user is stuck until manual reload.
5. **Retry generates new `client_message_id`** — Can cause server-side duplicates if original request actually succeeded.
6. **`DEBUG_REALTIME = true` hardcoded** — Production logging on every event.
7. **No virtualization** — Message list performance degrades with history.
8. **Pusher client cache has no health check** — Reused instance may be in a disconnected state.

### ❌ What is broken

1. **`markRead()` is never called** — Read receipts are dead code on the guest side. The backend never knows the guest has read messages. `unreadCountForGuest` grows forever.
2. **`message_read` UI is missing** — Events are processed but `MessageBubble` doesn't render read/seen status. Guest has no idea if staff has seen their messages.
3. **`message_deleted` / `message_edited` have no Pusher binding** — Store reducers exist but events are never bound. Guests see stale/deleted messages until reload.
4. **`ChatDebugPanel` renders in production** — Exposes internal state (channel names, session presence, Pusher config, event diagnostics) to any guest who opens the widget. **Security issue.**
5. **`console.log` on every realtime event in production** — `DEBUG_REALTIME = true` is hardcoded, not gated by `import.meta.env.DEV`. Leaks event payloads, channel names, message content to browser console.
6. **No attachment support in guest widget** — API, store, and staff-side all support attachments. Guest widget ignores them entirely — if staff sends an image, the guest sees nothing (only `message.message` rendered).

### 🚀 Must-Fix Priority Order

| Priority | Issue | Effort | Impact |
|---|---|---|---|
| **P0** | Remove `ChatDebugPanel` from production / gate behind DEV flag | 5 min | **Security** — exposes internal system state to guests |
| **P0** | Gate `DEBUG_REALTIME` behind `import.meta.env.DEV` | 2 min | **Security + Performance** — stops production logging |
| **P1** | Call `markRead()` automatically when widget is visible/focused | 30 min | **UX** — staff needs to know guest has read messages |
| **P1** | Bind `message_deleted` + `message_edited` events in Pusher setup | 30 min | **Data consistency** — guests see stale content |
| **P1** | Render attachment previews in `MessageBubble` | 1-2 hrs | **UX** — staff-sent images/files are invisible to guests |
| **P2** | Add read receipt indicators (checkmarks) to `MessageBubble` | 1 hr | **UX** — guest has no delivery/read feedback |
| **P2** | Set `activeConversationId` in guest flow to fix unread counting | 15 min | **State correctness** |
| **P2** | Add session expiry detection + auto re-bootstrap | 2 hrs | **Reliability** — avoids stuck sessions |
| **P3** | Eliminate dual message state (pick hook OR store, not both) | 3-4 hrs | **Architecture** — reduces surface for state desync bugs |
| **P3** | Add `React.memo` to `MessageBubble` + virtualize message list | 2 hrs | **Performance** — matters at scale |
| **P3** | Fix retry to reuse original `client_message_id` (or implement idempotency differently) | 1 hr | **Data integrity** — prevents duplicate messages on retry |
| **P4** | Add typing indicators | 3-4 hrs | **UX polish** |
| **P4** | Add reply-to UI in guest widget | 2-3 hrs | **UX polish** — API already supports it |

---

### Architecture Diagram (Current State)

```
┌─────────────────────────────────────────────────────────────┐
│  GuestChatPortal (URL params → hotelSlug, token)            │
│  └── GuestChatWidget                                        │
│       ├── useGuestChat() hook ← OWNS messages[], sending[]  │
│       │    ├── TanStack: getChatBootstrap(token)            │
│       │    ├── TanStack: getMessages(chatSession)           │
│       │    ├── Pusher: createGuestPusherClient(config)      │
│       │    │    ├── bind(message_created) → setMessages     │
│       │    │    └── bind(message_read)    → store only      │
│       │    └── guestChatActions.handleEvent → store dispatch │
│       ├── MessagesList                                       │
│       │    └── MessageBubble (no memo, no attachments)       │
│       ├── MessageInput                                       │
│       ├── ConnectionStatus                                   │
│       └── ChatDebugPanel ← ⚠️ IN PRODUCTION                 │
├─────────────────────────────────────────────────────────────┤
│  guestChatStore (useReducer)  ← PARALLEL message state      │
│  ├── messagesByConversationId  (can desync with hook)        │
│  ├── conversationsById                                       │
│  ├── activeConversationId  ← NEVER SET for guests            │
│  └── context                                                 │
├─────────────────────────────────────────────────────────────┤
│  eventBus.js                                                 │
│  ├── Routes guest_chat → guestChatActions (store)            │
│  └── Routes guest_chat → chatActions (staff store too)       │
├─────────────────────────────────────────────────────────────┤
│  channelRegistry.js                                          │
│  └── {slug}-guest-messages channel (staff-side notifications)│
└─────────────────────────────────────────────────────────────┘
```

### Summary

The guest chat system has a **solid foundation**: bootstrap contract validation, session-based auth, optimistic UI, and deduplication are all well-designed. However, it has **two P0 security issues** (debug panel in production, unchecked logging) that should be fixed immediately. The most impactful UX gaps are the missing `markRead` call and the lack of attachment rendering, which make the chat feel incomplete from the guest's perspective. The dual message state (hook + store) is an architectural debt that will cause increasingly subtle bugs as features are added.
