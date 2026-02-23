# 32 — State Management

> **State mechanisms used:** React Context + `useReducer` (primary), React Query / `@tanstack/react-query` (server cache), `localStorage` / `sessionStorage` (persistence), module-level singletons (realtime clients)

---

## 1. State Architecture Overview

The app uses **no external state library** (no Redux, no Zustand, no MobX). All state is managed via:

1. **React Context + `useReducer`** — domain-specific realtime stores under `src/realtime/stores/`
2. **React Context + `useState`** — simpler contexts under `src/context/`
3. **React Query (`@tanstack/react-query`)** — server data caching for themes, room lists, staff data
4. **localStorage** — auth tokens, user profiles, theme preferences, game tokens, guest sessions
5. **sessionStorage** — PIN validation state
6. **Module-level singletons** — Pusher client instances, eventBus dedup sets

---

## 2. Context Providers

| Provider | File | State Owned | Consumed By |
|----------|------|-------------|-------------|
| `AuthProvider` | `src/context/AuthContext.jsx` | `user` (object), `viewMode` ('guest'\|null), `currentHotel` (object) | Nearly every component via `useAuth()` |
| `UIProvider` | `src/context/UIContext.jsx` | `showFeed` (bool) | `BigScreenNavbar`, `Home` area components |
| `ChatProvider` | `src/context/ChatContext.jsx` | `conversations` (array), `activeConversation` (string\|null) | `ChatHomePage`, `ChatSidebar`, `ChatWindow` |
| `BookingNotificationProvider` | `src/context/BookingNotificationContext.jsx` | `hasNewBooking` (bool), `newBookingCount` (number) | `Bookings`, navbar badge |
| `RoomServiceNotificationProvider` | `src/context/RoomServiceNotificationContext.jsx` | `hasNewOrder` (bool), `notificationSeen` (bool), `newOrderCount` (number) | Room service pages, navbar badge |
| `ThemeProvider` | `src/context/ThemeContext.jsx` | Theme colors via React Query (`useQuery`/`useMutation`) | All themed components via `useTheme()` |
| `ChartPreferencesProvider` | `src/context/ChartPreferencesContext.jsx` | `chartLibrary` (string), `chartStyle` (string) — localStorage-backed | Analytics charts |
| `PresetsProvider` | `src/context/PresetsContext.jsx` | `presets` (object), `loading`, `error` | Public page rendering, preset selectors |
| `OrderCountProvider` | `src/hooks/useOrderCount.jsx` | Order counts | Navbar badges |
| `MessengerProvider` | `src/staff_chat/context/MessengerContext.jsx` | Messenger widget state | `MessengerWidget` |
| `StaffChatProvider` | `src/staff_chat/context/StaffChatContext.jsx` | Staff chat conversations/messages | Staff chat components |

### Auth Storage Contract

`AuthContext` reads/writes `localStorage`:
- Key `user` → full user object (token, hotel_slug, role, permissions, is_superuser, profile_picture)
- Key `viewMode` → 'guest' or null
- Key `currentHotel` → hotel object
- On logout: clears `user`, `viewMode`, `currentHotel`, `fcm_token`, `hotelmate_guest_chat_session`, game tokens, and ~10 other keys

---

## 3. Realtime Stores (useReducer-based)

These stores live under `src/realtime/stores/` and are all wrapped in `RealtimeProvider` (`src/realtime/RealtimeProvider.jsx`). They receive events from the centralized `eventBus` (`src/realtime/eventBus.js`) via a `dispatchRef` pattern that bridges non-React eventBus code into React state.

