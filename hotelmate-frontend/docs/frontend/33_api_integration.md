# 33 — API Integration

> **Primary client:** `src/services/api.js` (authenticated Axios instance)
> **Public client:** `src/services/publicApi.js` (unauthenticated Axios instance)
> **Guest chat client:** `src/services/guestChatAPI.js` (token-as-query-param Axios instance)

---

## 1. API Clients

### 1.1 Authenticated Client (`api`)

| Aspect | Detail |
|--------|--------|
| **File** | `src/services/api.js` |
| **Export** | Default export — Axios instance |
| **Base URL strategy** | Dynamic: Capacitor native → `VITE_API_BASE_URL` env → `localhost:8000` in dev → Heroku prod fallback. Always suffixed with `/api/v1` |
| **Auth headers** | Request interceptor reads `localStorage.getItem('user')` → attaches `Authorization: Token <token>`, `X-Hotel-ID`, `X-Hotel-Slug` |
| **Error handling** | Response interceptor catches `ERR_NETWORK` / CORS errors but only logs — no user-facing action. No automatic retry. No 401 auto-logout. |

### 1.2 Public Client (`publicAPI`)

| Aspect | Detail |
|--------|--------|
| **File** | `src/services/publicApi.js` |
| **Export** | Named: `publicAPI` object; Default: same |
| **Base URL** | Same dynamic resolution as `api` → suffixed with `/api/v1/public` |
| **Auth** | None — no interceptor |
| **Error handling** | Every method uses try/catch → `console.error` → re-throws. Consistent. |

### 1.3 Guest Chat Client (`guestChatAPI`)

| Aspect | Detail |
|--------|--------|
| **File** | `src/services/guestChatAPI.js` |
| **Export** | Named: `getGuestConversations`, `getGuestMessages`, `sendGuestMessage`, `getGuestChatWebSocketUrl` |
| **Base URL** | Same dynamic resolution (duplicated from `api.js`) |
| **Auth** | Guest token as query parameter `?guest_token=<token>` |
| **Error handling** | No try/catch — errors bubble raw |

### 1.4 Additional Clients (created inline)

| Usage | File | Client |
|-------|------|--------|
| Login | `src/hooks/useLogin.js` | Separate Axios instance with same base URL, no auth |
| Login/Register | `src/hooks/useAxiosPost.js` | Switches between `publicAPI` and `api` based on endpoint string match |
| Chat file upload | `src/components/chat/ChatWindow.jsx` | Raw `axios.post()` with manually constructed auth headers |

---

## 2. Endpoint Usage by Domain

### 2.1 Authentication

| Endpoint | Method | Service/Hook | Purpose |
|----------|--------|-------------|---------|
| `/login/` | POST | `useLogin.js` | Staff login → returns token |
| `/me/` | GET | `api.js` (inline) | Current user profile |
| `/register/` | POST | `useAxiosPost.js` | Staff registration (QR token required) |

### 2.2 Hotels (Public)

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/public/hotels/` | GET | `publicApi.js` | Hotel directory listing |
| `/public/hotel/{slug}/page/` | GET | `publicApi.js`, `sectionEditorApi.js` | Hotel public page data + sections |
| `/public/hotel-filters/` | GET | `publicApi.js` | Filter facets for hotel search |
| `/public/hotel/{slug}/info/` | GET | `publicApi.js` | Hotel information entries |
| `/public/hotel/{slug}/categories/` | GET | `publicApi.js` | Hotel info categories |

### 2.3 Room Bookings (Guest)

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/public/hotel/{slug}/availability/` | GET | Inline in `GuestRoomBookingPage` | Check room availability |
| `/public/hotel/{slug}/pricing/quote/` | POST | Inline | Price quote for selected rooms |
| `/public/hotel/{slug}/bookings/` | POST | Inline | Create booking |
| `/public/hotel/{slug}/room-bookings/{id}/` | GET | Inline | Booking status (with `?token=`) |
| `.../payment/session/` | POST | Inline | Create Stripe checkout session |
| `.../payment/verify/` | POST | Inline | Verify Stripe payment |
| `.../cancel/` | POST | Inline | Cancel booking |
| `/public/hotel/{slug}/precheckin/` | GET | Inline | Pre-check-in config + booking data |
| `/public/hotel/{slug}/precheckin/submit/` | POST | Inline | Submit pre-check-in |

