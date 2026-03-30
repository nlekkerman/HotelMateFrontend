# HotelMate Frontend — Complete System Overview

> Generated from actual codebase inspection. Based on code at `hotelmate-frontend/src/`.

---

## 1. Frontend System Overview

### Main App Areas/Modules

| Area | Description |
|------|-------------|
| **Public pages** | Hotel landing, hotel public page (section-builder driven), restaurant pages, "good to know" pages |
| **Auth** | Login, registration (QR-code/token-based), password reset, logout |
| **Staff dashboard** | Feed/home, reception, room list, bookings, guest list, room service, breakfast, menus, chat, attendance, housekeeping, maintenance, hotel info, stock tracker, settings, super user |
| **Guest portal** | Room booking flow, booking status page, pre-check-in, post-stay survey, guest chat, room service ordering, breakfast ordering, dinner booking |
| **Games** | Memory game, quiz game, Whack-a-Mole, ShootAR (entertainment/engagement modules) |
| **Staff chat** | Internal staff-to-staff messaging overlay (MessengerWidget) |

### Routing Structure

Routes are defined as config objects in `src/routes/`, assembled in `buildRoutes()`:

| File | Scope | Count | Protection |
|------|-------|-------|------------|
| [authRoutes.jsx](hotelmate-frontend/src/routes/authRoutes.jsx) | Login, register, password reset | 7 | None |
| [publicRoutes.jsx](hotelmate-frontend/src/routes/publicRoutes.jsx) | Landing, hotel pages, catch-alls | 8 | None |
| [staffRoutes.jsx](hotelmate-frontend/src/routes/staffRoutes.jsx) | All staff-authenticated pages | ~55 | `ProtectedRoute` with `mode: "staff"` + `requiredSlug` |
| [guestRoutes.jsx](hotelmate-frontend/src/routes/guestRoutes.jsx) | Guest services, booking flow, face clock-in | ~16 | None (own auth mechanisms) |
| [gameRoutes.jsx](hotelmate-frontend/src/routes/gameRoutes.jsx) | Game pages | ~5 | `ProtectedRoute` |

Order matters: auth → public-early → staff → guest → games → public-late (catch-all `/:hotelSlug` and `*`).

### State Management Shape

**No Redux.** The app uses:

1. **React Context + useReducer** — 9 realtime domain stores (chat, guest chat, attendance, rooms, room service, room bookings, service bookings, housekeeping, notifications, gallery placeholder)
2. **React Context** — Auth, Theme, Presets, UI, ChartPreferences, BookingNotification, RoomServiceNotification, ChatContext, StaffChatContext, MessengerContext
3. **TanStack React Query** — Server state caching for API data (bookings, staff, rooms, hotel settings, etc.)
4. **localStorage** — Auth persistence (`user`, `viewMode`, `selectedHotel`), game tokens, booking hold data, theme
5. **Module-level bridge** — `lib/authStore.js` bridges React auth state to non-React code (axios interceptors, Pusher auth)

### API Client Structure

Six axios instances defined in [api.js](hotelmate-frontend/src/services/api.js):

| Instance | Base URL prefix | Auth | Used by |
|----------|----------------|------|---------|
| `api` | `/api/` | Token header + `X-Hotel-ID` + `X-Hotel-Slug` | Staff authenticated calls |
| `publicAPI` | `/api/public/` | None | Public hotel pages, booking flow |
| `staffAuthAPI` | `/api/` | None (manual) | Login/register |
| `guestAPI` | `/api/guest/` | Guest token as query param | Guest services |
| `guestBaseAPI` | `/api/` | None | Guest base (breakfast, dinner) |

Platform detection: native (Capacitor) uses `VITE_API_URL`, web uses `VITE_API_BASE_URL`.

### Realtime Architecture Overview

**Pusher (pusher-js)** is the core realtime transport. Two client types:

- **Staff singleton** ([realtimeClient.js](hotelmate-frontend/src/realtime/realtimeClient.js)) — Token auth via `/pusher/auth` endpoint
- **Guest per-session** ([guestRealtimeClient.js](hotelmate-frontend/src/realtime/guestRealtimeClient.js)) — Bootstrap-provided auth

Flow: `Pusher event → channelRegistry → eventBus (normalize + deduplicate) → domain store dispatch → UI re-render`

Additionally: **Firebase Cloud Messaging** for push notifications, and two standalone **WebSocket** hooks (`useOrdersWebSocket`, `useOrderCountWebSocket`) for order count streaming.

---

## 2. Main User Types and UI Surfaces

### Super Admin (`is_superuser`)

- **SuperUser page** (`/super-user`): Hotel creation form, auto-bootstraps public page + default room types + navigation items
- Bypasses all permission checks (both route access and navigation visibility)
- Can access all staff routes
- Can manually trigger bootstrap operations on existing hotels

### Hotel Admin (`super_staff_admin` / `staff_admin`)

- **Settings** (`/staff/:hotelSlug/settings`): Theme configuration, staff registration packages
- **Staff management** (`/:hotelSlug/staff/`): Staff directory, create staff, edit staff details, per-staff navigation permission manager
- **Booking management dashboard** (`/staff/hotel/:hotelSlug/booking-management`): Cancellation policy config, checkout time config, approval cutoff config, pre-check-in requirements config, survey requirements config
- All other staff screens (rooms, bookings, room service, attendance, etc.)

### Staff User (regular staff)

- **Feed** (`/staff/:hotelSlug/feed`): Home dashboard
- **Own profile** (`/:hotelSlug/staff/me`): Self-service profile view
- Access determined by `allowed_navs` array from backend (per-user navigation permissions)
- Role-based notification eligibility (kitchen staff see room service, F&B staff see bookings, etc.)
- Screens: Reception, Rooms, Room Service, Breakfast, Bookings, Housekeeping, Guests, Maintenance, Chat, Attendance, Hotel Info, Stock Tracker, Menus — all gated by `requiredSlug`

### Guest (token-based, no login)

- **Room booking** (`/:hotelSlug/book`): 4-step flow (availability → room selection → details → payment)
- **Booking status** (`/booking/status/:hotelSlug/:bookingId`): Token-based booking management, cancellation, service access
- **Pre-check-in** (`/guest/hotel/:hotelSlug/precheckin`): Token-based party registration form
- **Post-stay survey** (`/guest/hotel/:hotelSlug/survey`): Dynamic field survey
- **Guest chat** (`/guest/chat`): Token-based chat with staff via Pusher
- **Room service** (`/room_services/:hotelIdentifier/room/:roomNumber/menu`): Menu browsing + ordering
- **Breakfast** (`/room_services/:hotelIdentifier/room/:roomNumber/breakfast/`): Breakfast ordering
- **Dinner booking** (`/guest-booking/:hotelSlug/restaurant/:restaurantSlug/`): Restaurant reservation

### Public / Unauthenticated

