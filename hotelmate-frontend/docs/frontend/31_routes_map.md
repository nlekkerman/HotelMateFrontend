# 31 — Routes Map

> **Source of truth:** `src/App.jsx` (lines 257–960)
> **Router:** React Router v6 (`react-router-dom` — `BrowserRouter` + `<Routes>/<Route>`)
> **Layout policy:** `src/policy/layoutPolicy.js` — classifies every pathname into `auth`, `pin_authenticated`, `guest`, or `staff` mode to control navbar/sidebar rendering.

---

## Route Table

Legend:
- **Auth Gate** — the wrapper that protects the route (`ProtectedRoute`, `RequirePin`, `RequireChatPin`, `RequireDinnerPin`, or *none* for public)
- **Layout Mode** — as returned by `getLayoutMode()` in `src/policy/layoutPolicy.js`

### Public Routes (no authentication)

| Path | Page Component | File | Auth Gate | Layout Mode |
|------|---------------|------|-----------|-------------|
| `/` | `HotelsLandingPage` | `src/pages/hotels/HotelsLandingPage.jsx` | None | `guest` |
| `/login` | `Login` | `src/components/auth/Login.jsx` | None | `auth` |
| `/logout` | `Logout` | `src/components/auth/Logout.jsx` | None | `auth` |
| `/register` | `Register` (via `RegisterWithToken` gate) | `src/components/auth/Register.jsx` | Token query-param required (`?token=&hotel=`) | `auth` |
| `/registration-success` | `RegistrationSuccess` | `src/components/auth/RegistrationSuccess.jsx` | None | `auth` |
| `/forgot-password` | `ForgotPassword` | `src/components/auth/ForgotPassword.jsx` | None | `auth` |
| `/reset-password/:uid/:token/` | `ResetPassword` | `src/components/auth/ResetPassword.jsx` | None | `auth` |
| `/no-internet` | `NoInternet` | `src/components/offline/NoInternet.jsx` | None | `auth` |
| `/hotel/:slug` | `HotelPublicPage` | `src/pages/hotels/HotelPublicPage.jsx` | None | `guest` |
| `/hotel/:slug/sections` | `SectionBasedPublicPage` | `src/pages/sections/SectionBasedPublicPage.jsx` | None | `guest` |
| `/:hotelSlug` | `HotelPortalPage` | `src/pages/HotelPortalPage.jsx` | None | `guest` |
| `/:hotelSlug/book` | `GuestRoomBookingPage` | `src/pages/bookings/GuestRoomBookingPage.jsx` | None | `guest` |
| `/booking/:hotelSlug` | `GuestRoomBookingPage` | `src/pages/bookings/GuestRoomBookingPage.jsx` | None | `guest` |
| `/booking/confirmation/:bookingId` | `BookingConfirmation` | `src/pages/bookings/BookingConfirmation.jsx` | None | `guest` |
| `/booking/status/:hotelSlug/:bookingId` | `BookingStatusPage` | `src/pages/bookings/BookingStatusPage.jsx` | None (token-gated internally) | `guest` |
| `/booking/:hotelSlug/payment/success` | `BookingPaymentSuccess` | `src/pages/bookings/BookingPaymentSuccess.jsx` | None | `guest` |
| `/booking/:hotelSlug/payment/cancel` | `BookingPaymentCancel` | `src/pages/bookings/BookingPaymentCancel.jsx` | None | `guest` |
| `/booking/payment/success` | `BookingPaymentSuccess` | `src/pages/bookings/BookingPaymentSuccess.jsx` | None (legacy) | `guest` |
| `/booking/payment/cancel` | `BookingPaymentCancel` | `src/pages/bookings/BookingPaymentCancel.jsx` | None (legacy) | `guest` |
| `/guest/hotel/:hotelSlug/precheckin` | `GuestPrecheckinPage` | `src/pages/guest/GuestPrecheckinPage.jsx` | None (token-gated internally) | `guest` |
| `/guest/hotel/:hotelSlug/survey` | `GuestSurveyPage` | `src/pages/guest/GuestSurveyPage.jsx` | None (token-gated internally) | `guest` |
| `/guest/chat` | `GuestChatPortal` | `src/pages/GuestChatPortal.jsx` | None (token via query params) | `guest` |
| `/hotels/:hotelSlug/restaurants/:restaurantSlug` | `Restaurant` | `src/components/restaurants/Restaurant.jsx` | None | `guest` |
| `/good_to_know/:hotel_slug/:slug` | `GoodToKnow` | `src/components/hotel_info/GoodToKnow.jsx` | None | `guest` |