### 2.4 Rooms (Staff)

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/staff/hotel/{slug}/rooms/dashboard/` | GET | `api.js` (via React Query) | All rooms with status |
| `/staff/hotel/{slug}/housekeeping/rooms/{id}/` | GET | `roomOperations.js` | Room details |
| `/staff/hotel/{slug}/housekeeping/rooms/{id}/status-history/` | GET | `roomOperations.js` | Room status history |
| `/staff/hotel/{slug}/rooms/{number}/start-cleaning/` | POST | `roomOperations.js` | Start cleaning |
| `/staff/hotel/{slug}/rooms/{number}/mark-cleaned/` | POST | `roomOperations.js` | Mark cleaned |
| `/staff/hotel/{slug}/rooms/{number}/inspect/` | POST | `roomOperations.js` | Inspect room |
| `/staff/hotel/{slug}/rooms/{number}/mark-maintenance/` | POST | `roomOperations.js` | Mark maintenance |
| `/staff/hotel/{slug}/rooms/{number}/complete-maintenance/` | POST | `roomOperations.js` | Complete maintenance |
| `/staff/hotel/{slug}/housekeeping/rooms/{id}/manager_override/` | POST | `roomOperations.js` | Manager override |
| `/staff/hotel/{slug}/rooms/checkin/` | POST | `roomOperations.js` | Bulk check-in |
| `/staff/hotel/{slug}/rooms/checkout/` | POST | `roomOperations.js` | Bulk check-out |
| `/staff/hotel/{slug}/turnover/rooms/` | GET | `roomOperations.js` | Turnover report |

### 2.5 Room Service & Breakfast

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/room_services/{hotel}/rooms/{room}/menu/` | GET | Inline | Room service menu items |
| `/room_services/{hotel}/rooms/{room}/orders/` | GET/POST | Inline | Guest orders |
| `/room_services/{hotel}/rooms/{room}/breakfast/` | GET | Inline | Breakfast menu items |
| `/room_services/{hotel}/orders/` | GET | Inline | All orders (staff) |
| `/room_services/{hotel}/orders/{id}/status/` | PATCH | Inline | Update order status |

### 2.6 Chat

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/staff/hotel/{slug}/chat/conversations/` | GET | `roomConversationsAPI.js` | Staff conversation list |
| `/staff/hotel/{slug}/chat/conversations/{id}/messages/` | GET | `roomConversationsAPI.js` | Paginated messages |
| `/staff/hotel/{slug}/chat/conversations/{id}/messages/send/` | POST | `roomConversationsAPI.js` | Send message |
| `/staff/hotel/{slug}/chat/conversations/{id}/mark-read/` | POST | `roomConversationsAPI.js` | Mark read |
| `/staff/hotel/{slug}/chat/conversations/unread-count/` | GET | `roomConversationsAPI.js` | Unread count |
| `/chat/{slug}/guest/conversations/` | GET | `guestChatAPI.js` | Guest conversations |
| `/chat/{slug}/guest/conversations/{id}/messages/` | GET | `guestChatAPI.js` | Guest messages |
| `/chat/{slug}/guest/conversations/{id}/messages/send/` | POST | `guestChatAPI.js` | Guest send |
| `/chat/{slug}/guest/chat/context/` | GET | Inline | Guest chat permissions |
| `/chat/{slug}/guest/conversations/{id}/mark-read/` | POST | `channelRegistry.js` | Guest mark-read |

### 2.7 Staff Management

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/staff/hotel/{slug}/staff/` | GET | `staffApi.js` | Staff list |
| `/staff/hotel/{slug}/staff/` | POST | Inline | Create staff |
| `/staff/hotel/{slug}/staff/{id}/` | GET | Inline | Staff details |
| `/staff/hotel/{slug}/hotel/public-page-builder/` | GET/POST | `staffApi.js` | Page builder |
| `/staff/hotel/{slug}/hotel/public-page-builder/bootstrap-default/` | POST | `staffApi.js` | Bootstrap page |

