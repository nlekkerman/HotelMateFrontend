# Frontend Permission, Navigation & Route Audit

**Date:** 2026-04-10
**Scope:** `hotelmate-frontend/src/` — audit only, no recommendations

---

## A. Navigation Components Inventory

### Primary Navigation Components

| # | Component | File | Type | Items | Hardcoded? | Auth/Permission Imports |
|---|-----------|------|------|-------|------------|------------------------|
| 1 | `BigScreenNavbar` | `src/components/layout/BigScreenNavbar.jsx` | Desktop sidebar | 23 items, 4 categories | No — config-driven via `useNavigation()` | `usePermissions()`, `useAuth()` |
| 2 | `MobileNavbar` | `src/components/layout/MobileNavbar.jsx` | Mobile navbar | 23 items, 4 categories | No — config-driven via `useNavigation()` | `usePermissions()`, `useAuth()` |
| 3 | `NavbarWrapper` | `src/components/layout/NavbarWrapper.jsx` | Responsive wrapper | Delegates to #1 or #2 | N/A | N/A |
| 4 | `Navbar` | `src/components/layout/Navbar.jsx` | **Legacy** navbar | ~23 items | Yes — hardcoded JSX | `useAuth()`, direct role checks |
| 5 | `ChatSidebar` | `src/components/chat/ChatSidebar.jsx` | Chat sidebar | Dynamic (conversations) | Data-driven from props | Guest/staff context |
| 6 | `AppLayoutShell` | `src/components/app/AppLayoutShell.jsx` | Layout wrapper | Owns sidebar chrome | Delegates to #1 and #2 | `getLayoutMode()` |

### Configuration & Hooks

| # | Name | File | Purpose |
|---|------|------|---------|
| 7 | `NAVIGATION_CATEGORIES` | `src/config/navigationCategories.js` | 4 categories: Front Office, F&B, Staff, Guest Relations |
| 8 | `NAV_ITEM_CATEGORY_MAP` | `src/config/navigationCategories.js` | Maps 23 nav slugs → categories |
| 9 | `useNavigation()` | `src/hooks/useNavigation.js` | Returns `visibleNavItems`, `categories`, `uncategorizedItems`, `allNavItems` |

### Dashboard / Tab Navigation Components

| # | Component | File | Items | Hardcoded? | Auth |
|---|-----------|------|-------|------------|------|
| 10 | `Staff` | `src/components/staff/Staff.jsx` | 4 tabs (Directory, Packages, Pending, Departments) | Yes — hardcoded JSX | `usePermissions()` — admin-only tabs hidden |
| 11 | `RoomManagementPage` | `src/pages/staff/RoomManagementPage.jsx` | 2 tabs (Room Types, Rooms) | Yes — `TABS` array | `useAuth()` |
| 12 | `EnhancedAttendanceDashboard` | `src/features/attendance/components/EnhancedAttendanceDashboard.jsx` | 4 tabs (Summary, Departments, Individuals, Roster) | Yes — hardcoded | None explicit |
| 13 | `GamesDashboard` | `src/games/GamesDashboard.jsx` | 5 game cards | Yes — hardcoded JSX | None |
| 14 | `RestaurantManagementDashboard` | `src/pages/bookings/RestaurantManagementDashboard.jsx` | Dynamic (API) | Data-driven | `useAuth()` |
| 15 | `BookingManagementDashboard` | `src/components/bookings/BookingManagementDashboard.jsx` | 5 config panels | Yes — hardcoded | `useAuth()` |
| 16 | `StockDashboard` | `src/pages/stock_tracker/StockDashboard.jsx` | 2 buttons (Items, Profitability) | Yes — hardcoded | None explicit |

### Navigation Items (DEFAULT_NAV_ITEMS in useNavigation.js)

23 items across 4 categories + 2 uncategorized:

**Uncategorized:**
- Home → `/staff/{hotelSlug}/feed`
- Settings → `/staff/{hotelSlug}/settings`

**Front Office:**
- Reception → `/reception`
- Rooms → `/rooms`
- Room Management → `/staff/hotel/{hotelSlug}/room-management` (`allowedRoles: ['super_staff_admin']`)
- Guests → `/{hotelSlug}/guests`
- Chat → `/hotel/{hotelSlug}/chat`
- Room Bookings → `/staff/hotel/{hotelSlug}/room-bookings` (has dropdown)