| Store | File | State Shape | Action Types | Events Handled |
|-------|------|-------------|--------------|----------------|
| **chatStore** | `src/realtime/stores/chatStore.jsx` | `conversations` (object map), `activeConversation`, `processedEvents` (dedup), `unreadConversationId` | 15 action types | `staff_chat_message_created/edited/deleted`, `_staff_mentioned`, `_messages_read`, `_message_delivered`, `_typing`, `_attachment_uploaded/deleted`, `_unread_updated`, `_conversations_with_unread`, `guest_message_created` (cross-domain) |
| **guestChatStore** | `src/realtime/stores/guestChatStore.jsx` | `messages`, `conversations`, `activeConversation`, `unreadCount`, hotel/booking/conversation IDs | 10 action types | `guest_message_created`, `staff_message_created`, `message_created` (legacy), `unread_updated`, `message_read`, `conversation_created/updated`, `message_deleted/edited` |
| **notificationsStore** | `src/realtime/stores/notificationsStore.jsx` | `notifications` (array, max 200) | 3 action types | All event types (receives everything for display) |
| **attendanceStore** | `src/realtime/stores/attendanceStore.jsx` | `staffStatus` (object map), `departmentCounts`, `processedEvents` | 8 action types | `clock_status_updated`, `clock-status-updated` (legacy), `clock-status-changed`, `attendance_update`, `timesheet-approved/rejected`, `personal-attendance-update` |
| **roomServiceStore** | `src/realtime/stores/roomServiceStore.jsx` | `orders` (object map), `pendingOrderIds` (array), `lastUpdated` | 10 action types | `order_created`, `order_updated`, `new_room_service_order` (legacy), `new_breakfast_order` (legacy), `order_status_changed`, `order_accepted/preparing/ready/delivered/cancelled` (legacy) |
| **serviceBookingStore** | `src/realtime/stores/serviceBookingStore.jsx` | `bookings` (object map), `recentBookingIds`, `lastUpdated` | 8 action types | `booking_created`, `booking_updated`, `booking_cancelled`, `new_dinner_booking` (legacy), `booking_confirmed`, `booking_seated`, `table_assigned/changed` |
| **roomBookingStore** | `src/realtime/stores/roomBookingStore.jsx` | `bookings` (object map), `orderedBookingIds`, `lastUpdated` | 15+ action types | `booking_created`, `booking_payment_required`, `booking_confirmed/updated/cancelled`, `booking_party_updated`, `booking_checked_in/checked_out`, `booking_expired`, `booking_overstay_*`, `integrity_healed`, `party_healed`, `guests_healed` |
| **roomsStore** | `src/realtime/stores/roomsStore.jsx` | `rooms` (object map keyed by room number), `orderedRoomNumbers`, `lastUpdated` | 5 action types | `room_updated`, `room_status_changed` |
| **galleryStore** | `src/realtime/stores/galleryStore.jsx` | *(placeholder)* | — | **Stub — not wired to eventBus or provider tree** |
| **housekeepingStore** | `src/realtime/stores/housekeepingStore.jsx` | `dashboardCounts` (status counts), `rooms`, `loading`, `error` | UI-driven actions only | **Not wired to eventBus — standalone UI state holder** |

### Deduplication Strategy

Every store implements its own `processedEvents` Set with LRU cleanup at 1000 entries. The `eventBus` has a separate global dedup set. Total: **triple-layer deduplication** (eventBus global → channel registry → per-store).

### dispatchRef Pattern

All realtime stores export a `dispatch` function that sets a module-level `dispatchRef` variable. The `eventBus` imports this function and calls it directly (outside React lifecycle). This bridges the gap between Pusher callbacks (non-React) and React state.

```
Pusher event → channelRegistry → eventBus.handleIncomingRealtimeEvent()
  → looks up event type → calls store's handle* function
  → store's handle* function calls dispatchRef({ type, payload })
  → React's useReducer processes the action → UI re-renders
```

Exception: `notificationsStore` uses a `window.addNotificationCallback` pattern instead of `dispatchRef`.

---

## 4. React Query Usage

| Query Key | File | Endpoint | Stale Time | Notes |
|-----------|------|----------|------------|-------|
| `['hotelTheme', slug]` | `src/context/ThemeContext.jsx` | Staff: `/staff/hotel/${slug}/settings/`, Guest: `/public/hotel/${slug}/page/` | 5 minutes | Writes CSS custom properties to `document.documentElement` |
| `['rooms']` | `src/components/rooms/RoomList.jsx` | `/staff/hotel/${slug}/rooms/dashboard/` | Default | Also dispatches `ROOM_BULK_REPLACE` to roomsStore on success |
| `['staff', id]` | `src/components/staff/StaffDetails.jsx` | Staff details | Default | Invalidated after face data revoke |

> **Note:** React Query usage is limited. Most data fetching uses raw `useEffect` + `useState` + `api.get()` pattern. React Query is not the primary data fetching strategy.

---

## 5. localStorage Keys

