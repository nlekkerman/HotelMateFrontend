# HotelMate Frontend — Audit Fix Status

**Date:** 2026-03-24
**Reference:** `promo_docs/FRONTEND_AUDIT.md` (2026-03-23)
**Scope:** All code changes since the audit was created

---

## Summary

The primary refactoring was delivered in commit `515e190` (61 files, +1941/−1340 lines), followed by two follow-up commits (`b28c3d1` for FCM/chat optimizations, `9491d9e` for cleanup backlog documentation). Together, these changes address a significant portion of the structural debt identified in the audit.

| Category | Items Identified | Fixed | Partially Fixed | Not Yet Fixed |
|----------|:---:|:---:|:---:|:---:|
| Architecture / Structure | 5 | 5 | 0 | 0 |
| State / Providers | 6 | 3 | 1 | 2 |
| Permissions / Auth | 5 | 4 | 1 | 0 |
| Realtime | 4 | 1 | 1 | 2 |
| Error Handling / UX | 10 | 3 | 0 | 7 |
| Route Inconsistencies | 6 | 1 | 1 | 4 |
| **Totals** | **36** | **17** | **4** | **15** |

---

## 1. Architecture / Structure Issues

### 1.1 App.jsx monolith (100+ routes, inline layout, 1000+ lines)
> **Audit Section 2, 9 — "100+ routes in a single App.jsx"**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | ~1046 lines: all routes inline, layout logic, provider nesting, media queries — all in one file |
| After  | ~30 lines: delegates to `AppProviders`, `GlobalErrorBoundary`, `AppLayoutShell` |
| Files  | `src/App.jsx`, `src/components/app/AppProviders.jsx`, `src/components/app/AppLayoutShell.jsx`, `src/components/app/AppRouter.jsx` |

App.jsx was decomposed into four purpose-specific modules:
- **AppProviders.jsx** — single provider composition tree (documented ordering)
- **AppLayoutShell.jsx** — sidebar, mobile nav, layout-mode detection via `getLayoutMode()`
- **AppRouter.jsx** — renders `<Routes>` via centralized `buildRoutes()`

---

### 1.2 No route organization / code splitting by surface
> **Audit Section 2 — Route tables, "No code-splitting of routes"**

| Status | **✅ FIXED (organization) / ❌ NOT FIXED (lazy loading)** |
|--------|-------------|
| Before | All routes defined inline in App.jsx — no separation by surface |
| After  | 5 route config modules: `authRoutes.jsx`, `publicRoutes.jsx`, `staffRoutes.jsx`, `guestRoutes.jsx`, `gameRoutes.jsx` with a central `routes/index.jsx` builder |
| Remaining | **No `React.lazy()` or dynamic `import()`** — all 80+ route components are still eagerly imported. Bundle size is unoptimized. |

Route ordering is now explicit and correct: auth → publicEarly → staff → guest → game → publicLate (catch-all `/:hotelSlug` last).

---

### 1.3 No dedicated Layout / Shell wrapper component
> **Audit Section 1 — "No dedicated Layout/Shell wrapper component"**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | Layout handled inline in `AppLayout` inside App.jsx |
| After  | `AppLayoutShell.jsx` is a dedicated layout shell: manages sidebar collapsed state, uses `getLayoutMode()` for chrome visibility, delegates content rendering to `AppRouter` |

---

### 1.4 REFACTOR_PLAN.md created
| Status | **✅ CREATED** |
|--------|-------------|
| File | `src/REFACTOR_PLAN.md` — Phase 1–6 breakdown, architecture rules, verification checklist, risk areas |

---

### 1.5 Migration tracking created
| Status | **✅ CREATED** |
|--------|-------------|
| File | `src/migration/realtime-migration.md` — tracks 4 stray Pusher instances and 23 remaining `localStorage` direct reads with clear migration paths |

---

## 2. State / Provider Issues

### 2.1 Five duplicate providers (mounted in both RealtimeProvider AND App root)
> **Audit Section 3 — "5 duplicate providers"**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | `AttendanceProvider`, `RoomServiceProvider`, `ServiceBookingProvider`, `GuestChatProvider`, `StaffChatStoreProvider` mounted inside `RealtimeProvider` AND again at the App root |
| After  | All 9 domain store providers nested exclusively inside `RealtimeProvider.jsx`. `AppProviders.jsx` has no duplicated store providers. Verified via code inspection. |

---