**F&B:**
- Restaurants → `/{hotelSlug}/restaurants`
- Restaurant Bookings → `/restaurant-bookings`
- Room Service → `/room_services/{hotelSlug}/orders-management`
- Breakfast → `/room_services/{hotelSlug}/breakfast-orders`
- Menus Management → `/menus_management/{hotelSlug}` (`allowedRoles: ['super_staff_admin']`)

**Staff:**
- Staff → `/{hotelSlug}/staff`
- Attendance → `/attendance/{hotelSlug}`
- Department Roster → `/department-roster/{hotelSlug}`
- Management Analytics → `/enhanced-attendance/{hotelSlug}`
- Maintenance → `/maintenance`

**Guest Relations:**
- Hotel Info → `/hotel_info/{hotelSlug}`
- Good to Know → `/good_to_know_console/{hotelSlug}`
- Games → `/games/?hotel={hotelSlug}`

**Permanently hidden via `HIDDEN_NAV_SLUGS`:** `stock_tracker`, `stock_dashboard`, `housekeeping`

---

## B. Role/Access Data Sources

### 1. AuthContext (React Context)

**File:** `src/context/AuthContext.jsx`
**Hook:** `useAuth()`

**Exported properties:**
- `user` — full user object from localStorage
- `login(userData)` — sets state + localStorage + authStore bridge
- `logout()` — clears everything
- `isStaff` — computed: `user?.is_staff || user?.is_superuser || access_level in ['staff_admin', 'super_staff_admin'] || user?.staff_id`
- `viewMode` — `'guest'` or `'staff'` (localStorage-backed)
- `selectedHotel` — multi-hotel browsing context

**User object shape (set during login):**

```
id, staff_id, token, username, hotel_id, hotel_name, hotel_slug,
is_staff, is_superuser, access_level, department, role,
allowed_navs[], navigation_items[], isAdmin, profile_image_url, hotel{}
```

### 2. authStore (Non-React Bridge)

**File:** `src/lib/authStore.js`

- `getAuthUser()` — read-only for non-React code (axios interceptors, Pusher, realtime)
- `setAuthUser(user)` — write-only, called exclusively by AuthProvider

**Consumers:** `src/services/api.js`, `src/context/ThemeContext.jsx`, `src/realtime/stores/chatStore.jsx`, `src/services/FirebaseService.js`, `src/realtime/realtimeClient.js`

### 3. usePermissions Hook

**File:** `src/hooks/usePermissions.js`

**Returns:**

| Property | Type | Source |
|----------|------|--------|
| `canAccessNav(slug)` | function → boolean | Checks `slug` in `user.allowed_navs[]`; superusers bypass |
| `canAccess(roleArray)` | function → boolean | Matches `user.role` or `user.access_level` against array; superusers bypass |
| `allowedNavs` | `string[]` | Direct ref to `user.allowed_navs` |
| `accessLevel` | `string` | Direct ref to `user.access_level` |
| `isSuperUser` | `boolean` | Direct ref to `user.is_superuser` |

**Does NOT export:** `isSuperStaffAdmin`, `isStaffAdmin`, `isStaff`

### 4. useNavigation Hook

**File:** `src/hooks/useNavigation.js`

- Sources from `user?.navigation_items` (backend authoritative)
- Falls back to `DEFAULT_NAV_ITEMS`
- Filters via `allowedRoles` per item + `HIDDEN_NAV_SLUGS`
- Only 2 items have `allowedRoles`: `menus_management` and `room_management` (both `['super_staff_admin']`)

### 5. usePublicPagePermissions Hook

**File:** `src/hooks/usePublicPagePermissions.js`

**Returns:**
- `isOwnHotel` — `user.hotel_slug === pageHotelSlug`
- `hasEditAccess` — `isSuperUser || canAccess(['staff_admin', 'super_staff_admin'])`
- `canEditPublicPage` — `isStaff && isOwnHotel && hasEditAccess`

### 6. Login Endpoint & Data Flow

**File:** `src/hooks/useLogin.js`
**Endpoint:** `POST /staff/login/`

**Response fields captured:**

```js
id, staff_id, token, username, hotel_id, hotel_name, hotel_slug,
is_staff, is_superuser, access_level, department, role,
allowed_navs[], navigation_items[], isAdmin (computed), profile_image_url, hotel{}
```

**`isAdmin` computed at login:** `data.is_superuser || ["staff_admin", "super_staff_admin"].includes(data.access_level)`

