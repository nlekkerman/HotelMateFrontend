# HotelMate Frontend Audit

**Date:** 2026-03-23  
**Scope:** React frontend only (`hotelmate-frontend/src/`)  
**Stack:** React 18, React Router v6, TanStack React Query, Pusher, Firebase, Bootstrap, Axios

---

## Executive Summary

HotelMate is a multi-surface hospitality application with **three distinct user surfaces** (public website, guest portal, staff dashboard) rendered by a **single React SPA** with conditional layout chrome. The app uses React Context + `useReducer` for state (no Redux/Zustand), Pusher for realtime events, and Firebase for push notifications.

**Key strengths:** Well-architected centralized realtime event bus with domain stores, a fully dynamic section-based page builder, and backend-authoritative navigation/permission model.

**Key risks:** No global error boundary, duplicated context providers in App.jsx, scattered permission checks, multiple independent Pusher instances not yet migrated to the singleton, and no code-splitting of routes.

---

## 1. Application Surface Map

The app serves three surfaces from a single React SPA, determined by URL path:

| Surface | Route Patterns | Auth Model | Layout Chrome |
|---------|---------------|------------|---------------|
| **Public** | `/`, `/hotel/:slug`, `/:hotelSlug`, `/:hotelSlug/book`, `/booking/*` | None | No nav, no sidebar |
| **Guest** | `/:hotelIdentifier/room/:roomNumber/*`, `/room_services/*`, `/guest-booking/*`, `/chat/:hotelSlug/*`, `/guest/*` | PIN (sessionStorage) or token (URL query param) | No nav, no sidebar |
| **Staff** | `/staff/*`, `/reception`, `/rooms`, `/bookings`, `/attendance/*`, `/stock_tracker/*`, `/games/*`, `/:hotelSlug/staff/*` | Django Token Auth (localStorage) | Sidebar + mobile nav + logo banner |

### Surface Detection

Determined by `getLayoutMode()` in [src/policy/layoutPolicy.js](hotelmate-frontend/src/policy/layoutPolicy.js):

```
pathname → "auth" | "guest" | "public" | "staff"
```

1. **`"auth"`** — Exact matches: `/login`, `/logout`, `/register`, `/forgot-password`, etc.
2. **`"guest"`** — Matches `GUEST_ROUTE_PATTERNS` array (PIN pages, room service menus, guest chat, dinner booking)
3. **`"public"`** — Regex matches for `/`, `/hotel/<slug>`, `/<slug>`, `/<slug>/book`, `/booking/*`
4. **`"staff"`** — Everything else (default fallback)

Only `layoutMode === "staff"` renders navigation chrome (sidebar, mobile nav, logo banner).

### Layout Implementation

There is **no dedicated Layout/Shell wrapper component**. Layout is handled inline in `AppLayout` inside [src/App.jsx](hotelmate-frontend/src/App.jsx):
- `BigScreenNavbar` renders on desktop when `!hideNavigation`
- `MobileNavbar` renders on mobile when `!hideNavigation`
- `LogoBanner` renders when `!hideNavigation`
- All route content renders in the same `<main>` area

---

## 2. Route Structure

### Provider Nesting Order (App.jsx)

```
BrowserRouter
  QueryClientProvider
    UIProvider
      AuthProvider
        RealtimeProvider  ← (wraps Notifications, Attendance, Chat, GuestChat, RoomService, ServiceBooking, RoomBooking, Rooms)
          AttendanceProvider        ← DUPLICATE of one inside RealtimeProvider
            RoomServiceProvider     ← DUPLICATE
              ServiceBookingProvider ← DUPLICATE
                HousekeepingProvider
                  GuestChatProvider   ← DUPLICATE
                    StaffChatStoreProvider ← DUPLICATE
                      ChatProvider
                        MessengerProvider
                          ThemeProvider
                            ChartPreferencesProvider
                              StaffChatProvider
                                BookingNotificationProvider
                                  RoomServiceNotificationProvider
                                    AppLayout (routes)
```

> **Issue:** 5 providers are mounted both inside `RealtimeProvider` AND again at the App root. The outer duplicates shadow the inner ones.

### Public Routes (no auth)