- **Hotels landing** (`/`): Hotel listing with city/country/type filters
- **Hotel public page** (`/hotel/:slug`): Section-builder driven hotel page
- **Hotel portal** (`/:hotelSlug`): Catch-all hotel entry page
- **Restaurant page** (`/hotels/:hotelSlug/restaurants/:restaurantSlug`)
- **Good to know** (`/good_to_know/:hotel_slug/:slug`)
- **Face clock-in** (`/face/:hotelSlug/clock-in`): Intentionally public — facial recognition IS the auth
- **ShootAR** (`/shootar`): AR game

---

## 3. Auth and Session Handling

### Staff Login Flow

1. User submits username + password to `/staff/login/` via `staffAuthAPI`
2. [useLogin](hotelmate-frontend/src/hooks/useLogin.js) builds a `userToSave` object containing: `id`, `staff_id`, `token`, `hotel_slug`, `is_staff`, `is_superuser`, `access_level`, `isAdmin`, `department`, `role`, `allowed_navs`, `navigation_items`, `profile_image_url`
3. `AuthContext.login(userToSave)` stores to React state + `localStorage.setItem('user', JSON.stringify(...))`
4. `setAuthUser(userToSave)` syncs to module-level `authStore.js` for non-React code
5. Firebase token request + save to server (`/staff/save-fcm-token/`)
6. Navigate to `/staff/${hotel_slug}/feed`

### Auth Persistence

- **Staff**: Full user object in `localStorage` under key `user`. Rehydrated on page load by `AuthProvider` constructor
- **Guest**: Token persisted via `persistGuestToken()` in `guestToken.js`, passed as query param to guest API calls
- **Token format**: `Token <token>` header for staff. Guest token as `?token=RAW_TOKEN` query param
- **No refresh token mechanism**: If token expires, user must re-login. No silent refresh

### Guest Token Flow

Guest enters system via:
1. **Booking flow**: Creates booking → receives `booking_token` in response → stored in `bookingHoldStorage`
2. **Email links**: Token embedded in URL (`/booking/status/:hotelSlug/:bookingId?token=...`)
3. **Pre-check-in link**: Staff sends via `useSendPrecheckinLink` → guest receives URL with token
4. **Chat portal**: `/guest/chat?hotelSlug=X&token=Y` → bootstraps chat session

Token is used for:
- `publicAPI` calls with `token` query param (booking status)
- `guestAPI` calls with token query param
- Chat bootstrap (`GET /api/guest/hotel/{slug}/chat/context?token=RAW_TOKEN`) → returns `chat_session` ID
- Subsequent chat calls use `X-Guest-Chat-Session` header

### Guest Chat Session/Grant Handling

1. `useGuestChat` hook calls `guestChatAPI.getChatBootstrap(hotelSlug, token)` 
2. Backend validates token → returns `{ chat_session, pusher_key, pusher_cluster, pusher_auth_endpoint, booking_channel, events }`
3. Frontend validates all required fields present in bootstrap response
4. Creates guest Pusher client with bootstrap-provided config
5. Subscribes to `booking_channel` (pattern: `private-hotel-{slug}-guest-chat-booking-{bookingId}`)
6. Binds to events: `message_created`, `message_read`, `message_deleted`, `message_edited`, `unread_updated`

### Route Guards / Protected Routes

[ProtectedRoute.jsx](hotelmate-frontend/src/components/auth/ProtectedRoute.jsx) implements two layers:

- **Layer 1** (always active): Check `user` exists in `useAuth()`. If missing → redirect to `/login`
- **Layer 2** (when `mode="staff"` AND `ENABLE_ROUTE_PERMISSIONS` flag is `true`): Calls `canAccessStaffPath()` from [staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js)
  - Maps route patterns to required nav slugs (21 entries)
  - Superuser bypasses all
  - Admin-only routes gated to `super_staff_admin`
  - Regular staff checked against `allowed_navs` array
  - **Deny by default** for unmapped routes
  - Redirects unauthorized to `/reception`

Guest routes have **no ProtectedRoute wrapper** — they use their own token-based auth.

### Hotel Context Derivation

- **Staff**: `user.hotel_slug` from login response. Used to parameterize all staff API URLs
- **URL params**: Many routes have `:hotelSlug` in path, read via `useParams()`
- **Selected hotel**: `AuthContext.selectedHotel` for multi-hotel browsing (stored in localStorage)
- **Hotel data**: `useHotel()` fetches from `/staff/hotel/${user.hotel_slug}/me/`

### Auth Confusion / Dangerous Mixing

1. **`useHotelRealtime.js` creates its own Pusher instance** separate from the centralized `realtimeClient.js` — marked with TODO for migration. Risk: two Pusher connections with staff auth
2. **`usePusher.js` in staff_chat** also creates its own Pusher instance — legacy, deprecated `PusherProvider.jsx` still exists
3. **`guestBaseAPI` has no auth at all** — used for breakfast orders and dinner bookings without any token. Security relies entirely on URL knowledge (room number + hotel identifier)
4. **`getAuthUser()` has localStorage fallback** — if `authStore._user` is null (race condition), reads from `localStorage`. This is a safety net but can serve stale data
5. **ChatWindow.jsx handles both staff and guest** — detects guest mode by `isGuest = !userId`. This dual-mode component mixes staff API (`buildStaffURL`) and guest store in one file

---

## 4. Frontend Domain Areas

### Hotel Setup

| Component | Path | Description |
|-----------|------|-------------|
| [SuperUser.jsx](hotelmate-frontend/src/pages/SuperUser.jsx) | `/super-user` | Hotel creation form + bootstrap (public page + room types + nav items) |
| [SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx) | `/staff/:hotelSlug/section-editor` | Public page builder |
| [HotelPublicPage.jsx](hotelmate-frontend/src/pages/hotels/HotelPublicPage.jsx) | `/hotel/:slug` | Renders section-builder output |
| [Settings.jsx](hotelmate-frontend/src/components/utils/Settings.jsx) | `/staff/:hotelSlug/settings` | Theme + staff registration config |
| [HotelInfo.jsx](hotelmate-frontend/src/pages/hotel_info/HotelInfo.jsx) | `/hotel_info/:hotel_slug` | Hotel information management |

**API**: `sectionEditorApi.js` (section CRUD), `publicApi.js` (public read), `themeService.js` (theme CRUD)  
**Hooks**: `useHotelTheme`, `useHotelLogo`, `useHotelGalleries`  
**Stores**: None — uses React Query

### Staff/User Onboarding

| Component | Description |
|-----------|-------------|
| [Register.jsx](hotelmate-frontend/src/components/auth/Register.jsx) | QR-token-based registration: `POST /staff/register/` |
| [RegistrationSuccess.jsx](hotelmate-frontend/src/components/auth/RegistrationSuccess.jsx) | Post-registration display (manager approval required) |
| [StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx) | Admin creates/approves staff: pending registrations, dept/role/access assignment, nav permissions |
| [NavigationPermissionManager.jsx](hotelmate-frontend/src/components/staff/NavigationPermissionManager.jsx) | Per-staff checkbox UI for navigation item access |

