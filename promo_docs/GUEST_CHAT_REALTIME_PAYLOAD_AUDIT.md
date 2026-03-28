# Guest Chat Realtime Payload — Frontend Code-Truth Audit

**Date:** 2026-03-28  
**Scope:** How the frontend consumes `chat.message.created` realtime events  
**Method:** Direct code reading — no assumptions, no intended behavior

---

## Backend Payload Under Audit

```json
{
  "conversation_id": "BK-NOWAYHOT-2026-0002",
  "booking_id": "BK-NOWAYHOT-2026-0002",
  "room_conversation_id": 135,
  "id": 1100,
  "sender_role": "guest",
  "sender_name": "Guest",
  "message": "gfgf",
  "timestamp": "2026-03-28T13:01:44.085900+00:00",
  "room_number": 107,
  "has_attachments": false,
  "is_staff_reply": false,
  "sender_id": null,
  "pin": null
}
```

---

## 1. Which function receives the realtime `message_created` event first?

### Path A: Direct Pusher binding (primary guest path)

**File:** `src/hooks/useGuestChat.js`, lines ~310-320

```js
const wrappedCreated = (evt) => handleMessageCreatedRef.current(evt);
channel.bind(events.message_created, wrappedCreated);
```

The **first function** to touch the event is `handleMessageCreated` (defined at line ~141 of `useGuestChat.js`), accessed through the `handleMessageCreatedRef` stable ref.

### Path B: eventBus fallback (if event routing exists)

**File:** `src/realtime/eventBus.js`, lines ~324-338

If the event arrives on a `private-hotel-*-guest-chat-booking-*` channel and is routed through `eventBus.handleIncomingRealtimeEvent`, it hits:

```js
if (channel?.startsWith('private-hotel-') && channel?.includes('-guest-chat-booking-')) {
  const normalized = {
    category: 'guest_chat',
    type: payload?.type || eventName || 'message_created',
    payload: payload?.payload || payload?.message || payload || {},
    meta: { channel, eventName, event_id: payload?.meta?.event_id || payload?.event_id || payload?.id },
  };
  routeToDomainStores(normalized);
}
```

**However**, the guest Pusher client is a **separate** Pusher instance (`guestRealtimeClient.js`) from the staff one (`realtimeClient.js`). The guest Pusher channel bindings are set up in `useGuestChat`, NOT through `channelRegistry.js`. The `eventBus.js` fallback path only fires if the staff Pusher client happens to also subscribe to this private channel — which it does NOT in the current code. So **Path B is effectively dead for guest-initiated events on the guest's own Pusher client.**

### Normalization / transformation

**There is NO normalization or transformation function.** The raw Pusher event lands in `handleMessageCreated`, and this line is the only "transform":

```js
// src/hooks/useGuestChat.js, line ~161
const payload = evt?.payload ?? evt;
const msg = { ...payload };
if (!msg.conversation_id && conversationId) msg.conversation_id = conversationId;
```

This does exactly:
1. Unwraps an envelope if the event has `{ payload: {...} }` shape; otherwise treats `evt` as the payload itself
2. Spreads the payload into `msg` (shallow copy)
3. Backfills `conversation_id` from the bootstrap value if missing

**No field renaming. No `sender_role` → `sender_type` mapping. No `room_conversation_id` → anything mapping.**

### Object shape inserted into UI state

```js
// src/hooks/useGuestChat.js, line ~187
setMessages((prev) => {
  if (prev.some((m) => m.id === msg.id)) return prev;
  return sortMessages([...prev, { ...msg, status: 'delivered' }]);
});
```

**Exact object shape inserted into `messages[]` (hook local state):**

```js
{
  // All fields from backend payload, spread as-is:
  conversation_id: "BK-NOWAYHOT-2026-0002",
  booking_id: "BK-NOWAYHOT-2026-0002",
  room_conversation_id: 135,
  id: 1100,
  sender_role: "guest",          // ← NOT renamed to sender_type
  sender_name: "Guest",
  message: "gfgf",
  timestamp: "2026-03-28T13:01:44.085900+00:00",
  room_number: 107,
  has_attachments: false,
  is_staff_reply: false,
  sender_id: null,
  pin: null,
  // Added by frontend:
  status: "delivered"
}
```

**No normalization. The raw backend payload + `status: "delivered"` is the message object in local state.**

---

## 2. Which field does the frontend treat as the conversation identifier?

### Bootstrap source

**File:** `src/hooks/useGuestChat.js`, line ~93

```js
const conversationId = contract?.conversation_id ?? null;
```