| Path | Component |
|------|-----------|
| `/` | `HotelsLandingPage` |
| `/hotel/:slug` | `HotelPublicPage` (dynamic section builder) |
| `/hotel/:slug/sections` | `SectionBasedPublicPage` |
| `/:hotelSlug` | `HotelPortalPage` (legacy hardcoded sections) |
| `/:hotelSlug/book` | `GuestRoomBookingPage` |
| `/booking/:hotelSlug` | `GuestRoomBookingPage` |
| `/booking/confirmation/:bookingId` | `BookingConfirmation` |
| `/booking/status/:hotelSlug/:bookingId` | `BookingStatusPage` |
| `/booking/:hotelSlug/payment/success` | `BookingPaymentSuccess` |
| `/booking/:hotelSlug/payment/cancel` | `BookingPaymentCancel` |
| `/booking/payment/success` | `BookingPaymentSuccess` (legacy) |
| `/booking/payment/cancel` | `BookingPaymentCancel` (legacy) |
| `/guest/hotel/:hotelSlug/precheckin` | `GuestPrecheckinPage` |
| `/guest/hotel/:hotelSlug/survey` | `GuestSurveyPage` |
| `/guest/chat` | `GuestChatPortal` |
| `/shootar` | `ShootARPage` |

### Auth Routes (no chrome)

| Path | Component |
|------|-----------|
| `/login` | `Login` |
| `/logout` | `Logout` |
| `/register` | `RegisterWithToken` (requires `?token=&hotel=`) |
| `/registration-success` | `RegistrationSuccess` |
| `/forgot-password` | `ForgotPassword` |
| `/reset-password/:uid/:token/` | `ResetPassword` |
| `/no-internet` | `NoInternet` |

### Guest PIN-Protected Routes (no staff chrome)

| Path | Component | Guard |
|------|-----------|-------|
| `/:hotelIdentifier/room/:roomNumber/validate-pin` | `PinAuth` | None (PIN entry) |
| `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin` | `DinnerPinAuth` | None |
| `/chat/:hotelSlug/messages/room/:room_number/validate-chat-pin` | `ChatPinAuth` | None |
| `/room_services/:hotelIdentifier/room/:roomNumber/menu` | `RoomService` | `RequirePin` |
| `/room_services/:hotelIdentifier/room/:roomNumber/breakfast/` | `Breakfast` | `RequirePin` |
| `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/` | `DinnerBookingList` | None |
| `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/` | `DinnerBookingForm` | `RequireDinnerPin` |
| `/chat/:hotelSlug/conversations/:conversationId/messages/send` | `ChatWindow` | `RequireChatPin` |
| `/chat/:hotelSlug/conversations/:conversationId/messages` | `ChatWindow` | None |
| `/good_to_know/:hotel_slug/:slug` | `GoodToKnow` | None |
| `/hotels/:hotelSlug/restaurants/:restaurantSlug` | `Restaurant` | None |

### Staff Protected Routes (full chrome, `ProtectedRoute` guard)

| Path | Component | Notes |
|------|-----------|-------|
| `/staff/:hotelSlug/section-editor` | `SectionEditorPage` | |
| `/staff/:hotelSlug/feed` | `Home` | |
| `/staff/:hotelSlug/settings` | `Settings` | |
| `/reception` | `Reception` | |
| `/super-user` | `SuperUser` | |
| `/maintenance` | `Maintenance` | |
| `/:hotelSlug/staff` | `Staff` | |
| `/:hotelSlug/staff/create` | `StaffCreate` | |
| `/:hotelSlug/staff/:id` | `StaffDetails` | |
| `/:hotelSlug/staff/me` | `StaffProfile` | |
| `/attendance/:hotelSlug` | `AttendanceDashboard` | |
| `/roster/:hotelSlug` | `AttendanceDashboard` | Legacy alias |
| `/department-roster/:hotelSlug` | `DepartmentRosterDashboard` | |
| `/enhanced-attendance/:hotelSlug` | `EnhancedAttendanceDashboard` | |
| `/face/:hotelSlug/register` | `FaceRegisterPage` | |
| `/face/:hotelSlug/clock-in` | `FaceClockInPage` | **No ProtectedRoute!** |
| `/camera-clock-in/:hotelSlug` | `FaceClockInPage` | **No ProtectedRoute!** |
| `/hotel-:hotelSlug/restaurants` | `RestaurantManagementDashboard` | |
| `/:hotelSlug/:restaurantSlug` | `RestaurantManagementDashboard` | |
| `/rooms` | `RoomList` | |
| `/room_services/:hotelIdentifier/orders` | `RoomServiceOrders` | |
| `/room_services/:hotelIdentifier/orders-summary` | `OrdersSummary` | |
| `/room_services/:hotelIdentifier/orders-management` | `RoomServiceOrdersManagement` | |
| `/room_services/:hotelIdentifier/breakfast-orders` | `BreakfastRoomService` | |
| `/menus_management/:hotelSlug` | `MenusManagement` | |
| `/:hotelIdentifier/guests` | `GuestList` | |
| `/:hotelIdentifier/guests/:guestId/edit` | `GuestEdit` | |
| `/room-management/:hotelIdentifier/room/:roomNumber` | `RoomDetails` | |
| `/rooms/:roomNumber/add-guest` | `AssignGuestForm` | |
| `/bookings` | `Bookings` | |
| `/staff/hotel/:hotelSlug/room-bookings` | `BookingManagementPage` | |
| `/staff/hotel/:hotelSlug/booking-management` | `BookingManagementDashboard` | |
| `/staff/hotel/:hotelSlug/housekeeping` | `HousekeepingRooms` | |
| `/staff/hotel/:hotelSlug/housekeeping/rooms/:roomNumber` | `HousekeepingRoomDetails` | |
| `/hotel_info/:hotel_slug` | `HotelInfo` | |
| `/hotel_info/:hotel_slug/:category` | `HotelInfo` | |
| `/good_to_know_console/:hotel_slug` | `GoodToKnowConsole` | |
| `/hotel/:hotelSlug/chat` | `ChatHomePage` | |
| `/stock_tracker/:hotel_slug/*` | (12 sub-routes) | Full stock management module |
| `/games/*` | (10 sub-routes) | Games module |
| `*` | `NotFound` | |