### PIN-Authenticated Routes (guest PIN validation)

| Path | Page Component | File | Auth Gate | Layout Mode |
|------|---------------|------|-----------|-------------|
| `/:hotelIdentifier/room/:roomNumber/validate-pin` | `PinAuth` | `src/components/auth/PinAuth.jsx` | None (is the auth page) | `pin_authenticated` |
| `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin` | `DinnerPinAuth` | `src/components/auth/DinnerPinAuth.jsx` | None (is the auth page) | `pin_authenticated` |
| `/chat/:hotelSlug/messages/room/:room_number/validate-chat-pin` | `ChatPinAuth` | `src/components/auth/ChatPinAuth.jsx` | None (is the auth page) | `pin_authenticated` |
| `/room_services/:hotelIdentifier/room/:roomNumber/menu` | `RoomService` | `src/components/rooms/RoomService.jsx` | `RequirePin` | `pin_authenticated` |
| `/room_services/:hotelIdentifier/room/:roomNumber/breakfast/` | `Breakfast` | `src/components/rooms/Breakfast.jsx` | `RequirePin` | `pin_authenticated` |
| `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/` | `DinnerBookingList` | `src/components/bookings/DinnerBookingList.jsx` | None | `guest` |
| `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/` | `DinnerBookingForm` | `src/components/bookings/DinnerBookingForm.jsx` | `RequireDinnerPin` | `pin_authenticated` |
| `/chat/:hotelSlug/conversations/:conversationId/messages/send` | `ChatWindow` | `src/components/chat/ChatWindow.jsx` | `RequireChatPin` | `pin_authenticated` |
| `/chat/:hotelSlug/conversations/:conversationId/messages` | `ChatWindow` | `src/components/chat/ChatWindow.jsx` | None | `pin_authenticated` |

### Staff-Protected Routes (`ProtectedRoute` — requires `user` in AuthContext)