### 7. API Interceptor (Token Injection)

**File:** `src/services/api.js`

Reads from `getAuthUser()` (fallback: localStorage). Injects:
- `Authorization: Token ${token}`
- `X-Hotel-ID: ${hotelId}`
- `X-Hotel-Slug: ${hotelSlug}`

### 8. Data Flow Summary

```
POST /staff/login/  →  response {token, is_superuser, allowed_navs[], ...}
         │
         ▼  (useLogin hook)
  ┌──────────────────────────────────────┐
  │ localStorage.setItem('user', JSON)   │
  │ AuthContext.login(userData)           │
  │   ├→ setState(user)                  │
  │   └→ setAuthUser(userData)  [bridge] │
  └──────────────────────────────────────┘
         │
         ▼  (consumed via 3 paths)
  ┌──────────────────────────────────────┐
  │ useAuth()        → React components  │
  │ getAuthUser()    → non-React code    │
  │ localStorage     → fallback at init  │
  └──────────────────────────────────────┘
         │
         ▼  (usePermissions derives)
  ┌──────────────────────────────────────┐
  │ role         ← user.role             │
  │ isSuperUser  ← user.is_superuser     │
  │ allowedNavs  ← user.allowed_navs[]   │
  │ accessLevel  ← user.access_level     │
  └──────────────────────────────────────┘
```

---

## C. Permission-Check Patterns Inventory

### Pattern 1: `isSuperUser` / `is_superuser`

~81 matches. Superuser bypass — top-level global admin.

| File | Usage |
|------|-------|
| `src/hooks/usePermissions.js` | `const isSuperUser = user?.is_superuser` — canonical derivation |
| `src/pages/SuperUser.jsx` | `if (!user?.is_superuser)` — page-level guard |
| `src/components/layout/Navbar.jsx` | `const isSuperUser = user?.is_superuser` — navitem filtering |
| `src/components/layout/MobileNavbar.jsx` | `{user?.is_superuser && (...)}` — SuperUser panel visibility |
| `src/context/AuthContext.jsx` | `user?.is_superuser` — isStaff derivation |
| `src/context/ThemeContext.jsx` | `const isSuperUser = user?.is_superuser` — theme settings gate |
| `src/policy/staffAccessPolicy.js` | `if (user.is_superuser)` — all-access bypass |
| `src/components/stock_tracker/periods/PeriodSnapshots.jsx` | `const isSuperuser = user?.is_superuser === true` |
| `src/hooks/useLogin.js` | `isAdmin: data.is_superuser \|\| [...]` |

### Pattern 2: `access_level === 'super_staff_admin'`

~38 matches. Hotel-level super admin.

| File | Usage |
|------|-------|
| `src/context/AuthContext.jsx` | `user?.access_level === 'super_staff_admin'` — isStaff check |
| `src/context/ThemeContext.jsx` | `const isSuperStaffAdmin = user?.access_level === 'super_staff_admin'` |
| `src/components/layout/Navbar.jsx` | `const isSuperStaffAdmin = accessLevel === "super_staff_admin"` |
| `src/components/utils/Settings.jsx` | `canAccess(['super_staff_admin'])` |
| `src/hooks/usePublicPagePermissions.js` | `canAccess(['staff_admin', 'super_staff_admin'])` |
| `src/policy/staffAccessPolicy.js` | `if (user.access_level === 'super_staff_admin')` — all-access bypass |
| `src/components/staff/Staff.jsx` | `canAccess(["staff_admin", "super_staff_admin"])` |
| `src/components/staff/StaffDetails.jsx` | `canAccess(['staff_admin', 'super_staff_admin'])` |
| `src/components/rooms/RoomList.jsx` | `canAccess(['super_staff_admin'])` |
| `src/pages/sections/SectionEditorPage.jsx` | `const { isSuperStaffAdmin } = usePermissions()` — **BROKEN** (not exported) |

### Pattern 3: `isStaff` / `is_staff`

~96 matches. Distinguish staff vs guests.

