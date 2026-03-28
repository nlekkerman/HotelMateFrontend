# Guest ↔ Staff Chat — Realtime Flow & Optimistic Update Audit

**Date:** 2026-03-28  
**Scope:** All realtime messaging and optimistic update patterns for the guest-to-staff chat system (NOT staff-to-staff).

---

## 1. Architecture Overview

The guest-staff chat system runs as **two parallel subsystems** sharing some infrastructure:

| Aspect | Guest Side | Staff Side |
|---|---|---|
| **Entry point** | `GuestChatPortal.jsx` → `GuestChatWidget.jsx` | `ChatHomePage` → `ChatWindow.jsx` |
| **Main hook** | `useGuestChat.js` | `ChatContext.jsx` + inline logic in `ChatWindow.jsx` |
| **State store** | `guestChatStore.jsx` (React Context + useReducer) | `guestChatStore.jsx` + `chatStore.jsx` (cross-routed) |
| **API layer** | `guestChatAPI.js` (session-header auth) | `roomConversationsAPI` (staff token auth) |
| **Pusher client** | `guestRealtimeClient.js` (per-session instance) | `realtimeClient.js` (singleton) |
| **Auth mechanism** | `X-Guest-Chat-Session` header | Staff JWT token |

### Key Files

| File | Role |
|---|---|
| `src/hooks/useGuestChat.js` | Guest-side bootstrap, Pusher setup, message fetch, send, dedup |
| `src/services/guestChatAPI.js` | Guest API service (locked backend contract) |
| `src/realtime/guestRealtimeClient.js` | Guest-scoped Pusher client factory |
| `src/realtime/stores/guestChatStore.jsx` | Central guest chat state (reducer + actions) |
| `src/realtime/eventBus.js` | Central event router for ALL realtime events |
| `src/realtime/channelRegistry.js` | Pusher channel subscription manager |
| `src/components/guest/GuestChatWidget.jsx` | Guest-side chat UI (message list, input, connection status) |
| `src/components/chat/ChatWindow.jsx` | Staff-side chat UI (dual-mode: staff-staff & guest-staff) |
| `src/context/ChatContext.jsx` | Staff-side context providing guest message access |
| `src/staff_chat/components/ConversationsList.jsx` | Staff conversation sidebar + guest channel subscriptions |

---

## 2. Realtime Flow — Guest Side

### 2.1 Bootstrap Sequence

```
1. Guest opens /guest/chat?hotel_slug=X&token=Y
2. useGuestChat calls getChatBootstrap(slug, token)
     → GET /api/guest/hotel/{slug}/chat/context?token=RAW_TOKEN
     → Returns: { conversation_id, chat_session, channel_name, events, pusher, permissions }
3. Contract validated against REQUIRED_BOOTSTRAP_FIELDS + REQUIRED_NESTED_PATHS
4. Context pushed to guestChatStore via guestChatActions.setContext()
5. Raw token is NEVER used again — all subsequent calls use chat_session
```

### 2.2 Pusher Connection (Guest)

```
1. createGuestPusherClient({ key, cluster, authEndpoint, chatSession })
     - Config sourced ONLY from bootstrap response (not env vars)
     - Auth header: { 'X-Guest-Chat-Session': chatSession }
     - Memoized per chatSession:authEndpoint combo
2. Subscribe to: channel_name (e.g., private-hotel-{slug}-guest-chat-booking-{bookingId})
3. Bind events:
     - events.message_created → handleMessageCreated()
     - events.message_read → handleMessageRead()
4. Connection state tracked: connecting → connected | failed | disconnected
5. On subscription_succeeded → syncMessages() (refetch from API to fill gaps)
```

### 2.3 Incoming Message Handling (Guest)

```
Pusher event → handleMessageCreated(evt)
  │
  ├─ Extract: payload = evt.payload ?? evt
  ├─ Extract: eventId = evt.meta.event_id
  │
  ├─ DEDUP LAYER 1: processedEventIds.has(eventId) → skip
  ├─ DEDUP LAYER 2: processedMessageIds.has(msg.id) → skip
  │
  ├─ If own message (sender_type=guest + client_message_id):
  │     └─ Remove matching entry from sendingMessages[]
  │
  ├─ setMessages(): append if msg.id not already in list, sort by time
  │
  └─ Route to guestChatStore via guestChatActions.handleEvent()
       └─ DEDUP LAYER 3: guestChatActions._processedEventIds.has(eventId) → skip
```