| Path | Page Component | File | Auth Gate | Layout Mode |
|------|---------------|------|-----------|-------------|
| `/staff/:hotelSlug/section-editor` | `SectionEditorPage` | `src/pages/sections/SectionEditorPage.jsx` | `ProtectedRoute` | `staff` |
| `/staff/:hotelSlug/feed` | `Home` | `src/pages/home/Home.jsx` | `ProtectedRoute` | `staff` |
| `/staff/:hotelSlug/settings` | `Settings` | `src/components/utils/Settings.jsx` | `ProtectedRoute` | `staff` |
| `/reception` | `Reception` | `src/components/Reception.jsx` | `ProtectedRoute` | `staff` |
| `/super-user` | `SuperUser` | `src/pages/SuperUser.jsx` | `ProtectedRoute` + in-component `is_superuser` check | `staff` |
| `/maintenance` | `Maintenance` | `src/pages/maintenance/Maintenance.jsx` | `ProtectedRoute` | `staff` |
| `/:hotelSlug/staff` | `Staff` | `src/components/staff/Staff.jsx` | `ProtectedRoute` | `staff` |
| `/:hotelSlug/staff/create` | `StaffCreate` | `src/components/staff/StaffCreate.jsx` | `ProtectedRoute` | `staff` |
| `/:hotelSlug/staff/:id` | `StaffDetails` | `src/components/staff/StaffDetails.jsx` | `ProtectedRoute` | `staff` |
| `/:hotelSlug/staff/me` | `StaffProfile` | `src/components/staff/StaffProfile.jsx` | `ProtectedRoute` | `staff` |
| `/attendance/:hotelSlug` | `AttendanceDashboard` | `src/features/attendance/pages/AttendanceDashboard.jsx` | `ProtectedRoute` | `staff` |
| `/roster/:hotelSlug` | `AttendanceDashboard` | `src/features/attendance/pages/AttendanceDashboard.jsx` | `ProtectedRoute` (legacy alias) | `staff` |
| `/department-roster/:hotelSlug` | `DepartmentRosterDashboard` | `src/features/attendance/pages/DepartmentRosterDashboard.jsx` | `ProtectedRoute` | `staff` |
| `/enhanced-attendance/:hotelSlug` | `EnhancedAttendanceDashboard` | `src/features/attendance/components/EnhancedAttendanceDashboard.jsx` | `ProtectedRoute` | `staff` |
| `/face/:hotelSlug/register` | `FaceRegisterPage` | `src/features/faceAttendance/pages/FaceRegisterPage.jsx` | `ProtectedRoute` | `staff` |
| `/face/:hotelSlug/clock-in` | `FaceClockInPage` | `src/features/faceAttendance/pages/FaceClockInPage.jsx` | None (kiosk/public) | `staff` |
| `/camera-clock-in/:hotelSlug` | `FaceClockInPage` | `src/features/faceAttendance/pages/FaceClockInPage.jsx` | None (kiosk alias) | `staff` |
| `/hotel-:hotelSlug/restaurants` | `RestaurantManagementDashboard` | `src/pages/bookings/RestaurantManagementDashboard.jsx` | `ProtectedRoute` | `staff` |
| `/:hotelSlug/:restaurantSlug` | `RestaurantManagementDashboard` | `src/pages/bookings/RestaurantManagementDashboard.jsx` | `ProtectedRoute` | `staff` |
| `/rooms` | `RoomList` | `src/components/rooms/RoomList.jsx` | `ProtectedRoute` | `staff` |
| `/room_services/:hotelIdentifier/orders` | `RoomServiceOrders` | `src/components/room_service/RoomServiceOrders.jsx` | `ProtectedRoute` | `staff` |
| `/room_services/:hotelIdentifier/orders-summary` | `OrdersSummary` | `src/components/room_service/OrdersSummary.jsx` | `ProtectedRoute` | `staff` |
| `/room_services/:hotelIdentifier/orders-management` | `RoomServiceOrdersManagement` | `src/components/room_service/RoomServiceOrdersManagement.jsx` | `ProtectedRoute` | `staff` |
| `/room_services/:hotelIdentifier/breakfast-orders` | `BreakfastRoomService` | `src/components/room_service/BreakfastRoomService.jsx` | `ProtectedRoute` | `staff` |
| `/menus_management/:hotelSlug` | `MenusManagement` | `src/components/menus/MenusManagement.jsx` | `ProtectedRoute` | `staff` |
| `/room-management/:hotelIdentifier/room/:roomNumber` | `RoomDetails` | `src/components/rooms/RoomDetails.jsx` | `ProtectedRoute` | `staff` |
| `/:hotelIdentifier/guests` | `GuestList` | `src/components/guests/GuestList.jsx` | `ProtectedRoute` | `staff` |
| `/:hotelIdentifier/guests/:guestId/edit` | `GuestEdit` | `src/components/guests/GuestEdit.jsx` | `ProtectedRoute` | `staff` |
| `/rooms/:roomNumber/add-guest` | `AssignGuestForm` | `src/components/guests/AssignGuestForm.jsx` | `ProtectedRoute` | `staff` |
| `/bookings` | `Bookings` | `src/components/bookings/Bookings.jsx` | `ProtectedRoute` | `staff` |
| `/staff/hotel/:hotelSlug/room-bookings` | `BookingManagementPage` | `src/pages/staff/BookingManagementPage.jsx` | `ProtectedRoute` | `staff` |
| `/staff/hotel/:hotelSlug/booking-management` | `BookingManagementDashboard` | `src/components/bookings/BookingManagementDashboard.jsx` | `ProtectedRoute` | `staff` |
| `/staff/hotel/:hotelSlug/housekeeping` | `HousekeepingRooms` | `src/pages/housekeeping/` (barrel) | `ProtectedRoute` | `staff` |
| `/staff/hotel/:hotelSlug/housekeeping/rooms/:roomNumber` | `HousekeepingRoomDetails` | `src/pages/housekeeping/components/HousekeepingRoomDetails.jsx` | `ProtectedRoute` | `staff` |
| `/hotel_info/:hotel_slug` | `HotelInfo` | `src/pages/hotel_info/HotelInfo.jsx` | `ProtectedRoute` | `staff` |
| `/hotel_info/:hotel_slug/:category` | `HotelInfo` | `src/pages/hotel_info/HotelInfo.jsx` | `ProtectedRoute` | `staff` |
| `/good_to_know_console/:hotel_slug` | `GoodToKnowConsole` | `src/components/hotel_info/GoodToKnowConsole.jsx` | `ProtectedRoute` | `staff` |
| `/hotel/:hotelSlug/chat` | `ChatHomePage` | `src/pages/chat/ChatHomePage.jsx` | `ProtectedRoute` | `staff` |