| File | Usage |
|------|-------|
| `src/context/AuthContext.jsx` | `const isStaff = user?.is_staff \|\| user?.is_superuser \|\| access_level in [...] \|\| user?.staff_id` |
| `src/hooks/usePublicPagePermissions.js` | `const { user, isStaff } = useAuth()` |
| `src/policy/staffAccessPolicy.js` | `if (!user \|\| !user.is_staff)` |
| `src/pages/hotels/HotelsLandingPage.jsx` | `if (user && isStaff && !viewAllHotels)` |
| `src/sections/GuestHotelHome.jsx` | `isStaff = user.is_staff \|\| user.is_staff_member \|\| user.role === 'staff' \|\| user.staff_id` |
| `src/realtime/RealtimeProvider.jsx` | `user?.is_staff \|\| user?.role === 'staff' \|\| user?.isStaff` |
| `src/components/hotels/GallerySection.jsx` | `const activeGalleries = isStaff ? allGalleries : activeOnly` |

### Pattern 4: `canAccess(allowedRoles)` / `canAccessNav(slug)`

100+ matches. Primary hook-based permission gate.

| File | Usage |
|------|-------|
| `src/components/utils/Settings.jsx` | `isSuperUser \|\| canAccess(['super_staff_admin'])` |
| `src/components/staff/Staff.jsx` | `isSuperUser \|\| canAccess(["staff_admin", "super_staff_admin"])` |
| `src/components/staff/StaffDetails.jsx` | `canAccess(['staff_admin', 'super_staff_admin'])` |
| `src/components/rooms/RoomList.jsx` | `canAccess(['super_staff_admin'])` |
| `src/components/layout/MobileNavbar.jsx` | `canAccess('room-bookings')` |
| `src/components/layout/BigScreenNavbar.jsx` | `const { canAccess } = usePermissions()` |
| `src/hooks/usePublicPagePermissions.js` | `isSuperUser \|\| canAccess(['staff_admin', 'super_staff_admin'])` |
| `src/components/staff/RegistrationPackagesPanel.jsx` | `canAccess(['staff_admin', 'super_staff_admin'])` |

### Pattern 5: `allowedRoles` / `allowedNavs` (Navigation permissions)

~33 matches. Backend-authoritative nav access.

| File | Usage |
|------|-------|
| `src/hooks/usePermissions.js` | `const allowedNavs = user?.allowed_navs \|\| []` |
| `src/hooks/useNavigation.js` | `item.allowedRoles` filtering in `passesRoleGate` |
| `src/policy/staffAccessPolicy.js` | `if (!allowedNavs.includes(requiredNavSlug))` |
| `src/hooks/useLogin.js` | `allowed_navs: data.allowed_navs \|\| []` |
| `src/components/staff/StaffCreate.jsx` | `allowed_navs: selectedNavItems` |

### Pattern 6: `isOwnHotel` / `isOwnProfile` (Ownership checks)

~26 matches. Multi-tenant + self-service access.

| File | Usage |
|------|-------|
| `src/hooks/usePublicPagePermissions.js` | `const isOwnHotel = Boolean(user?.hotel_slug && user.hotel_slug === pageHotelSlug)` |
| `src/features/staffProfile/StaffProfilePage.jsx` | `const isOwnProfile = staff && user && staff.id === user.staff_id` |
| `src/features/staffProfile/StaffProfileCard.jsx` | `{isOwnProfile && (...)}` — edit button visibility |
| `src/features/staffProfile/StaffImageUploader.jsx` | `if (!isOwnProfile)` — upload restriction |
| `src/features/staffProfile/StaffFaceRegistrationCTA.jsx` | `if (!isOwnProfile \|\| staff.has_registered_face)` |

### Pattern 7: `viewMode` (Staff vs Guest perspective)

~60 matches. UI toggle between staff and guest views.

| File | Usage |
|------|-------|
| `src/context/AuthContext.jsx` | State + localStorage persistence; guard: `if (!isStaff && viewMode === 'staff') { setViewMode('guest') }` |

### Pattern 8: Direct `role` string comparisons

~12 matches. Ad-hoc role checks outside the hook system.

| File | Code |
|------|------|
| `src/components/rooms/RoomDetails.jsx` | `['housekeeping', 'admin', 'manager'].includes(userData?.role?.toLowerCase())` |
| `src/sections/GuestHotelHome.jsx` | `user.role === 'staff'` |
| `src/realtime/RealtimeProvider.jsx` | `user?.role === 'staff'` |
| `src/staff_chat/components/ConversationView.jsx` | `currentUserData?.role === 'manager' \|\| currentUserData?.role === 'admin'` |
| `src/features/attendance/pages/AttendanceDashboard.jsx` | `authUser?.role === 'admin' \|\| authUser?.access_level === 'super_admin'` |

