# Duplicate Conversation in Chat Sidebar — Root Cause Audit

**Date:** 2026-03-30  
**Symptom:** One real conversation appears as TWO entries in the staff chat sidebar. The ghost entry is missing `guest_name` and `room_number`.

---

## 1. How the sidebar gets its data

```
ChatHomePage.jsx
  └── useChat() → ChatContext.conversations
        └── derived via useMemo from chatStore.conversationsById
              └── Object.values(chatStore.conversationsById)
```

`ChatSidebar` receives `conversations` as a prop from `ChatHomePage`, which reads it from `ChatContext`. `ChatContext.conversations` is a `useMemo` that maps `Object.values(chatStore.conversationsById)`.

**Key insight:** If `chatStore.conversationsById` has two keys for the same real conversation, the sidebar renders two entries.

---

## 2. What writes into `chatStore.conversationsById`

There are **four independent code paths** that dispatch `INIT_CONVERSATIONS_FROM_API` into the chatStore, plus one path that can create entries via `RECEIVE_MESSAGE`:

| # | Source file | Trigger | What it sends |
|---|------------|---------|---------------|
| A | `ChatContext.jsx` line 110 | Guest mode — guest context loaded | Single guest conversation with `conversation_id` from `guestChatState.context.conversation_id` |
| B | `ChatContext.jsx` line 171 | Staff mode — `fetchRoomConversations()` API call | All conversations from `/api/.../chat/conversations/` — keyed by `c.id` |
| C | `ChatContext.jsx` line 229 | Guest context re-fetch (setTimeout fallback) | Same as (A) — single guest conversation |
| D | `StaffChatContext.jsx` line 36 | Staff chat init — `fetchConversations()` | Staff-to-staff conversations from staff chat API |
| E | `ConversationView.jsx` line 181 | Opening a conversation not yet in store | Single conversation object |

### The `INIT_CONVERSATIONS_FROM_API` reducer (chatStore.jsx line 24–56)

```js
const convId = conv.id || conv.conversation_id;
conversationsById[convId] = { ... };
```

It uses `conv.id || conv.conversation_id` as the dictionary key. This is a **merge** operation (`{ ...state.conversationsById }` spread first), so entries are **added or overwritten by key**.

---

## 3. Root cause: Key mismatch creates two entries for the same conversation

### The problem

The API response from `fetchRoomConversations` (path B) returns conversations where the canonical ID is in `c.id`. ChatContext maps it:

```js
// ChatContext.jsx line 147
conversation_id: c.id || c.conversation_id,
id: c.id || c.conversation_id,
```

So both `id` and `conversation_id` are set to the same value (e.g., `42`).

**But** when a realtime `new-guest-message` event arrives on the `{slug}-notifications` channel (eventBus.js line 430–475), it creates a synthetic `realtime_staff_chat_message_created` event with:

```js
conversation_id: payload?.conversation_id,  // from the Pusher event payload
```

This `conversation_id` goes to `chatActions.handleEvent` (chatStore.jsx line 656), which parses it:

```js
const rawConversationId = payload?.conversation !== undefined
  ? payload.conversation
  : payload?.conversation_id !== undefined
    ? payload.conversation_id
    : payload?.conversationId;
```

Then dispatches `RECEIVE_MESSAGE` with `conversationId: numericConversationId`.

### The `RECEIVE_MESSAGE` reducer (chatStore.jsx line 131–205)

```js
case CHAT_ACTIONS.RECEIVE_MESSAGE: {
  const { message, conversationId } = action.payload;
  let conversation = state.conversationsById[conversationId];
  
  if (!conversation) {
    console.log('💬 [RECEIVE_MESSAGE] Conversation not in store yet, skipping:', conversationId);
    return state;
  }
  // ...
}
```

The reducer now correctly **skips** creating a stub if the conversation doesn't exist (the comment says "Creating stubs here caused ghost conversations with missing fields").

### So where does the ghost come from?

The ghost is **not** created by `RECEIVE_MESSAGE` anymore. It's created by **path B and D colliding with mismatched ID types**.

Here's the specific scenario:

1. **Path B** (`fetchRoomConversations` API) returns the conversation with `id: 42` (integer). ChatContext maps it and dispatches to chatStore. Key in `conversationsById`: `42` (number).

2. **Path D** (`StaffChatContext.fetchStaffConversations`) calls a **different** API (`staff_chat/conversations/`). If the backend returns staff-to-guest conversations in **both** APIs, the same conversation appears with potentially different shapes. The staff chat API may return the conversation with `id: "42"` (string) or with a different nested structure where `conv.id` resolves differently.

3. **OR** — more likely for guest chat — the realtime `new-guest-message` event on the `-guest-messages` channel triggers `showGuestMessageNotification` but ALSO a notification on the `-notifications` channel triggers path 5 (eventBus.js line 430), which synthesizes a `realtime_staff_chat_message_created`. This event carries `conversation_id` as a string from the Pusher payload. When `RECEIVE_MESSAGE` looks up `state.conversationsById[conversationId]`:
   - Key `42` (number from API) ≠ key `"42"` (string from realtime)
   - **JavaScript object keys are always strings**, so `42` becomes `"42"` — this is actually fine.