### Route Inconsistencies

| Issue | Details |
|-------|---------|
| **Inconsistent slug param names** | Routes use `:hotelSlug`, `:hotel_slug`, `:hotelIdentifier`, `:slug` interchangeably for the same concept |
| **Duplicate booking routes** | `/:hotelSlug/book` and `/booking/:hotelSlug` both render `GuestRoomBookingPage` |
| **Duplicate payment routes** | `/booking/:hotelSlug/payment/success` and `/booking/payment/success` both exist |
| **Unprotected face clock-in** | `/face/:hotelSlug/clock-in` and `/camera-clock-in/:hotelSlug` lack `ProtectedRoute` |
| **Legacy route aliases** | `/roster/:hotelSlug` is a legacy alias for `/attendance/:hotelSlug` |
| **Ambiguous catch-all** | `/:hotelSlug` matches any single-segment path, must be ordered last |
| **Staff route prefix inconsistency** | Some under `/staff/:hotelSlug/*`, others under `/:hotelSlug/staff/*`, others at root (`/rooms`, `/bookings`) |

---

## 3. State / Store Map

### Architecture

- **No Zustand or Redux** — all state via React Context + `useReducer` or `useState`
- **TanStack React Query** for server-state caching (newer code)
- **`localStorage`** as persistence for auth, preferences
- **Pusher** as realtime event source feeding into domain stores

### Top-Level Contexts (`src/context/`)

| Context | State Managed | Hook |
|---------|--------------|------|
| `AuthContext` | User, viewMode (guest/staff), selectedHotel | `useAuth()` |
| `ThemeContext` | Hotel theme colors, full settings object, applies CSS variables | `useTheme()` |
| `UIContext` | Visibility toggles for rooms/guests panels | `useUI()` |
| `ChatContext` | Room conversations list, current conversation ID | `useChatContext()` |
| `BookingNotificationContext` | Dinner booking notifications, `hasNewBooking` flag | `useBookingNotifications()` |
| `RoomServiceNotificationContext` | Room service + breakfast order notifications | `useRoomServiceNotifications()` |
| `ChartPreferencesContext` | Chart library preference, chart style | `useChartPreferences()` |
| `PresetsContext` | UI presets (section, card, room_card, image, news_block) | `usePresets()` |

### Realtime Domain Stores (`src/realtime/stores/`)

All use Context + `useReducer` with separate State/Dispatch contexts:

| Store | State Shape | Key Actions |
|-------|------------|-------------|
| `notificationsStore` | `items[]` (max 200), unread count | `addNotification`, `markAsRead`, `markAllAsRead` |
| `attendanceStore` | `staffById`, `byDepartment`, `currentUserStatus` | `INIT_FROM_API`, `UPDATE_CLOCK_STATUS`, `UPDATE_PERSONAL_STATUS` |
| `chatStore` | `conversationsById`, messages, `activeConversationId`, unread | `RECEIVE_MESSAGE`, `MARK_CONVERSATION_READ`, `SET_TOTAL_UNREAD` |
| `guestChatStore` | `conversationsById`, `messagesByConversationId`, `context` | `GUEST_MESSAGE_RECEIVED`, `STAFF_MESSAGE_SENT`, `SET_CONTEXT` |
| `roomServiceStore` | `ordersById`, `pendingOrders`, `activeOrderId` | `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_STATUS_CHANGED` |
| `serviceBookingStore` | `bookingsById`, `todaysBookings` | `SERVICE_BOOKING_CREATED`, `SERVICE_BOOKING_UPDATED`, `SERVICE_BOOKING_CANCELLED` |
| `roomBookingStore` | `byBookingId`, `list[]`, LRU event dedup | `ROOM_BOOKING_CREATED`, `ROOM_BOOKING_CHECKED_IN`, `ROOM_BOOKING_CANCELLED` |
| `roomsStore` | `byRoomNumber`, `list[]` (numeric sort) | `ROOM_UPSERT`, `ROOM_BULK_REPLACE`, `ROOM_REMOVE` |
| `housekeepingStore` | Dashboard counts, loading/error | `SET_COUNTS`, `SET_LOADING`, `SET_ERROR` |
| `galleryStore` | Placeholder (Phase 6) | `handleEvent()` |