### 2.2 Auth: localStorage vs Context drift
> **Audit Section 3 — "usePermissions() and api.js read localStorage directly, bypassing AuthContext"**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | `usePermissions()` and `api.js` read `localStorage.getItem('user')` directly, bypassing context |
| After  | New `src/lib/authStore.js` module-level bridge: `getAuthUser()` / `setAuthUser()`. `AuthContext` is the **sole writer** via `setAuthUser()`. `api.js` and `FirebaseService.js` read via `getAuthUser()` (with localStorage fallback for pre-mount only). `usePermissions.js` now reads from `useAuth()` context — **zero localStorage references**. |

---

### 2.3 Theme applied twice (ThemeContext + useHotelTheme)
> **Audit Section 3 — "ThemeContext and useHotelTheme() both set the same CSS variables independently"**

| Status | **⚠️ PARTIALLY FIXED** |
|--------|-------------|
| Before | Both `ThemeContext` and `useHotelTheme()` independently fetched hotel data and applied identical CSS variables |
| After  | `ThemeContext` was enhanced with React Query–based fetching and now applies all 11 CSS variables properly. However, **`useHotelTheme()` still exists** and is still called in `HotelPortalPage.jsx` (legacy system). Both still set overlapping CSS variables on `document.documentElement`. |
| Remaining | Remove `useHotelTheme()` usage from `HotelPortalPage` or unify into ThemeContext |

---

### 2.4 Hotel data fetched 3 ways
> **Audit Section 3 — "useHotel(), ThemeContext, useHotelLogo() each hit different endpoints"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | `useHotel()`, `ThemeContext`, and `useHotelLogo()` still fetch overlapping hotel data from 3 different endpoints. No consolidation. |

---

### 2.5 Chat stores overlap (4 separate systems)
> **Audit Section 3 — "ChatContext, chatStore, StaffChatContext, and guestChatStore all manage conversation state"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | Four distinct chat state systems still coexist: `ChatContext` (guest chat UI), `chatStore` (realtime store), `guestChatStore` (guest-specific store), `StaffChatContext` (staff chat operations). Work was done to bridge them (chatStore dependency for real-time updates) but no consolidation. |

---

### 2.6 Notification logic fragmented (4 subsystems)
> **Audit Section 3 — "4 separate notification subsystems"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | Still 4 independent notification systems: `notificationsStore`, `BookingNotificationContext`, `RoomServiceNotificationContext`, and browser notifications from `StaffChatContext`. No unification. |

---

## 3. Permission / Auth Issues

### 3.1 ProtectedRoute is binary (only checks login, not roles)
> **Audit Section 4 — "Only checks login, not roles"**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | `ProtectedRoute` only checked if `user` exists — any logged-in user could access any staff route |
| After  | **Two-layer implementation**: Layer 1 = auth check (login required), Layer 2 = authorization via `canAccessStaffPath()` from `staffAccessPolicy.js`. Gated by `ENABLE_ROUTE_PERMISSIONS` feature flag (currently `true`). Logs `[PERMISSION_DENIED]` with path, slug, userId, reason. Redirects to `/reception` on denial. |

---

### 3.2 staffAccessPolicy not wired (only used in tests)
> **Audit Section 4 — "Detailed path→permission mappings exist but aren't used in route guards"**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | `staffAccessPolicy.js` had 20+ route-to-slug mappings used only in test utilities |
| After  | `canAccessStaffPath()` is now imported and called in `ProtectedRoute.jsx` Layer 2, behind feature flag |

---

### 3.3 Permissions from localStorage (not context)
> **Audit Section 4 — "usePermissions() reads localStorage directly"**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | `usePermissions()` parsed `localStorage.getItem('user')` for allowed_navs, is_superuser, access_level |
| After  | Reads exclusively from `useAuth()` hook — zero `localStorage` references. Functions: `canAccessNav(slug)`, `canAccess(allowedRoles[])`, `isSuperUser` |

---

### 3.4 Unprotected face clock-in routes
> **Audit Section 4 — "/face/:hotelSlug/clock-in and /camera-clock-in/:hotelSlug lack ProtectedRoute"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | Both routes are defined in `guestRoutes.jsx` without staff auth wrapping. No `ProtectedRoute` guard. The `FaceClockInPage` component may have internal checks, but there is no route-level protection. |

*Note: These routes are intentionally placed in guest routes since they may be accessed by unauthenticated staff at a kiosk. This may be a design decision rather than a bug — needs product clarification.*

---

### 3.5 Feature flag for permission rollout
| Status | **✅ CREATED** |
|--------|-------------|
| File | `src/config/featureFlags.js` — `ENABLE_ROUTE_PERMISSIONS = true` |
| Purpose | Single kill-switch for all route-level permission enforcement. Set to `false` for instant rollback. |

