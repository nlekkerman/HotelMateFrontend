# Guest↔Staff Chat Realtime UI Audit

**Date:** 2025-03-28
**Scope:** Frontend code only — exact code-truth, no architecture advice.

---

## A. Guest Side

### A1. Which exact state drives the visible guest message list?

**Primary (rendered):** `useGuestChat` hook local state `messages` — a `useState([])` array.
- **File:** `src/hooks/useGuestChat.js`, line ~74
- **Variable:** `const [messages, setMessages] = useState([]);`
- **Returned as:** `messages` from `useGuestChat()` return object (line ~624)

**Secondary (dead for rendering):** `guestChatStore.messagesByConversationId[conversationId]`
- **File:** `src/realtime/stores/guestChatStore.jsx`
- The store receives duplicate writes from every handler, but `GuestChatWidget` never reads from it.

**The widget reads:**
- `GuestChatWidget.jsx` line ~256: `const { messages, sendingMessages, ... } = useGuestChat({ hotelSlug, token });`
- `MessagesList` component receives `messages` and `sendingMessages` as props and merges them: `const allMessages = [...messages, ...sendingMessages].sort(...)`

**Conclusion:** The rendered guest message list is driven by `useGuestChat` local `useState` — NOT by `guestChatStore`.

---

### A2. Which exact handler updates guest visible messages in realtime?

| Event | Handler in `useGuestChat.js` | Updates `setMessages`? | Updates `guestChatStore`? |
|---|---|---|---|
| `message_created` | `handleMessageCreated` (line ~164) | ✅ YES — `setMessages((prev) => sortMessages([...prev, msg]))` | ✅ YES — via `guestChatActions.handleEvent()` |
| `message_read` | `handleMessageRead` (line ~228) | ❌ **NO** — only dispatches to store | ✅ YES — `MESSAGE_READ_UPDATE` in store |
| `message_deleted` | `handleMessageDeleted` (line ~255) | ✅ YES — `setMessages((prev) => prev.filter(...))` | ✅ YES — `GUEST_CHAT_MESSAGE_DELETED` in store |
| `message_edited` | `handleMessageEdited` (line ~273) | ✅ YES — `setMessages((prev) => prev.map(...))` | ✅ YES — `GUEST_CHAT_MESSAGE_EDITED` in store |
| `unread_updated` | `handleUnreadUpdated` (line ~293) | ❌ NO — store only | ✅ YES — `CONVERSATION_METADATA_UPDATED` in store |

---

### A3. For each event — does it update the actually rendered UI?

| Event | Updates rendered UI? | Explanation |
|---|---|---|
| `message_created` | ✅ YES | Calls `setMessages()` → `MessagesList` re-renders |
| `message_read` | ❌ **NO** | Only dispatches to `guestChatStore`, but `GuestChatWidget` reads from hook `messages` state, NOT the store. The `read_by_staff` field on existing messages is never updated in the `messages` useState array. |
| `message_deleted` | ✅ YES | Calls `setMessages()` |
| `message_edited` | ✅ YES | Calls `setMessages()` |
| `unread_updated` | ❌ NO (no visible unread UI on guest side) | Store-only, and guest UI doesn't display unread counts |

---

### A4. Which exact field does guest UI use to display sender name?

**File:** `GuestChatWidget.jsx`, `MessageBubble` component, line ~42:

```jsx
{!isGuest && (message.staff_display_name || message.sender_name) && (
  <span className="sender-name">{message.staff_display_name || message.sender_name}</span>
)}
```

**Logic:**
- For **staff messages** shown on guest side: displays `staff_display_name` with fallback to `sender_name`
- For **guest messages**: does NOT display any sender name (the `!isGuest` guard hides it)
- `sender_name` comes from `normalizeRealtimeMessage()` which maps `payload.sender_name`

**Why you might see "Guest":**
- The guest side does NOT show the guest's own name on their own bubbles (the `!isGuest` check prevents it)
- If "Guest" appears on a staff message bubble, it means the backend is sending `sender_name: "Guest"` and `staff_display_name` is undefined/null
- `normalizeRealtimeMessage()` just passes through `payload.sender_name` without any transformation

**This is NOT a guest-side bug.** The guest UI correctly hides guest name on guest messages and shows staff name on staff messages.