The hook's `conversationId` comes from the **bootstrap response's `conversation_id` field**. Whatever the bootstrap returns as `conversation_id` is what the entire hook uses.

### Usage in hook (8 locations)

| Location | Code | Purpose |
|---|---|---|
| `useGuestChat.js:137` | `if (conversationId) guestChatActions.initMessagesForConversation(conversationId, result, ...)` | Push API-fetched messages into store keyed by `conversationId` |
| `useGuestChat.js:162` | `if (!msg.conversation_id && conversationId) msg.conversation_id = conversationId` | Backfill `conversation_id` on realtime messages |
| `useGuestChat.js:197` | `guestChatActions.handleEvent(storeEvent, ...)` where `storeEvent.payload = msg` | Routes to store, which reads `payload.conversation_id` |
| `useGuestChat.js:372` | `syncMessages() → guestChatActions.initMessagesForConversation(conversationId, ...)` | Sync uses bootstrap `conversationId` |
| `useGuestChat.js:460` | `loadOlderMessages → guestChatActions.initMessagesForConversation(conversationId, ...)` | Pagination uses bootstrap `conversationId` |
| `useGuestChat.js:483` | `markRead(hotelSlug, chatSession, conversationId)` | API call uses bootstrap `conversationId` |

### Usage in guestChatStore (handleEvent)

**File:** `src/realtime/stores/guestChatStore.jsx`, line ~398

```js
conversationId = payload.conversation_id; // ✅ CRITICAL: Must use payload.conversation_id as source of truth
```

When a realtime event arrives, the store reads `payload.conversation_id` directly from the event payload.

### The critical question: What value is `conversation_id`?

**From the backend payload:** `conversation_id: "BK-NOWAYHOT-2026-0002"` — a **string booking reference**.

**From the bootstrap:** Unknown without backend docs, but the bootstrap `REQUIRED_BOOTSTRAP_FIELDS` includes `conversation_id`. If the bootstrap also returns `conversation_id: "BK-NOWAYHOT-2026-0002"`, then:

- **Hook uses:** `"BK-NOWAYHOT-2026-0002"` as key
- **Store uses:** `"BK-NOWAYHOT-2026-0002"` as key for `messagesByConversationId["BK-NOWAYHOT-2026-0002"]`
- **Realtime event's `conversation_id`:** `"BK-NOWAYHOT-2026-0002"` → matches → messages land in correct bucket

**If the bootstrap returns a NUMERIC conversation ID (e.g., `135`) but the realtime event sends `conversation_id: "BK-NOWAYHOT-2026-0002"`:**

- **Hook uses:** `135` as key
- **Store keys messages under:** `135`
- **Realtime event's `conversation_id`:** `"BK-NOWAYHOT-2026-0002"` → **MISMATCH** → messages land in a NEW bucket `"BK-NOWAYHOT-2026-0002"` that nobody reads from
- **ALSO:** The hook's backfill logic (`if (!msg.conversation_id && conversationId)`) would NOT fire because `msg.conversation_id` IS present (`"BK-..."`)

**Verdict:** The frontend does NOT use `room_conversation_id` at all. It exclusively uses `conversation_id`. The field `room_conversation_id: 135` is **completely ignored** — never read, never referenced, never stored. Whether the system works depends entirely on whether the bootstrap's `conversation_id` matches the realtime event's `conversation_id`.

---

## 3. Does the frontend map `sender_role` → `sender_type`?

### In `useGuestChat.js` (hook)

**NO.** The `handleMessageCreated` function does:

```js
const msg = { ...payload };
```

It spreads the raw payload. The field `sender_role: "guest"` remains as `sender_role`. No `sender_type` field is created.

**However**, the hook does check `sender_role` in one place:

```js
// line ~177
if (
  (msg.sender_type === 'guest' || msg.sender_role === 'guest') &&
  msg.client_message_id
) {
  setSendingMessages((prev) =>
    prev.filter((s) => s.client_message_id !== msg.client_message_id)
  );
}
```

This is the **optimistic reconciliation logic**. It checks BOTH `sender_type` AND `sender_role`. This works correctly with the backend payload.

### In `guestChatStore.jsx` (store reducer)

**File:** `src/realtime/stores/guestChatStore.jsx`, line ~153

```js
const formattedMessage = {
  id: message.id,
  senderType: message.sender_type || message.senderType,
  senderName: message.sender_name || message.senderName,
  body: message.body || message.message,
  // ...
};
```

The reducer reads `message.sender_type` — **NOT `message.sender_role`**. Since the backend sends `sender_role: "guest"` and no `sender_type`, the formattedMessage gets:

```js
senderType: undefined || undefined  → undefined
```

**`senderType` will be `undefined` for all realtime messages.**

### In `guestChatStore.jsx` (handleEvent routing)

```js
case 'message_created':
  const actionType = payload.sender_type === 'guest' 
    ? GUEST_CHAT_ACTIONS.GUEST_MESSAGE_RECEIVED 
    : GUEST_CHAT_ACTIONS.STAFF_MESSAGE_SENT;
```

This checks `payload.sender_type`. Since the backend sends `sender_role` not `sender_type`, `payload.sender_type` is `undefined`, which is falsy → **ALL messages are routed to `STAFF_MESSAGE_SENT`**, even guest messages.

### Does `sender_name` get mapped?

In the store reducer:
```js
senderName: message.sender_name || message.senderName
```

The backend sends `sender_name: "Guest"` → this works. ✅

### Does `room_conversation_id` get mapped?

**NO.** Zero references to `room_conversation_id` anywhere in the frontend codebase. The field is completely ignored.

### Summary of field mapping

| Backend field | Frontend mapping | Result |
|---|---|---|
| `sender_role: "guest"` | NOT mapped to `sender_type` | `sender_type` is missing in stored message |
| `sender_role` | Checked in hook optimistic reconciliation (`msg.sender_role === 'guest'`) | Works for that one check |
| `sender_role` | NOT checked in store's `handleEvent` routing (`payload.sender_type`) | **Misroutes all messages** |
| `sender_role` | NOT checked in store reducer (`message.sender_type \|\| message.senderType`) | `senderType: undefined` in store |
| `sender_name` | `message.sender_name \|\| message.senderName` | Works ✅ |
| `room_conversation_id` | Never referenced | Ignored |
| `message` | Used directly by hook; `message.body \|\| message.message` in store | Works ✅ |
| `timestamp` | Used by hook sort (`a.timestamp \|\| a.created_at`) | Works ✅ |
| `has_attachments` | Never read by guest widget rendering | Ignored |
| `is_staff_reply` | Never referenced | Ignored |
| `pin` | Never referenced | Ignored |
| `booking_id` | Never referenced in message handling | Ignored |

---

## 4. Does the guest widget render from local hook state or guestChatStore?

### Definitive answer: **Local hook state only.**

**File:** `src/components/guest/GuestChatWidget.jsx`, line ~283-296

```js
const {
  messages,
  sendingMessages,
  // ...
} = useGuestChat({ hotelSlug, token });
```

And the render:

```jsx
<MessagesList
  messages={messages}
  sendingMessages={sendingMessages}
  contract={contract}
  onLoadOlder={loadOlder}
  onRetry={retryMessage}
/>
```

**File:** `src/hooks/useGuestChat.js`, return statement:

```js
return {
  messages,           // ← useState local state
  sendingMessages,    // ← useState local state
  // ...
};
```

The widget renders from:
- `messages[]` — hook's local `useState`
- `sendingMessages[]` — hook's local `useState`

**The `guestChatStore.messagesByConversationId` is NEVER read by the guest widget.** The store receives parallel updates but its data is not consumed by the rendering layer.

**Verdict:** The hook's local `messages[]` state is the sole source of truth for displayed messages.

---

## 5. Required fields for the rendering layer

### `MessageBubble` reads these fields:

**File:** `src/components/guest/GuestChatWidget.jsx`, lines ~15-80

| Field read | Code | Required? | Present in realtime payload? |
|---|---|---|---|
| `message.sender_type` | `message.sender_type === 'guest'` | For guest/staff alignment | ❌ **MISSING** — backend sends `sender_role` |
| `message.sender_role` | `message.sender_role === 'guest'` (same line, OR check) | Fallback for alignment | ✅ Present |
| `message.guest_id` | `contract?.guest_id && message.guest_id` | Fallback alignment | ❌ Not in payload (but fallback chain continues) |
| `message.staff_id` | `message.staff_id \|\| message.staff \|\| message.staff_display_name` | Determines staff message | ❌ Not in payload |
| `message.sender_type` again | final `else` fallback: `message.sender_type === 'guest'` | Last resort | ❌ Not in payload |
| `message.message` | `{message.message}` | **The text content** | ✅ Present |
| `message.timestamp` | `new Date(message.timestamp \|\| message.created_at)` | **Timestamp display** | ✅ Present |
| `message.created_at` | Fallback for timestamp | Timestamp fallback | ❌ Not in payload (but `timestamp` is) |
| `message.status` | `message.status === 'failed'`, `'sending'`, `'pending'` | UI state indicators | ✅ Added by frontend (`'delivered'`) |
| `message.staff_display_name` | `{message.staff_display_name}` | Staff sender name display | ❌ Not in payload |
| `message.id` | Used as React key | Dedup + sorting | ✅ Present |