| Key | Written By | Read By | Content |
|-----|-----------|---------|---------|
| `user` | `AuthContext`, `useLogin` | Nearly everything | Full user object with token, role, permissions, hotel_slug |
| `viewMode` | `AuthContext` | `AuthContext` | 'guest' or null |
| `currentHotel` | `AuthContext` | `AuthContext`, `ThemeContext` | Hotel data object |
| `hotelmate_guest_chat_session` | `ChatPinAuth`, guest chat | `RequireChatPin`, `ChatContext`, `ThemeContext` | Guest chat session JSON |
| `fcm_token` | `FirebaseService` | `FirebaseService` | Firebase Cloud Messaging token |
| `guest_fcm_token_saved` | `ChatWindow` | `ChatWindow` | Boolean flag |
| `chart_library_preference` | `ChartPreferencesContext` | `ChartPreferencesContext` | 'recharts'\|'chartjs'\|'victory'\|'echarts' |
| `chart_style_preference` | `ChartPreferencesContext` | `ChartPreferencesContext` | Chart style name |
| `quiz_session_id` | `quizGameAPI` | `quizGameAPI` | Active quiz session ID |
| `player_token` | Game utils | `memoryGameAPI` | Anonymous game player token |
| `kiosk_mode` | `AttendanceDashboard` | `AttendanceDashboard`, `FaceClockInPage` | Boolean |

---

## 6. sessionStorage Keys

| Key Pattern | Written By | Read By | Content |
|-------------|-----------|---------|---------|
| `pin_ok_${roomNumber}` | `PinAuth`, `DinnerPinAuth` | `RequirePin`, `RequireDinnerPin` | "true" string |
| `chat_pin_ok_${roomNumber}` | `ChatPinAuth` | `RequireChatPin` | "true" string |

> ⚠️ **Known issue:** `pin_ok_` prefix is shared between room service and dinner PIN gates. Validating one satisfies the other.

---

## 7. Cross-Domain Event Flow

```
                    ┌──────────────────┐
                    │  Pusher Server   │
                    └────────┬─────────┘
                             │ WebSocket
                    ┌────────▼─────────┐
                    │ channelRegistry  │ (src/realtime/channelRegistry.js)
                    │ Dedup layer #1   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │    eventBus      │ (src/realtime/eventBus.js)
                    │ Dedup layer #2   │ Routes by event.type
                    │ Normalizes FCM   │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼───────────────────┐
          │                  │                   │
   ┌──────▼──────┐   ┌──────▼──────┐   ┌───────▼───────┐
   │ chatStore   │   │roomService  │   │roomBooking    │   ... (6 more stores)
   │ Dedup #3    │   │Store        │   │Store          │
   └──────┬──────┘   └──────┬──────┘   └───────┬───────┘
          │                  │                   │
   ┌──────▼──────┐   ┌──────▼──────┐   ┌───────▼───────┐
   │ ChatContext │   │Notification │   │BookingStatus  │
   │ (bridge)    │   │Context      │   │Page           │
   └─────────────┘   └─────────────┘   └───────────────┘
```

**Cross-domain routing:** Guest chat events are routed to **both** `guestChatStore` and `chatStore` for staff visibility. The eventBus creates dual events for this purpose.

---

## 8. State Risks and Tech Debt

| Issue | Location | Severity |
|-------|----------|----------|
| **Triple room data** — React Query cache + roomsStore + local state | `src/components/rooms/RoomList.jsx` | 🟡 Store drift |
| **ChatContext bridge serializes conversations map as useEffect dep** | `src/context/ChatContext.jsx` | 🟡 Performance — triggers on every store update |
| **Notification contexts monitor store arrays** | `BookingNotificationContext`, `RoomServiceNotificationContext` | 🟡 Re-render cascades |
| **dispatchRef can be null between mount and effect** | All realtime stores | 🟡 Dropped events during hydration |
| **Unconnected stores** | `galleryStore` (stub), `housekeepingStore` (UI-only, not in eventBus) | 🟢 Dead code |
| **Window event dispatch for cross-component communication** | `roomBookingStore` → `bookingStoreEvent`, `chatStore` → `chatStoreEvent`, `FaceClockInPage` → `refreshAttendanceStatus` | 🟡 Non-React pattern |