### Staff Chat Contexts (`src/staff_chat/context/`)

| Context | Purpose |
|---------|---------|
| `StaffChatContext` | Wraps `chatStore` — exposes `conversations`, `totalUnread`, `sendMessage()`, `openConversation()` |
| `MessengerContext` | Messenger widget open/close handler registration |
| `PusherProvider` | **DEPRECATED** — legacy Pusher connection, replaced by `realtimeClient.js` |

### Auth State Details

- **User object** in `AuthContext` state, initialized from `localStorage.getItem('user')`
- **Token**: `user.token` (Django Token Auth string)
- **Token injection**: `api.js` request interceptor reads `localStorage.getItem('user')` directly (bypasses context)
- **Key user properties**: `id`, `staff_id`, `token`, `username`, `hotel_id`, `hotel_name`, `hotel_slug`, `is_staff`, `is_superuser`, `access_level`, `department`, `role`, `allowed_navs`, `navigation_items`, `profile_image_url`

### Hotel State (NOT centralized)

| Source | Provides |
|--------|----------|
| `AuthContext.user.hotel_slug/hotel_id/hotel_name` | Staff hotel identity (from login) |
| `AuthContext.selectedHotel` | Multi-hotel browsing |
| `ThemeContext` | Hotel settings + theme colors (from `/staff/hotel/{slug}/settings/`) |
| `useHotel()` hook | Hotel ID, name, logo (from `/staff/hotel/{slug}/me/`) |
| `useHotelLogo()` hook | Logo URL (from `/public/hotel/{slug}/page/`) |
| `api.js` interceptor | Sends `X-Hotel-ID` and `X-Hotel-Slug` headers (from localStorage) |

### Duplicated/Problematic State

| Issue | Details |
|-------|---------|
| **Auth: localStorage vs Context** | `usePermissions()` and `api.js` read `localStorage` directly, bypassing `AuthContext`. If context and localStorage drift, behavior diverges. |
| **Theme applied twice** | `ThemeContext` and `useHotelTheme()` both set the same CSS variables independently. |
| **Hotel data fetched 3 ways** | `useHotel()`, `ThemeContext`, `useHotelLogo()` each hit different endpoints for overlapping hotel data. |
| **Chat stores overlap** | `ChatContext`, `chatStore`, `StaffChatContext`, and `guestChatStore` all manage conversation state with bridging logic. |
| **5 duplicate providers** | `AttendanceProvider`, `RoomServiceProvider`, `ServiceBookingProvider`, `GuestChatProvider`, `StaffChatStoreProvider` are mounted inside `RealtimeProvider` AND again at the App root. |
| **Multiple Pusher instances** | `useHotelRealtime()` and `useHotelGalleries()` create their own `new Pusher()` instead of using `realtimeClient.js`. |
| **Notification logic fragmented** | 4 separate notification subsystems: `notificationsStore`, `BookingNotificationContext`, `RoomServiceNotificationContext`, and browser notifications from `StaffChatContext`. |

---

## 4. Permission Handling Overview

### Architecture: Semi-centralized, backend-authoritative

| Layer | File | Purpose |
|-------|------|---------|
| `ProtectedRoute` | `src/components/auth/ProtectedRoute.jsx` | Checks if `user` exists. **No role checking** — any logged-in user passes. |
| `staffAccessPolicy` | `src/policy/staffAccessPolicy.js` | Maps URL paths → required nav slugs, checks against `user.allowed_navs[]`. 20+ route-to-slug mappings. **However, only used in tests, not in actual route rendering.** |
| `usePermissions` | `src/hooks/usePermissions.js` | Runtime permission checks: `canAccessNav(slug)`, `canAccess(allowedRoles)`, `isSuperUser`. Reads from **localStorage** (not AuthContext). |
| `useNavigation` | `src/hooks/useNavigation.js` | Builds sidebar nav items from backend `navigation_items[]`. Falls back to `DEFAULT_NAV_ITEMS`. |
| PIN Guards | `src/components/auth/RequirePin.jsx`, `RequireChatPin.jsx`, `RequireDinnerPin.jsx` | Check `sessionStorage` for `pin_ok_{roomNumber}` |