### Guest/staff alignment analysis with the actual payload

Walking through `MessageBubble`'s alignment logic with the backend payload:

```js
let isGuest = false;

// Check 1: message.sender_type === 'guest'  →  sender_type is MISSING  →  false
// Check 1b: message.sender_role === 'guest'  →  'guest' === 'guest'  →  TRUE
if (message.sender_type === 'guest' || message.sender_role === 'guest') {
  isGuest = true;  // ← HIT. isGuest = true.
}
```

**For guest messages: works.** The `sender_role` OR check saves it. ✅

For a staff message (where `sender_role: "staff"`):

```js
// Check 1: message.sender_type === 'guest'  →  missing  →  false
// Check 1b: message.sender_role === 'guest'  →  'staff' !== 'guest'  →  false
// Check 2: contract?.guest_id && message.guest_id  →  message.guest_id not in payload  →  false
// Check 3: message.guest_id && !message.staff_id && !message.staff  →  no guest_id  →  false
// Check 4: message.staff_id || message.staff || message.staff_display_name  →  none present  →  false
// Check 5 (final else): message.sender_type === 'guest'  →  undefined  →  false  →  isGuest = false
```

**For staff messages: works accidentally** — falls through all checks, final `else` evaluates `undefined === 'guest'` → false → `isGuest = false`. Staff message rendered as staff. ✅ (but fragile)

### Sort logic reads:

```js
const tA = new Date(a.timestamp || a.created_at).getTime();
const tB = new Date(b.timestamp || b.created_at).getTime();
return tA !== tB ? tA - tB : (a.id || 0) - (b.id || 0);
```

- `timestamp` → ✅ present
- `id` → ✅ present (numeric `1100`, works for tie-breaking)

### Dedup logic reads:

```js
if (msg.id && processedMessageIds.current.has(msg.id))  // msg.id = 1100  ✅
if (prev.some((m) => m.id === msg.id))                  // msg.id = 1100  ✅
```

### Missing fields summary

| Missing field | Impact | Severity |
|---|---|---|
| `sender_type` | Widget alignment works via `sender_role` fallback. **Store routing is broken** — all messages treated as staff in `handleEvent` | ⚠️ Widget OK, ❌ Store broken |
| `staff_display_name` | Staff messages show no sender name in the bubble | ⚠️ Cosmetic |
| `created_at` | Not needed — `timestamp` is present and used first | ✅ No impact |
| `body` | Store reads `message.body \|\| message.message` — `message` field is present | ✅ No impact |
| `read_by_staff`, `read_by_guest` | Store sets `readByStaff: false`, `readByGuest: false` (defaults to false) | ✅ Default is correct (new message = unread) |
| `client_message_id` | Optimistic reconciliation check: `msg.client_message_id` will be undefined → sendingMessage is NOT cleared for guests | ⚠️ See Section 5b |

### 5b. Missing `client_message_id` impact

When the guest sends a message, the frontend includes `client_message_id` in the API request. When the echo comes back via Pusher:

```js
if (
  (msg.sender_type === 'guest' || msg.sender_role === 'guest') &&
  msg.client_message_id   // ← backend payload does NOT include this field
) {
  setSendingMessages((prev) =>
    prev.filter((s) => s.client_message_id !== msg.client_message_id)
  );
}
```

Since `msg.client_message_id` is **not in the backend payload**, this block never executes for the Pusher echo. **However**, the `sendMessage` mutation's `onSuccess` callback already removes the sending message before the Pusher echo arrives:

```js
onSuccess: (data) => {
  // ...add confirmedMsg to messages[]...
  setSendingMessages((prev) => prev.filter((m) => m.client_message_id !== clientMessageId));
}
```

So the `sendingMessage` is removed by the API response (synchronous), not by the Pusher echo. The dead Pusher reconciliation code is a no-op but not harmful.

---

## 6. Dedup logic — exact code and whether the payload can bypass it

### Layer 1: Event ID dedup (hook)

```js
// src/hooks/useGuestChat.js, line ~157
const eventId = evt?.meta?.event_id;
if (eventId) {
  if (processedEventIds.current.has(eventId)) { return; }
  processedEventIds.current.add(eventId);
}
```

**Backend payload has no `meta` envelope.** The raw Pusher event IS the payload directly. So:
- `evt?.meta?.event_id` → `undefined`
- The `if (eventId)` check is false → **this entire dedup layer is skipped**