### 2.4 Read Receipt Handling (Guest)

```
Pusher event → handleMessageRead(evt)
  │
  ├─ DEDUP: processedEventIds check
  │
  └─ Route to guestChatStore → MESSAGE_READ_UPDATE reducer
       └─ Updates readByStaff / readByGuest on specific message
```

---

## 3. Realtime Flow — Staff Side

### 3.1 Channel Subscriptions (Staff)

Staff subscribes to **three different channel types** for guest chat:

| Channel | Subscribed In | Purpose |
|---|---|---|
| `{hotelSlug}-guest-messages` | `channelRegistry.subscribeBaseHotelChannels()` | Hotel-wide notification when ANY guest sends a message |
| `{hotelSlug}.staff-chat.{conversationId}` | `channelRegistry.subscribeToStaffChatConversation()` | Per-conversation events (used for both staff-staff and guest-staff) |
| `private-hotel-{slug}-guest-chat-booking-{bookingId}` | `channelRegistry.subscribeStaffToGuestChatBooking()` | Staff joining the guest's private booking channel |

**ConversationsList.jsx** dynamically subscribes to all guest conversations on mount:
```
Mount → fetchRoomConversations(hotelSlug) → for each conversation:
  subscribeToStaffChatConversation(hotelSlug, conversationId)
```

### 3.2 Event Routing (Staff → Stores)

```
Pusher event arrives at channelRegistry.bind_global()
  │
  └─ handleIncomingRealtimeEvent({ source: 'pusher', channel, eventName, payload })
       │
       ├─ If channel includes "staff-chat" + eventName starts with "realtime_staff_chat_":
       │     → Normalize as category:"staff_chat", route to chatActions.handleEvent()
       │
       ├─ If channel ends with "-guest-messages" + eventName = "new-guest-message":
       │     → Show toast notification (showGuestMessageNotification)
       │     → Add to notification center
       │
       ├─ If channel starts with "private-hotel-" + includes "-guest-chat-booking-":
       │     → Normalize as category:"guest_chat", route to guestChatActions.handleEvent()
       │
       ├─ If channel ends with "-notifications" + eventName = "new-guest-message":
       │     → Route BOTH as guest_chat event AND staff_chat event (cross-domain)
       │
       └─ routeToDomainStores():
            ├─ "guest_chat" → guestChatActions.handleEvent() + chatActions.handleEvent() (cross-domain)
            └─ "staff_chat" → chatActions.handleEvent()
```

### 3.3 Cross-Domain Routing

**Critical pattern:** Guest messages are routed to BOTH stores:
- `guestChatActions.handleEvent()` — updates guestChatStore for guest-facing views
- `chatActions.handleEvent()` — updates chatStore so the staff conversation sidebar updates

This dual-routing happens in `routeToDomainStores()` under the `"guest_chat"` case.

---

## 4. Optimistic Update Patterns

### 4.1 Guest Side (useGuestChat.js)

**Send flow:**
```
User hits send → sendMessageMutation.mutate({ message, replyTo })
  │
  ├─ OPTIMISTIC: Add to sendingMessages[] with:
  │     { id: 'sending-{uuid}', client_message_id: uuid, status: 'sending', sender_type: 'guest' }
  │
  ├─ API CALL: guestChatAPI.sendMessage(hotelSlug, chatSession, { message, client_message_id, reply_to })
  │     → POST /api/guest/hotel/{slug}/chat/messages [X-Guest-Chat-Session header]
  │
  ├─ ON SUCCESS: Remove from sendingMessages[] by client_message_id
  │     (Real message arrives via Pusher event and replaces optimistic)
  │
  └─ ON ERROR: Mark status: 'failed' in sendingMessages[]
       → User can tap retry → retryMessage() removes failed, re-calls mutate
```

**Merge strategy (GuestChatWidget):**
```javascript
allMessages = [...messages, ...sendingMessages].sort(byTimestamp)
```
- `messages[]` = confirmed messages from API + Pusher
- `sendingMessages[]` = optimistic pending/failed messages
- Sorted together for unified timeline display