### Permission Flow

1. **Backend** returns `allowed_navs[]` and `navigation_items[]` in the login payload
2. **Sidebar** renders only items from `navigation_items[]` (backend-filtered)
3. **`usePermissions().canAccessNav(slug)`** checks `allowed_navs[]` for component-level gating
4. **Superusers** bypass all checks via `user.is_superuser`
5. **Inline `isStaff` checks** in components like `HeroSectionView`, `GallerySectionView` show/hide edit buttons

### Key Gaps

| Gap | Details |
|-----|---------|
| **ProtectedRoute is binary** | Only checks login, not roles. Any authenticated user can access any staff route by URL. |
| **staffAccessPolicy not wired** | Detailed path→permission mappings exist but aren't used in route guards — only in test utilities. |
| **Permissions from localStorage** | `usePermissions()` reads `localStorage` directly, creating potential drift from AuthContext state. |
| **UI-only hiding** | Edit buttons in section views are hidden with `isStaff` checks, but the underlying API endpoints are the actual enforcement point. |
| **Unprotected face clock-in routes** | `/face/:hotelSlug/clock-in` and `/camera-clock-in/:hotelSlug` lack `ProtectedRoute`. |

---

## 5. Guest Flow Summary

### Guest Authentication: PIN-Based (not JWT)

1. Guest scans QR code → lands on `/:hotelIdentifier/room/:roomNumber/validate-pin`
2. `PinAuth` component POSTs PIN to backend
3. On success: `sessionStorage.setItem('pin_ok_<roomNumber>', 'true')`
4. `RequirePin` guard checks sessionStorage → redirects to PIN page if missing
5. Same pattern for `RequireChatPin` and `RequireDinnerPin`

### Guest Booking Flow (Token-Based)

1. URL: `/:hotelSlug/book?room_type_code=XYZ` or `/booking/:hotelSlug`
2. Multi-step form: hotel+room selection → dates → guest info → confirmation
3. Uses `publicAPI` (no auth headers)
4. Booking tokens managed in `localStorage` as `guest_booking_token:{bookingId}` via [src/utils/guestBookingTokens.js](hotelmate-frontend/src/utils/guestBookingTokens.js)
5. Token resolution priority: booking payload > localStorage > URL query param

### Pre-Checkin Flow

1. URL: `/guest/hotel/:hotelSlug/precheckin?token=abc123`
2. Token extracted via `useSearchParams()`
3. API call: `publicAPI.get(/hotel/${hotelSlug}/precheckin/?token=${token})`
4. Response normalized via `normalizePrecheckinData()` → populates form
5. Components: `PrecheckinHeader`, `BookingContactCard`, `PrimaryGuestCard`, `CompanionsSection`, `ExtrasSection`, `SubmitBar`
6. Adapts form based on `booking.booker_type` (`SELF` vs `THIRD_PARTY`)

### Guest Pages

| Page | File |
|------|------|
| Pre-checkin | `src/pages/guest/GuestPrecheckinPage.jsx` |
| Survey | `src/pages/guest/GuestSurveyPage.jsx` |
| Guest Chat | `src/pages/GuestChatPortal.jsx` |
| Room Booking | `src/pages/bookings/GuestRoomBookingPage.jsx` |
| Booking Confirmation | `src/pages/bookings/BookingConfirmation.jsx` |
| Booking Status | `src/pages/bookings/BookingStatusPage.jsx` |

### Weaknesses in Guest Flow

| Issue | Details |
|-------|---------|
| **No dedicated GuestContext** | Guest identity derived from URL params, chat session storage, or component state — not centralized |
| **sessionStorage for PIN** | PIN auth cleared on tab close; guest must re-enter PIN in new tab |
| **No explicit check-in state** | Frontend relies entirely on backend for booking status; no local tracking of pre/post check-in UI state |
| **Guest chat session in localStorage** | `hotelmate_guest_chat_session` persists across sessions but has no expiration mechanism |

---

## 6. Public Page Builder Summary

### Two Systems Coexist

#### System A: Legacy Hardcoded (`HotelPortalPage` → `GuestHotelHome`)

