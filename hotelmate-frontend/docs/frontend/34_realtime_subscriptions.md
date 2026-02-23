# 34 — Realtime Subscriptions

> **Transport:** Pusher (WebSocket) for real-time events; Firebase Cloud Messaging for background push notifications.
> **Architecture:** Centralized event routing via `eventBus.js` — Pusher → channelRegistry → eventBus → domain stores.

---

## 1. System Components

### 1.1 Pusher Clients

| Client | File | Scope | Auth |
|--------|------|-------|------|
| **Staff client** (singleton) | `src/realtime/realtimeClient.js` | Hotel-wide channels + private staff channels | `Authorization: Token` via `localStorage.user` sent to Pusher auth endpoint |
| **Guest client** (per-instance) | `src/realtime/guestRealtimeClient.js` | Per-guest private channel | `guest_token` query parameter to Pusher auth endpoint |

**Staff client lifecycle:** Created once by `RealtimeProvider` (`src/realtime/RealtimeProvider.jsx`), stored in React context. Shared by all staff-protected routes. Reconnects automatically (Pusher SDK handles).

**Guest client lifecycle:** Created per-guest in guest-facing components (e.g., `GuestChatPortal`). Destroyed on unmount. Multiple guest clients can exist simultaneously (no singleton enforcement).

### 1.2 Channel Registry

| Aspect | Detail |
|--------|--------|
| **File** | `src/realtime/channelRegistry.js` |
| **Role** | Manages Pusher channel subscriptions, deduplication, and teardown |
| **Tracking** | Internal `Map` of `channelName → { channel, refCount, bindings }` |
| **Ref counting** | Subscribes once per unique channel name; increments ref count on re-subscribe; unsubscribes only when ref count hits 0 |
| **Exports** | `subscribe(channelName, eventName, callback)`, `unsubscribe(channelName)`, `getChannel(channelName)`, `subscribeGuest(...)` |

### 1.3 Event Bus

| Aspect | Detail |
|--------|--------|
| **File** | `src/realtime/eventBus.js` (837 lines) |
| **Role** | Central routing hub: receives events from 3 sources → normalizes → deduplicates → dispatches to domain stores |
| **Sources** | 1. Pusher (via channelRegistry bindings) 2. Firebase Cloud Messaging (via `handleIncomingRealtimeEvent`) 3. Local dispatches (via `dispatchLocalEvent`) |
| **Deduplication** | LRU set capped at 1000 entries; key = `${event.type}:${event.id || JSON.stringify(event)}` |
| **Fallback dispatch** | If primary store dispatch fails → fires `CustomEvent` on `window` → components can listen via `addEventListener` |

---

## 2. Channel Map

### 2.1 Staff Channels

| Channel Name | Subscribed By | Events Routed To |
|-------------|---------------|------------------|
| `hotel.{slug}` | `channelRegistry` via `RealtimeProvider` | `eventBus` → multiple stores based on event type |
| `hotel.{slug}.rooms` | `channelRegistry` via `RealtimeProvider` | `roomsStore` |
| `hotel.{slug}.attendance` | `channelRegistry` via `RealtimeProvider` | `attendanceStore` |
| `hotel.{slug}.orders` | `channelRegistry` via `RealtimeProvider` | `roomServiceStore` |
| `hotel.{slug}.bookings` | `channelRegistry` via `RealtimeProvider` | `roomBookingStore`, `serviceBookingStore` |
| `hotel.{slug}.housekeeping` | `channelRegistry` via `RealtimeProvider` | `housekeepingStore` |
| `private-staff.{userId}` | `channelRegistry` via `RealtimeProvider` | `chatStore` (DM notifications) |

### 2.2 Guest Channels

| Channel Name | Subscribed By | Events Routed To |
|-------------|---------------|------------------|
| `private-guest.{token}` | `guestRealtimeClient` via guest components | `guestChatStore` + `chatStore` (cross-domain) |

### 2.3 Dynamic Channels

| Channel Name | Subscribed By | Events Routed To |
|-------------|---------------|------------------|
| `private-conversation.{id}` | `channelRegistry` (subscribed/unsubscribed as user enters/leaves chat) | `chatStore` (new messages, typing indicators) |

---

## 3. Event Routing Table

The `eventBus.js` routes events by `event.type` prefix:

| Event Type Prefix | Target Store | Store File | Key Actions |
|-------------------|-------------|------------|-------------|
| `attendance` | `attendanceStore` | `src/realtime/stores/attendanceStore.js` | `clock_in`, `clock_out`, `shift_start`, `shift_end`, `attendance_update` |
| `staff_chat` | `chatStore` | `src/realtime/stores/chatStore.js` | `new_message`, `message_read`, `typing`, `conversation_created`, `unread_count_update` |
| `guest_chat` | `guestChatStore` + `chatStore` | `src/realtime/stores/guestChatStore.js` | `new_message`, `message_read`, `typing` (cross-dispatched to chatStore for staff-side unread count) |
| `room_service` | `roomServiceStore` | `src/realtime/stores/roomServiceStore.js` | `new_order`, `order_status_update`, `order_cancelled` |
| `room_booking` | `roomBookingStore` | `src/realtime/stores/roomBookingStore.js` | `booking_created`, `booking_confirmed`, `booking_cancelled`, `booking_checked_in`, `booking_checked_out`, `overstay_alert`, `overstay_acknowledged`, `overstay_extended` |
| `service_booking` | `serviceBookingStore` | `src/realtime/stores/serviceBookingStore.js` | `booking_created`, `booking_confirmed`, `booking_cancelled`, `booking_updated` |
| `rooms` | `roomsStore` | `src/realtime/stores/roomsStore.js` | `room_status_change`, `room_assignment`, `room_cleaned`, `room_inspected`, `room_maintenance` |
| `housekeeping` | `housekeepingStore` | `src/realtime/stores/housekeepingStore.js` | `task_created`, `task_assigned`, `task_completed`, `task_status_update` |
| `notification` | `notificationStore` | `src/realtime/stores/notificationStore.js` | `new_notification`, `notification_read`, `notification_cleared` |
| `stock` | `stockStore` | `src/realtime/stores/stockStore.js` | `stocktake_update`, `movement_created`, `item_updated` |

---

## 4. Firebase Cloud Messaging Integration

| Aspect | Detail |
|--------|--------|
| **Service worker** | `public/firebase-messaging-sw.js` — handles background push |
| **Foreground listener** | `src/main.jsx` → `listenForFirebaseMessages()` from `src/firebase.js` |
| **Token registration** | `FirebaseService.js` → `POST /staff/hotel/{slug}/fcm-tokens/` |
| **Event flow** | FCM message received → `handleIncomingRealtimeEvent(event)` from `eventBus.js` → same routing as Pusher |
| **FCM normalization** | `eventBus.js` normalizes FCM payload structure — FCM wraps `data` in `notification.data` or `data.data` depending on foreground/background |
| **staff_chat special case** | FCM `staff_chat` events get `event.type` rewritten: `new_message` → `staff_chat.new_message` to match Pusher format |
| **Dedup** | Same LRU dedup set as Pusher events — prevents double-processing when both Pusher and FCM deliver the same event |

---

## 5. Store Architecture

Each domain store under `src/realtime/stores/` follows a consistent pattern:

```
┌─────────────────────────────────┐
│  Store (e.g. roomBookingStore)  │
├─────────────────────────────────┤
│  state: { items, counts, ... }  │
│  listeners: Set<callback>       │
├─────────────────────────────────┤
│  getState()                     │
│  subscribe(callback) → unsub    │
│  dispatch(event)                │
│  getSnapshot()                  │
│  reset()                        │
└─────────────────────────────────┘
```

- **Not** React Context — vanilla JS stores with pub/sub
- Components consume via `useSyncExternalStore(store.subscribe, store.getSnapshot)`
- Stores are **singleton modules** — shared across all components
- State is **in-memory only** — lost on page refresh (no persistence)

### Store ↔ Component Binding

Components subscribe to stores via custom hooks, e.g.:

| Hook | Store | Components |
|------|-------|------------|
| `useRoomBookings()` | `roomBookingStore` | `Bookings`, `BookingManagementDashboard` |
| `useRoomServiceOrders()` | `roomServiceStore` | `RoomServiceOrders`, `BreakfastRoomService` |
| `useChatMessages()` | `chatStore` | `ChatWindow`, `ChatHomePage` |
| `useAttendance()` | `attendanceStore` | `AttendanceDashboard`, `EnhancedAttendanceDashboard` |
| `useRooms()` | `roomsStore` | `RoomList`, `Reception`, `Housekeeping` |

---

## 6. Legacy / Non-Centralized Subscriptions

### 6.1 `useHotelRealtime()` Hook

