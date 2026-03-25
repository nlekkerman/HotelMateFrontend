# Frontend Token & API Client Audit

> **Date:** 2025-03-25
> **Scope:** Correctness audit of guest token system, API client separation, and critical guest flows.
> **Approach:** No refactors, no redesigns — only verification and gap identification.

---

## ✅ Verified Correct

### Token System
- `guestToken.js` provides centralized token resolution with correct priority: URL `?token=` → localStorage fallback
- `guestToken.js` is imported in 6 files — all usage is appropriate and consistent
- `guestBookingTokens.js` correctly handles booking-scoped token storage with 3-tier priority (fresh payload → stored → query string)
- `persistGuestToken()` is called on mount in all guest entry-point pages: BookingStatusPage, GuestSurveyPage, GuestPrecheckinPage, GuestChatPortal

### API Client Separation
- 5 Axios instances properly defined in `src/services/api.js`: `api`, `publicAPI`, `guestAPI`, `guestBaseAPI`, `staffAuthAPI`
- `api` (staff): correctly injects `Authorization: Token`, `X-Hotel-ID`, `X-Hotel-Slug` headers
- `publicAPI`: no auth headers — correct for public endpoints
- `guestAPI`: auto-injects `?token=` via request interceptor — correct for guest endpoints
- `guestBaseAPI`: no auth headers — correct for guest endpoints outside `/api/guest/`
- `staffAuthAPI`: no auth headers — correct for login/register

### Guest Flow Verification
- **Booking email → landing page**: BookingStatusPage correctly uses `publicAPI`, extracts token via `useSearchParams()`, persists to localStorage
- **Guest chat**: GuestChatPortal validates both `hotelSlug` and `token` before rendering, shows explicit error UI when missing
- **Room service**: RoomService.jsx uses `guestAPI` — token auto-injected by interceptor, proper error toasts on failure
- **Survey**: GuestSurveyPage uses `publicAPI`, handles all status codes (401, 410 expired, 409 already completed)
- **Pre-checkin**: GuestPrecheckinPage uses `publicAPI`, validates token on mount, shows error if missing
- **Breakfast**: Breakfast.jsx uses `guestBaseAPI` — correct
- **Dinner booking**: DinnerBookingForm.jsx uses `guestBaseAPI` — correct

### PIN/Session Cleanup
- No active PIN-based auth code remains in source
- Old PIN references in ChatWindow.jsx are cleanup comments only (lines 991, 1096, 1250)
- No `RequireDinnerPin` wrapper or PIN validation components exist
- No `guest_session` or session-based auth patterns found
- `memoryGameAPI.js` localStorage session references are game state, not auth

### Staff API Usage
- All staff-only services (roomOperations.js, staffApi.js, ChatContext.jsx, BookingNotificationContext.jsx) correctly use `api`
- All public services (publicApi.js, presetsService.js) correctly use `publicAPI`
- `guestChatAPI.js` correctly uses `guestAPI` with `requireGuestToken()` validation

---

## ⚠️ Remaining Risks

### Wrong API Client (3 files calling `/public/` endpoints via staff `api`)
- **`src/context/ThemeContext.jsx`** (~line 99): `api.get('/public/hotel/${hotelSlug}/page/')` — sends staff `Authorization` header to public endpoint; will fail for unauthenticated guest users loading themes
- **`src/pages/HotelPortalPage.jsx`** (~line 51): `api.get('/public/hotel/${hotelSlug}/page/')` — same issue; guest landing page fetch uses staff client
- **`src/pages/SuperUser.jsx`** (~line 126): `api.post('/public/hotel/${hotelSlug}/bootstrap/')` — staff client calling public bootstrap endpoint (lower impact since SuperUser is staff-only, but still incorrect client)

### Silent Token Failures
- **guestAPI interceptor** (`api.js` line 117–126): if `getGuestToken()` returns `null`, request is sent **without any token** — backend receives unauthenticated request with no explicit failure
- **`getGuestToken()`** returns `null` silently when no token exists in URL or localStorage — no warning logged for callers that expect a token

### Inconsistent Error Handling in guestChatAPI.js
- `getContext()`, `getMessages()`, `sendMessage()` all **throw** when token is missing
- `getPusherAuthEndpoint()` **returns null** instead of throwing — inconsistent; callers may not guard for null

### Minor
- **`src/components/app/AppLayoutShell.jsx`** (lines 36–40): uses raw `new URLSearchParams(location.search)` instead of React Router `useSearchParams()` — functional but inconsistent with rest of codebase
- **`src/components/guests/GuestEdit.jsx`**: still contains `id_pin` field in form state (line 15) and field list (line 72) — legacy field, should be removed if backend no longer accepts it

---

## 🎯 Next Frontend Tasks (MAX 5)

1. **Replace `api` with `publicAPI`** in ThemeContext.jsx, HotelPortalPage.jsx, and SuperUser.jsx — these are calling `/public/` endpoints with the staff auth client, which breaks guest-facing theme and portal loading
2. **Add console.warn in guestAPI interceptor** when `getGuestToken()` returns null — surface silent token failures instead of sending unauthenticated requests (`api.js` line ~122)
3. **Change `getPusherAuthEndpoint()` to throw** instead of returning null — align with the other 3 methods in guestChatAPI.js for consistent error handling
4. **Remove `id_pin` field** from GuestEdit.jsx form state and field list — dead field from removed PIN auth system
5. **Remove legacy PIN comments** in ChatWindow.jsx (lines 991, 1096, 1250) — cleanup leftover code comments referencing deleted auth system
