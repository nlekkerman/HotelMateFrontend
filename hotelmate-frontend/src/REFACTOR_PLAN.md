# HotelMate Frontend Architectural Refactor — Plan v2

Refactor App.jsx into composable modules (AppProviders, AppRouter, AppLayoutShell, GlobalErrorBoundary), remove duplicated providers, consolidate auth reads onto AuthContext, upgrade ProtectedRoute with 2-layer permission gating, split routes into config-object modules, and add a top-level error boundary. No behavior changes except fixing the authorization gap in ProtectedRoute.

---

## Phase 1 — Auth Foundation *(blocking — others depend on this)*

### Step 1.1: Create auth bridge for non-React code
- **Create** `src/lib/authStore.js`
  - Module-level `let _user = null`
  - Exports `getAuthUser()` (read-only) and `setAuthUser(user)` (write-only)
  - **RULE: `setAuthUser` is called ONLY inside AuthProvider — never elsewhere**
  - Purpose: lets `api.js` and `realtimeClient.js` read auth state without localStorage

### Step 1.2: Update AuthContext to sync auth bridge
- **Modify** `src/context/AuthContext.jsx`
  - Import `setAuthUser` — call it in `login()`, `logout()`, and initial hydration
  - AuthProvider is the **single writer** to authStore

### Step 1.3: Refactor usePermissions to read from AuthContext
- **Modify** `src/hooks/usePermissions.js`
  - Replace `localStorage.getItem("user")` with `useAuth()` hook
  - Keep all `canAccessNav()`, `canAccess()` logic unchanged

### Step 1.4: Update api.js interceptor to use auth bridge
- **Modify** `src/services/api.js`
  - Primary: `getAuthUser()` from authStore
  - Fallback: `localStorage.getItem('user')` (only for requests before AuthProvider mounts)

---

## Phase 2 — ProtectedRoute Upgrade *(depends on Phase 1)*

### Step 2.1: Two-layer ProtectedRoute design
- **Modify** `src/components/auth/ProtectedRoute.jsx`
- Props:
  - `mode` — `"auth"` (just login check) or `"staff"` (login + permission check). Default: `"auth"`
  - `requiredSlug` — nav slug to check (only used when `mode="staff"`)
  - `unauthorizedRedirect` — where to send denied users (default: `"/reception"`)
- Logic:
  1. **Layer 1 (global)**: If no `user` → redirect to `/login`
  2. **Layer 2 (per-route, mode="staff" only)**: Call `canAccessStaffPath({ pathname, user })` → if denied, redirect to `unauthorizedRedirect`
- Backward compatible: `<ProtectedRoute>` with no props = auth-only (existing behavior)

### Step 2.2: Feature flag for permission enforcement
- **Create** `src/config/featureFlags.js`
  - `export const ENABLE_ROUTE_PERMISSIONS = true;`
  - ProtectedRoute checks this flag — if false, Layer 2 is skipped
  - **Instant rollback**: set to `false` to disable all route permission checks in prod

### Step 2.3: Permission denial logging
- In ProtectedRoute Layer 2 denial:
  ```js
  console.warn("[PERMISSION DENIED]", { path: pathname, requiredSlug, userId: user?.id });
  ```
- Saves hours debugging in prod

### Step 2.4: Wire staffAccessPolicy into routes (incremental)
- Add `mode="staff" requiredSlug="..."` to high-value routes first:
  - `/reception` → `"reception"`
  - `/rooms` → `"rooms"`
  - `/maintenance` → `"maintenance"`
  - `/stock_tracker/*` → `"stock_tracker"`
  - `/super-user` → requires superuser
  - settings routes → `"super_staff_admin"`
- Add `// TODO: Add mode="staff" requiredSlug="..."` on remaining staff routes

---

## Phase 3 — Provider Deduplication + ErrorBoundary *(parallel with Phase 2)*