**Optimistic → Confirmed reconciliation:**
```
When Pusher event arrives for own message (sender_type=guest + matching client_message_id):
  1. sendingMessages[] entry is removed (by client_message_id match)
  2. Real message added to messages[] with status: 'delivered'
  3. No duplicate because processedMessageIds tracks msg.id
```

**Gap protection during fetch:**
```
On initial fetch or sync, optimistic messages are PRESERVED if no matching
client_message_id exists in the fetched results:
  optimistic = prev.filter(m => m.__optimistic && !merged.find(x => x.client_message_id === m.client_message_id))
  result = sortMessages([...merged, ...optimistic])
```

### 4.2 Staff Side (ChatWindow.jsx)

**Send flow:**
```
Staff hits send → handleSendMessage()
  │
  ├─ OPTIMISTIC: Create temp message:
  │     { id: tempId, message, sender_type: 'staff', status: 'pending', __optimistic: true }
  │     Added to local messages state immediately
  │
  ├─ API CALL: POST with { message, staff_id, reply_to }
  │     (uses staff auth, not guest session)
  │
  ├─ ON SUCCESS:
  │     ├─ If real message already in state (from Pusher): remove temp
  │     └─ If not: replace temp with real message data, status: 'delivered'
  │
  └─ ON ERROR: Mark status: 'failed' on temp message
```

**Key difference from guest side:** Staff uses `__optimistic: true` flag directly on messages in the messages array (single array), while guest side uses a separate `sendingMessages[]` array merged at render time.

---

## 5. Deduplication — Three-Layer System

### Layer 1: Event-Level (useGuestChat.js)
- **Ref:** `processedEventIds` (Set)
- **Key:** `evt.meta.event_id`
- **Scope:** Per hook instance (guest-side only)

### Layer 2: Message-Level (useGuestChat.js)
- **Ref:** `processedMessageIds` (Set)
- **Key:** `msg.id` (server-assigned ID)
- **Scope:** Per hook instance (guest-side only)

### Layer 3: Store-Level (guestChatStore.jsx)
- **Ref:** `guestChatActions._processedEventIds` (Set on module scope)
- **Key:** `event.meta.event_id`
- **Scope:** Global singleton — shared across all consumers
- **LRU cleanup:** Trims to 500 when exceeding 1000 entries

### Layer 4: Global EventBus (eventBus.js)
- **Ref:** `globalProcessedEventIds` (Set)
- **Key:** `meta.event_id`
- **Scope:** Global — catches duplicates before domain routing
- **LRU cleanup:** Trims to 500 when exceeding 1000

### Store Reducer Dedup
Both `GUEST_MESSAGE_RECEIVED` and `STAFF_MESSAGE_SENT` reducers check:
```javascript
const messageExists = currentMessages.some(m => m.id === message.id);
if (messageExists) return state;
```

---

## 6. Identified Issues & Risks

### ISSUE 1: Dual State — Divergence Risk
**Severity: MEDIUM**

Both `useGuestChat.js` (local `messages[]` state) and `guestChatStore.jsx` (centralized reducer) maintain their own message lists. Messages are pushed to both, but they can diverge:
- `useGuestChat` has its own dedup sets (`processedEventIds`, `processedMessageIds`)
- `guestChatStore` has its own dedup set (`_processedEventIds`)
- If one processes an event the other skips (e.g., missing `event_id`), they desync

**Impact:** On guest side, `useGuestChat` owns the rendered messages. The store is a secondary copy primarily consumed by staff side. Desync doesn't directly affect guest UI but could cause staff-side stale data.

### ISSUE 2: Missing event_id Silently Drops Events in Store
**Severity: HIGH**

In `guestChatStore.jsx`, `handleEvent()` requires `event_id`:
```javascript
if (!eventId) {
  console.warn('[guestChatStore] Missing event_id, skipping event:', event);
  return;
}
```
If the backend ever sends an event without `meta.event_id`, the store silently drops it. The `useGuestChat` hook still processes it (event-level dedup is skipped, message-level dedup catches it), creating divergence between hook state and store state.