### Layer 2: Message ID dedup (hook)

```js
// src/hooks/useGuestChat.js, line ~166
if (msg.id && processedMessageIds.current.has(msg.id)) { return; }
if (msg.id) processedMessageIds.current.add(msg.id);
```

- `msg.id = 1100` → numeric, truthy → **this dedup works** ✅

### Layer 3: Array-level dedup (hook)

```js
// src/hooks/useGuestChat.js, line ~187
setMessages((prev) => {
  if (prev.some((m) => m.id === msg.id)) return prev;
  return sortMessages([...prev, { ...msg, status: 'delivered' }]);
});
```

- Checks `m.id === msg.id` → `1100 === 1100` → **works** ✅

### Layer 4: Store-level event dedup

```js
// src/realtime/stores/guestChatStore.jsx, handleEvent
eventId = event.meta?.event_id;
if (!eventId) {
  const msgId = payload?.id || payload?.message_id;
  if (msgId) {
    eventId = `fallback-msg-${msgId}`;  // → "fallback-msg-1100"
  }
}
if (guestChatActions._processedEventIds.has(eventId)) { return; }
guestChatActions._processedEventIds.add(eventId);
```

- No `meta.event_id` → falls back to `fallback-msg-1100` → **works** ✅

### Layer 5: Store reducer dedup

```js
// GUEST_MESSAGE_RECEIVED / STAFF_MESSAGE_SENT reducer
const messageExists = currentMessages.some(m => m.id === message.id);
if (messageExists) return state;
```

- `m.id === 1100` → **works** ✅

### Can the payload bypass dedup?

**No** — as long as `id` is present and consistent across deliveries. The `id: 1100` field is checked at 4 independent layers (message ID set, array check, store fallback event ID, store reducer).

**Edge case:** If Pusher delivers the same event twice with the same `id`, all layers catch it. If the backend sends a different `id` for the same logical message, dedup would fail — but that's a backend bug, not a frontend one.

---

## 7. Does the frontend incorrectly use `conversation_id: "BK-..."` as a numeric room conversation ID?

### Direct answer: The frontend does NOT reference `room_conversation_id` anywhere.

**Grep result:** `room_conversation_id` has zero matches in the frontend source.

The frontend uses `conversation_id` as an **opaque key**. It does not assume it's numeric. All uses are:

1. **As a Map/object key:** `messagesByConversationId[conversationId]` — works with strings
2. **As an equality check:** `activeConversationId === conversationId` — works with strings
3. **Passed to API:** `markRead(hotelSlug, chatSession, conversationId)` — URL segment in `/chat/conversations/${conversationId}/mark_read/`

### The real question: Do bootstrap and realtime agree?

The risk is:

| Source | `conversation_id` value |
|---|---|
| Bootstrap response | Unknown — could be `"BK-NOWAYHOT-2026-0002"` or `135` |
| Realtime payload | `"BK-NOWAYHOT-2026-0002"` (string) |

**If bootstrap returns `conversation_id: "BK-NOWAYHOT-2026-0002"`:**
- Hook stores `conversationId = "BK-NOWAYHOT-2026-0002"`
- Store keys messages under `messagesByConversationId["BK-NOWAYHOT-2026-0002"]`
- Realtime event has `conversation_id: "BK-NOWAYHOT-2026-0002"` → **match** ✅
- Messages land in correct bucket

**If bootstrap returns `conversation_id: 135` (numeric room_conversation_id):**
- Hook stores `conversationId = 135`
- Store keys messages under `messagesByConversationId[135]`
- Realtime event has `conversation_id: "BK-NOWAYHOT-2026-0002"` → **MISMATCH** ❌
- In the hook: `if (!msg.conversation_id && conversationId)` → `msg.conversation_id` IS present ("BK-...") → backfill does NOT fire
- In the store: `conversationId = payload.conversation_id` → `"BK-NOWAYHOT-2026-0002"` → creates new bucket `messagesByConversationId["BK-NOWAYHOT-2026-0002"]`
- **Messages go into a bucket that nobody reads from** — widget reads from the hook's `messages[]` (which is flat, no bucketing), but the store has orphaned data

**Impact on hook's `messages[]`:** The hook's `setMessages` does NOT use `conversationId` at all — it's a flat array. So realtime messages still get added to the display. **The widget still shows them.** The mismatch only affects the store.

### Affected places if bootstrap ≠ realtime `conversation_id`:

| Location | Code | Effect |
|---|---|---|
| `guestChatStore` `handleEvent` | `conversationId = payload.conversation_id` → `"BK-..."` | Messages stored under wrong key |
| `guestChatStore` `GUEST_MESSAGE_RECEIVED` reducer | `state.messagesByConversationId[conversationId]` | Looks up `"BK-..."` bucket (empty), creates new entry |
| `guestChatStore` `conversationsById[conversationId]` | `conversation` lookup → `undefined` | Unread count increment skipped |
| `useGuestChat` `handleMessageCreated` | `msg.conversation_id = "BK-..."` stays as-is | Inconsequential (hook uses flat array) |
| `markRead` API | Uses bootstrap `conversationId` → API may receive wrong ID | Potential 404 if backend expects numeric ID |

---

## 8. Read receipt fields

### What `message_read` handler depends on:

**File:** `src/realtime/stores/guestChatStore.jsx`, `MESSAGE_READ_UPDATE` case:

```js
case GUEST_CHAT_ACTIONS.MESSAGE_READ_UPDATE: {
  const { messageId, conversationId, readByStaff, readByGuest } = action.payload;
  const currentMessages = state.messagesByConversationId[conversationId] || [];
  
  const updatedMessages = currentMessages.map(msg => 
    msg.id === messageId ? {
      ...msg,
      readByStaff: readByStaff !== undefined ? readByStaff : msg.readByStaff,
      readByGuest: readByGuest !== undefined ? readByGuest : msg.readByGuest
    } : msg
  );
```

Required fields: `message_id`, `conversation_id`, `read_by_staff`, `read_by_guest`

### What the `handleEvent` routing sends:

```js
case 'message_read':
  dispatch({
    type: GUEST_CHAT_ACTIONS.MESSAGE_READ_UPDATE,
    payload: {
      messageId: payload.message_id,
      conversationId,              // ← from payload.conversation_id
      readByStaff: payload.read_by_staff,
      readByGuest: payload.read_by_guest
    }
  });
```

### Does `MessageBubble` render read status?

**NO.** `MessageBubble` only checks:
- `message.status === 'failed'`
- `message.status === 'sending'`
- `message.status === 'pending'`

**It never reads `readByStaff`, `readByGuest`, or any read receipt field.**

### Are realtime-created messages populated with read fields?

The backend payload has **no** `read_by_staff` or `read_by_guest`. The store reducer defaults them:

```js
readByStaff: message.read_by_staff || message.readByStaff || false,
readByGuest: message.read_by_guest || message.readByGuest || false
```

Both resolve to `false` for new messages. This is **correct** — a newly created message is unread.

### But the widget reads from hook state, not store

The hook's local `messages[]` has the raw backend payload, which has neither `read_by_staff` nor `readByStaff`. The widget doesn't care because `MessageBubble` never reads those fields.

**Verdict:** Read receipt data flow is:
1. `message_read` event → store updates `readByStaff/readByGuest` on store messages ✅
2. Store messages are never read by widget ❌ (dead update)
3. Hook's display `messages[]` never get read receipt updates ❌
4. `MessageBubble` never renders read status ❌

**The entire read receipt pipeline is functional in the store but invisible to the user.**

---

## 9. Do edited/deleted message handlers exist? Are they bound to realtime?

### Store handlers

**File:** `src/realtime/stores/guestChatStore.jsx`

**Delete handler — EXISTS:**
```js
case GUEST_CHAT_ACTIONS.GUEST_CHAT_MESSAGE_DELETED: {
  const { conversationId, messageId } = action.payload;
  const msgs = state.messagesByConversationId[conversationId] || [];
  return {
    ...state,
    messagesByConversationId: {
      ...state.messagesByConversationId,
      [conversationId]: msgs.filter(m => m.id !== messageId)
    }
  };
}
```

**Edit handler — EXISTS:**
```js
case GUEST_CHAT_ACTIONS.GUEST_CHAT_MESSAGE_EDITED: {
  const { conversationId, message } = action.payload;
  const msgs = state.messagesByConversationId[conversationId] || [];
  return {
    ...state,
    messagesByConversationId: {
      ...state.messagesByConversationId,
      [conversationId]: msgs.map(m =>
        m.id === message.id
          ? { ...m, body: message.body, attachments: message.attachments ?? m.attachments, editedAt: message.edited_at ?? new Date().toISOString() }
          : m
      )
    }
  };
}
```

**handleEvent routing — EXISTS:**
```js
case 'message_deleted': {
  dispatch({
    type: 'GUEST_CHAT_MESSAGE_DELETED',
    payload: { messageId: payload.message_id, conversationId }
  });
  break;
}

case 'message_edited': {
  dispatch({
    type: 'GUEST_CHAT_MESSAGE_EDITED',
    payload: { message: payload, conversationId }
  });
  break;
}
```