### Step 3.1: Remove 5 duplicated providers from App.jsx
- Already inside `RealtimeProvider.jsx`:
  - `AttendanceProvider` ✅
  - `RoomServiceProvider` ✅
  - `ServiceBookingProvider` ✅
  - `GuestChatProvider` ✅
  - `StaffChatStoreProvider` (ChatProvider from chatStore) ✅
- Remove from App.jsx + remove imports

### Step 3.2: Add HousekeepingProvider to RealtimeProvider
- **Modify** `src/realtime/RealtimeProvider.jsx` — import and nest `HousekeepingProvider`
- **Add temporary trace log**: `console.log("[RealtimeProvider] HousekeepingProvider mounted")`
- Verify: mounts once, receives expected data

### Step 3.3: Create GlobalErrorBoundary
- **Create** `src/components/app/GlobalErrorBoundary.jsx`
  - Class component with `getDerivedStateFromError` + `componentDidCatch`
  - Fallback UI: Bootstrap card with error message, collapsible details, "Reload" button
  - Pattern: existing `ChartErrorBoundary.jsx`

---

## Phase 4 — Route Splitting *(parallel with Phase 2; depends on Phase 3.1)*

### Key change from v1: Export config objects, not JSX

Route modules export arrays of config objects:
```js
// Example route config object
{
  path: "/rooms",
  element: <RoomList />,
  protected: true,
  mode: "staff",
  requiredSlug: "rooms"
}
```

Routes are built in ONE central place (`src/routes/index.jsx`) to preserve:
- Route order (critical for `/:hotelSlug` catch-all)
- Centralized logic
- Debuggability

