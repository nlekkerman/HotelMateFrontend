# 30 — Frontend Overview

> **Repository path:** `hotelmate-frontend/`
> **Framework:** React 18 (Vite build)
> **Router:** React Router v6 (BrowserRouter)
> **Styling:** Bootstrap 5 + custom CSS + CSS custom properties (theme)
> **State:** React Context + `useReducer` stores + React Query (`@tanstack/react-query`)
> **Realtime:** Pusher (WebSocket) + Firebase Cloud Messaging (push notifications)
> **Mobile:** Capacitor wrapper for Android (see `capacitor.config.json`)

---

## 1. Purpose and Responsibilities

The HotelMate frontend is a **multi-tenant hotel operations SPA** serving three distinct user classes:

| User Class | What They Do | Auth Mechanism |
|------------|-------------|----------------|
| **Guests** | Browse hotels, book rooms, pre-check-in, order room service/breakfast, chat with staff, take surveys, play games | Public (none), token-based (email link), PIN-based (room PIN) |
| **Staff** | Manage rooms, housekeeping, attendance, bookings, restaurants, menus, stock, chat, hotel info | Token auth (Django REST `Token` header) |
| **Super Users** | Create hotels, bootstrap public pages, manage room types, system administration | Token auth + `is_superuser` flag |

### What the Frontend Does
- Renders hotel public pages (section-based page builder)
- Handles full guest room booking flow (dates → rooms → details → Stripe payment)
- Provides real-time dashboards for room status, housekeeping, attendance, room service orders
- Manages guest–staff chat with Pusher WebSocket + FCM push notifications
- Drives stock tracker with stocktakes, period management, sales analysis, cocktail calculator
- Hosts entertainment games (Memory Match, Quiz, Whack-a-Mole) with tournaments
- Supports face recognition clock-in/out (face-api.js client-side encoding)

### What the Frontend Does NOT Do
- No server-side rendering — pure client SPA
- No direct database access — all data via REST API to Django backend
- No payment processing — delegates to Stripe Checkout sessions
- No face recognition model training — only client-side encoding, backend handles matching
- No push notification delivery — Firebase handles delivery, frontend registers tokens and listens

---

## 2. App Boot Sequence

**Entry file:** `src/main.jsx`

```
1. bootstrap() async function called
2. Firebase Service Worker registered (/firebase-messaging-sw.js)
3. FCM foreground message listener set up → routes through eventBus (handleIncomingRealtimeEvent)
4. ReactDOM.createRoot renders provider tree:
   PresetsProvider → OrderCountProvider → App
```

**Provider nesting in `src/App.jsx` (export default App):**

```
BrowserRouter
  └─ QueryClientProvider (React Query)
      └─ ToastContainer (react-toastify)
          └─ UIProvider
              └─ AuthProvider
                  └─ RealtimeProvider (Pusher subscription setup)
                      └─ AttendanceProvider
                          └─ RoomServiceProvider
                              └─ ServiceBookingProvider
                                  └─ HousekeepingProvider
                                      └─ GuestChatProvider
                                          └─ StaffChatStoreProvider (chatStore)
                                              └─ ChatProvider (context bridge)
                                                  └─ MessengerProvider (staff chat)
                                                      └─ ThemeProvider
                                                          └─ ChartPreferencesProvider
                                                              └─ StaffChatProvider
                                                                  └─ BookingNotificationProvider
                                                                      └─ RoomServiceNotificationProvider
                                                                          └─ NetworkHandler
                                                                          └─ MessengerWidget
                                                                          └─ AppLayout (routes)
```

**Total provider depth: 18 nested providers** (including `BrowserRouter` and `QueryClientProvider`).

**AppLayout** (`src/App.jsx`, inner function component) handles:
- Layout mode detection via `getLayoutMode()` from `src/policy/layoutPolicy.js`
- Conditional navbar/sidebar rendering based on layout mode
- All `<Routes>` definitions

---

## 3. Key Architectural Principles (as observed in code)

### 3.1 Layout Policy — Single Source of Truth
`src/policy/layoutPolicy.js` classifies every pathname into one of four modes (`auth`, `pin_authenticated`, `guest`, `staff`). This is the **sole determinant** of whether navbar, sidebar, and `LogoBanner` render. Both `MobileNavbar` and `BigScreenNavbar` are externally controlled by this policy (not by internal auth checks).

### 3.2 Dual-Audience Routing
Routes are cleanly split between guest-public and staff-protected paths. Guest routes use no auth, token-based auth (query param `?token=`), or PIN-based auth (`sessionStorage`). Staff routes use `ProtectedRoute` which checks `user` from `AuthContext`.

### 3.3 Realtime Store Architecture
A centralized `eventBus` (`src/realtime/eventBus.js`, 837 lines) routes all incoming Pusher and FCM events to domain-specific stores (`chatStore`, `roomServiceStore`, `roomBookingStore`, etc.). Stores use `useReducer` with a `dispatchRef` pattern to bridge non-React eventBus code into React state. Triple-layer deduplication: eventBus global set → channel registry set → per-store set.