**API**: `staffAuthAPI.post('/staff/register/')`, `api.get('/staff/{slug}/pending-registrations/')`  
**Hooks**: `useStaffMetadata` (departments, roles, access levels)

### Rooms

| Component | Path | Description |
|-----------|------|-------------|
| [RoomList.jsx](hotelmate-frontend/src/components/rooms/RoomList.jsx) | `/rooms` | Room grid with status filters, realtime via `roomsStore` |
| [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx) | `/room-management/:hotelIdentifier/room/:roomNumber` | Full room operations: checkout, housekeeping, inspection, manager override |
| [RoomCard.jsx](hotelmate-frontend/src/components/rooms/RoomCard.jsx) | — | Room card with quick action buttons |
| [HousekeepingRooms.jsx](hotelmate-frontend/src/pages/housekeeping/HousekeepingRooms.jsx) | `/staff/hotel/:hotelSlug/housekeeping` | Housekeeping dashboard with 8 status filters |
| [HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx) | `.../housekeeping/rooms/:roomNumber` | Housekeeping-specific room detail |

**API**: `roomOperations.js` (turnover workflow, bulk check-in/out, room move)  
**Hooks**: `useRoomsState()`, `useRoomsDispatch()` from realtime store  
**Stores**: `roomsStore.jsx` (realtime room status), `housekeepingStore.jsx` (counts derived from roomsStore)

### Bookings

**Staff-facing:**

| Component | Path | Description |
|-----------|------|-------------|
| [BookingList.jsx](hotelmate-frontend/src/components/staff/bookings/BookingList.jsx) | `/staff/hotel/:hotelSlug/room-bookings` | Main staff booking list with canonical FilterSet backend, bucketed navigation, search, advanced filters |
| [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx) | (modal) | Room assignment, check-in/out, overstay management, pre-check-in summary |
| [BookingManagementDashboard.jsx](hotelmate-frontend/src/components/bookings/BookingManagementDashboard.jsx) | `/staff/hotel/:hotelSlug/booking-management` | Config: cancellation policy, checkout time, approval cutoff, pre-check-in, survey |
| [Bookings.jsx](hotelmate-frontend/src/components/bookings/Bookings.jsx) | `/bookings` | Restaurant/service booking categories |
| [RestaurantBookings.jsx](hotelmate-frontend/src/components/bookings/RestaurantBookings.jsx) | — | Restaurant booking list |
| [BookingsGrid.jsx](hotelmate-frontend/src/components/bookings/BookingsGrid.jsx) | — | Timeline grid with drag-drop table assignment |

**Guest-facing:**

| Component | Path | Description |
|-----------|------|-------------|
| [GuestRoomBookingPage.jsx](hotelmate-frontend/src/pages/bookings/GuestRoomBookingPage.jsx) | `/:hotelSlug/book` | 4-step booking: availability → room → details → payment. Hold system with countdown |
| [BookingStatusPage.jsx](hotelmate-frontend/src/pages/bookings/BookingStatusPage.jsx) | `/booking/status/:hotelSlug/:bookingId` | Token-based booking view, cancellation, service links |
| [BookingConfirmation.jsx](hotelmate-frontend/src/pages/bookings/BookingConfirmation.jsx) | `/booking/confirmation/:bookingId` | Confirmation display |
| [BookingPaymentSuccess.jsx](hotelmate-frontend/src/pages/bookings/BookingPaymentSuccess.jsx) | `/booking/:hotelSlug/payment/success` | Stripe redirect → status polling (3s × 100 attempts) |
| [BookingPaymentCancel.jsx](hotelmate-frontend/src/pages/bookings/BookingPaymentCancel.jsx) | `/booking/:hotelSlug/payment/cancel` | Payment cancelled page |

**API**: `api.js` (`staffBookingService` — accept, decline, send pre-check-in link), `publicAPI` (availability, pricing quote, booking creation)  
**Hooks**: `useStaffRoomBookings` (list with URL-driven filters), `useStaffRoomBookingDetail` (single booking + mutations), `useExpiredBookingHandler`, `useBookingTimeWarnings`  
**Stores**: `roomBookingStore.jsx` (realtime booking events), `serviceBookingStore.jsx` (restaurant bookings)

### Guest Portal

| Component | Description |
|-----------|-------------|
| [HotelPortalPage.jsx](hotelmate-frontend/src/pages/HotelPortalPage.jsx) | Public hotel entry (`/:hotelSlug`) with theme + realtime |
| [BookingStatusPage.jsx](hotelmate-frontend/src/pages/bookings/BookingStatusPage.jsx) | Guest's booking management page |
| [GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx) | Pre-check-in form with party management |
| [GuestSurveyPage.jsx](hotelmate-frontend/src/pages/guest/GuestSurveyPage.jsx) | Post-stay dynamic survey |
| [RoomService.jsx](hotelmate-frontend/src/components/rooms/RoomService.jsx) | Guest room service ordering |
| [Breakfast.jsx](hotelmate-frontend/src/components/rooms/Breakfast.jsx) | Guest breakfast ordering |

**Hooks**: `usePrecheckinData`, `usePrecheckinForm`, `useSurveyData`, `useSurveyForm`

### Guest Chat

| Component | Description |
|-----------|-------------|
| [GuestChatPortal.jsx](hotelmate-frontend/src/pages/GuestChatPortal.jsx) | Route entry: `/guest/chat` |
| [GuestChatWidget.jsx](hotelmate-frontend/src/components/guest/GuestChatWidget.jsx) | Full chat widget: message list, input, connection status, dev debug panel |

**API**: `guestChatAPI.js` (bootstrap, messages, send, mark read)  
**Hooks**: `useGuestChat` (full lifecycle: bootstrap → fetch → Pusher → send → dedup)  
**Stores**: `guestChatStore.jsx` (guest-side conversation state)

### Staff Chat

| Component | Description |
|-----------|-------------|
| [MessengerWidget.jsx](hotelmate-frontend/src/staff_chat/components/MessengerWidget.jsx) | Floating overlay rendered in App.jsx |
| [StaffChatContainer.jsx](hotelmate-frontend/src/staff_chat/components/StaffChatContainer.jsx) | Main chat container |
| [ConversationsList.jsx](hotelmate-frontend/src/staff_chat/components/ConversationsList.jsx) | Conversation sidebar |
| [ConversationView.jsx](hotelmate-frontend/src/staff_chat/components/ConversationView.jsx) | Message view |
| [ChatWindowPopup.jsx](hotelmate-frontend/src/staff_chat/components/ChatWindowPopup.jsx) | Detached chat popup |

**API**: `staff_chat/services/staffChatApi.js` (conversations CRUD, messages, reactions, file upload, mark read)  
**Hooks**: `useStaffChatRealtime`, `useConversations`, `useSendMessage`  
**Context**: `StaffChatContext.jsx`, `MessengerContext.jsx`  
**Stores**: `chatStore.jsx` (single source of truth for staff conversations)

### Staff Chat (Room Conversations — Staff ↔ Guest)