**Recommendation:** Log as error, not warn. Consider processing events without `event_id` but without dedup protection, or generate a client-side fallback ID.

### ISSUE 3: sendMessageMutation.onError Missing clientMessageId
**Severity: LOW**

In `useGuestChat.js`:
```javascript
onError: (error, _vars, ctx) => {
  setSendingMessages((prev) =>
    prev.map((m) =>
      m.client_message_id === ctx?.clientMessageId ? { ...m, status: 'failed' } : m
    )
  );
}
```
`ctx` here is the mutation context, but `useMutation` doesn't automatically pass `clientMessageId` to `onError` context. The `clientMessageId` is generated inside `mutationFn`, not returned as context. This means `ctx?.clientMessageId` is always `undefined`, and **failed messages never get marked as 'failed'** — they stay in 'sending' state forever.

**Fix:** Use the `onMutate` callback to capture `clientMessageId` in context, or restructure to pass it through variables.

### ISSUE 4: Staff Optimistic → Pusher Race Condition
**Severity: LOW**

In `ChatWindow.jsx`, the success handler checks:
```javascript
if (realMessageExists) {
  return prev.filter(msg => msg.id !== tempId);  // Remove temp
} else {
  return prev.map(msg => msg.id === tempId ? {...messageData, status: 'delivered'} : msg);
}
```

If the Pusher echo arrives **before** the API response:
1. Pusher adds real message to state
2. API success handler finds `realMessageExists=true`, removes temp
3. Result: correct ✅

If API response arrives **before** Pusher echo:
1. API success maps temp → real
2. Pusher event arrives, dedup catches it by `msg.id`
3. Result: correct ✅

Edge case: if the Pusher echo arrives in the **same React render batch** as the API response, both state updates merge. The Pusher handler's `if (prev.some(m => m.id === msg.id)) return prev` check prevents duplicates. **This appears correctly handled.**

### ISSUE 5: Pusher Instance Leak on Error
**Severity: LOW**

In `guestRealtimeClient.js`, if `new Pusher()` throws (e.g., invalid config), the error propagates to `useGuestChat`'s try/catch which sets `connectionState='failed'`. But if Pusher partially initializes before throwing, the instance won't be in the cache and won't be cleaned up.

**Recommendation:** Wrap Pusher construction in try/catch within `createGuestPusherClient` and ensure partial instances are disconnected.

### ISSUE 6: ConversationsList Subscribes to Staff Chat Channels, Not Guest Booking Channels
**Severity: MEDIUM**

`ConversationsList.jsx` subscribes via `subscribeToStaffChatConversation()` which creates channels like `{hotelSlug}.staff-chat.{conversationId}`. For guest-staff conversations, the actual guest messages arrive on `private-hotel-{slug}-guest-chat-booking-{bookingId}`. 

This means staff receives guest messages through:
1. The `{hotelSlug}-guest-messages` hotel-wide notification channel (toast only)
2. The `{hotelSlug}-notifications` channel (cross-routed to both stores)
3. NOT directly from the guest's booking channel unless `subscribeStaffToGuestChatBooking()` is explicitly called

**Impact:** Staff may not receive real-time messages in the conversation window unless the notification channel cross-routing covers it. The `ChatWindow.jsx` component should ensure a booking channel subscription is active for the open conversation.

### ISSUE 7: Global State Ref Stale Closure in GuestChatProvider
**Severity: LOW**

```javascript
React.useEffect(() => {
  registerGuestChatHandlers(dispatch, () => state);
}, [dispatch, state]);
```
The `() => state` closure captures `state` at the time of the effect. Since `state` changes on every dispatch, this causes the effect to re-run on every state change, which is wasteful. A ref pattern would be more efficient.

### ISSUE 8: No Reconnection Backoff
**Severity: LOW**

When Pusher disconnects, the connection state is set to `'disconnected'` but there's no explicit reconnection strategy with backoff. Pusher.js has built-in reconnection, but if it fails permanently, the user sees "Reconnecting..." forever with no fallback (e.g., polling).

---

## 7. Event Type Mapping