---

### A5. Does guest UI render seen/read state?

**YES, partially.** `MessageBubble` in `GuestChatWidget.jsx`, lines ~51-56:

```jsx
{isGuest && message.status === 'delivered' && (
  <span className="read-receipt" title={message.read_by_staff ? 'Seen' : 'Delivered'}>
    {message.read_by_staff
      ? <i className="bi bi-check2-all" style={{ color: '#0d6efd' }}></i>
      : <i className="bi bi-check2"></i>}
  </span>
)}
```

**Fields used:** `message.read_by_staff` (boolean) and `message.status`

**BUG:** This UI reads `read_by_staff` from the `messages` useState array. But `handleMessageRead` (A2 above) NEVER calls `setMessages()` to update `read_by_staff` on existing messages. It only dispatches to `guestChatStore` which the widget doesn't read. **Therefore, the seen/read checkmarks NEVER update in realtime on the guest side.**

They only show correctly:
- On initial load (from API response which includes `read_by_staff`)
- After a sync/reconnect (which refetches all messages)

---

### A6. Does guest UI have unread badge/count?

**NO.** There is no visible unread count or badge anywhere in the guest chat widget. The `unread_updated` event is handled by the store only, and the store state is not read by any guest UI component.

---

## B. Staff Side

### B7. Which exact state drives the staff sidebar conversation list?

**There are TWO separate staff sidebar systems:**

#### System 1: `ChatSidebar` (guest↔staff room conversations)
- **File:** `src/components/chat/ChatSidebar.jsx`
- **State source:** `conversations` prop passed from `ChatHomePage.jsx`
- **ChatHomePage** gets it from: `const { conversations, markConversationRead } = useChat();` (ChatContext)
- **ChatContext** (`src/context/ChatContext.jsx`) populates from: `fetchRoomConversations(hotelSlug)` API call → local `useState` `conversations`
- **Fallback:** If API fails, tries `chatStore.conversationsById`

#### System 2: `ConversationsList` (staff↔staff Messenger widget)
- **File:** `src/staff_chat/components/ConversationsList.jsx`
- **State source:** `const { conversations, fetchStaffConversations } = useStaffChat();`
- **StaffChatContext** derives conversations from: `Object.values(chatState.conversationsById)` where `chatState` = `useChatState()` (chatStore)
- **chatStore** populated by: `StaffChatContext.fetchStaffConversations()` → `fetchConversations(hotelSlug)` API → dispatches `INIT_CONVERSATIONS_FROM_API`

**Key difference:** `ChatSidebar` reads from `ChatContext` local state (API-driven). `ConversationsList` reads from `chatStore` (realtime-driven).

---

### B8. Which exact state drives the open staff conversation panel messages?

#### ChatWindow (guest↔staff, in ChatHomePage)
- **File:** `src/components/chat/ChatWindow.jsx`
- **State source:** `const [messages, setMessages] = useState([]);` — local state
- Also reads from `chatState` (`useChatState()`) but has its OWN local `messages` state
- Fetches messages via direct API call, stores in local state

#### ConversationView (staff↔staff, in StaffChatContainer)
- **File:** `src/staff_chat/components/ConversationView.jsx`, line ~31
- **State source:** `const messages = storeConversation?.messages || [];`
- Reads directly from `chatState.conversationsById[conversation.id].messages`
- **This is the chatStore** — same store that `ConversationsList` reads from

#### ChatWindowPopup (staff↔staff, Messenger widget popups)
- **File:** `src/staff_chat/components/ChatWindowPopup.jsx`, line ~78
- **State source:** `const messages = chatState.conversationsById[conversation?.id]?.messages || [];`
- Same `chatStore` as ConversationView

**Conclusion:**
- Staff↔staff messages: `chatStore` (single source of truth for sidebar + panel)
- Guest↔staff messages: `ChatContext` local state for sidebar, `ChatWindow` local state for panel — **these are different sources and can diverge**

---

### B9. Which exact state drives the floating/global unread badge?

#### MessengerWidget (staff↔staff chat)
- **File:** `src/staff_chat/components/MessengerWidget.jsx`, lines ~53-75
- **State variable:** `totalUnreadCount` computed via `useMemo`
- **Logic:**
  1. If `chatState.totalUnreadOverride` is a number → use it directly
  2. Otherwise → count `Object.values(chatState.conversationsById).filter(c => c.unread_count > 0).length`