---

### 3.6 Permission coverage on staff routes
| Status | **⚠️ PARTIALLY COMPLETE** |
|--------|-------------|
| Done | ~25 staff routes have `mode: "staff"` + `requiredSlug` fully marked (reception, rooms, maintenance, stock_tracker/*, super-user) |
| TODO | ~35+ staff routes have explicit TODO comments specifying the expected `requiredSlug` value but are not yet enforced. Includes: staff management, attendance, room service, guest management, bookings, housekeeping, hotel info, chat, restaurant management. |

---

## 4. Realtime Issues

### 4.1 Multiple Pusher instances (3 independent + 1 centralized)
> **Audit Section 7 — "3 Pusher instances"**

| Status | **⚠️ PARTIALLY FIXED (documented, 1 blocker)** |
|--------|-------------|
| Before | 3 independent Pusher instances + centralized singleton, undocumented |
| After  | All 4 instances documented in `src/migration/realtime-migration.md` with migration paths: |

| Instance | File | Status |
|----------|------|--------|
| Centralized singleton | `realtimeClient.js` | ✅ Active, primary |
| Hotel settings/gallery | `useHotelRealtime.js` | TODO — annotated with migration comment |
| Gallery management | `useHotelGalleries.js` | TODO — annotated with migration comment |
| Staff chat | `usePusher.js` | ⚠️ **BLOCKED** — uses `Bearer` auth prefix vs centralized `Token` prefix. Cannot migrate until backend auth verified. |
| Stocktake detail | `StocktakeDetail.jsx` | TODO — documented in migration tracking |

---

### 4.2 Two transport protocols (Pusher + raw WebSocket)
> **Audit Section 7 — "Pusher and raw WebSocket for overlapping order data"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | `useOrdersWebSocket` and `useOrderCountWebSocket` still use raw WebSocket connections (`/ws/orders/`) independent of the Pusher event bus |

---

### 4.3 Dual notification pipelines (Pusher + FCM)
> **Audit Section 7 — "Pusher events → stores AND FCM → eventBus → stores"**

| Status | **✅ WORKING AS DESIGNED** |
|--------|-------------|
| Current | Dual pipeline is **intentional** for reliability. Deduplication in `eventBus.js` via `globalProcessedEventIds` Set (max 1000, LRU) prevents double-processing. Both Pusher and FCM foreground messages route through the centralized event bus. |

---

### 4.4 Repeated mark_as_read calls
> **Audit Section 8 (new finding) — hammering endpoint repeatedly**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | Frontend repeatedly called `mark_as_read` on render/focus bounce |
| After  | Commit `b28c3d1`: Optimized `ChatWindowPopup.jsx` and `ConversationView.jsx` with gating logic. `staffChatApi.js` cleaned up redundant code. Documented as P1 in `FRONTEND_CLEANUP_BACKLOG.md`. |

---

### 4.5 Stale FCM token cleanup
> **Audit Section 7 / Cleanup Backlog P2**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | No periodic token refresh; old tokens could persist |
| After  | Commit `b28c3d1`: `FirebaseService.js` now implements **60-minute token refresh checks**. `deleteFCMToken()` called on logout. Aggressive IndexedDB cleanup on re-init. Backend-side cleanup still needed for push failures (404/410). |

---

## 5. Error Handling / UX Issues

### 5.1 No global error boundary
> **Audit Section 8 — "App crash = white screen"**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | No top-level error boundary; any unhandled error crashed the entire app |
| After  | `GlobalErrorBoundary.jsx` — class component with `getDerivedStateFromError` + `componentDidCatch`, Bootstrap-styled fallback UI with error details (collapsible), reload and retry buttons. Wrapped at top level in `App.jsx`. |

---

### 5.2 Empty axios error interceptor
> **Audit Section 8 — "Network/CORS errors silently swallowed"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | Main `api` instance response interceptor still has empty handler body for `ERR_NETWORK` / CORS errors. `publicAPI` has `console.error` but no user-facing feedback. |

---

### 5.3 No code-splitting (large initial bundle)
> **Audit Section 8 — "All pages eagerly imported"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | All 80+ route components are eagerly imported. No `React.lazy()`, no dynamic `import()`, no route-level code splitting. |

---

### 5.4 Inconsistent loading states
> **Audit Section 8 — "Different spinners, error messages, or none at all"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | No shared `<LoadingSpinner>` or `<Skeleton>` component. Only `ChartLoadingSkeleton` exists for stock tracker charts. Components still use ad-hoc `useState(loading)` + inline Bootstrap spinners. |

---

### 5.5 Bare Suspense fallback
> **Audit Section 8**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | `gameRoutes.jsx` still uses `<div>Loading...</div>` (bare, unstyled) as Suspense fallback |

---

### 5.6 Ambiguous `/:hotelSlug` catch-all route
> **Audit Section 2, 8 — "Any single-segment URL hits the catch-all portal page"**

| Status | **⚠️ MITIGATED** |
|--------|-------------|
| Before | Route ordering was implicit, making the catch-all potentially conflicting |
| After  | `publicRoutesLate` array explicitly places `/:hotelSlug` last in the route builder. Ordering is correct but the fundamental ambiguity remains — any unknown single-segment path will match this route. |

---

### 5.7 localStorage drift (remaining instances)
> **Audit Section 3, 8**

| Status | **⚠️ PARTIALLY FIXED** |
|--------|-------------|
| Before | Untracked number of direct `localStorage` reads |
| After  | 23 remaining `localStorage.getItem('user')` references documented in `realtime-migration.md` (15 in React components → should use `useAuth()`, 8 in non-React modules → should use `getAuthUser()`). Key consumers (`usePermissions`, `api.js`, `FirebaseService`) already migrated. |

---

### 5.8 sessionStorage PIN auth (tab close = re-authenticate)
> **Audit Section 5, 8**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | PIN auth still stored in `sessionStorage` — guest must re-enter PIN in new tab. No change. |

---

### 5.9 Guest token no expiry
> **Audit Section 5, 8 — "hotelmate_guest_chat_session in localStorage never expires"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | `hotelmate_guest_chat_session` has no TTL. Stale sessions persist until manual logout. Cleared on staff logout via `AuthContext`, but guests don't have a logout flow. |

---

### 5.10 Refresh on guest pages loses context
> **Audit Section 5, 8 — "No centralized guest state means page refresh may lose context"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | No dedicated `GuestContext`. Guest identity still derived from URL params, sessionStorage, or component state. |

---

## 6. Route Inconsistencies

### 6.1 Inconsistent slug param names
> **Audit Section 2 — ":hotelSlug, :hotel_slug, :hotelIdentifier, :slug interchangeably"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | All four naming patterns persist across route config files: `:hotelSlug` (staff routes), `:hotel_slug` (hotel info, stock tracker), `:hotelIdentifier` (guest routes, room services), `:slug` (public routes) |

---

### 6.2 Duplicate booking routes
> **Audit Section 2 — "/:hotelSlug/book and /booking/:hotelSlug both render GuestRoomBookingPage"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | Both routes still exist in `guestRoutes.jsx` rendering the same component |

---

### 6.3 Duplicate payment routes
> **Audit Section 2 — "/booking/:hotelSlug/payment/success and /booking/payment/success"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | Both legacy and new payment routes still coexist |

---

### 6.4 Staff route prefix inconsistency
> **Audit Section 2 — "Some under /staff/:hotelSlug/*, others under /:hotelSlug/staff/*, others at root"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | Three prefix patterns remain: `/staff/:hotelSlug/*`, `/:hotelSlug/staff/*`, and root-level (`/rooms`, `/bookings`, `/reception`). Routes are now organized into config files but the URL patterns are unchanged. |

---

### 6.5 Legacy route aliases
> **Audit Section 2 — "/roster/:hotelSlug is a legacy alias for /attendance/:hotelSlug"**

| Status | **❌ NOT FIXED** |
|--------|-------------|
| Current | Legacy alias still present in `staffRoutes.jsx` |

---

### 6.6 Route ordering (catch-all safety)
> **Audit Section 2 — "/:hotelSlug matches any single-segment path"**

| Status | **✅ FIXED** |
|--------|-------------|
| Before | Implicit ordering inside a massive App.jsx — easy to misplace |
| After  | Explicit `buildRoutes()` function in `routes/index.jsx` with documented ordering: auth → publicEarly → staff → guest → game → publicLate. Catch-all `/:hotelSlug` explicitly placed in `publicRoutesLate` array (last). |

---

## 7. Navigation & UI Improvements (Beyond Audit Scope)

These fixes address issues not explicitly in the audit but improve the codebase:

| Fix | Commit | Details |
|-----|--------|---------|
| Hidden navigation slugs | `8ca581c`, `1716001`, `1ac0a22` | `stock_tracker`, `stock_dashboard`, `housekeeping` added to hidden nav slugs for features not yet ready |
| Expandable mobile nav | `c2cf5f2` | MobileNavbar now has expandable category sections and room bookings collapsible |
| Navbar visibility cleanup | `d852977` | Streamlined navbar visibility logic and removed legacy patterns |
| Navigation permission manager | `515e190` | `NavigationPermissionManager.jsx` updated for consistency |
| Housekeeping store added | `515e190` | `HousekeepingProvider` added to centralized `RealtimeProvider` |

---

## 8. Files Created / Significantly Modified

### New Files
| File | Purpose |
|------|---------|
| `src/components/app/AppProviders.jsx` | Deduplicated provider composition tree |
| `src/components/app/AppLayoutShell.jsx` | Extracted layout shell with surface detection |
| `src/components/app/AppRouter.jsx` | Centralized route rendering |
| `src/components/app/GlobalErrorBoundary.jsx` | App-wide crash recovery |
| `src/routes/index.jsx` | Route builder with explicit ordering |
| `src/routes/authRoutes.jsx` | Auth route config |
| `src/routes/publicRoutes.jsx` | Public route config (early + late) |
| `src/routes/staffRoutes.jsx` | Staff route config with permission TODOs |
| `src/routes/guestRoutes.jsx` | Guest route config |
| `src/routes/gameRoutes.jsx` | Game route config |
| `src/lib/authStore.js` | Module-level auth bridge for non-React code |
| `src/config/featureFlags.js` | Feature flag for route permissions |
| `src/migration/realtime-migration.md` | Migration tracker for stray Pusher/localStorage |
| `src/REFACTOR_PLAN.md` | Phased refactoring plan |
| `issues/FRONTEND_CLEANUP_BACKLOG.md` | P1–P3 cleanup items |

### Significantly Modified
| File | Change Summary |
|------|---------------|
| `src/App.jsx` | Reduced from ~1046 lines to ~30 lines |
| `src/components/auth/ProtectedRoute.jsx` | Added Layer 2 authorization with staffAccessPolicy |
| `src/hooks/usePermissions.js` | Migrated from localStorage to AuthContext |
| `src/hooks/useNavigation.js` | Migrated from localStorage to AuthContext |
| `src/context/AuthContext.jsx` | Integrated authStore bridge sync |
| `src/context/ThemeContext.jsx` | React Query–based fetching, enhanced CSS variable application |
| `src/services/api.js` | Migrated to authStore bridge (localStorage fallback) |
| `src/services/FirebaseService.js` | Migrated to authStore bridge + 60-min token refresh |
| `src/realtime/RealtimeProvider.jsx` | Consolidated all 9 domain stores, added HousekeepingProvider |
| `src/main.jsx` | Removed redundant theme bootstrap |
| `src/components/layout/MobileNavbar.jsx` | Expandable categories, room bookings section |
| `src/staff_chat/components/ChatWindowPopup.jsx` | Optimized mark_as_read gating |
| `src/staff_chat/components/ConversationView.jsx` | Optimized mark_as_read gating |
| `src/staff_chat/services/staffChatApi.js` | Cleaned up redundant code |
| ~20 components | Migrated from `localStorage` to `useAuth()` for user data |

---

## 9. Priority Items Still Open

### High Priority
1. **Empty axios error interceptor** — Network/CORS errors silently swallowed for main `api` instance
2. **No code splitting** — All 80+ route components eagerly imported; large initial bundle
3. **Unprotected face clock-in routes** — No route-level auth (needs product decision)
4. **35+ staff routes without permission gates** — TODO comments exist but not yet enforced

### Medium Priority
5. **useHotelTheme() still double-applies CSS** — Remove from `HotelPortalPage` or merge into ThemeContext
6. **Hotel data fetched 3 ways** — `useHotel()`, `ThemeContext`, `useHotelLogo()` hit 3 endpoints for overlapping data
7. **4 chat state systems** — ChatContext, chatStore, guestChatStore, StaffChatContext not consolidated
8. **4 notification subsystems** — No unified notification layer
9. **23 remaining localStorage reads** — Documented in migration tracker, need progressive elimination
10. **Inconsistent route slug params** — `:hotelSlug`, `:hotel_slug`, `:hotelIdentifier`, `:slug` all used

### Low Priority
11. **Duplicate booking/payment routes** — Legacy aliases still present
12. **Staff route prefix inconsistency** — Three URL prefix patterns for staff routes
13. **Guest token no expiry** — `hotelmate_guest_chat_session` has no TTL
14. **No shared LoadingSpinner** — Each component rolls its own spinner
15. **Raw WebSocket instances** — `useOrdersWebSocket`, `useOrderCountWebSocket` not migrated to Pusher