### Are they bound to Pusher?

**NO.** In `useGuestChat.js`, the Pusher binding section (lines ~310-318):

```js
channel.bind(events.message_created, wrappedCreated);
channel.bind(events.message_read, wrappedRead);

realtimeDiag.current.boundEvents = [events.message_created, events.message_read];
```

**Only two events are bound.** No binding for `message_deleted` or `message_edited`.

### Even if bound, would they affect the widget?

**NO.** The handlers update `guestChatStore.messagesByConversationId`, which the widget does not read. The hook's local `messages[]` would not be updated.

### Where the missing bindings should be added

**File:** `src/hooks/useGuestChat.js`, inside the `setup()` function, after line ~318:

```js
// Currently:
channel.bind(events.message_created, wrappedCreated);
channel.bind(events.message_read, wrappedRead);

// Missing (need to add):
// channel.bind(events.message_deleted, wrappedDeleted);   // if events.message_deleted exists in contract
// channel.bind(events.message_edited, wrappedEdited);     // if events.message_edited exists in contract
```

**Also need:** New handlers (`handleMessageDeleted`, `handleMessageEdited`) that update BOTH the hook's local `setMessages` AND dispatch to the store. Currently the store-only handlers exist but the hook-level handlers do not.

**Also need:** The bootstrap contract (`events` object) must include `message_deleted` and `message_edited` event names from the backend.

---

## 10. Final Output

### ✅ What the frontend currently does correctly with this payload

1. **Message text renders correctly** — `MessageBubble` reads `message.message` directly. Backend sends `message: "gfgf"`. ✅
2. **Timestamp renders correctly** — `MessageBubble` reads `message.timestamp || message.created_at`. Backend sends `timestamp`. ✅
3. **Guest message alignment works** — `MessageBubble` checks `message.sender_role === 'guest'` (OR chain). Backend sends `sender_role: "guest"`. ✅
4. **Dedup works** — `msg.id: 1100` is checked at 4 independent layers. All pass. ✅
5. **Sort works** — `timestamp` field is present and parseable. `id: 1100` is numeric for tie-breaking. ✅
6. **Optimistic reconciliation (API path) works** — `sendMessage` mutation `onSuccess` removes sending message before Pusher echo arrives. ✅
7. **Message added to display state** — `setMessages` adds `{ ...msg, status: 'delivered' }` correctly. ✅

### ⚠️ What is fragile

1. **Staff message alignment is accidental** — For staff messages, `MessageBubble` falls through ALL checks (no `sender_type`, no `guest_id`, no `staff_id`, no `staff_display_name`) and the final `else` defaults to `isGuest = false`. This works but depends on zero matching fields — any future field addition could break it.

2. **Staff sender name is invisible** — `MessageBubble` shows `message.staff_display_name` for staff messages. Backend sends `sender_name` but NOT `staff_display_name`. Staff messages render with no name label.

3. **`conversation_id` type agreement** — Frontend treats it as opaque key. If bootstrap returns a different `conversation_id` format than realtime, store data becomes orphaned. The widget still works (flat array) but the store is silently broken.

4. **No `meta.event_id` in payload** — Event-level dedup in the hook is completely bypassed. Only message-ID dedup catches duplicates. If Pusher double-delivers with a transient ID change, it could pass through.

5. **`client_message_id` not echoed by backend** — Pusher echo-based optimistic reconciliation is dead code. Works only because API response `onSuccess` handles it first.

### ❌ What is wrong right now

1. **`sender_role` / `sender_type` mismatch in store routing** — `guestChatStore.handleEvent` checks `payload.sender_type === 'guest'` for `message_created` routing. Backend sends `sender_role`, not `sender_type`. **All realtime messages are routed to `STAFF_MESSAGE_SENT`**, which increments `unreadCountForGuest` instead of `unreadCountForStaff`. Every guest message is misclassified in the store.

2. **`senderType: undefined` in store** — The store's `formattedMessage` reads `message.sender_type || message.senderType`. Neither exists in the backend payload. `senderType` is `undefined` for all realtime messages. The unread counting logic (`isGuestMessage = formattedMessage.senderType === 'guest'`) always evaluates to `false`. All messages are treated as non-guest (staff) for unread counting.

3. **`message_deleted` / `message_edited` not bound** — Store reducers exist, handleEvent routes exist, but no Pusher bindings. Deleted messages stay visible. Edited messages show stale content. Even if bound, they would only update the store (not the display).

4. **`markRead()` never invoked** — The backend never learns the guest has read messages. Staff-side unread counts accumulate forever.