- **Source:** `chatStore` via `useChatState()`

#### StaffChatFloatingButton
- **File:** `src/staff_chat/components/StaffChatFloatingButton.jsx`
- **State variable:** `totalUnread` from `useUnreadCount(hotelSlug, 30000)`
- **Source:** `useUnreadCount` hook — **API polling every 30 seconds**, NOT realtime
- **NOT connected to chatStore or any realtime events**

---

### B10. For staff UI, which exact handlers update realtime UI?

All staff-side realtime events flow through:
```
Pusher → channelRegistry (bind_global) → eventBus.handleIncomingRealtimeEvent → routeToDomainStores → chatActions.handleEvent → chatStore reducer
```

| Event | chatStore action | Updates sidebar (ConversationsList)? | Updates open panel (ConversationView/ChatWindowPopup)? |
|---|---|---|---|
| `realtime_staff_chat_message_created` | `RECEIVE_MESSAGE` | ✅ YES — updates `messages[]` and `lastMessage` in conversationsById | ✅ YES — reads same store |
| staff reply (own message echo) | `RECEIVE_MESSAGE` | ✅ YES | ✅ YES |
| `realtime_staff_chat_messages_read` | `STAFF_CHAT_READ_RECEIPT_RECEIVED` + `RECEIVE_READ_RECEIPT` | ❌ partial — only zeroes `unread_count` if current user's read | ✅ YES — updates `read_by_list` on messages |
| `realtime_staff_chat_message_deleted` | `MESSAGE_DELETED` | ✅ YES — removes from messages and updates lastMessage | ✅ YES |
| `realtime_staff_chat_message_edited` | `MESSAGE_UPDATED` | ✅ YES — updates message fields | ✅ YES |
| `realtime_staff_chat_unread_updated` | `UPDATE_UNREAD_COUNTS` | ✅ YES — updates `unread_count` per conversation and `totalUnreadOverride` | N/A (badge only) |

**For the ChatHomePage guest↔staff system:** Events from the `-notifications` channel (`new-guest-message`) are re-routed by eventBus into `staff_chat/realtime_staff_chat_message_created` → chatStore. But `ChatSidebar` reads from `ChatContext` local state which is NOT updated by realtime events — it only fetches from API on mount.

---

### B11. Why might the staff sidebar still show "Guest" instead of the real guest name?

**Two separate problems:**

#### Problem 1: ChatSidebar (guest↔staff)
- `ChatSidebar.jsx` renders: `{conv.guest_name || conv.guestName}`
- Source: `ChatContext.fetchConversations()` maps: `guest_name: c.room?.guest_name || c.guest_name`
- **If the backend's `/chat/conversations/` endpoint returns `guest_name: null` or `guest_name: "Guest"`, the UI shows "Guest"**
- The fallback path in ChatContext: `guest_name: c.guest_name` — no frontend transformation

#### Problem 2: ConversationsList (staff↔staff conversations list, Messenger widget)
- `ConversationsList.jsx` renders: `{conversation.title || otherParticipant?.full_name || 'Chat'}`
- For guest-originated conversations, `conversation.title` comes from `chatStore.conversationsById[id].title`
- `chatStore` sets `title: conv.title || existing.title || ''` from API
- For realtime stub conversations: `title: message.conversation_title || message.title || ''`
- **If backend doesn't populate `title`, and there's no `otherParticipant` with `full_name`, it falls back to `'Chat'`**

#### Problem 3: eventBus guest→staff message bridging
- **File:** `src/realtime/eventBus.js`, line ~447
- When a `new-guest-message` arrives on the `-notifications` channel, the eventBus constructs `staffPayload`:
  ```js
  sender_name: payload?.sender_name || payload?.guest_name || 'Guest',
  ```
- **If the backend's Pusher payload for `new-guest-message` doesn't include `sender_name` or `guest_name`, the frontend hardcodes `'Guest'`**
- This hardcoded "Guest" then propagates into `chatStore.conversationsById[id].messages[].sender_name`

---

### B12. Why might unread badge counts fail to update or fail to clear?

**Multiple issues:**