### 2.8 Restaurants & Dinner Bookings

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/staff/hotel/{slug}/restaurants/` | GET | Inline | Restaurant list |
| `/staff/hotel/{slug}/bookings/{restaurant}/` | GET | Inline | Dinner bookings |
| `/guest-booking/{slug}/restaurant/{rest}/room/{room}/` | POST | Inline | Guest dinner booking |

### 2.9 Hotel Info & Good To Know

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/hotel_info/{slug}/` | GET | Inline | Hotel info items |
| `/hotel_info/categories/{slug}/` | GET | Inline | Categories |
| `/hotel_info/category_qr/` | POST | Inline | Generate QR |
| `/good_to_know/{slug}/` | GET | Inline | Single entry |
| `/good_to_know/hotel/{slug}/` | GET | Inline | Paginated list |

### 2.10 Attendance

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/staff/hotel/{slug}/attendance/logs/` | GET | Inline | Attendance logs |
| `/staff/hotel/{slug}/attendance/roster-analytics/kpis/` | GET | `analytics.js` | KPI summary |
| `/staff/hotel/{slug}/attendance/roster-analytics/staff-summary/` | GET | `analytics.js` | Staff summary |
| `/staff/hotel/{slug}/attendance/roster-analytics/department-summary/` | GET | `analytics.js` | Dept summary |
| `/staff/hotel/{slug}/attendance/shift-locations/` | GET/POST/PUT/DELETE | `shiftLocations.js` | Shift locations CRUD |

### 2.11 Section Editor (Page Builder)

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/staff/hotel/{slug}/public-page/` | GET | `sectionEditorApi.js` | Get sections |
| `/staff/hotel/{slug}/public-sections/` | POST | `sectionEditorApi.js` | Create section |
| `/staff/hotel/{slug}/public-sections/{id}/` | PATCH/DELETE | `sectionEditorApi.js` | Update/delete section |
| `/staff/hotel/{slug}/public-sections/reorder/` | POST | `sectionEditorApi.js` | Reorder |
| `/staff/hotel/{slug}/hero-sections/` | POST | `sectionEditorApi.js` | Create hero |
| `/staff/hotel/{slug}/gallery-containers/` | POST | `sectionEditorApi.js` | Create gallery |
| `/staff/hotel/{slug}/gallery-images/bulk-upload/` | POST | `sectionEditorApi.js` | Upload images |
| `/staff/hotel/{slug}/list-containers/` | POST | `sectionEditorApi.js` | Create list |
| `/staff/hotel/{slug}/news-items/` | POST | `sectionEditorApi.js` | Create news |
| `/staff/hotel/{slug}/content-blocks/` | POST | `sectionEditorApi.js` | Create content block |
| `/staff/hotel/{slug}/public-page/apply-page-style/` | POST | `sectionEditorApi.js` | Apply style |

### 2.12 Stock Tracker

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/stock_tracker/{slug}/kpi-summary/` | GET | `stockAnalytics.js` | KPI summary |
| `/stock_tracker/{slug}/compare/categories/` | GET | `stockAnalytics.js` | Category comparison |
| `/stock_tracker/{slug}/compare/top-movers/` | GET | `stockAnalytics.js` | Top movers |
| `/stock_tracker/{slug}/compare/cost-analysis/` | GET | `stockAnalytics.js` | Cost analysis |
| `/stock_tracker/{slug}/compare/trend-analysis/` | GET | `stockAnalytics.js` | Trend analysis |
| `/stock_tracker/{slug}/items/profitability/` | GET | `stockAnalytics.js` | Item profitability |
| `/stock_tracker/{slug}/periods/compare/` | GET | `stockAnalytics.js` | Period comparison (legacy) |
| `/stock_tracker/{slug}/periods/{id}/sales-analysis/` | GET | `salesAnalytics.js` | Sales analysis |
| `/stock_tracker/{slug}/sales/` | GET/POST | `salesAnalytics.js` | Sales CRUD |
| `/stock_tracker/{slug}/sales/summary/` | GET | `salesAnalytics.js` | Sales summary |
| `/stock_tracker/{slug}/items/` | GET | Hooks | Stock items |
| `/stock_tracker/{slug}/movements/` | GET/POST | Hooks | Stock movements |
| `/stock_tracker/{slug}/stocktakes/` | GET/POST | Inline | Stocktakes |
| `/stock_tracker/{slug}/stocktakes/{id}/` | GET/PATCH | Inline | Stocktake detail |
| `/stock_tracker/{slug}/stocktakes/{id}/populate/` | POST | Inline | Populate stocktake |
| `/stock_tracker/{slug}/periods/` | GET/POST | Inline | Periods |
| `/stock_tracker/{slug}/periods/{id}/` | DELETE | Inline | Delete period |
| `/stock_tracker/{slug}/periods/{id}/reopen/` | POST | Inline | Reopen period |

### 2.13 Games (Entertainment)

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/entertainment/memory-sessions/` | GET | `memoryGameAPI.js` | Memory game sessions |
| `/entertainment/memory-sessions/practice/` | POST | `memoryGameAPI.js` | Start practice |
| `/entertainment/tournaments/` | GET/POST | `memoryGameAPI.js` | Tournament CRUD |
| `/entertainment/tournaments/{id}/leaderboard/` | GET | `memoryGameAPI.js` | Tournament leaderboard |
| `entertainment/quiz-categories/` | GET | `quizGameAPI.js` | Quiz categories |
| `entertainment/quiz-sessions/start_quiz/` | POST | `quizGameAPI.js` | Start quiz |
| `entertainment/quiz-sessions/{id}/submit_answer/` | POST | `quizGameAPI.js` | Submit answer |
| `entertainment/quiz-leaderboard/` | GET | `quizGameAPI.js` | Quiz leaderboard |
| `entertainment/quiz-tournaments/` | GET | `quizGameAPI.js` | Quiz tournaments |

