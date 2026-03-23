# Realtime & Auth Migration Tracker

Tracks stray Pusher instances and direct localStorage reads that should migrate
to the centralized architecture. Each entry includes file, current state, and target.

---

## Stray Pusher Instances (target: centralized realtimeClient / guestRealtimeClient)

| # | File | What it creates | Target |
|---|------|-----------------|--------|
| 1 | `src/hooks/useHotelRealtime.js` | `new Pusher()` for hotel settings, gallery, room types (guest UI) | `guestRealtimeClient` |
| 2 | `src/hooks/useHotelGalleries.js` | `new Pusher()` for gallery management | `guestRealtimeClient` |
| 3 | `src/staff_chat/hooks/usePusher.js` | `new Pusher()` for staff chat (uses Bearer auth) | `realtimeClient` (Token auth) |
| 4 | `src/components/stock_tracker/stocktakes/StocktakeDetail.jsx` | `new Pusher()` for stocktake line updates | `realtimeClient` |

### Migration notes
- Items 1-2 are guest-facing — use `getGuestPusherClient()` or `getGuestRealtimeClient()`
- Item 3 uses `Bearer` auth scheme vs the centralized `Token` scheme — verify backend accepts both before migrating
- Item 4 disconnects on unmount — can be replaced with channel subscription via `channelRegistry`

---

## Direct localStorage Reads for Auth (target: `useAuth()` context or `getAuthUser()` bridge)

| # | File | What it reads | Migration path |
|---|------|---------------|----------------|
| 1 | `src/context/ThemeContext.jsx` | `localStorage.getItem('user')` for hotel slug/staff detection | Use `useAuth()` |
| 2 | `src/sections/GuestHotelHome.jsx` | `localStorage.getItem('user')` for staff mode toggle | Use `useAuth()` |
| 3 | `src/hooks/useRoster.js` | `localStorage.getItem('user')` for hotel_id | Use `useAuth()` |
| 4 | `src/hooks/useNavigation.js` | `localStorage.getItem('user')` for user data | Use `useAuth()` |
| 5 | `src/components/utils/settings-sections/SectionStaffRegistration.jsx` | `localStorage.getItem('user')` for user data | Use `useAuth()` |
| 6 | `src/components/utils/QRRegistrationManager.jsx` | `localStorage.getItem('user')` for user data | Use `useAuth()` |
| 7 | `src/components/utils/ColorSelector.jsx` | `localStorage.getItem('user')` for hotel slug | Use `useAuth()` |
| 8 | `src/realtime/realtimeClient.js` | `localStorage.getItem('user')` for token | Use `getAuthUser()` bridge |
| 9 | `src/staff_chat/hooks/usePusher.js` | `localStorage.getItem('token')` for Bearer auth | Use `getAuthUser()` bridge |
| 10 | `src/pages/housekeeping/components/HousekeepingRoomDetails.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |
| 11 | `src/components/guests/GuestList.jsx` | `localStorage.getItem('user')` for hotel_name | Use `useAuth()` |
| 12 | `src/components/guests/AssignGuestForm.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |
| 13 | `src/components/stock_tracker/stock_items/StockItemsMobile.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |
| 14 | `src/staff_chat/components/FCMTestPanel.jsx` | `localStorage.getItem('user')` (x2) | Use `useAuth()` |
| 15 | `src/staff_chat/components/ConversationView.jsx` | `localStorage.getItem('user')` fallback | Use `useAuth()` |
| 16 | `src/staff_chat/components/MessengerWidget.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |
| 17 | `src/components/bookings/DinnerBookingList.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |
| 18 | `src/components/stock_tracker/periods/PeriodSnapshots.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |
| 19 | `src/services/FirebaseService.js` | `localStorage.getItem('user')` (x2) | Use `getAuthUser()` bridge |
| 20 | `src/features/attendance/pages/AttendanceDashboard.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |
| 21 | `src/components/bookings/Bookings.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |
| 22 | `src/components/stock_tracker/movements/MovementsList.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |
| 23 | `src/components/bookings/BookingManagementDashboard.jsx` | `localStorage.getItem('user')` | Use `useAuth()` |

### Notes
- Items in React components (1-7, 10-23) should use `useAuth()` hook
- Items in non-React modules (8-9, 19) should use `getAuthUser()` from `@/lib/authStore`
- `main.jsx` localStorage read for hotel slug is intentional (pre-React-mount bootstrap) — do not migrate
- `AuthContext.jsx` localStorage read is intentional (initial hydration) — do not migrate
- `api.js` already migrated to authStore bridge with localStorage fallback