#### Issue 1: StaffChatFloatingButton uses polling, not realtime
- `useUnreadCount.js` polls API every 30 seconds
- Between polls, badge is stale
- `incrementUnread`/`decrementUnread` exist but are never called by any realtime handler

#### Issue 2: MessengerWidget totalUnreadCount computation
- Uses `chatState.totalUnreadOverride` (set by `realtime_staff_chat_unread_updated` events)
- If backend doesn't send `total_unread` in the event, `totalUnreadOverride` may be `null` → falls back to counting conversations with `unread_count > 0`
- **The count shows number of conversations with unread, NOT total unread messages**

#### Issue 3: Mark-as-read may not clear properly
- `StaffChatContext.markConversationRead()` dispatches `MARK_CONVERSATION_READ` → sets `unread_count: 0` and adjusts `totalUnreadOverride`
- But backend then sends `realtime_staff_chat_unread_updated` which may SET IT BACK if the event arrives after the optimistic clear
- Race condition: optimistic clear → backend event arrives with stale count → count goes back up

#### Issue 4: ChatSidebar (ChatHomePage) unread never clears from realtime
- `ChatSidebar` reads from `ChatContext.conversations` which is local state populated by API on mount
- Realtime `unread_updated` events update `chatStore` but `ChatContext` never re-reads from `chatStore`
- Unread only clears on page refresh or manual re-fetch

---

### B13. Why might the sidebar and the open chat panel show different state?

**The two guest↔staff systems read from completely different sources:**

| UI Element | State Source | Updated by realtime? |
|---|---|---|
| `ChatSidebar` (guest↔staff) | `ChatContext.conversations` (local useState) | ❌ NO — API fetch only |
| `ChatWindow` (guest↔staff open panel) | Local `useState` messages + direct API fetch | ❌ NO — API fetch only |
| `ConversationsList` (staff↔staff) | `chatStore.conversationsById` via StaffChatContext | ✅ YES |
| `ConversationView` / `ChatWindowPopup` (staff↔staff panel) | `chatStore.conversationsById[id].messages` | ✅ YES |

**Result:** For guest↔staff conversations, the sidebar and panel are both on separate local state islands. Neither updates from realtime. The only way they sync is via full page refresh or API re-fetch.

For staff↔staff conversations, sidebar and panel both read from `chatStore` and stay in sync via realtime.

---

## C. Realtime Subscription Truth

### C14. Every current realtime subscription path

| # | Channel Pattern | Who subscribes | Where | Updates which UI |
|---|---|---|---|---|
| 1 | `private-hotel-{slug}-guest-chat-booking-{bookingId}` | **Guest** via `useGuestChat` | `useGuestChat.js` Pusher setup effect | Guest widget messages, read receipts (broken - see A5) |
| 2 | `{slug}-guest-messages` | **Staff** via `channelRegistry.subscribeBaseHotelChannels` | `channelRegistry.js` | Toast notification only (via `showGuestMessageNotification`) |
| 3 | `{slug}.staff-{id}-notifications` | **Staff** via `channelRegistry.subscribeBaseHotelChannels` | `channelRegistry.js` | eventBus bridges `new-guest-message` → chatStore `RECEIVE_MESSAGE` |
| 4 | `{slug}.staff-chat.{conversationId}` | **Staff** via `subscribeToStaffChatConversation()` | `StaffChatContext`, `ConversationView`, `ConversationsList` | chatStore → MessengerWidget conversations + open panels |
| 5 | `private-hotel-{slug}-guest-chat-booking-{bookingId}` | **Staff** via `subscribeStaffToGuestChatBooking()` | `channelRegistry.js` (called from ConversationsList for room conversations) | Routes through eventBus → guest_chat category → guestChatStore (NOT read by staff UI) |

### What updates what (truth table):

| Channel | guest widget? | staff ConversationsList? | staff MessengerWidget badge? | ChatSidebar? | ChatWindow? |
|---|---|---|---|---|---|
| #1 (guest private booking) | ✅ messages | ❌ | ❌ | ❌ | ❌ |
| #2 (guest-messages) | ❌ | ❌ | ❌ | ❌ | ❌ (toast only) |
| #3 (staff notifications) | ❌ | ✅ (bridged to chatStore) | ✅ (via chatStore unread) | ❌ | ❌ |
| #4 (staff-chat.{id}) | ❌ | ✅ | ✅ | ❌ | ❌ |
| #5 (staff→guest booking) | ❌ | ❌ (routes to guestChatStore) | ❌ | ❌ | ❌ |