### 2.14 Settings & Theme

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/staff/hotel/{slug}/settings/` | GET/PATCH | `themeService.js`, `ThemeContext` | Hotel settings + theme |
| `/staff/hotel/{slug}/presets/` | GET | `presetsService.js` | Visual presets |

### 2.15 Firebase / Notifications

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/staff/hotel/{slug}/fcm-tokens/` | POST | `FirebaseService.js` | Save FCM token |
| `/staff/hotel/{slug}/fcm-tokens/delete/` | POST | `FirebaseService.js` | Delete FCM token |

### 2.16 Overstay Management

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/staff/hotel/{slug}/room-bookings/{id}/overstay/acknowledge/` | POST | `staffApi.js` | Acknowledge overstay |
| `/staff/hotel/{slug}/room-bookings/{id}/overstay/extend/` | POST | `staffApi.js` | Extend overstay (with `Idempotency-Key`) |

---

## 3. Error Handling Summary

| Pattern | Services Using It | Behavior |
|---------|-------------------|----------|
| try/catch → `console.error` → re-throw | `publicApi`, `analytics`, `stockAnalytics`, `salesAnalytics` | Caller must handle |
| try/catch → fallback return | `presetsService` (empty preset), `roomConversationsAPI` (empty array), `memoryGameAPI` (localStorage offline queue) | Silent degradation |
| No try/catch | `roomOperations`, `themeService`, `sectionEditorApi`, `guestChatAPI`, `shiftLocations` | Errors bubble raw to component |
| Response interceptor | `api.js` | Catches `ERR_NETWORK` but only logs — no user action |

### Retry Strategy

**There is no systematic retry strategy.** React Query provides automatic retries (3 by default) for the few endpoints using it (`ThemeContext`, `RoomList`). All other API calls are fire-and-forget with no retry. The `BookingPaymentSuccess` page implements manual polling (every 3s) as a workaround for async payment processing.

---

## 4. Cross-Cutting API Risks

| Risk | Evidence | Severity |
|------|----------|----------|
| **Inconsistent URL patterns** | `api` uses `/staff/hotel/${slug}/...`, `stockAnalytics` uses `stock_tracker/${slug}/...` (no leading `/`), `quizGameAPI` uses `entertainment/...` (no leading `/`) | 🟡 |
| **Duplicate base URL logic** | `guestChatAPI.js` re-implements the same Capacitor/env/fallback chain as `api.js` | 🟡 |
| **No AbortController** | `useAxios.js` has no request cancellation — state updates after unmount | 🟡 |
| **No 401 auto-logout** | Response interceptor doesn't redirect on 401 — components must handle individually | 🟡 |
| **localStorage JSON.parse unguarded** | `api.js` request interceptor parses `user` on every request without try/catch | 🟡 |
| **Duplicate endpoint definitions** | Hotel settings: `themeService.js` AND `api.js` inline. Sections: `sectionEditorApi.js` AND `staffApi.js` | 🟡 |
| **Dead parameter** | `themeService.fetchTheme(slug, token)` accepts `token` but never uses it | 🟢 |
| **Hardcoded hotel slug** | `memoryGameAPI.js` defaults to specific hotel slug | 🟢 |