### Stock Tracker Routes (all `ProtectedRoute`)

| Path | Page Component | File |
|------|---------------|------|
| `/stock_tracker/:hotel_slug` | `StockDashboard` | `src/pages/stock_tracker/StockDashboard.jsx` |
| `/stock_tracker/:hotel_slug/analytics` | `Analytics` | `src/pages/stock_tracker/Analytics.jsx` |
| `/stock_tracker/:hotel_slug/operations` | `StockOperations` | `src/pages/stock_tracker/StockOperations.jsx` |
| `/stock_tracker/:hotel_slug/items` | `StockItemsResponsive` | `src/components/stock_tracker/stock_items/StockItemsResponsive.jsx` |
| `/stock_tracker/:hotel_slug/profitability` | `StockItemProfitability` | `src/components/stock_tracker/stock_items/StockItemProfitability.jsx` |
| `/stock_tracker/:hotel_slug/movements` | `MovementsList` | `src/components/stock_tracker/movements/MovementsList.jsx` |
| `/stock_tracker/:hotel_slug/stocktakes` | `StocktakesList` | `src/components/stock_tracker/stocktakes/StocktakesList.jsx` |
| `/stock_tracker/:hotel_slug/stocktakes/:id` | `StocktakeDetail` | `src/components/stock_tracker/stocktakes/StocktakeDetail.jsx` |
| `/stock_tracker/:hotel_slug/periods` | `PeriodSnapshots` | `src/components/stock_tracker/periods/PeriodSnapshots.jsx` |
| `/stock_tracker/:hotel_slug/periods/:id` | `PeriodSnapshotDetail` | `src/components/stock_tracker/periods/PeriodSnapshotDetail.jsx` |
| `/stock_tracker/:hotel_slug/comparison` | `PeriodsComparison` | `src/components/stock_tracker/periods/PeriodsComparison.jsx` |
| `/stock_tracker/:hotel_slug/sales/analysis` | `SalesReport` | `src/pages/stock_tracker/SalesReport.jsx` |
| `/stock_tracker/:hotel_slug/sales/list` | `SalesListView` | `src/pages/stock_tracker/SalesListView.jsx` |
| `/stock_tracker/:hotel_slug/sales/entry` | `SalesEntry` | `src/pages/stock_tracker/SalesEntry.jsx` |
| `/stock_tracker/:hotel_slug/cocktails` | `CocktailsPage` | `src/pages/stock_tracker/CocktailsPage.jsx` |

### Legacy Redirect Routes

| Path | Redirects To |
|------|-------------|
| `/stock_tracker/:hotel_slug/sales-report` | `../sales/analysis` |
| `/stock_tracker/:hotel_slug/sales` | `./entry` |

### Games Routes (all `ProtectedRoute`)