### Pattern 9: `requiredLevel` / `requiredNavSlug` (Policy-level)

In `src/policy/staffAccessPolicy.js`:

```
ADMIN_ONLY_ROUTES = [
  { match: /\/settings.*\/staff\//, requiredLevel: 'super_staff_admin' },
  { match: /\/permissions/,         requiredLevel: 'super_staff_admin' }
]
```

### Pattern 10: `canEditPublicPage` / `hasEditAccess`

| File | Code |
|------|------|
| `src/hooks/usePublicPagePermissions.js` | `canEditPublicPage = Boolean(isStaff && isOwnHotel && hasEditAccess)` |
| `src/pages/hotels/HotelPublicPage.jsx` | `return canEditPublicPage ? (...) : (...)` |
| `src/components/presets/HeroSectionPreset.jsx` | `{canEditPublicPage && hotel && (...)}` |
| `src/components/sections/GallerySectionView.jsx` | `if (galleries.length === 0 && canEditPublicPage)` |

---

## D. Route Protection Inventory

### Protection Architecture

- **Layer 1 — Authentication:** `ProtectedRoute` checks `user` exists. Redirect → `/login`.
- **Layer 2 — Permissions:** If `mode="staff"` AND `ENABLE_ROUTE_PERMISSIONS=true`, calls `canAccessStaffPath()`. Redirect → `/reception`.
- **Feature flag:** `ENABLE_ROUTE_PERMISSIONS = true` in `src/config/featureFlags.js`

### ProtectedRoute Component

**File:** `src/components/auth/ProtectedRoute.jsx`

**Props:**
- `mode`: `"auth"` (Layer 1 only) | `"staff"` (Layer 1 + Layer 2)
- `requiredSlug`: Override auto-slug-mapping
- `unauthorizedRedirect`: Default `/reception`

**Logic:**
```
if (!user) → redirect /login
if (mode === 'staff' && ENABLE_ROUTE_PERMISSIONS) {
  result = canAccessStaffPath({ pathname, user, requiredSlug })
  if (!result.allowed) → redirect /reception
}
```

### staffAccessPolicy.js Decision Tree

**File:** `src/policy/staffAccessPolicy.js`

```
canAccessStaffPath({ pathname, user, requiredSlug }):
  1. Not logged in OR not staff?  → DENY → /login
  2. is_superuser?                → ALLOW ALL
  3. super_staff_admin?           → ALLOW ALL
  4. Match ADMIN_ONLY_ROUTES?     → Check requiredLevel → DENY if mismatch
  5. Map pathname → nav slug      → via PATH_TO_NAV_MAPPING (25 patterns)
  6. No slug matched?             → DENY (deny by default)
  7. Check slug in allowed_navs   → DENY if not present
  8. All passed                   → ALLOW
```

### PATH_TO_NAV_MAPPING (25 path→slug mappings)

| Pattern | Required Slug |
|---------|---------------|
| `/reception` | `reception` |
| `/rooms` | `rooms` |
| `/housekeeping` | `housekeeping` |
| `/bookings` | `bookings` |
| `/room-bookings` \| `/booking-management` | `room_bookings` |
| `/maintenance` | `maintenance` |
| `/stock_tracker` | `stock_tracker` |
| `/hotel_info` | `hotel_info` |
| `/good_to_know_console` | `good_to_know` |
| `/games` | `games` |
| `/staff/` | `home` |
| `/[slug]/staff` | `staff_management` |
| `/guests` | `guests` |
| `/restaurants` | `restaurants` |
| `/room_services/*/orders` | `room_service` |
| `/breakfast` | `breakfast` |
| `/menus_management` | `menus_management` |
| `/attendance` | `attendance` |
| `/department-roster` | `department_roster` |
| `/enhanced-attendance` | `management_analytics` |
| `/chat` | `chat` |

### Complete Route Table

#### Auth Routes (7 — unprotected)

| Path | Component | Protection |
|------|-----------|------------|
| `/login` | Login | None |
| `/logout` | Logout | None |
| `/register` | Register | None |
| `/forgot-password` | ForgotPassword | None |
| `/reset-password/:uid/:token/` | ResetPassword | None |
| `/registration-success` | RegistrationSuccess | None |
| `/no-internet` | NoInternet | None |

**File:** `src/routes/authRoutes.jsx`

#### Public Routes (8 — unprotected, intentional)