---

### C15. Canonical vs Legacy/Bridge/Fallback

| Path | Status | Notes |
|---|---|---|
| Guest: `useGuestChat` → own Pusher client → local state | **Canonical** | Works correctly for messages. Broken for read receipts. |
| Staff: `channelRegistry` → eventBus → chatStore | **Canonical** | Works for staff↔staff. Guest messages only arrive via `-notifications` bridge. |
| Staff: `-notifications` `new-guest-message` → eventBus bridges to `realtime_staff_chat_message_created` | **Bridge/Fallback** | Works but hardcodes `sender_name: 'Guest'` if backend payload lacks it |
| `ChatContext` local state | **Legacy** | Feeds `ChatSidebar` + `ChatWindow`. Not realtime. Should be replaced or connected to chatStore. |
| `guestChatStore` | **Dead store for guest UI** | Receives all events but nothing renders from it on guest side. Potentially useful for staff side but currently only reached via channel #5 which staff UI doesn't read. |
| `StaffChatFloatingButton` → `useUnreadCount` (polling) | **Legacy** | Totally disconnected from realtime. Polls API every 30s. |

---

## D. Final Output

### ✅ UI pieces that already update correctly in realtime

1. **Guest widget message list** — new messages (`message_created`) appear in realtime
2. **Guest widget message deletion** — deleted messages disappear in realtime
3. **Guest widget message editing** — edited messages update in realtime
4. **Staff ConversationsList** (Messenger widget) — new staff↔staff messages appear in realtime
5. **Staff ConversationView / ChatWindowPopup** — new staff↔staff messages appear + update in realtime
6. **Staff MessengerWidget unread badge** — updates via `realtime_staff_chat_unread_updated` events
7. **Staff read receipts in ConversationView** — `read_by_list` updates on messages in realtime
8. **Guest messages appear in staff Messenger widget** — via `-notifications` channel bridge

### ❌ UI pieces that do NOT update correctly

| # | Broken UI Piece | File | State Source | Why Broken |
|---|---|---|---|---|
| 1 | **Guest read receipts (seen checkmarks)** | `GuestChatWidget.jsx` `MessageBubble` | `useGuestChat.messages[].read_by_staff` | `handleMessageRead` does NOT call `setMessages()` — only dispatches to guestChatStore which widget doesn't read |
| 2 | **Staff ChatSidebar conversations** (guest↔staff) | `ChatSidebar.jsx` | `ChatContext.conversations` (local state) | Not connected to any realtime events. Only populates on initial API fetch. |
| 3 | **Staff ChatSidebar unread counts** (guest↔staff) | `ChatSidebar.jsx` | `ChatContext.conversations[].unread_count` | Same as above — stale after mount |
| 4 | **Staff ChatSidebar "Seen"/"Not seen" indicator** | `ChatSidebar.jsx` line ~134 | `conv.unread_count \|\| conv.unreadCountForGuest` | Never updates from realtime |
| 5 | **Staff ChatWindow messages** (guest↔staff) | `ChatWindow.jsx` | Local `useState` + API fetch | Not connected to chatStore or any realtime event handler |
| 6 | **StaffChatFloatingButton unread badge** | `StaffChatFloatingButton.jsx` | `useUnreadCount` (API polling every 30s) | Not connected to realtime. 30-second delay minimum. |
| 7 | **Guest name shows "Guest"** on staff side | `eventBus.js` line ~447 | `sender_name: payload?.sender_name \|\| payload?.guest_name \|\| 'Guest'` | Backend may not send `sender_name`/`guest_name` in notification payload; frontend hardcodes `'Guest'` fallback |
| 8 | **Staff ConversationsList guest name** | `ConversationsList.jsx` line ~407 | `conversation.title \|\| otherParticipant?.full_name \|\| 'Chat'` | Guest conversations have no `title` or `participants` with `full_name` in chatStore |
| 9 | **Unread badge race condition** | `chatStore.jsx` `MARK_CONVERSATION_READ` | `chatState.totalUnreadOverride` | Optimistic clear gets overwritten by delayed `unread_updated` event with stale count |