- Route: `/:hotelSlug` (catch-all)
- File: [src/sections/GuestHotelHome.jsx](hotelmate-frontend/src/sections/GuestHotelHome.jsx)
- **Hardcoded section order**: HeroSection → RoomTypesSection → OffersSection → LeisureActivitiesSection → LocationContactSection → GallerySection → AmenitiesSection → GuestPortalStub
- Data from `publicAPI.get(/public/hotel/${hotelSlug}/page/)`
- Content is data-driven within a fixed structure

#### System B: Dynamic Section Builder (`HotelPublicPage`) ← **Active System**

- Route: `/hotel/:slug`
- File: [src/pages/hotels/HotelPublicPage.jsx](hotelmate-frontend/src/pages/hotels/HotelPublicPage.jsx)
- Data: `GET /api/public/hotel/{slug}/page/` → `{ hotel, sections[] }`
- **Fully dynamic rendering**:

```javascript
pageData.sections
  .sort((a, b) => a.position - b.position)
  .map((section) => renderSection(section))
```

#### Section Type → Component Mapping

| `section_type` | Component | File |
|---------------|-----------|------|
| `hero` | `HeroSectionPreset` | `src/components/presets/HeroSectionPreset.jsx` |
| `gallery` | `GallerySectionPreset` | `src/components/presets/GallerySectionPreset.jsx` |
| `list` | `ListSectionPreset` | `src/components/presets/ListSectionPreset.jsx` |
| `news` | `NewsSectionPreset` | `src/components/presets/NewsSectionPreset.jsx` |
| `rooms` | `RoomsSectionView` | `src/components/sections/RoomsSectionView.jsx` |
| `footer` | `FooterSectionPreset` | `src/components/presets/FooterSectionPreset.jsx` |

- Default `FooterSectionPreset` auto-appended if no footer section exists
- Sections ordered by `position` field from backend

#### Staff-Only Builder

- [src/components/builder/InlinePageBuilder.jsx](hotelmate-frontend/src/components/builder/InlinePageBuilder.jsx) — Offcanvas panel visible only to staff
- Add new sections (hero/gallery/list/news/rooms) with auto-incrementing `position`
- Section CRUD via [src/services/sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js)
- `PresetSelector` for global `style_variant` switching

#### Style System

- Page root: `data-preset={variant}` attribute + `page-style-{variant}` class
- CSS in [src/styles/hotelPublicPage.css](hotelmate-frontend/src/styles/hotelPublicPage.css) uses `[data-preset="N"]` selectors
- Each section can override with own `style_variant`, `header_style`, `card_style`

---

## 7. Realtime Usage

### Transport Mechanisms

| Transport | Purpose | Status |
|-----------|---------|--------|
| **Pusher** (centralized singleton) | Primary realtime for all domains | Active, well-architected |
| **Pusher** (independent instances) | Hotel settings/gallery updates, legacy staff chat | Active, TODO to migrate |
| **WebSocket** (raw) | Order tracking, order counts | Legacy, not migrated |
| **Firebase Cloud Messaging** | Push notifications (background/foreground) | Active |

### Centralized Pusher Architecture

```
realtimeClient.js (singleton Pusher)
    ↓
channelRegistry.js (subscribes to hotel channels)
    ↓  bind_global → all events
eventBus.js (central dispatcher)
    ↓  routes by event.category
Domain Action Dispatchers → Domain Stores (useReducer)
```

#### Channel Map

| Channel Pattern | Domain |
|----------------|--------|
| `{hotelSlug}.attendance` | Staff clock-in/out |
| `{hotelSlug}.room-service` | Room service orders |
| `{hotelSlug}.booking` | Restaurant/service bookings |
| `{hotelSlug}.room-bookings` | Room accommodation bookings |
| `{hotelSlug}.rooms` | Room operational status |
| `{hotelSlug}-guest-messages` | Guest→staff messages |
| `{hotelSlug}.staff-{staffId}-notifications` | Personal staff notifications |
| `{hotelSlug}.staff-chat.{conversationId}` | Per-conversation staff chat |
| `private-hotel-{hotelSlug}-guest-chat-booking-{bookingId}` | Guest private channel |

#### Event Deduplication

- `eventBus.js` maintains `globalProcessedEventIds` Set (max 1000, LRU)
- Deduplicates by `meta.event_id` across both Pusher and FCM
- `roomBookingStore` has its own LRU dedup layer

### Firebase Push Notifications

- Service worker: `/firebase-messaging-sw.js`
- Token management: [src/services/FirebaseService.js](hotelmate-frontend/src/services/FirebaseService.js)
- Tokens saved to backend at `staff/save-fcm-token/`
- Foreground messages routed through the centralized event bus (same as Pusher events)
- Aggressive cleanup: deletes old Firebase IndexedDB databases on each token refresh

### Legacy Realtime (Not Migrated)