| Pusher Event Name | eventBus Category | Store Action | Description |
|---|---|---|---|
| `events.message_created` (from bootstrap) | `guest_chat` | `GUEST_MESSAGE_RECEIVED` or `STAFF_MESSAGE_SENT` | New message in guest conversation |
| `events.message_read` (from bootstrap) | `guest_chat` | `MESSAGE_READ_UPDATE` | Read receipt update |
| `new-guest-message` | `guest_notification` | Toast notification | Hotel-wide guest message alert |
| `realtime_staff_chat_message_created` | `staff_chat` | `chatActions.handleEvent` | Staff-side message event |
| `message_deleted` | `guest_chat` | `GUEST_CHAT_MESSAGE_DELETED` | Message removed |
| `message_edited` | `guest_chat` | `GUEST_CHAT_MESSAGE_EDITED` | Message updated |
| `unread_updated` | `guest_chat` | `CONVERSATION_METADATA_UPDATED` | Unread count change |
| `conversation_created` | `guest_chat` | `CONVERSATION_CREATED` | New guest conversation |

---

## 8. Data Flow Diagrams

### Guest Sends Message

```
Guest types → MessageInput.onSubmit()
  │
  ├─ useGuestChat.sendMessage(text, replyTo)
  │     ├─ Add to sendingMessages[] (status: 'sending')
  │     └─ POST /api/guest/hotel/{slug}/chat/messages
  │          │
  │          ├─ SUCCESS → Remove from sendingMessages[]
  │          └─ ERROR → Mark as 'failed' (⚠️ ISSUE 3: may not work)
  │
  ├─ Backend broadcasts to Pusher channel
  │     │
  │     └─ events.message_created event
  │          │
  │          ├─ Guest Pusher client receives it
  │          │     └─ handleMessageCreated() — dedup, merge, add to messages[]
  │          │
  │          ├─ Staff Pusher clients receive it (via booking channel or notification channel)
  │          │     └─ eventBus → guestChatActions.handleEvent() + chatActions.handleEvent()
  │          │
  │          └─ Hotel-wide {slug}-guest-messages notification
  │                └─ Toast notification to all online staff
  │
  └─ GuestChatWidget renders [...messages, ...sendingMessages] sorted
```

### Staff Sends Message to Guest

```
Staff types → ChatWindow.handleSendMessage()
  │
  ├─ Create temp message (__optimistic: true, status: 'pending')
  │     └─ Add to local messages state
  │
  ├─ POST /api/staff/chat/messages (staff auth)
  │     │
  │     ├─ SUCCESS → Replace temp with real message or remove if Pusher already delivered
  │     └─ ERROR → Mark temp as 'failed'
  │
  ├─ Backend broadcasts to Pusher
  │     │
  │     ├─ Guest receives via private booking channel
  │     │     └─ useGuestChat.handleMessageCreated() → messages[]
  │     │
  │     └─ Staff receives echo via staff-chat channel
  │           └─ eventBus → chatActions (dedup catches if already in state)
  │
  └─ ChatWindow renders messages with optimistic temp inline
```

---

## 9. Summary of Findings

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | Dual state (hook + store) divergence risk | MEDIUM | Acknowledged by design |
| 2 | Missing event_id silently drops events in store | HIGH | Needs fix |
| 3 | Failed message status never applied (missing ctx) | LOW | Needs fix |
| 4 | Staff optimistic → Pusher race condition | LOW | Correctly handled |
| 5 | Pusher instance leak on construction error | LOW | Minor cleanup |
| 6 | Staff may miss realtime guest messages if not on booking channel | MEDIUM | Needs verification |
| 7 | Stale closure in GuestChatProvider register | LOW | Performance only |
| 8 | No reconnection backoff / polling fallback | LOW | Pusher built-in covers most cases |

### What Works Well
- **Triple-layer deduplication** — robust protection against duplicate messages
- **Locked backend contract** with strict validation — prevents silent API drift
- **Optimistic updates on both sides** — instant UI feedback for message sends
- **Cross-domain routing** — guest events automatically update staff conversation lists
- **Session-based auth** — raw token used only once during bootstrap, never stored
- **Connection state UI** — users always see their connection status
- **Retry mechanism** — failed messages can be retried by the user
- **Pagination** — both initial load and load-older-messages supported
- **Reconnect sync** — messages are re-fetched on Pusher reconnection to fill gaps