5. **Debug logging in production** — `DEBUG_REALTIME = true` hardcoded. Every event logs to console with full payload including message content.

### 🚀 Minimum frontend-only fixes required BEFORE any backend contract change

| # | Fix | File | Change |
|---|---|---|---|
| 1 | **Add `sender_role` fallback in store routing** | `guestChatStore.jsx` `handleEvent` | Change `payload.sender_type === 'guest'` to `(payload.sender_type \|\| payload.sender_role) === 'guest'` |
| 2 | **Add `sender_role` fallback in store reducer** | `guestChatStore.jsx` reducer `formattedMessage` | Change `senderType: message.sender_type \|\| message.senderType` to `senderType: message.sender_type \|\| message.sender_role \|\| message.senderType` |
| 3 | **Gate debug logging** | `useGuestChat.js` line 26 | Change `const DEBUG_REALTIME = true;` to `const DEBUG_REALTIME = import.meta.env.DEV;` |
| 4 | **Gate ChatDebugPanel** | `GuestChatWidget.jsx` | Wrap `<ChatDebugPanel>` in `{import.meta.env.DEV && <ChatDebugPanel .../>}` |
| 5 | **Call `markRead()` on widget mount/focus** | `GuestChatWidget.jsx` or `useGuestChat.js` | Add `useEffect` that calls `markRead()` when messages are visible |
| 6 | **Set `activeConversationId`** | `useGuestChat.js` | After bootstrap, call `guestChatActions.setActiveConversation(conversationId, dispatch)` |

**Fixes 1-2 are critical** — without them, the store's message classification, unread counting, and conversation metadata are **all wrong** for every realtime message. The widget displays correctly by accident (it reads from the hook's raw payload, not the store), but any feature that reads from the store (staff conversation list, unread badges, ChatContext consumers) gets corrupted data.

**Fix 3-4 are P0 security** — production guests can see internal debug data.

**Fixes 5-6 are P1 UX** — dead read receipts and broken unread counting.

---

## Appendix: Complete Event Path Trace

```
Backend Pusher event arrives on private-hotel-{slug}-guest-chat-booking-{bookingId}
  │
  ├─► Guest Pusher client (guestRealtimeClient.js)
  │     │
  │     ├─► channel.bind(events.message_created, wrappedCreated)
  │     │     │
  │     │     └─► handleMessageCreated(evt)  [useGuestChat.js]
  │     │           │
  │     │           ├─ payload = evt?.payload ?? evt     // Raw payload (no envelope)
  │     │           ├─ eventId = evt?.meta?.event_id     // undefined (no meta)
  │     │           ├─ msg = { ...payload }              // Shallow copy of raw backend fields
  │     │           ├─ Backfill: if (!msg.conversation_id) → NO (it exists as "BK-...")
  │     │           │
  │     │           ├─ Event dedup: SKIPPED (no eventId)
  │     │           ├─ Message dedup: processedMessageIds.has(1100) → CHECK
  │     │           │
  │     │           ├─ Optimistic reconciliation:
  │     │           │   msg.sender_role === 'guest' ✅ BUT msg.client_message_id → undefined
  │     │           │   → Block does NOT execute
  │     │           │
  │     │           ├─ setMessages: add { ...msg, status: 'delivered' }
  │     │           │   → UI updates with raw payload
  │     │           │
  │     │           └─ guestChatActions.handleEvent({
  │     │                 category: 'guest_chat',
  │     │                 type: 'message_created',
  │     │                 payload: msg,               // { sender_role: 'guest', ... }
  │     │                 meta: undefined
  │     │               }, dispatch)
  │     │                 │
  │     │                 ├─ conversationId = payload.conversation_id = "BK-..."
  │     │                 ├─ eventId fallback: "fallback-msg-1100"
  │     │                 ├─ switch 'message_created':
  │     │                 │   payload.sender_type === 'guest'
  │     │                 │   → undefined === 'guest' → FALSE
  │     │                 │   → dispatches STAFF_MESSAGE_SENT ← ❌ WRONG
  │     │                 │
  │     │                 └─ Reducer STAFF_MESSAGE_SENT:
  │     │                     conversationId = "BK-..."
  │     │                     formattedMessage.senderType = undefined ← ❌
  │     │                     isGuestMessage = false ← ❌
  │     │                     unreadCountForGuest++ (if not active) ← ❌ WRONG COUNTER
  │     │
  │     └─► channel.bind(events.message_read, wrappedRead)
  │           └─► (only fires for read events, not creation)
  │
  └─► (eventBus does NOT receive this — separate Pusher client)
```