| Hook | Transport | Purpose |
|------|-----------|---------|
| `useOrdersWebSocket` | Raw WebSocket `/ws/orders/{orderId}/` | Single order tracking |
| `useOrderCountWebSocket` | Raw WebSocket `/ws/orders/{hotelSlug}/counts/` | Order count tracking |
| `useHotelRealtime` | Independent Pusher instance | Hotel settings/gallery updates |
| `usePusher` (staff_chat) | Independent Pusher instance | Legacy staff chat connection |

### Staff Chat System

Full-featured module in `src/staff_chat/`:
- **30 components**: `MessengerWidget`, `ConversationView`, `ConversationsList`, `ChatWindowPopup`, `MessageBubble`, `MessageInput`, `FileUpload`, `ReactionPicker`, `ParticipantsList`, `GroupChatModal`, `ShareMessageModal`, etc.
- **15+ hooks**: `useConversations`, `useSendMessage`, `useEditMessage`, `useDeleteMessage`, `useFileUpload`, `useGroupChat`, `useReactions`, `useReadReceipts`, `useStaffChatRealtime`, `useUnreadCount`, etc.
- Realtime: reads from centralized `chatStore`, detects diffs for new messages/edits/deletes/reactions

### Fragile/Duplicated Realtime Logic

| Issue | Details |
|-------|---------|
| **3 Pusher instances** | Centralized singleton + `useHotelRealtime` + `usePusher` (staff_chat) |
| **2 transport protocols** | Pusher and raw WebSocket for overlapping order data |
| **Dual notification pipelines** | Pusher events → stores AND FCM → eventBus → stores (with dedup to prevent double-processing) |
| **Guest Pusher per-token** | Guest realtime creates a new Pusher instance per guest token (memoized in Map) |

---

## 8. Error Handling & UX Risks

### Error Boundaries

| Boundary | Scope | File |
|----------|-------|------|
| `ChartErrorBoundary` | Stock tracker charts only | `src/components/stock_tracker/charts/ChartErrorBoundary.jsx` |
| `AttendanceErrorBoundary` | Attendance dashboard only | `src/features/attendance/pages/AttendanceDashboard.jsx` |
| **NO GLOBAL ErrorBoundary** | App.jsx has no top-level error boundary | — |

> **Risk:** An unhandled error in any top-level component crashes the entire app with no recovery UI.

### Loading States

- **Inconsistent** — each component manages its own `useState(loading)` + inline Bootstrap `spinner-border`
- **No shared `<LoadingSpinner>` or `<Skeleton>` component**
- React Query provides `isLoading` in newer code but usage is inconsistent
- Single `React.Suspense` in App.jsx with bare `<div>Loading...</div>` fallback

### API Error Handling

| Pattern | Usage |
|---------|-------|
| Raw try/catch with `console.error` | Most common — no user-facing feedback |
| `toast.error()` (react-toastify) | Some components |
| `useAxios` hook (`{ data, loading, error }`) | Exists but rarely used |
| Axios response interceptor | Catches `ERR_NETWORK`/CORS errors but **handler body is empty** |

### Offline Handling

- `NetworkHandler` component listens to `online`/`offline` browser events
- Redirects to `/no-internet` page on disconnect
- `NoInternet.jsx` page with retry option

### UX Risk Areas

| Risk | Severity | Details |
|------|----------|---------|
| **No global error boundary** | High | App crash = white screen |
| **Empty axios error interceptor** | High | Network/CORS errors silently swallowed |
| **No code-splitting** | Medium | All pages eagerly imported — large initial bundle |
| **sessionStorage PIN auth** | Medium | Tab close = re-authenticate |
| **No loading/error consistency** | Medium | Different spinners, error messages, or none at all across pages |
| **Ambiguous `/:hotelSlug` route** | Medium | Any single-segment URL hits the catch-all portal page |
| **localStorage drift** | Medium | `usePermissions` and `api.js` read localStorage directly; stale data possible if context updates aren't synced |
| **Duplicate providers** | Low | 5 providers mounted twice — outer shadows inner, wastes memory |
| **Guest token no expiry** | Low | `hotelmate_guest_chat_session` in localStorage never expires |
| **Refresh on guest pages** | Low | No centralized guest state means page refresh may lose context |

---

## 9. Code Structure & Maintainability

### Main Directories