| Path | Page Component | File |
|------|---------------|------|
| `/games` | `GamesDashboard` | `src/games/GamesDashboard.jsx` |
| `/games/whack-a-mole` | `WhackAMolePage` | `src/games/whack-a-mole/pages/GamePage.jsx` |
| `/games/memory-match` | `MemoryMatchDashboard` | `src/games/memory-match/pages/MemoryMatchDashboard.jsx` |
| `/games/memory-match/practice` | `MemoryGame` (practiceMode) | `src/games/memory-match/pages/MemoryGame.jsx` |
| `/games/memory-match/tournament/:tournamentId` | `MemoryGame` | `src/games/memory-match/pages/MemoryGame.jsx` |
| `/games/memory-match/tournament/:tournamentId/winners` | `TournamentWinners` | `src/games/memory-match/pages/TournamentWinners.jsx` |
| `/games/memory-match/tournaments` | `TournamentDashboard` | `src/games/memory-match/pages/TournamentDashboard.jsx` |
| `/games/memory-match/leaderboard` | `Leaderboard` | `src/games/memory-match/pages/Leaderboard.jsx` |
| `/games/memory-match/stats` | `PersonalStats` | `src/games/memory-match/pages/PersonalStats.jsx` |
| `/games/quiz` | `QuizStartScreen` | `src/games/quiz-game/pages/QuizStartScreen.jsx` |
| `/games/quiz/play` | `QuizPlayScreen` | `src/games/quiz-game/pages/QuizPlayScreen.jsx` |
| `/games/quiz/results` | `QuizResultsScreen` | `src/games/quiz-game/pages/QuizResultsScreen.jsx` |
| `/games/quiz/leaderboard` | `QuizLeaderboard` | `src/games/quiz-game/pages/QuizLeaderboard.jsx` |
| `/games/quiz/tournaments` | `QuizTournaments` | `src/games/quiz-game/pages/QuizTournaments.jsx` |
| `/games/settings` | Placeholder `<div>` | Inline in `src/App.jsx` |

### Catch-All

| Path | Page Component | File |
|------|---------------|------|
| `*` | `NotFound` | `src/components/offline/NotFound.jsx` |

---

## Auth Gate Components

| Gate | File | Mechanism | Failure Behavior |
|------|------|-----------|-----------------|
| `ProtectedRoute` | `src/components/auth/ProtectedRoute.jsx` | Checks `user` from `AuthContext` | Redirects to `/login` with `state.from` |
| `RequirePin` | `src/components/auth/RequirePin.jsx` | Checks `sessionStorage` key `pin_ok_${roomNumber}` | Redirects to `/:hotelIdentifier/room/:roomNumber/validate-pin` |
| `RequireChatPin` | `src/components/auth/RequireChatPin.jsx` | Checks `sessionStorage` key `chat_pin_ok_${room_number}` + falls back to `localStorage` guest session | Redirects to chat PIN auth page |
| `RequireDinnerPin` | `src/components/auth/RequireDinnerPin.jsx` | Checks `sessionStorage` key `pin_ok_${roomNumber}` | Redirects to dinner PIN auth page |

> ⚠️ **Known issue:** `RequirePin` and `RequireDinnerPin` share the same `sessionStorage` key prefix (`pin_ok_`). Validating a room-service PIN inadvertently satisfies the dinner PIN gate, and vice versa.

---

## Route Ordering Risk

The `/:hotelSlug` catch-all route is placed **last** among specific routes (line ~958 in `App.jsx`), which is correct. However, `/:hotelSlug/:restaurantSlug` (staff restaurant management) is a very greedy pattern that could intercept two-segment guest paths if not carefully ordered. Currently it is wrapped in `ProtectedRoute`, so unauthenticated hits fall through to login.

---

## Layout Chrome

| Layout Mode | Navbar | Sidebar | LogoBanner | Determined By |
|-------------|--------|---------|------------|---------------|
| `staff` | `MobileNavbar` (≤991px) or `BigScreenNavbar` (>991px) | Yes (desktop) | Yes | Default for authenticated staff routes |
| `guest` | Hidden | Hidden | Hidden | Hotel public pages, booking flows |
| `pin_authenticated` | Hidden | Hidden | Hidden | Room service, chat, dinner PIN-gated routes |
| `auth` | Hidden | Hidden | Hidden | Login, register, password reset |