| Path | Component | Protection |
|------|-----------|------------|
| `/` | HotelsLandingPage | None |
| `/hotel/:slug` | HotelPublicPage | None |
| `/hotels/:hotelSlug/restaurants/:restaurantSlug` | RestaurantPublicPage | None |
| `/good_to_know/:hotel_slug/:slug` | GoodToKnowArticle | None |
| `/shootar` | ShootAR | None |
| `/:hotelSlug` (catch-all) | HotelPortalPage | None |
| `*` (404) | NotFound | None |

**File:** `src/routes/publicRoutes.jsx`

#### Staff Routes (54 — ALL protected via ProtectedRoute)

| Path | Protection Mode | requiredSlug |
|------|-----------------|--------------|
| `/reception` | staff | `reception` |
| `/rooms` | staff | `rooms` |
| `/room-management/:hotelIdentifier/room/:roomNumber` | staff | `rooms` |
| `/rooms/:roomNumber/add-guest` | staff | `rooms` |
| `/staff/hotel/:hotelSlug/room-management` | staff | `rooms` |
| `/staff/hotel/:hotelSlug/housekeeping` | staff | `housekeeping` |
| `/staff/hotel/:hotelSlug/housekeeping/rooms/:roomNumber` | staff | `housekeeping` |
| `/bookings` | staff | (auto-mapped) |
| `/staff/hotel/:hotelSlug/room-bookings` | staff | `room_bookings` |
| `/:hotelSlug/staff` | staff | `staff_management` |
| `/:hotelSlug/staff/create` | staff | `staff_management` |
| `/:hotelSlug/staff/:id` | staff | `staff_management` |
| `/attendance/:hotelSlug` | staff | (auto-mapped) |
| `/department-roster/:hotelSlug` | staff | (auto-mapped) |
| `/enhanced-attendance/:hotelSlug` | staff | (auto-mapped) |
| `/room_services/:hotelIdentifier/orders` | staff | `room_service` |
| `/room_services/:hotelIdentifier/orders-management` | staff | `room_service` |
| `/room_services/:hotelIdentifier/breakfast-orders` | staff | `breakfast` |
| `/:hotelIdentifier/guests` | staff | (auto-mapped) |
| `/hotel_info/:hotelSlug` | staff | (auto-mapped) |
| `/good_to_know_console/:hotelSlug` | staff | (auto-mapped) |
| `/stock_tracker/:hotel_slug/*` (17 sub-routes) | staff | `stock_tracker` |
| `/hotel/:hotelSlug/chat` | staff | (auto-mapped) |
| `/menus_management/:hotelSlug` | staff | `menus_management` |
| `/maintenance` | staff | (auto-mapped) |
| `/staff/:hotelSlug/feed` | **auth** (no permission check) | — |
| `/:hotelSlug/staff/me` | **auth** (no permission check) | — |

**File:** `src/routes/staffRoutes.jsx`

#### Guest Routes (20 — intentionally unprotected)

Protected by PIN, room number, QR code, or backend validation — not by ProtectedRoute.

| Path | Component | Auth Mechanism |
|------|-----------|----------------|
| `/room_services/*` | RoomServiceOrders | Room/hotel validation |
| `/guest-booking/*` | GuestBooking | Backend validation |
| `/:hotelSlug/book` | BookingPage | Hotel slug |
| `/booking/*` | BookingFlow | Booking ID |
| `/chat/*` | GuestChat | Conversation ID |
| `/guest/chat` | GuestChat | Session |
| `/guest/hotel/*` | GuestPortal | Hotel slug |
| `/face/:hotelSlug/clock-in` | FaceClockIn | **Kiosk — facial recognition server-side** |
| `/camera-clock-in/:hotelSlug` | CameraClockIn | **Kiosk — facial recognition server-side** |

**File:** `src/routes/guestRoutes.jsx`

#### Game Routes (15 — all protected, auth-only)

| Path | Protection Mode |
|------|-----------------|
| `/games` | auth (Layer 1 only) |
| `/games/whack-a-mole` | auth |
| `/games/memory-match/*` | auth |
| `/games/quiz/*` | auth |
| `/games/settings` | auth |

**File:** `src/routes/gameRoutes.jsx`

### Layout Policy

**File:** `src/policy/layoutPolicy.js`