### 3.4 Service Layer Pattern
API calls are organized into domain-specific service files under `src/services/`. The authenticated client (`src/services/api.js`) auto-attaches `Token` auth headers via interceptor. A separate `publicAPI` instance handles unauthenticated guest endpoints. Some services (theme, presets) have in-memory caches.

### 3.5 Context as State Bridge
`ChatContext` (`src/context/ChatContext.jsx`) acts as a bridge between the realtime stores (`guestChatStore`, `chatStore`) and legacy component APIs. Several other contexts (`BookingNotificationContext`, `RoomServiceNotificationContext`) monitor store state changes to trigger browser notifications.

---

## 4. Directory Structure (src/)

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `components/` | Reusable UI components organized by domain | `auth/`, `bookings/`, `chat/`, `guests/`, `hotel_info/`, `layout/`, `menus/`, `rooms/`, `room_service/`, `staff/`, `stock_tracker/` |
| `pages/` | Route-level page components | `bookings/`, `chat/`, `guest/`, `home/`, `hotel_info/`, `housekeeping/`, `maintenance/`, `staff/`, `stock_tracker/` |
| `context/` | React Context providers | `AuthContext`, `ChatContext`, `ThemeContext`, `UIContext`, `PresetsContext`, `BookingNotificationContext`, `RoomServiceNotificationContext`, `ChartPreferencesContext` |
| `realtime/` | Pusher clients + eventBus + domain stores | `realtimeClient.js`, `guestRealtimeClient.js`, `channelRegistry.js`, `eventBus.js`, `RealtimeProvider.jsx`, `stores/` |
| `services/` | API client + domain-specific API modules | `api.js`, `publicApi.js`, `guestChatAPI.js`, `roomConversationsAPI.js`, `roomOperations.js`, `staffApi.js`, `sectionEditorApi.js`, `memoryGameAPI.js`, `quizGameAPI.js`, `salesAnalytics.js`, `stockAnalytics.js`, etc. |
| `hooks/` | Custom React hooks | `useAxios.js`, `usePermissions.js`, `useLogin.js`, `useHotelRealtime.js`, `useCountdownTimer.js`, etc. |
| `features/` | Feature modules (attendance, face recognition, staff profile) | `attendance/`, `faceAttendance/`, `staffProfile/` |
| `games/` | Entertainment module | `memory-match/`, `quiz-game/`, `whack-a-mole/` |
| `config/` | Navigation categories, custom icons | `navigationCategories.js`, `customIcons.js` |
| `policy/` | Layout policy | `layoutPolicy.js` |
| `staff_chat/` | Staff messenger (internal chat) | `components/`, `context/`, `hooks/`, `services/` |
| `utils/` | Utility functions | `errorHandling.js`, `fcm.js`, `bookingHoldStorage.js`, `guestBookingTokens.js`, etc. |
| `styles/` | CSS files | `main.css`, `home.css`, `presets.css`, `sections.css`, etc. |
| `types/` | Type definitions | `bookingFilters.js`, `presets.js`, `sectionEditor.js` |

---

## 5. Build and Deployment

| Aspect | Detail |
|--------|--------|
| **Build tool** | Vite (`vite.config.js`) |
| **Deploy target** | Netlify (see `netlify.toml` at repo root) |
| **Mobile** | Capacitor for Android (`android/` directory, `capacitor.config.json`) |
| **Environment variables** | `VITE_API_BASE_URL`, `VITE_PUSHER_KEY`, `VITE_PUSHER_CLUSTER`, `VITE_PUSHER_AUTH_ENDPOINT`, `VITE_FIREBASE_*`, `VITE_CLOUDINARY_CLOUD_NAME` |
| **Routing** | Client-side SPA with `/*` redirect to `index.html` (Netlify config) |

---

## 6. Cross-Cutting Risks (Architectural Level)

| Risk | Evidence | Severity |
|------|----------|----------|
| **Provider nesting depth (18 levels)** | `src/App.jsx` export default | 🟡 Performance — every context change re-renders subtree |
| **Triple state for rooms** | React Query cache + roomsStore + local component state in `RoomList.jsx` | 🟡 Store drift |
| **Console.log spam in production** | Found in 30+ files with emoji-prefixed debug output | 🟡 Performance + info leakage |
| **localStorage JSON.parse in render** | `RoomList`, `MovementsList`, `PeriodSnapshots`, `AttendanceDashboard` | 🟡 Crash risk on corrupt data |
| **Client-only permission checks** | `usePermissions.js` reads `localStorage` — no server validation | 🟡 Bypassable (backend must enforce) |
| **Monolith components (>1000 LOC)** | `ChatWindow` (2405), `StocktakeDetail` (1397), `MenusManagement` (1217), `RoomService` (1166), `RoomDetails` (1103), `FaceClockInPage` (1082) | 🟡 Maintainability |
| **Inconsistent error UX** | Mix of `toast`, `window.alert`, inline error divs, silent swallowing | 🟡 Poor UX consistency |
| **Shared PIN sessionStorage key** | `RequirePin` and `RequireDinnerPin` use same `pin_ok_` prefix | 🟡 Security — cross-gate bypass |
| **Broken redirect-back flow** | `ProtectedRoute` saves `location.state.from` but `Login.jsx` ignores it | 🟡 UX — always redirects to `/` |