| Aspect | Detail |
|--------|--------|
| **File** | `src/hooks/useHotelRealtime.js` |
| **Pattern** | Direct Pusher subscription — bypasses `channelRegistry` and `eventBus` |
| **Usage** | Several components use this for quick one-off subscriptions |
| **Risk** | Duplicate subscriptions to same channels, no dedup, no store integration |
| **Status** | TODO in code: "migrate to centralized system" |

### 6.2 `StocktakeDetail.jsx` Direct Pusher

| Aspect | Detail |
|--------|--------|
| **File** | `src/pages/StocktakeDetail.jsx` |
| **Pattern** | Creates its own Pusher instance directly — completely outside centralized system |
| **Channel** | `hotel.{slug}.stocktakes` |
| **Risk** | Separate connection, no dedup, no cleanup guarantee |
| **Status** | TODO in code |

---

## 7. Event Flow Diagram

```
                 ┌─────────────┐
                 │  Pusher CDN  │
                 └──────┬──────┘
                        │ WebSocket
                        ▼
              ┌──────────────────┐
              │  realtimeClient  │ (singleton)
              └────────┬─────────┘
                       │
              ┌────────▼─────────┐
              │  channelRegistry │ (subscribe/bind per channel)
              └────────┬─────────┘
                       │ event callback
                       ▼
              ┌────────────────────┐      ┌──────────┐
              │     eventBus.js    │◄─────│ Firebase  │ (FCM foreground)
              │                    │      │  (main.jsx)│
              │  ┌──────────────┐  │      └──────────┘
              │  │  LRU Dedup   │  │
              │  │  (1000 max)  │  │      ┌──────────────┐
              │  └──────────────┘  │◄─────│ Local Events │
              │                    │      │ (dispatchLocal│
              │  Route by type:    │      │  Event)      │
              │  attendance → ...  │      └──────────────┘
              │  staff_chat → ...  │
              │  room_booking → .. │
              └───┬───┬───┬───┬───┘
                  │   │   │   │
        ┌─────┘   │   │   └──────┐
        ▼         ▼   ▼          ▼
  ┌──────────┐ ┌────┐ ┌────┐ ┌──────────┐
  │attendance│ │chat│ │room│ │  ...more  │
  │  Store   │ │Stor│ │Book│ │  stores   │
  └────┬─────┘ └──┬─┘ └──┬─┘ └────┬─────┘
       │          │      │        │
       ▼          ▼      ▼        ▼
  useSyncExternalStore → React components re-render
```

---

## 8. Guest Realtime Flow

Guest realtime follows a **separate path** from staff:

```
GuestChatPortal
  └─ creates guestRealtimeClient(token)
       └─ subscribes to private-guest.{token}
            └─ on event → channelRegistry callback
                 └─ eventBus.dispatch(event)
                      └─ guestChatStore.dispatch(event)
                           └─ ALSO chatStore.dispatch(event)  ← cross-domain
```

The cross-domain dispatch to `chatStore` ensures staff-side components (e.g., `ChatHomePage`) see guest messages without separate subscriptions.

---

## 9. Realtime Risks

| Risk | Evidence | Severity |
|------|----------|----------|
| **Legacy bypass paths** | `useHotelRealtime` and `StocktakeDetail` bypass centralized system — duplicate subscriptions, no dedup | 🔴 |
| **No reconnection UI** | Pusher SDK auto-reconnects but no user-facing indicator (banner, toast) when connection drops | 🟡 |
| **Store state lost on refresh** | All stores are in-memory — page refresh resets all realtime state. Components must re-fetch from API on mount | 🟡 |
| **Unbounded listener growth** | `eventBus.js` `listeners` set has no leak protection — if components forget to unsubscribe, listeners accumulate | 🟡 |
| **Guest client leak potential** | `guestRealtimeClient` creates new Pusher instances — if component unmounts without explicit disconnect, connection lingers | 🟡 |
| **LRU dedup collision** | Dedup key uses `JSON.stringify(event)` fallback — large events with minor field differences will bypass dedup | 🟢 |
| **FCM normalization fragility** | FCM payload structure detection (`notification.data` vs `data.data`) relies on duck-typing — may break on Firebase SDK update | 🟡 |
| **Cross-domain dispatch coupling** | `guest_chat` events dispatched to both `guestChatStore` AND `chatStore` — tight coupling, changes to either store's dispatch signature break the other | 🟡 |