| Directory | Purpose | Files |
|-----------|---------|-------|
| `src/components/` | UI components (25 subfolders) | Feature-grouped |
| `src/pages/` | Route-level page components | 14 subfolders |
| `src/services/` | API service layer | 17 files |
| `src/realtime/` | Centralized Pusher + event bus + stores | Well-organized |
| `src/staff_chat/` | Self-contained chat module | 30 components, 15+ hooks |
| `src/context/` | React contexts | 8 contexts |
| `src/hooks/` | Shared hooks | 31 files |
| `src/features/` | Feature modules (attendance, bookings, faceAttendance, staffProfile) | Newer pattern |
| `src/lib/` | Shared libraries | Just `pusher/channels.js` |
| `src/config/` | App config | `customIcons.js`, `navigationCategories.js` |
| `src/types/` | Type definitions | `bookingFilters.js`, `presets.js`, `sectionEditor.js` |
| `src/utils/` | Utilities | 18 files |
| `src/styles/` | Global CSS | Presets and theme styles |
| `src/games/` | Guest games | Whack-a-mole, memory match, quiz |
| `src/policy/` | Layout/access policies | `layoutPolicy.js`, `staffAccessPolicy.js` |

### Naming Confusions

| Confusion | Details |
|-----------|---------|
| `components/guests/` vs `components/guest/` | Plural = staff-side guest management, singular = guest-facing components |
| `components/sections/` vs `pages/sections/` vs `src/sections/` | Three "sections" directories at different levels |
| `components/chat/` vs `staff_chat/` | Two separate chat UI systems — guest-to-staff vs staff-to-staff |
| `pages/chat/` vs `pages/GuestChatPortal.jsx` | Chat page directories at multiple levels |

### Separation of Concerns

| Area | Assessment |
|------|-----------|
| **Realtime layer** | **Good** — well-architected centralized event bus with clean domain separation |
| **API services** | **Good** — dedicated service files per domain, clean axios instance management |
| **State management** | **Mixed** — well-structured stores but duplicated providers and localStorage/context drift |
| **Routing** | **Messy** — 100+ routes in a single App.jsx with inconsistent patterns |
| **Permissions** | **Scattered** — `staffAccessPolicy` exists but isn't wired, inline `isStaff` checks throughout |
| **Styles** | **Mixed** — CSS variables via theme system but per-component inline styles also common |
| **Error handling** | **Poor** — no consistent pattern, no shared error/loading components |

---

## 10. Summary Tables

### Top 5 Frontend Strengths

| # | Strength | Details |
|---|----------|---------|
| 1 | **Centralized realtime architecture** | `realtimeClient` → `channelRegistry` → `eventBus` → domain stores is a clean, scalable pattern with event deduplication |
| 2 | **Dynamic page builder** | Fully data-driven section rendering with position ordering, style variants, and inline staff editing |
| 3 | **Backend-authoritative permissions** | `navigation_items[]` and `allowed_navs[]` come from the backend, avoiding hardcoded permission lists |
| 4 | **Domain store pattern** | `useReducer` + dual Context (state/dispatch) in `src/realtime/stores/` provides predictable state updates per domain |
| 5 | **Comprehensive staff chat** | Self-contained module (`src/staff_chat/`) with 30+ components including reactions, file uploads, read receipts, group chat |

### Top 5 Frontend Weaknesses

| # | Weakness | Impact | Files |
|---|----------|--------|-------|
| 1 | **No global ErrorBoundary** | Unhandled errors crash entire app with no recovery | `src/App.jsx` |
| 2 | **5 duplicate context providers** | Outer providers shadow inner ones in `RealtimeProvider`, causing potential state confusion and wasted renders | `src/App.jsx` provider tree |
| 3 | **No route-level permission guards** | `ProtectedRoute` only checks login; any authenticated user can access any staff route by URL. `staffAccessPolicy` mappings exist but aren't wired. | `src/components/auth/ProtectedRoute.jsx`, `src/policy/staffAccessPolicy.js` |
| 4 | **No code-splitting** | All 100+ page components eagerly imported in App.jsx — large initial bundle, slow first load | `src/App.jsx` imports |
| 5 | **Auth state reads from localStorage directly** | `usePermissions()` and `api.js` interceptor bypass `AuthContext`, risking stale/inconsistent permission data | `src/hooks/usePermissions.js`, `src/services/api.js` |

### Additional Notable Risks

| Risk | Severity |
|------|----------|
| Multiple independent Pusher instances (not migrated to singleton) | Medium |
| Legacy WebSocket hooks coexist with Pusher for order data | Medium |
| No shared loading/error UI components — each page reinvents | Medium |
| Empty axios response error interceptor (network errors silently fail) | Medium |
| Inconsistent route parameter naming (`:hotelSlug` vs `:hotel_slug` vs `:hotelIdentifier` vs `:slug`) | Low |
| Fragmented notification logic across 4 separate subsystems | Low |
| Guest chat session in localStorage has no expiration | Low |