---

### Minimum frontend fixes needed

#### Fix 1: Guest read receipts must update in realtime
**File:** `src/hooks/useGuestChat.js`, `handleMessageRead` handler (~line 228)
**Problem:** Only dispatches to guestChatStore, never calls `setMessages()`
**Fix:** Add `setMessages()` call to update `read_by_staff` on matching messages:
```js
// After dispatching to store, also update local rendering state
setMessages((prev) =>
  prev.map((m) => {
    if (payload.message_id && m.id === payload.message_id) {
      return { ...m, read_by_staff: payload.read_by_staff ?? true };
    }
    // Bulk update: if read_at or all_read flag is set
    if (payload.all_read || (!payload.message_id && m.sender_type === 'guest')) {
      return { ...m, read_by_staff: true };
    }
    return m;
  })
);
```

#### Fix 2: Guest name fallback in eventBus
**File:** `src/realtime/eventBus.js`, line ~447
**Problem:** Hardcoded `'Guest'` fallback when backend doesn't send `guest_name`
**Fix:** Use room number as fallback instead of "Guest":
```js
sender_name: payload?.sender_name || payload?.guest_name || `Guest (Room ${payload?.room_number || '?'})`,
```
And/or ensure backend sends `guest_name` in the `new-guest-message` notification payload.

#### Fix 3: ChatSidebar must read from chatStore or re-fetch on realtime events
**File:** `src/context/ChatContext.jsx`
**Problem:** `conversations` local state is never updated by realtime events
**Fix options (pick one):**
- A) Make `ChatContext.conversations` derived from `chatStore.conversationsById` (like `StaffChatContext` does)
- B) Subscribe `ChatContext` to relevant chatStore changes and re-fetch conversations
- C) Replace `ChatSidebar` / `ChatHomePage` with the `MessengerWidget` / `ConversationsList` system that already works

#### Fix 4: ChatWindow must read from chatStore
**File:** `src/components/chat/ChatWindow.jsx`
**Problem:** Uses its own local `messages` state disconnected from realtime
**Fix:** Read messages from `chatState.conversationsById[conversationId].messages` like `ConversationView` / `ChatWindowPopup` already do.

#### Fix 5: StaffChatFloatingButton must use chatStore instead of polling
**File:** `src/staff_chat/components/StaffChatFloatingButton.jsx`
**Problem:** Uses `useUnreadCount` which polls API every 30 seconds
**Fix:** Use `useChatState()` and compute unread from `chatState.conversationsById` or `chatState.totalUnreadOverride`, identical to `MessengerWidget`.

#### Fix 6: Unread badge race condition
**File:** `src/realtime/stores/chatStore.jsx`, `UPDATE_UNREAD_COUNTS` reducer
**Problem:** Backend `unread_updated` event after optimistic `MARK_CONVERSATION_READ` overwrites the zero
**Fix:** Track a `lastMarkedReadAt` timestamp per conversation. In `UPDATE_UNREAD_COUNTS`, ignore events with `updated_at` older than `lastMarkedReadAt` for that conversation.

#### Fix 7: Staff ConversationsList guest name display
**File:** `src/staff_chat/components/ConversationsList.jsx`, line ~407
**Problem:** Shows `conversation.title || otherParticipant?.full_name || 'Chat'`. Guest conversations lack both.
**Fix:** Add guest name resolution. When `chatStore` receives a guest message via the bridge, include guest metadata. Or: fall back to `conversation.last_message?.sender_name` or separate API enrichment.

---

### Priority Order

1. **Fix 1** (guest read receipts) — one-line fix, immediate user-visible improvement
2. **Fix 2** (guest name fallback) — one-line fix, stops "Guest" from appearing
3. **Fix 6** (unread race condition) — prevents confusing badge behavior
4. **Fix 5** (floating button realtime) — simple swap from polling to store
5. **Fix 3** (ChatSidebar realtime) — medium effort, connects guest↔staff sidebar to realtime
6. **Fix 4** (ChatWindow realtime) — medium effort, connects guest↔staff panel to realtime
7. **Fix 7** (guest name in ConversationsList) — requires backend coordination or enrichment logic