### Step 4.1: Create route config modules
- `src/routes/authRoutes.jsx` — login, logout, register, forgot-password, reset-password, registration-success, no-internet
- `src/routes/publicRoutes.jsx` — /, hotel pages, shootar, /:hotelSlug portal, catch-all
- `src/routes/guestRoutes.jsx` — PIN auth, room service menus, dinner bookings, guest chat, booking flow
- `src/routes/staffRoutes.jsx` — all staff routes with `mode` and `requiredSlug` 
- `src/routes/gameRoutes.jsx` — all /games/* routes

### Step 4.2: Create route builder
- `src/routes/index.jsx` — imports all config arrays, builds `<Route>` elements in correct order
- Single `buildRoutes()` function that maps config → JSX
- Handles ProtectedRoute wrapping based on `protected` and `mode` flags

---

## Phase 5 — App.jsx Decomposition *(depends on Phases 3, 4)*

### Step 5.1: Create AppProviders → `src/components/app/AppProviders.jsx`
- Cleaned provider tree (no duplicates):
  ```
  BrowserRouter > QueryClientProvider > ToastContainer > UIProvider > AuthProvider >
  RealtimeProvider > ChatProvider(context) > MessengerProvider > ThemeProvider >
  ChartPreferencesProvider > StaffChatProvider > BookingNotificationProvider >
  RoomServiceNotificationProvider > {children}
  ```

### Step 5.2: Create AppLayoutShell → `src/components/app/AppLayoutShell.jsx`
- Extract current `AppLayout` function (sidebar, mobile nav, layoutMode, LogoBanner)

### Step 5.3: Create AppRouter → `src/components/app/AppRouter.jsx`
- Imports built routes from `src/routes/index.jsx`, renders `<Routes>`

### Step 5.4: Simplify App.jsx to ~30 lines
- Composes: `AppProviders > GlobalErrorBoundary > NetworkHandler + MessengerWidget + AppLayoutShell`

---

## Phase 6 — Migration Tracking + TODOs

### Step 6.1: Create migration tracking file
- **Create** `src/migration/realtime-migration.md`
- Track ALL stray Pusher instances:
  - `src/hooks/useHotelRealtime.js` — `new Pusher()` for hotel settings/gallery
  - `src/hooks/useHotelGalleries.js` — `new Pusher()` for gallery management
  - `src/staff_chat/hooks/usePusher.js` — `new Pusher()` for staff chat
  - `src/components/stock_tracker/stocktakes/StocktakeDetail.jsx` — `new Pusher()` for stocktake
- Track ALL direct localStorage reads that should migrate to useAuth():
  - List every file from grep results

### Step 6.2: Add TODO comments in source files
- Stray Pusher files: `// TODO: Migrate to centralized realtime — see src/migration/realtime-migration.md`
- localStorage reader files: `// TODO: Migrate to useAuth() context — see src/migration/realtime-migration.md`

---

## Architecture Rules

| Rule | Enforcement |
|------|-------------|
| `authStore` is write-only inside AuthProvider | Code convention — `setAuthUser()` imported only in AuthContext.jsx |
| Permission checks read from AuthContext, never localStorage at runtime | `usePermissions()` uses `useAuth()` |
| API interceptor reads from authStore bridge | `getAuthUser()` with localStorage fallback for pre-mount only |
| Route permissions have feature flag | `ENABLE_ROUTE_PERMISSIONS` in `src/config/featureFlags.js` |
| Permission denials are logged | `console.warn("[PERMISSION DENIED]", ...)` in ProtectedRoute |
| Provider deduplication is verified | Each store provider appears exactly once (inside RealtimeProvider) |
| Route ordering is centralized | All routes built in `src/routes/index.jsx` from config objects |

---

## Verification Checklist

- [ ] Each store provider appears exactly once (inside RealtimeProvider)
- [ ] `usePermissions.js` has zero `localStorage` references
- [ ] `api.js` uses authStore as primary source
- [ ] ProtectedRoute: unauthenticated → `/login`
- [ ] ProtectedRoute: authenticated without slug → denied (mode="staff")
- [ ] ProtectedRoute: superuser → all access
- [ ] Feature flag `false` → Layer 2 skipped
- [ ] Permission denial logged to console
- [ ] GlobalErrorBoundary catches thrown error, shows fallback
- [ ] All route paths identical before/after
- [ ] HousekeepingProvider trace log shows single mount
- [ ] Smoke test: staff login/logout, nav filtering, realtime events, guest flows, games, bookings

---

## Risks Requiring Manual QA

1. **Provider ordering change** — 5 duplicate providers removed, HousekeepingProvider relocated. Test: all realtime features
2. **ProtectedRoute `requiredSlug`** — if PATH_TO_NAV_MAPPING has gaps, routes could be blocked. Test: regular staff (not superuser) navigating all protected routes
3. **Route ordering after split** — `/:hotelSlug` catch-all must remain last. Test: every route category
4. **usePermissions context switch** — could differ if context/localStorage temporarily desync. Test: nav sidebar immediately after login
5. **Feature flag discipline** — `ENABLE_ROUTE_PERMISSIONS = false` must cleanly disable Layer 2

---

## New Files Created

```
src/
├── lib/
│   └── authStore.js                    # Auth bridge (read-only outside AuthProvider)
├── config/
│   └── featureFlags.js                 # ENABLE_ROUTE_PERMISSIONS flag
├── components/
│   └── app/
│       ├── GlobalErrorBoundary.jsx     # Top-level error boundary
│       ├── AppProviders.jsx            # Provider composition
│       ├── AppLayoutShell.jsx          # Layout shell
│       └── AppRouter.jsx              # Route assembly
├── routes/
│   ├── authRoutes.jsx                  # Auth route configs
│   ├── publicRoutes.jsx                # Public route configs
│   ├── guestRoutes.jsx                 # Guest route configs
│   ├── staffRoutes.jsx                 # Staff route configs
│   ├── gameRoutes.jsx                  # Game route configs
│   └── index.jsx                       # Route builder (single place)
└── migration/
    └── realtime-migration.md           # Tracks stray Pusher + localStorage reads
```

## Modified Files

```
src/App.jsx                             # Decomposed to ~30 lines
src/context/AuthContext.jsx             # Syncs authStore bridge
src/components/auth/ProtectedRoute.jsx  # 2-layer with mode prop
src/hooks/usePermissions.js             # Reads from useAuth() not localStorage
src/services/api.js                     # Reads from authStore bridge
src/realtime/RealtimeProvider.jsx       # Adds HousekeepingProvider
```