4. **The actual culprit: Path A + Path B running concurrently with different ID values.**

   - `fetchRoomConversations` returns conversation `{ id: 42, room: { number: "107", guest_name: "John" } }`. ChatContext maps it to key `42`.
   - The guest context path (A or C in ChatContext) creates a conversation from `guestChatState.context.conversation_id`. **If this value differs** from the API `id` (e.g., the bootstrap returns a UUID or a different numeric ID), it creates a second entry.

### Most probable root cause: **Guest mode path dispatching with `conversation_id` from bootstrap**

In `ChatContext.jsx` lines 85–111 (guest mode):

```js
const guestConversation = {
  conversation_id: guestChatState.context.conversation_id,
  id: guestChatState.context.conversation_id,
  // ...
};

chatDispatch({
  type: CHAT_ACTIONS.INIT_CONVERSATIONS_FROM_API,
  payload: { conversations: [guestConversation] }
});
```

And again at line 209–235 (the setTimeout re-fetch):

```js
chatDispatch({
  type: CHAT_ACTIONS.INIT_CONVERSATIONS_FROM_API,
  payload: { conversations: [guestConversation] }
});
```

These dispatch a conversation keyed by `guestChatState.context.conversation_id`.

**If the `ChatContext` is mounted in a context where `user?.hotel_slug` exists** (i.e., staff mode), path B runs instead. But both paths share the same `chatStore`. If **both paths run** (e.g., due to race conditions, or if the user check evaluates differently across renders), you get:

- Key `42` from the staff API (with `guest_name`, `room_number`)
- Key `42` from the guest context (with `guest_name`, `room_number`)

These would merge correctly if the key matches. **But if the key doesn't match** — for example, if the guest bootstrap returns `conversation_id` as a UUID or prefixed string while the API returns a plain integer — you get two entries.

---

## 4. Secondary cause: `guestChatActions.initFromAPI` also called

`ChatContext.jsx` line 113:
```js
guestChatActions.initFromAPI([guestConversation], guestChatDispatch);
```

And line 173:
```js
guestChatActions.initFromAPI(convs, guestChatDispatch);
```

The `guestChatStore` uses `conv.id` as the key. The `ChatContext.contextValue` exposes:

```js
guestConversations: Object.values(guestChatState.conversationsById),
```

If `guestChatState.conversationsById` also has duplicates (same problem — different key types/values), then any component reading `guestConversations` would see duplicates too.

---

## 5. The ghost entry characteristics

The ghost entry is missing `guest_name` and `room_number` because:

- It was created by a code path that doesn't have access to the room data
- Most likely: **a realtime event** or **the guest-mode fallback path** created a minimal conversation stub
- The `INIT_CONVERSATIONS_FROM_API` reducer does `conv.guest_name || existing.guest_name || null` — if the ghost was created first with `null` values, and the real API data arrives under a **different key**, the ghost never gets updated

---

## 6. Specific code locations to investigate

### 6a. ChatContext double-dispatch (HIGH PROBABILITY)

**File:** `src/context/ChatContext.jsx`  
**Lines:** 85–113 (guest path) AND 133–174 (staff path)

The `fetchConversations` callback has two branches:
- `if (!user?.hotel_slug)` → guest mode → creates conversation from `guestChatState.context`
- `else` → staff mode → fetches from API

**Problem:** If `user?.hotel_slug` is truthy, the staff path runs and fetches conversation `{ id: 42 }`. But the `useEffect` at line 193 also fires when `guestChatState?.context` becomes available, and dispatches a **second** conversation with `id: guestChatState.context.conversation_id`. If `guestChatState.context.conversation_id` equals `42`, they merge correctly. But if the guest context isn't populated (or has a different ID format), a ghost appears.

**However**, the useEffect at line 193 has a guard: `if (!user?.hotel_slug && guestChatState?.context)`. So for staff users, this should not fire.

### 6b. StaffChatContext + ChatContext both dispatching (HIGH PROBABILITY)

**File:** `src/staff_chat/context/StaffChatContext.jsx` line 36  
**File:** `src/context/ChatContext.jsx` line 171

Both call `INIT_CONVERSATIONS_FROM_API` but from **different API endpoints**:
- `ChatContext` calls `fetchRoomConversations()` → `/api/.../room-chat/conversations/`
- `StaffChatContext` calls `fetchConversations()` → `/api/.../staff-chat/conversations/`

If the backend returns guest↔staff conversations in **both** endpoints (the room-chat API for room conversations AND the staff-chat API which might include all conversations), the same conversation appears twice — but potentially with different `id` values (room conversation ID vs staff chat conversation ID) or different data shapes.