| Layout Mode | Paths | Navigation Shown |
|-------------|-------|------------------|
| `auth` | `/login`, `/register`, `/forgot-password`, `/reset-password/*` | None |
| `guest` | `/room_services/*`, `/guest-booking/*`, `/chat/*`, `/games/quiz` | None |
| `public` | `/`, `/hotel/*`, `/:slug`, `/*/book`, `/*/my-bookings` | None |
| `staff` | `/staff/*`, `/reception`, `/rooms`, `/bookings`, `/maintenance`, `/stock_tracker`, `/games`, `/hotel_info`, `/good_to_know_console` | Full staff sidebar |

### Route Assembly Order

**File:** `src/routes/index.jsx` — `buildRoutes()`

```
1. Auth routes         (specific paths)
2. Public routes early (specific paths)
3. Staff routes        (54 protected routes)
4. Guest routes        (20 unprotected routes)
5. Game routes         (15 protected routes)
6. Public routes late  (catch-alls: /:hotelSlug, /*)
```

---

## E. Visibility-Rule Mismatches

### E1. `isSuperStaffAdmin` imported from `usePermissions()` — does not exist

**File:** `src/pages/sections/SectionEditorPage.jsx` line 28

```js
const { isSuperStaffAdmin } = usePermissions();
```

`usePermissions()` does **not** export `isSuperStaffAdmin`. The destructured value is `undefined`. The check at line 40 (`if (!isSuperStaffAdmin)`) will always evaluate truthy, meaning non-superusers are always redirected — but `super_staff_admin` users are also redirected because the value is never set.

Other files compute `isSuperStaffAdmin` locally:
- `src/components/layout/Navbar.jsx` — `const isSuperStaffAdmin = accessLevel === "super_staff_admin"`
- `src/context/ThemeContext.jsx` — `const isSuperStaffAdmin = user?.access_level === 'super_staff_admin'`

### E2. Settings visibility differs between legacy and new navbar

| Component | Condition to show Settings | Who sees it |
|-----------|---------------------------|-------------|
| `Navbar.jsx` (legacy) | `isSuperStaffAdmin` (accessLevel check) | Only `super_staff_admin` |
| `useNavigation.js` | No `allowedRoles` on Settings item | All staff |
| `BigScreenNavbar` / `MobileNavbar` | Trusts `useNavigation()` output | All staff |

### E3. Room Bookings — redundant check in MobileNavbar

| Component | Check |
|-----------|-------|
| `MobileNavbar.jsx` | Explicit `canAccess('room-bookings')` AND items from `useNavigation()` |
| `BigScreenNavbar.jsx` | Only items from `useNavigation()` (no additional explicit check) |

MobileNavbar applies a redundant second gate on Room Bookings that BigScreenNavbar does not.

### E4. Stock Tracker — hidden in nav but routes exist

| System | Status |
|--------|--------|
| `useNavigation.js` | Hidden via `HIDDEN_NAV_SLUGS` — never appears in navbars |
| `Navbar.jsx` (legacy) | Shown when `showFullNav=true` |
| `staffRoutes.jsx` | Routes exist: `/stock_tracker/:hotel_slug/*` |
| UI result | Unreachable via new navbars; reachable via direct URL |

### E5. Housekeeping — hidden in nav but routes exist

| System | Status |
|--------|--------|
| `useNavigation.js` | Hidden via `HIDDEN_NAV_SLUGS` |
| `staffRoutes.jsx` | Route exists with `requiredSlug: 'housekeeping'` |
| UI result | Unreachable via all navbars; reachable via direct URL only |

### E6. Room Management — nav slug vs route slug mismatch

| System | Slug Used |
|--------|-----------|
| `useNavigation.js` (nav item) | `room_management` |
| `staffRoutes.jsx` (route) | `requiredSlug: 'rooms'` |

The nav item uses slug `room_management` but the route demands `rooms` in `allowed_navs`. A user could have `room_management` in their `allowed_navs` and still be denied at the route level (which checks for `rooms`), or vice versa.

---

## F. Duplicated / Inconsistent Logic

### F1. Duplicated Permission Patterns (inline, not via shared helper)

**Pattern A: Admin access check** — `isSuperUser || canAccess(['staff_admin', 'super_staff_admin'])`

Repeated in:
1. `src/components/staff/Staff.jsx` line 16
2. `src/hooks/usePublicPagePermissions.js` line 30
3. `src/components/staff/StaffDetails.jsx` line 97