| Component | Description |
|-----------|-------------|
| [ChatHomePage.jsx](hotelmate-frontend/src/pages/chat/ChatHomePage.jsx) | `/hotel/:hotelSlug/chat` — staff-side room conversation view |
| [ChatSidebar.jsx](hotelmate-frontend/src/components/chat/ChatSidebar.jsx) | Conversation list showing guest name, room, unread |
| [ChatWindow.jsx](hotelmate-frontend/src/components/chat/ChatWindow.jsx) | **Dual-mode**: staff or guest chat window |

**API**: `roomConversationsAPI.js` (fetch conversations, messages, send, mark read)  
**Context**: `ChatContext.jsx` (single source of truth derived from chatStore + guestChatStore)

### Operations / Incidents / Overstays

| Component | Description |
|-----------|-------------|
| [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx) | Overstay management: acknowledge, extend by nights/date |
| [useBookingTimeWarnings.js](hotelmate-frontend/src/hooks/useBookingTimeWarnings.js) | Approval warnings (DUE_SOON/OVERDUE/CRITICAL) + overstay warnings |
| [Maintenance.jsx](hotelmate-frontend/src/pages/maintenance/Maintenance.jsx) | Maintenance request submission + list |
| `staffOverstayAPI` in [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `getOverstayStatus`, `acknowledgeOverstay`, `extendOverstay` |

**Pusher events**: `booking_overstay_flagged`, `booking_overstay_acknowledged`, `booking_overstay_extended` on `{hotelSlug}-staff-overstays` channel

### Analytics / Reporting

| Component | Description |
|-----------|-------------|
| [RosterAnalytics.jsx](hotelmate-frontend/src/components/analytics/RosterAnalytics.jsx) | KPIs, staff/dept summary, daily/weekly totals |
| [ClockedInTicker.jsx](hotelmate-frontend/src/components/analytics/ClockedInTicker.jsx) | Live clocked-in staff timeline |
| [DownloadRosters.jsx](hotelmate-frontend/src/components/analytics/DownloadRosters.jsx) | PDF export for daily/weekly rosters |
| [StockDashboard.jsx](hotelmate-frontend/src/pages/stock_tracker/StockDashboard.jsx) | Stock tracker main dashboard |
| Stock tracker pages (Analytics, Operations, Items, Profitability, Movements, Stocktakes, Periods, Sales) | Full inventory analytics suite |

**API**: `analytics.js` (attendance KPIs), `stockAnalytics.js` (stock KPIs/trends/variance), `salesAnalytics.js` (sales CRUD + analysis)

---

## 5. Booking Lifecycle in Frontend

### Where Booking Is Created

[GuestRoomBookingPage.jsx](hotelmate-frontend/src/pages/bookings/GuestRoomBookingPage.jsx) — 4-step wizard:

1. **Availability** — `publicAPI.get('/hotel/{slug}/room-bookings/availability/')` with check-in/check-out dates
2. **Room Selection** — Guest picks room type → `publicAPI.post('/hotel/{slug}/room-bookings/pricing/quote/')` for pricing
3. **Details** — Guest fills name, email, phone. Supports `SELF` and `THIRD_PARTY` booker types
4. **Payment** — `publicAPI.post('/hotel/{slug}/room-bookings/')` creates booking → Stripe redirect or direct confirmation

Hold system: Booking starts as a "hold" with `expires_at` countdown. `useExpiredBookingHandler` detects expiry and offers restart. Hold data persisted in `bookingHoldStorage`.

### Where Bookings Are Listed

| View | Component | Data Source |
|------|-----------|-------------|
| Staff booking list | [BookingList.jsx](hotelmate-frontend/src/components/staff/bookings/BookingList.jsx) | `useStaffRoomBookings` hook → `buildStaffURL(slug, 'room-bookings', '/?params')` with backend FilterSet |
| Restaurant bookings | [RestaurantBookings.jsx](hotelmate-frontend/src/components/bookings/RestaurantBookings.jsx) | `api.get('/bookings/bookings/')` + `serviceBookingStore` realtime overlay |
| Guest booking status | [BookingStatusPage.jsx](hotelmate-frontend/src/pages/bookings/BookingStatusPage.jsx) | `publicAPI.get('/hotel/{slug}/room-bookings/{id}/')` with token |

### Where Details Are Shown

- **Staff modal**: [BookingDetailsModal.jsx](hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx) — Full CRUD: room assignment, check-in/out, overstay, pre-check-in summary, survey status, time controls
- **Guest page**: [BookingStatusPage.jsx](hotelmate-frontend/src/pages/bookings/BookingStatusPage.jsx) — Read view: booking info, dates, room type, status, cancellation option, service links

### How Statuses Are Displayed

`BookingStatusBadges.jsx` renders contextual badges. `BookingTimeWarningBadges.jsx` adds time-based warnings. Statuses observed in code:

| Status | Context |
|--------|---------|
| `DRAFT` / `PENDING_PAYMENT` / `CANCELLED_DRAFT` | Non-operational (filtered from realtime store) |
| `PENDING_APPROVAL` | Requires staff action, approval cutoff warnings |
| `CONFIRMED` | Approved booking |
| `CHECKED_IN` | Guest in house |
| `CHECKED_OUT` | Completed stay |
| `CANCELLED` | Cancelled by guest or staff |
| `NO_SHOW` | Inferred from context |

### How Transitions Are Triggered

| Transition | Where | API |
|------------|-------|-----|
| Create → Pending Payment | `GuestRoomBookingPage` | `publicAPI.post('/hotel/{slug}/room-bookings/')` |
| Payment → Pending Approval | Stripe webhook (backend) | N/A (frontend polls) |
| Accept/Confirm | `BookingList` accept action | `staffBookingService.acceptRoomBooking(hotelSlug, bookingId)` |
| Decline | `BookingList` | `staffBookingService.declineRoomBooking(hotelSlug, bookingId)` |
| Cancel (guest) | `BookingStatusPage` cancellation modal | `publicAPI.post('/hotel/{slug}/room-bookings/{id}/cancel/')` |
| Check-in | `BookingDetailsModal` | `useCheckInBooking` mutation → `buildStaffURL + '/check-in/'` |
| Check-out | `BookingDetailsModal` | `useCheckOutBooking` mutation → `buildStaffURL + '/check-out/'` |
| Bulk check-in/out | `RoomDetails` | `roomOperations.checkinGuests()` / `checkoutGuests()` → bulk POST |
| Room assignment | `BookingDetailsModal` | `useSafeAssignRoom` → `buildStaffURL + '/assign-room/'` |
| Overstay acknowledge | `BookingDetailsModal` | `staffOverstayAPI.acknowledgeOverstay()` |
| Overstay extend | `BookingDetailsModal` | `staffOverstayAPI.extendOverstay()` |

### How Check-in/Check-out Is Handled

**Check-in**: `useCheckInBooking` mutation, also available as bulk via `roomOperations.checkinGuests(hotelSlug, bookingIds)`. Pre-check-in link can be sent to guest via `useSendPrecheckinLink`. Guest fills pre-check-in form → staff sees pre-check-in summary in booking modal.

**Check-out**: `useCheckOutBooking` mutation, bulk via `roomOperations.checkoutGuests(hotelSlug, bookingIds)`. Individual room checkout in `RoomDetails.jsx`.

### How Guest-Visible Booking State Is Exposed

[BookingStatusPage.jsx](hotelmate-frontend/src/pages/bookings/BookingStatusPage.jsx):
- Reads booking via `publicAPI.get(...)` with token query param
- Displays status, dates, room type, guest details
- Shows service links when status is `CHECKED_IN` (room service, breakfast, chat)
- Cancellation available for non-terminal statuses

### How Realtime Updates Affect UI

- `roomBookingStore.jsx` receives Pusher events on `{hotelSlug}.room-bookings` channel
- Events: `booking_created`, `booking_updated`, `booking_confirmed`, `booking_cancelled`, `booking_checked_in`, `booking_checked_out`, `booking_payment_required`, `booking_party_updated`, `booking_overstay_*`
- Store filters out `NON_OPERATIONAL_STATUSES` (DRAFT, PENDING_PAYMENT, CANCELLED_DRAFT)
- **React Query cache invalidation** triggered on booking events
- `useStaffRoomBookings` also has 3-second polling for `PENDING_PAYMENT` / `PENDING_APPROVAL` buckets
- `BookingPaymentSuccess` polls booking status every 3 seconds after Stripe redirect (up to 100 attempts)

---

## 6. Guest Lifecycle in Frontend

### How Guest Enters the System

1. **Public hotel page** (`/:hotelSlug`) → clicks "Book" → `GuestRoomBookingPage`
2. **Direct booking link** (`/:hotelSlug/book`)
3. **Email link with token** → `BookingStatusPage`, `GuestPrecheckinPage`, `GuestSurveyPage`
4. **QR code scan** → room service, breakfast, dinner booking routes

### How Booking/Token Is Read

- Booking flow uses `publicAPI` (no auth needed for availability/pricing)
- Booking creation returns `booking_token` or token in URL
- `BookingStatusPage` reads token from URL query params
- `GuestPrecheckinPage` reads token from `?token=` query param
- Token validated by backend — frontend handles error states: `missing_token`, `invalid_token`, `token_used`, `token_revoked`, `token_expired`

### How Guest Status Page Works

[BookingStatusPage.jsx](hotelmate-frontend/src/pages/bookings/BookingStatusPage.jsx):
- Fetches booking with token
- Shows booking details, status badge, dates, room type
- When `CHECKED_IN`: shows links to room service menu, breakfast, chat
- Cancellation modal with policy display
- No automatic refresh — manual reload needed (no realtime subscription on this page)

### How Guest Chat Is Bootstrapped

1. Guest navigates to `/guest/chat?hotelSlug=X&token=Y`
2. [GuestChatPortal.jsx](hotelmate-frontend/src/pages/GuestChatPortal.jsx) renders `GuestChatWidget`
3. `useGuestChat` calls `guestChatAPI.getChatBootstrap(hotelSlug, token)` → backend returns:
   - `chat_session`, `pusher_key`, `pusher_cluster`, `pusher_auth_endpoint`, `booking_channel`, `events`
4. Frontend validates all required fields in bootstrap response
5. Fetches initial messages: `guestChatAPI.getMessages()`
6. Creates guest Pusher client via `getOrCreateGuestClient(bootstrapData)`
7. Subscribes to `booking_channel`, binds to `message_created`, `message_read`, `message_deleted`, `message_edited`, `unread_updated`
8. Optimistic message sending with `client_message_id` (UUID) for deduplication

### How Guest Service Actions Are Made

| Action | Route | API |
|--------|-------|-----|
| Order room service | `/room_services/:hotelId/room/:roomNumber/menu` | `guestAPI.post('/hotels/{hotelId}/room-services/orders/')` |
| Order breakfast | `/room_services/:hotelId/room/:roomNumber/breakfast/` | `guestBaseAPI.post('/room_services/{hotelId}/breakfast-orders/')` |
| Book dinner | `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/` | `guestBaseAPI.post('/bookings/guest-booking/...')` |
| Submit pre-check-in | `/guest/hotel/:hotelSlug/precheckin?token=` | `publicAPI.post(...)` |
| Submit survey | `/guest/hotel/:hotelSlug/survey?token=` | Via `useSurveyForm` |
| Cancel booking | `BookingStatusPage` | `publicAPI.post('/hotel/{slug}/room-bookings/{id}/cancel/')` |

### Backend Contract Dependencies

- **Chat bootstrap contract**: `guestChatAPI.js` explicitly validates 6 required fields from backend
- **Pre-check-in**: Dynamic field registry from backend determines which fields are shown
- **Survey**: Dynamic field types (rating, textarea, checkbox, select, date, text) driven by backend config
- **Booking availability/pricing**: Fully backend-driven
- **Room service menu**: Menu structure from backend

### Fragile/Duplicated Points

1. **`guestBaseAPI` has no auth** — breakfast and dinner booking depend entirely on URL knowledge for security
2. **Booking token delivery is implicit** — frontend assumes token will be in URL, no standardized token storage/retrieval
3. **BookingStatusPage has no realtime** — guest must manually refresh to see status changes
4. **Dual booking routes**: `/:hotelSlug/book` AND `/booking/:hotelSlug` both render `GuestRoomBookingPage`
5. **ChatWindow.jsx is dual-mode** (staff + guest) — complex `isGuest` branching
6. **Guest room service uses `guestAPI`** but breakfast uses `guestBaseAPI`** — inconsistent auth approach

---

## 7. API Integration Overview

### Service Files

| File | Domain | Auth | Endpoints | Notes |
|------|--------|------|-----------|-------|
| [api.js](hotelmate-frontend/src/services/api.js) | Core + staff operations | Token | Staff URLs, public hotel page, booking service, cancellation policy | Houses 5 axios instances + helpers |
| [publicApi.js](hotelmate-frontend/src/services/publicApi.js) | Public data | None | Hotels list, filter options, hotel page, presets | Clean public-only |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | Sections + overstay | Token | Public page builder CRUD, overstay management | |
| [guestChatAPI.js](hotelmate-frontend/src/services/guestChatAPI.js) | Guest chat | Guest token → session header | Chat bootstrap, messages, send, mark read | Locked backend contract |
| [roomConversationsAPI.js](hotelmate-frontend/src/services/roomConversationsAPI.js) | Staff ↔ guest chat | Token | Room conversations CRUD, messages, mark read | Staff-only |
| [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) | Room management | Token | Housekeeping status, turnover workflow, bulk check-in/out, room move | |
| [analytics.js](hotelmate-frontend/src/services/analytics.js) | Attendance analytics | Token | KPIs, staff/dept summary, daily/weekly totals | Staff-only |
| [salesAnalytics.js](hotelmate-frontend/src/services/salesAnalytics.js) | Stock sales | Token | Sales CRUD, analysis | Has deprecated endpoint |
| [stockAnalytics.js](hotelmate-frontend/src/services/stockAnalytics.js) | Stock analytics | Token | KPIs, trends, variance, profitability | Staff-only |
| [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | Page builder | Token | Sections, heroes, galleries, lists, news | **Duplicates `buildStaffURL`** as `buildSectionURL` |
| [shiftLocations.js](hotelmate-frontend/src/services/shiftLocations.js) | Attendance | Token | Shift locations CRUD | Staff-only |
| [themeService.js](hotelmate-frontend/src/services/themeService.js) | Theme | Token | Hotel settings fetch/update | **Overlaps with `cancellationPolicyService.getHotelSettings`** |
| [presetsService.js](hotelmate-frontend/src/services/presetsService.js) | Presets | Public | Presets fetch with in-memory cache | |
| [FirebaseService.js](hotelmate-frontend/src/services/FirebaseService.js) | Push notifications | Token | FCM token save | Class-based singleton |
| [memoryGameAPI.js](hotelmate-frontend/src/services/memoryGameAPI.js) | Games | Token + public fallback | Game sessions, leaderboard, achievements | Cloudinary images |
| [quizGameAPI.js](hotelmate-frontend/src/services/quizGameAPI.js) | Games | Token | Quiz sessions, tournaments | |
| [staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) | Staff chat | Token | Conversations, messages, reactions, files, mark read | Staff-only |

### Contract Duplication

1. `getHotelPublicPage(slug)` in `api.js` vs `publicHotelPageAPI.getHotelPage(slug)` in `publicApi.js` — same endpoint
2. `cancellationPolicyService.getHotelSettings` in `api.js` vs `themeService.fetchHotelSettings` in `themeService.js` — same endpoint
3. `buildSectionURL` in `sectionEditorApi.js` duplicates `buildStaffURL` in `api.js`

---

## 8. State Management Overview

### React Query Usage

Used for server-state caching across most domain areas:

| Domain | Query Keys |
|--------|------------|
| Rooms | `["rooms"]`, `["room-detail", roomNumber]` |
| Bookings | `["staff-room-bookings", hotelSlug, params]`, `["room-booking-detail", hotelSlug, bookingId]`, `["available-rooms", ...]` |
| Staff | `["staffMetadata", hotelSlug]`, `["staff-list"]` |
| Hotel | `["hotel-me"]` |
| Attendance | `["attendance-kpis", ...]`, `["staff-summary", ...]` |
| Stock | Various by slug |

`staleTime` varies: 5 minutes for metadata/settings, default for most others.

### Local Component State

Many components maintain local state for:
- Form inputs
- Loading/error states per action (especially `RoomDetails.jsx` with per-button loading)
- Optimistic UI overlays before realtime confirmation
- Modal open/close
- Filter/search values

### Zustand / Context / Reducers / Stores

**No Zustand.** All shared state is Context + useReducer:

| Store | State Shape | Source |
|-------|-------------|--------|
| `chatStore` | `{ conversationsById, activeConversationId, totalUnreadOverride }` | API init + Pusher events |
| `guestChatStore` | `{ conversationsById, messagesByConversationId }` | Chat bootstrap + Pusher events |
| `attendanceStore` | `{ staffById, currentUserStatus, byDepartment }` | API init + Pusher events |
| `roomsStore` | `{ byRoomNumber, list }` | API bulk + Pusher events |
| `roomServiceStore` | `{ ordersById, pendingOrders }` | API init + Pusher events |
| `roomBookingStore` | `{ byBookingId, list }` | Pusher events + RQ invalidation |
| `serviceBookingStore` | `{ bookingsById, todaysBookings }` | API init + Pusher events |
| `housekeepingStore` | `{ loading, error, counts }` | Derived from roomsStore |
| `notificationsStore` | `{ items }` (max 200) | Events + window bridge |

### Duplicated State

1. **Chat state**: `ChatContext.jsx` derives from `chatStore` + `guestChatStore` — this is intentional (single source refactored), but the dual-store setup still creates mental overhead
2. **Room data** exists in both `roomsStore` (realtime) AND React Query cache (API fetch) — components choose which to prefer, but drift is possible
3. **Booking data** in `roomBookingStore` (realtime) AND React Query cache — store invalidates RQ on events, but timing gaps exist
4. **Hotel settings** fetched by both `ThemeContext` and `BookingManagementDashboard` independently

### Derived State

- `housekeepingStore.counts` derived from `roomsStore`
- `ChatContext.conversations` derived via `useMemo` from `chatStore.conversationsById`
- `useBookingTimeWarnings` computes approval/overstay warnings from booking data with local timer
- `useNavigation` derives visible nav items from `user.navigation_items` + hide list + category mapping

### Where Realtime Writes Into UI State

Realtime events (Pusher) write into:
- All 9 domain stores via `dispatchRef.current(action)`
- React Query cache invalidation (especially room bookings)
- `notificationsStore` via `window.addNotificationCallback` bridge
- FCM events normalized and routed through same eventBus

### Where Inconsistencies Can Happen

1. **Realtime store vs React Query**: If a Pusher event writes to `roomsStore` but RQ cache hasn't refreshed, components reading from RQ get stale data. The codebase generally prefers store data, but this isn't universal
2. **Booking status polling (3s) + Pusher events**: Both can update booking list — race conditions if poll response arrives after a Pusher event
3. **Hotel settings**: Multiple independent fetchers (ThemeContext, BookingManagementDashboard, cancellationPolicyService) can have different staleness
4. **`guestBaseAPI` calls** (no auth) can succeed/fail differently than `guestAPI` calls for the same user flow
5. **Connection loss**: If Pusher disconnects, stores freeze at last-known state. Only full page refresh or explicit re-fetch restores truth

---

## 9. Realtime Architecture

### Subscription Entry Points

1. **RealtimeManager** (inside `RealtimeProvider`) — subscribes base hotel channels on mount for logged-in staff
2. **StaffChatContext** — subscribes to per-conversation channels dynamically
3. **useGuestChat** — subscribes guest to booking chat channel
4. **useHotelRealtime** — subscribes to `hotel-${hotelSlug}` for settings/gallery (standalone Pusher instance — tech debt)
5. **useOrdersWebSocket** / **useOrderCountWebSocket** — standalone WebSocket connections

### Channels Used

| Channel Pattern | Scope | Events |
|-----------------|-------|--------|
| `{slug}.attendance` | Staff | `clock_in`, `clock_out`, `shift_started`, `shift_ended` |
| `{slug}.room-service` | Staff | `order_created`, `order_updated`, `order_status_changed`, `order_deleted` |
| `{slug}.rooms` | Staff | `room-status-changed`, `room_status_changed`, `room-occupancy-updated`, `room_occupancy_updated`, `room_updated` |
| `{slug}.booking` | Staff | `booking_created`, `booking_updated`, etc. |
| `{slug}.room-bookings` | Staff | `booking_created`, `booking_updated`, `booking_confirmed`, `booking_cancelled`, `booking_checked_in`, `booking_checked_out`, `booking_payment_required`, `booking_party_updated`, `booking_overstay_*` |
| `{slug}-staff-bookings` | Staff | Subscribed but event bindings unclear |
| `{slug}-staff-overstays` | Staff | Overstay-related events |
| `{slug}-guest-messages` | Staff | `new-guest-message` |
| `{slug}.staff-{staffId}-notifications` | Per-staff | Personal notifications |
| `{slug}.staff-chat.{conversationId}` | Dynamic | `realtime_staff_chat_message_created`, `realtime_staff_chat_unread_updated`, `realtime_staff_chat_message_edited`, `realtime_staff_chat_message_deleted` |
| `private-hotel-{slug}-guest-chat-booking-{bookingId}` | Guest (private) | `message_created`, `message_read`, `message_deleted`, `message_edited`, `unread_updated` |
| `hotel-{slug}` | Hotel settings | `settings-updated`, `gallery-image-uploaded`, `gallery-reordered`, `room-type-image-updated` |

### Event Bus / Store Interactions

[eventBus.js](hotelmate-frontend/src/realtime/eventBus.js):
- Normalizes raw events to `{ category, type, payload, meta }` envelope
- Global deduplication via `event_id` Set (LRU, TTL-based cleanup)
- Routes by `category` to domain store action handlers
- FCM events also normalized and routed through same bus

### Invalidation Strategy

- **React Query invalidation**: `roomBookingStore` invalidates `["staff-room-bookings"]` queries on booking events
- **Store dispatch**: Direct state mutations in domain stores
- **No automatic re-fetch**: Most stores rely on event payloads, not re-fetching from API after events
- **Polling fallback**: `useStaffRoomBookings` polls every 3s for payment/approval buckets

### Optimistic Update Patterns

- **Guest chat**: Optimistic message add with `client_message_id`, deduplication on Pusher echo
- **Room service**: Optimistic status transitions in store, confirmed by Pusher event
- **Room status**: Quick actions dispatch locally, Pusher event confirms
- **Booking actions**: Mutations invalidate RQ cache, Pusher event updates store

### Duplication / Ghost / Stale UI Risks

1. **Dual Pusher instances**: `useHotelRealtime` creates standalone Pusher connection alongside `realtimeClient` singleton
2. **Legacy `usePusher` in staff_chat**: Creates third Pusher instance (deprecated but present)
3. **Event name inconsistency**: `room-status-changed` vs `room_status_changed` (both bound, same handler) — suggests backend inconsistency at some point
4. **Channel `{slug}-staff-bookings`**: Subscribed but unclear event handling — potential dead subscription
5. **Guest BookingStatusPage has no realtime**: Guest sees stale data until manual refresh
6. **WebSocket + Pusher overlap**: Order count uses WebSocket while everything else uses Pusher — dual transport

---

## 10. UX / Product Flow Strengths

### Operational Flows
- **Housekeeping turnover workflow** is well-designed: checkout-dirty → cleaning → cleaned → inspection → ready, with manager override capability. Status-driven quick actions on room cards
- **Bulk check-in/check-out** via `roomOperations` is practical for front desk operations
- **Overstay management** (flag → acknowledge → extend) is a complete workflow with realtime notifications

### Multi-Role Behavior
- **Two-tier permission system** (auth + staff access policy) with deny-by-default is solid
- **Per-staff navigation permissions** give granular control
- **Department-based notification routing** (F&B gets bookings, kitchen gets room service) is production-appropriate
- **Superuser bypass** for all permissions is clean

### Guest Experience
- **4-step booking wizard** with hold system and countdown is polished
- **Token-based access** for pre-check-in, survey, and booking management works well for email-link flows
- **Dynamic pre-check-in fields** from backend registry is flexible
- **Guest chat** with optimistic sends and deduplication feels real-time

### Live Updates
- **9 domain stores** covering attendance, rooms, bookings, chat, room service — broad realtime coverage
- **Event deduplication** (global LRU + per-store) prevents ghost updates
- **Normalized event bus** centralizes all realtime routing through one pipeline
- **Room service management** is 100% realtime from Pusher store (no polling)

### Admin Capability
- **Hotel creation + auto-bootstrap** (public page, room types, nav items) in SuperUser is a complete setup flow
- **Booking management dashboard** with configurable cancellation policies, checkout times, approval cutoffs
- **Section-builder** for public hotel pages with preset styles
- **Stock tracker** is a full inventory management module with analytics, stocktakes, periods comparison, sales tracking

---

## 11. Weak Spots / Inconsistencies

### Duplicated Flows

1. **`getHotelPublicPage(slug)`** in `api.js` duplicates **`publicHotelPageAPI.getHotelPage(slug)`** in `publicApi.js` — same endpoint, two callsites
2. **`buildSectionURL()`** in `sectionEditorApi.js` reimplements **`buildStaffURL()`** from `api.js`
3. **`cancellationPolicyService.getHotelSettings()`** overlaps **`themeService.fetchHotelSettings()`** — same endpoint, different modules
4. **Dual booking routes**: `/:hotelSlug/book` AND `/booking/:hotelSlug` → same component
5. **Legacy `Navbar.jsx`** still exists alongside `BigScreenNavbar` / `MobileNavbar`

### Mismatched Contracts

1. **Room event names**: both `room-status-changed` and `room_status_changed` are bound — evidence of backend inconsistency
2. **Guest API auth**: `guestAPI` uses token as query param, `guestBaseAPI` uses no auth at all — for the same user session
3. **Chat dual-property names**: `ChatSidebar.jsx` handles both `conversation_id` (API) and `id` (Store) — contract mismatch between API response and store shape

### Stale Legacy Code

1. **`PusherProvider.jsx`** in `staff_chat/context/` — deprecated, kept "for compatibility"
2. **`usePusher.js`** in `staff_chat/hooks/` — creates own Pusher instance, should use centralized realtime
3. **`Navbar.jsx`** — old navbar superseded by `BigScreenNavbar`/`MobileNavbar`
4. **`galleryStore.jsx`** — Phase 6 placeholder, logs events only
5. **`hotel-operations/`** directory — empty planned directories
6. **`salesAnalytics.js` deprecated endpoint** — `getSalesAnalysis()` marked as deprecated
7. **`guestNotifications.js` AND `guestNotifications.jsx`** — JS + JSX versions of same utility

### Mixed Responsibility

1. **`ChatWindow.jsx`** handles both staff and guest chat with `isGuest` branching — should be two components
2. **`api.js`** houses 5 axios instances + booking service + cancellation policy service + hotel public page fetcher — too many concerns
3. **`main.jsx`** has legacy FCM notification display logic inline (room_service, breakfast, stock_movement, staff_chat_message) that should be in the notification pipeline

### Unclear Source of Truth

1. **Room data**: `roomsStore` (realtime) vs React Query `["rooms"]` cache — components inconsistently pick one
2. **Booking data**: `roomBookingStore` (realtime) vs RQ `["staff-room-bookings"]` — store triggers RQ invalidation, but they can diverge
3. **Hotel settings**: fetched independently by ThemeContext, booking config components, and cancellation policy service
4. **Nav permissions**: Both `user.allowed_navs` (login response) and `staffAccessPolicy` check. If backend changes permissions mid-session, frontend won't know until re-login

### UI States That Can Drift From Backend Truth

1. **Guest BookingStatusPage** has no realtime — stale after any backend state change
2. **Pusher disconnect** freezes all 9 domain stores at last-known state
3. **3-second polling** in booking list can race with Pusher events
4. **Optimistic chat messages** could remain "sending" forever if API fails silently
5. **Pre-check-in page** fetches once — if backend updates config mid-session, guest sees stale fields

### Route or Role Confusion

1. **Guest routes have no ProtectedRoute** — intentional, but `guestBaseAPI` calls have zero auth (breakfast/dinner)
2. **`/reception`** route doesn't have `:hotelSlug` in path but others do — inconsistent URL pattern
3. **`/rooms`** route doesn't have `:hotelSlug` — derives hotel from auth context
4. **`/bookings`** (no slug) is restaurant bookings, `/staff/hotel/:hotelSlug/room-bookings` is room bookings — naming confusion

---

## 12. Canonical Frontend Paths We Should Protect

### Canonical — Keep and Protect

| Path | Why |
|------|-----|
| `useStaffRoomBookings` + `BookingList` | Canonical FilterSet-backed booking list with URL-driven state |
| `useStaffRoomBookingDetail` + `BookingDetailsModal` | Complete booking detail with all mutations |
| `useGuestChat` + `GuestChatWidget` | Locked backend contract, proper bootstrap flow |
| `guestChatAPI.js` | Validates backend contract fields — canonical guest chat API |
| `roomOperations.js` | Clean turnover workflow + bulk operations |
| `useBookingTimeWarnings` | Approval + overstay warning logic |
| `useExpiredBookingHandler` | Booking hold expiry management |
| `eventBus.js` + `channelRegistry.js` | Central event bus with dedup |
| `chatStore.jsx` (single source of truth) | Post-refactor canonical chat state |
| `ChatContext.jsx` | Derives from chatStore, unified staff/guest |
| `staffAccessPolicy.js` + `layoutPolicy.js` | Route protection policies |
| `GuestRoomBookingPage` | 4-step booking wizard |
| `GuestPrecheckinPage` + `usePrecheckinData/Form` | Dynamic field pre-check-in |
| `BookingManagementDashboard` | Booking config (policies, cutoffs, pre-check-in, survey) |
| `HousekeepingRooms` + room turnover workflow | Complete housekeeping flow |
| `useNavigation` | Backend-authoritative navigation |
| `roomsStore` + `roomServiceStore` + `roomBookingStore` | Core realtime stores |

### Should Remove / Consolidate

| Path | Action |
|------|--------|
| `PusherProvider.jsx` (staff_chat) | Remove — deprecated, replaced by centralized realtime |
| `usePusher.js` (staff_chat) | Remove — creates duplicate Pusher instance |
| `Navbar.jsx` (legacy) | Remove — superseded by BigScreenNavbar/MobileNavbar |
| `galleryStore.jsx` | Remove or implement — placeholder since Phase 6 |
| `hotel-operations/` empty dirs | Remove or implement |
| `getHotelPublicPage()` in `api.js` | Remove — use `publicHotelPageAPI.getHotelPage()` |
| `buildSectionURL()` in `sectionEditorApi.js` | Replace with `buildStaffURL()` from api.js |
| `salesAnalytics.getSalesAnalysis()` | Remove — deprecated |
| `guestNotifications.js` (non-JSX version) | Consolidate with `.jsx` version |
| `/booking/:hotelSlug` duplicate route | Remove — keep `/:hotelSlug/book` |
| `useHotelRealtime` standalone Pusher | Migrate to centralized `realtimeClient` |

---

## 13. Final Summary

### Strongest Parts

1. **Realtime architecture**: 9 domain stores, centralized event bus with deduplication, normalized event pipeline, clean channel registry. This is production-grade infrastructure
2. **Booking management**: Staff booking list with backend FilterSet, comprehensive booking detail modal with all lifecycle mutations, configurable policies
3. **Permission system**: Two-tier route protection with deny-by-default, per-staff navigation permissions, backend-authoritative nav items
4. **Housekeeping turnover workflow**: Complete status lifecycle with role-appropriate quick actions and manager override
5. **Guest booking wizard**: 4-step flow with hold system, countdown, expired detection, Stripe integration
6. **Guest chat**: Locked backend contract validation, proper bootstrap, optimistic sends, deduplication

### Weakest Parts

1. **Guest-facing pages lack realtime**: BookingStatusPage has no Pusher subscription — guest sees stale state
2. **Auth inconsistency for guest APIs**: `guestAPI` uses token, `guestBaseAPI` uses nothing — security gap for breakfast/dinner
3. **Dual/triple Pusher instances**: `realtimeClient` + `useHotelRealtime` + legacy `usePusher` = three connections
4. **State source-of-truth confusion**: Room and booking data exists in both realtime stores and React Query cache with no enforced priority
5. **Legacy code not cleaned up**: Deprecated PusherProvider, legacy Navbar, empty hotel-operations dirs, duplicate API helpers
6. **`ChatWindow.jsx` dual-mode**: Single component handling both staff and guest chat with complex branching

### Risky Integration Points

1. **Guest chat bootstrap contract**: If backend changes any of the 6 required fields, frontend breaks immediately
2. **Pre-check-in field registry**: Frontend renders whatever backend returns — no validation of field types beyond known set
3. **Booking hold expiry**: Frontend-only timer — if backend and frontend clocks disagree, user sees confusing behavior
4. **Stripe redirect polling**: 100 × 3s = 5-minute max wait — if backend never updates status, user stuck on loading
5. **FCM → eventBus normalization**: If Firebase payload format changes, `normalizeFcmEvent()` fails silently
6. **`X-Hotel-ID` / `X-Hotel-Slug` headers**: Injected by axios interceptor from localStorage — if user data is corrupted, all staff API calls fail

### What Must Be Locked With Backend Before More Frontend Work

1. **Guest API auth contract**: Decide if `guestBaseAPI` (no auth) is acceptable or if all guest calls should use token. Document which endpoints are truly public
2. **Pusher channel naming**: Standardize on hyphen vs underscore in event names (`room-status-changed` vs `room_status_changed`)
3. **Booking status enum**: Finalize and document all possible statuses with transition rules — frontend currently infers some
4. **Hotel settings endpoint ownership**: One canonical endpoint for hotel settings, not three overlapping accessors
5. **Guest chat bootstrap contract**: Version or freeze the bootstrap response shape — frontend validates strictly
6. **Pre-check-in/survey field registry**: Document the field type contract so frontend can validate
7. **Realtime event payloads**: Document expected shape per event — frontend stores process raw payloads with minimal validation
8. **Navigation item slugs**: Lock the canonical set — frontend hides some (`HIDDEN_NAV_SLUGS`), routes map to others (`PATH_TO_NAV_MAPPING`) — any slug change breaks both