**This is the most likely root cause.** The staff-chat API returns conversations without `room_number` or `guest_name` because those are room-specific fields not part of the staff-chat data model.

### 6c. ConversationView lazy-init (LOW PROBABILITY)

**File:** `src/staff_chat/components/ConversationView.jsx` line 181

Dispatches `INIT_CONVERSATIONS_FROM_API` with the raw `conversation` object when `storeConversation` is falsy. The conversation object shape depends on what the parent passes. If it has an ID that doesn't match the API-fetched key, a ghost appears.

---

## 7. Recommended fixes (in priority order)

### Fix 1: Prevent StaffChatContext from loading guest↔staff room conversations

The staff-chat API (`/api/.../staff-chat/conversations/`) should only return **staff-to-staff** conversations. If it also returns guest-to-staff room conversations, those collide with the entries loaded by `ChatContext` from the room-chat API.

**Action:** Backend filter — ensure the staff-chat conversations endpoint excludes room/guest conversations. Or frontend filter — in `StaffChatContext.fetchStaffConversations`, filter out conversations that have `room_number` or `conversation_type === 'room'`.

### Fix 2: Normalize conversation IDs to consistent type

In `chatStore.jsx` reducer `INIT_CONVERSATIONS_FROM_API`:

```js
const convId = parseInt(conv.id || conv.conversation_id, 10);
```

Ensure all callers also use `parseInt`. This prevents string/number key mismatches.

### Fix 3: Add deduplication by room_number in ChatContext

In the `useMemo` that derives `conversations` from `chatStore.conversationsById`:

```js
const conversations = useMemo(() => {
  if (!chatStore?.conversationsById) return [];
  const seen = new Map();
  Object.values(chatStore.conversationsById).forEach(c => {
    const key = c.room_number || c.roomNumber || c.id;
    if (!seen.has(key) || (c.guest_name && !seen.get(key).guest_name)) {
      seen.set(key, c); // prefer entry with guest_name
    }
  });
  return Array.from(seen.values()).map(c => ({ ... }));
}, [chatStore?.conversationsById]);
```

### Fix 4: Guard ChatSidebar against empty entries

In `ChatSidebar.jsx`, the filter already exists:

```js
.filter(conv => conv && typeof conv === 'object' && !conv.message)
```

Strengthen it to also filter out entries without a room_number:

```js
.filter(conv => conv && typeof conv === 'object' && !conv.message && (conv.room_number || conv.roomNumber))
```

---

## 8. How to confirm

Add this temporary debug log at the top of the `ChatSidebar` render:

```js
console.log('[SIDEBAR AUDIT] conversations:', conversations.map(c => ({
  key: c.conversation_id || c.id,
  id: c.id,
  conversation_id: c.conversation_id,
  room_number: c.room_number,
  roomNumber: c.roomNumber,
  guest_name: c.guest_name,
  guestName: c.guestName,
  idType: typeof (c.id || c.conversation_id),
})));
```

And in `chatStore.jsx`, inside `INIT_CONVERSATIONS_FROM_API`:

```js
console.log('[STORE AUDIT] Adding conversation with key:', convId, typeof convId, 'from:', conv);
```

This will reveal:
1. Whether two keys exist (e.g., `42` and `"42"`, or `42` and `99`)
2. Which dispatch path created the ghost entry
3. What data the ghost entry has vs the real entry

---

## 9. Data flow diagram

```
┌─────────────────────────────────┐
│  fetchRoomConversations API     │──► ChatContext ──► chatStore.INIT_CONVERSATIONS_FROM_API
│  (room-chat/conversations/)     │    Key: conv.id (e.g., 42)
│  Has: guest_name, room_number   │    Has: guest_name ✅, room_number ✅
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  fetchConversations API         │──► StaffChatContext ──► chatStore.INIT_CONVERSATIONS_FROM_API
│  (staff-chat/conversations/)    │    Key: conv.id (e.g., 99 or different shape)
│  Missing: guest_name, room_no   │    Has: guest_name ❌, room_number ❌
└─────────────────────────────────┘

Both write to the SAME chatStore.conversationsById
  → If different keys → TWO sidebar entries
  → Ghost entry has no guest_name or room_number

┌─────────────────────────────────┐
│  ChatContext.useMemo            │
│  Object.values(conversationsById)│──► ChatHomePage ──► ChatSidebar
│  Returns BOTH entries           │    Renders BOTH entries
└─────────────────────────────────┘
```

---

## 10. Summary

| Factor | Detail |
|--------|--------|
| **Root cause** | Two independent API fetch paths (`ChatContext` + `StaffChatContext`) both dispatch into the same `chatStore.conversationsById`, creating entries with different keys for the same logical conversation |
| **Ghost characteristics** | Missing `guest_name` and `room_number` because the staff-chat API doesn't return room-specific fields |
| **Why only one extra** | Only one real conversation exists, so only one ghost from the secondary API |
| **Fix complexity** | Low — filter or deduplicate at the store or sidebar level |