**Pattern B: Super admin check** — `isSuperUser || canAccess(['super_staff_admin'])`

Repeated in:
1. `src/components/utils/Settings.jsx` line 30
2. `src/components/rooms/RoomList.jsx` line 169

### F2. Inconsistent Property Naming

| Concept | Variant 1 | Variant 2 | Variant 3 | Variant 4 |
|---------|-----------|-----------|-----------|-----------|
| Superuser | `is_superuser` (backend) | `isSuperUser` (hooks) | `user?.is_superuser` (inline) | — |
| Staff status | `is_staff` (backend) | `isStaff` (context) | `is_staff_member` (GuestHotelHome) | `user?.isStaff` (RealtimeProvider) |
| Super staff admin | `access_level === 'super_staff_admin'` | `isSuperStaffAdmin` (Navbar, ThemeContext) | **not exported from usePermissions** | — |
| Hotel identifier | `hotel_slug` | `hotelSlug` | `hotelIdentifier` | `:hotel_slug` (path) |
| Staff identifier | `staff_id` | `staffProfile.id` | `user?.id` | `:id` (path) |
| Manager | `is_manager` (property) | `role === 'manager'` (string check) | — | — |

### F3. Five Different Admin-Check Patterns

| Pattern | Code | Files |
|---------|------|-------|
| A. Via `canAccess()` | `canAccess(['staff_admin', 'super_staff_admin'])` | Staff.jsx, StaffDetails.jsx, usePublicPagePermissions.js |
| B. Direct accessLevel | `accessLevel === "super_staff_admin"` | Navbar.jsx |
| C. `isSuperUser` only | `user?.is_superuser` | SuperUser.jsx, various |
| D. Role string array | `['housekeeping', 'admin', 'manager'].includes(userData?.role?.toLowerCase())` | RoomDetails.jsx |
| E. Non-standard values | `authUser?.role === 'admin' \|\| authUser?.access_level === 'super_admin'` | AttendanceDashboard.jsx |

Pattern E uses `'super_admin'` which is not one of the three valid `access_level` values (`regular_staff`, `staff_admin`, `super_staff_admin`).

### F4. `isStaff` Computed Three Different Ways

| File | Computation |
|------|-------------|
| `src/context/AuthContext.jsx` | `user?.is_staff \|\| user?.is_superuser \|\| ['staff_admin','super_staff_admin'].includes(access_level) \|\| user?.staff_id` |
| `src/sections/GuestHotelHome.jsx` | `user.is_staff \|\| user.is_staff_member \|\| user.role === 'staff' \|\| user.staff_id` |
| `src/realtime/RealtimeProvider.jsx` | `user?.is_staff \|\| user?.role === 'staff' \|\| user?.isStaff` |

### F5. `restaurant-bookings` — Nav Item With No Route

`DEFAULT_NAV_ITEMS` includes `{ slug: 'restaurant-bookings', path: '/restaurant-bookings' }`. No route in `staffRoutes.jsx` matches `/restaurant-bookings`. Clicking this nav item leads to a 404 or the public catch-all.

### F6. Confusing Access Level Terms

| Term | Where Used | Standard? |
|------|------------|-----------|
| `super_staff_admin` | Policy, hooks, login, nav | Yes — valid `access_level` value |
| `staff_admin` | Policy, hooks, login, nav | Yes — valid `access_level` value |
| `regular_staff` | Policy, staff creation | Yes — valid `access_level` value |
| `super_admin` | `AttendanceDashboard.jsx` line 637 | **No** — not a valid `access_level` |
| `is_super_staff` | `AttendanceDashboard.jsx` line 637 | **No** — not a standard user property |

### F7. Destinations in Multiple Menu Systems With Different Checks

| Destination | Legacy Navbar | New Navbar (useNavigation) | Route (staffAccessPolicy) |
|-------------|---------------|---------------------------|---------------------------|
| Settings | `isSuperStaffAdmin` only | No `allowedRoles` — all staff | `mode: 'staff'` — general |
| Stock Tracker | `showFullNav` — visible | `HIDDEN_NAV_SLUGS` — hidden | Routes exist — accessible by URL |
| Housekeeping | Not present | `HIDDEN_NAV_SLUGS` — hidden | Route exists with `requiredSlug: 'housekeeping'` |
| Room Management | Not present | `allowedRoles: ['super_staff_admin']`, slug `room_management` | `requiredSlug: 'rooms'` |
