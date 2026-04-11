# Frontend RBAC Refactor Plan

**Date:** 2026-04-11  
**Status:** READY TO IMPLEMENT  
**Principle:** Backend is source of truth. Frontend mirrors, never invents.

---

## LOCKED BACKEND CONTRACT

### Backend Access Payload (`resolve_effective_access()`)

| Field | Type | Description |
|-------|------|-------------|
| `tier` | string | `"super_staff_admin"` \| `"staff_admin"` \| `"regular_staff"` |
| `role_slug` | string | `"manager"` \| `"housekeeping"` \| etc. |
| `effective_navs` | string[] | Canonical RBAC module slugs the user can access |
| `navigation_items` | object[] | `{ slug, name, path, icon }` — renderable nav items |
| `is_superuser` | boolean | Django superuser flag |
| `access_level` | string | Same value as `tier` (legacy alias, both present) |
| `hotel_slug` | string | Current hotel context |

### 13 Canonical RBAC Module Slugs

```
home  rooms  bookings  chat  stock_tracker  housekeeping  attendance
staff_management  room_services  maintenance  entertainment  hotel_info  admin_settings
```

These are the ONLY valid values in `effective_navs` and `navigation_items[].slug`.

### RBAC Slugs vs Entity Slugs

- **RBAC module slugs** = permission gates (`rooms`, `bookings`, `admin_settings`, etc.)
- **Entity slugs** = data context only (`hotelSlug`, `restaurantSlug`, `roomNumber`, `hotel_slug`)

Entity slugs are route parameters for data scoping. They are NOT permission checks.

---

## 1. SLUG RECONCILIATION TABLE

### 1.1 Current Frontend Slugs → Required Canonical Mapping

| # | Current Frontend Slug | Canonical Backend Slug | Action | Files Affected |
|---|----------------------|----------------------|--------|----------------|
| 1 | `home` | `home` | NO CHANGE | — |
| 2 | `rooms` | `rooms` | NO CHANGE | — |
| 3 | `chat` | `chat` | NO CHANGE | — |
| 4 | `housekeeping` | `housekeeping` | NO CHANGE | — |
| 5 | `attendance` | `attendance` | NO CHANGE | — |
| 6 | `maintenance` | `maintenance` | NO CHANGE | — |
| 7 | `hotel_info` | `hotel_info` | NO CHANGE | — |
| 8 | `stock_tracker` | `stock_tracker` | NO CHANGE (remove from `HIDDEN_NAV_SLUGS`) | `useNavigation.js` |
| 9 | `bookings` | `bookings` | NO CHANGE (route slug already correct) | — |
| 10 | `staff` (nav item) | `staff_management` | **RENAME** slug `staff` → `staff_management` | `useNavigation.js`, `navigationCategories.js` |
| 11 | `room-bookings` (nav item) | `bookings` | **RENAME** slug `room-bookings` → `bookings` | `useNavigation.js`, `navigationCategories.js`, `MobileNavbar.jsx` |
| 12 | `room_service` (nav item + routes) | `room_services` | **RENAME** slug → `room_services` | `useNavigation.js`, `staffRoutes.jsx`, `staffAccessPolicy.js`, `navigationCategories.js` |
| 13 | `games` (nav item) | `entertainment` | **RENAME** slug `games` → `entertainment` | `useNavigation.js`, `staffAccessPolicy.js`, `navigationCategories.js` |
| 14 | `settings` (nav item) | `admin_settings` | **RENAME** slug `settings` → `admin_settings` | `useNavigation.js`, `staffAccessPolicy.js`, `navigationCategories.js` |
| 15 | `room_management` (nav item) | `rooms` | **REMOVE** — duplicate of `rooms` | `useNavigation.js`, `navigationCategories.js` |
| 16 | `room_bookings` (route slug) | `bookings` | **RENAME** requiredSlug → `bookings` | `staffRoutes.jsx`, `staffAccessPolicy.js` |

### 1.2 Legacy RBAC Slugs to PURGE (no canonical match)

| # | Legacy Slug | Where Used | Disposition |
|---|-------------|------------|-------------|
| 1 | `reception` | `DEFAULT_NAV_ITEMS`, `staffRoutes.jsx` requiredSlug, `PATH_TO_NAV_MAPPING`, `NAV_ITEM_CATEGORY_MAP` | **REMOVE** nav item. Route `/reception` → `requiredSlug: 'rooms'` |
| 2 | `guests` | `DEFAULT_NAV_ITEMS`, `staffRoutes.jsx` requiredSlug, `PATH_TO_NAV_MAPPING`, `NAV_ITEM_CATEGORY_MAP` | **REMOVE** nav item. Routes `/:hotelIdentifier/guests` → `requiredSlug: 'rooms'` |
| 3 | `restaurants` | `DEFAULT_NAV_ITEMS`, `staffRoutes.jsx` requiredSlug, `PATH_TO_NAV_MAPPING`, `NAV_ITEM_CATEGORY_MAP` | **REMOVE** nav item. Routes → `requiredSlug: 'room_services'` |
| 4 | `good_to_know` | `DEFAULT_NAV_ITEMS`, `staffRoutes.jsx` requiredSlug, `PATH_TO_NAV_MAPPING`, `NAV_ITEM_CATEGORY_MAP` | **REMOVE** nav item. Route `/good_to_know_console` → `requiredSlug: 'hotel_info'` |
| 5 | `breakfast` | `DEFAULT_NAV_ITEMS`, `staffRoutes.jsx` requiredSlug, `PATH_TO_NAV_MAPPING` | **REMOVE** nav item. Route → `requiredSlug: 'room_services'` |
| 6 | `department_roster` | `DEFAULT_NAV_ITEMS`, `staffRoutes.jsx` requiredSlug, `PATH_TO_NAV_MAPPING`, `NAV_ITEM_CATEGORY_MAP` | **REMOVE** nav item. Route → `requiredSlug: 'attendance'` |
| 7 | `management_analytics` | `DEFAULT_NAV_ITEMS`, `staffRoutes.jsx` requiredSlug, `PATH_TO_NAV_MAPPING`, `NAV_ITEM_CATEGORY_MAP` | **REMOVE** nav item. Route → `requiredSlug: 'attendance'` |
| 8 | `menus_management` | `DEFAULT_NAV_ITEMS`, `staffRoutes.jsx` requiredSlug, `PATH_TO_NAV_MAPPING` | **REMOVE** nav item. Route → `requiredSlug: 'room_services'` |
| 9 | `restaurant-bookings` | `DEFAULT_NAV_ITEMS`, `NAV_ITEM_CATEGORY_MAP` | **DELETE** — no route exists, no backend slug |
| 10 | `room-bookings` (hyphenated) | `DEFAULT_NAV_ITEMS`, `NAV_ITEM_CATEGORY_MAP` | **REPLACE** with `bookings` |
| 11 | `staff_chat` | `NAV_ITEM_CATEGORY_MAP` | **DELETE** — orphan mapping, no nav item |
| 12 | `stock_dashboard` | `HIDDEN_NAV_SLUGS` | **DELETE** — not a real slug |
| 13 | `room_management` | `DEFAULT_NAV_ITEMS`, `NAV_ITEM_CATEGORY_MAP` | **DELETE** — folded into `rooms` |

### 1.3 Structures to DELETE

| Structure | File | Reason |
|-----------|------|--------|
| `HIDDEN_NAV_SLUGS` | `useNavigation.js` | Backend controls nav visibility via `navigation_items` |
| `passesRoleGate()` | `useNavigation.js` | Backend controls nav visibility via `effective_navs` |
| `allowedRoles` on nav items | `useNavigation.js` | Client-side role gate on nav items is not permitted |
| `ADMIN_ONLY_ROUTES` | `staffAccessPolicy.js` | Replaced by `admin_settings` in `effective_navs` |
| `super_staff_admin` bypass block | `staffAccessPolicy.js` | Backend populates `effective_navs` for all tiers |

---

## 2. EXACT FILES FOR PHASE 1

### Phase 1A: Auth Bootstrap (no downstream dependencies)

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/useLogin.js` | Add `effective_navs`, `tier`, `role_slug` to user object. Remove `isAdmin` computation. Keep `allowed_navs` as temporary backward-compat alias. |
| 2 | `src/context/AuthContext.jsx` | Simplify `isStaff` to `user?.is_staff \|\| user?.is_superuser`. Remove `access_level`, `staff_id` fallbacks. |
| 3 | `src/hooks/usePermissions.js` | Add `isSuperStaffAdmin`, `isStaffAdmin`, `isAdmin`, `hasTier()`, `effectiveNavs`, `hasNavAccess()`. Read `user.effective_navs` with fallback to `user.allowed_navs`. Keep `allowedNavs` + `canAccessNav` as deprecated aliases. |

### Phase 1B: Route Policy (depends on 1A)

| # | File | Change |
|---|------|--------|
| 4 | `src/policy/staffAccessPolicy.js` | Read `user.effective_navs` (fallback `user.allowed_navs`). Delete `super_staff_admin` bypass. Delete `ADMIN_ONLY_ROUTES`. Rewrite `PATH_TO_NAV_MAPPING` to use only canonical slugs (see §3). |

### Phase 1C: Navigation (depends on 1A)

| # | File | Change |
|---|------|--------|
| 5 | `src/hooks/useNavigation.js` | Delete `HIDDEN_NAV_SLUGS`. Delete `passesRoleGate()`. Remove `allowedRoles` from all items. Update `DEFAULT_NAV_ITEMS` slugs to canonical only (see §4). Remove orphan items. |
| 6 | `src/config/navigationCategories.js` | Rewrite `NAV_ITEM_CATEGORY_MAP` to use only canonical slugs (see §5). |

### Phase 1D: Route Definitions (depends on 1B)

| # | File | Change |
|---|------|--------|
| 7 | `src/routes/staffRoutes.jsx` | Update every `requiredSlug` to a canonical slug (see §6). Add explicit `requiredSlug` to settings + section-editor routes. |

### Phase 1E: P0 Bug Fixes (depends on 1A)

| # | File | Change |
|---|------|--------|
| 8 | `src/pages/sections/SectionEditorPage.jsx` | Destructure `isSuperStaffAdmin` from `usePermissions()` — now exported |
| 9 | `src/features/attendance/pages/AttendanceDashboard.jsx` | Replace `super_admin` and `is_super_staff` with `usePermissions().isSuperStaffAdmin` |

### Phase 1F: Page-Level Fixes (depends on 1A)

| # | File | Change | Priority |
|---|------|--------|----------|
| 10 | `src/components/rooms/RoomDetails.jsx` | Replace inline role array with `canAccess()` | P1 |
| 11 | `src/sections/GuestHotelHome.jsx` | Replace ad-hoc `isStaff` / `is_staff_member` with `useAuth().isStaff` | P1 |
| 12 | `src/realtime/RealtimeProvider.jsx` | Replace `user?.isStaff` with `user?.is_staff` | P1 |
| 13 | `src/staff_chat/components/ConversationView.jsx` | Replace `role === 'manager'` with `canAccess(['manager','admin'])` | P1 |
| 14 | `src/components/utils/Settings.jsx` | Use `isAdmin` from `usePermissions()` | P2 |
| 15 | `src/components/staff/Staff.jsx` | Use `isAdmin` from `usePermissions()` | P2 |
| 16 | `src/components/staff/StaffDetails.jsx` | Use `isAdmin` from `usePermissions()` | P2 |
| 17 | `src/components/staff/RegistrationPackagesPanel.jsx` | Use `isAdmin` from `usePermissions()` | P2 |
| 18 | `src/components/rooms/RoomList.jsx` | Use `isSuperStaffAdmin` from `usePermissions()` | P2 |
| 19 | `src/context/ThemeContext.jsx` | Use `isSuperStaffAdmin` from `usePermissions()` | P2 |
| 20 | `src/hooks/usePublicPagePermissions.js` | Use `isAdmin` from `usePermissions()` | P2 |
| 21 | `src/components/layout/MobileNavbar.jsx` | Remove redundant `canAccess('room-bookings')` check | P2 |

---

## 3. EXACT PATH_TO_NAV_MAPPING (after refactor)

Replace the entire `PATH_TO_NAV_MAPPING` array in `staffAccessPolicy.js` with:

```javascript
const PATH_TO_NAV_MAPPING = [
  // Front Office
  { match: (p) => p === "/reception" || p.startsWith("/reception/"), slug: "rooms" },
  { match: (p) => p.startsWith("/rooms"), slug: "rooms" },
  { match: (p) => p.includes("/room-management"), slug: "rooms" },
  { match: (p) => p.includes("/guests"), slug: "rooms" },

  // Bookings
  { match: (p) => p.startsWith("/bookings"), slug: "bookings" },
  { match: (p) => p.includes("/room-bookings") || p.includes("/booking-management"), slug: "bookings" },

  // Housekeeping
  { match: (p) => p.includes("/housekeeping"), slug: "housekeeping" },

  // Chat
  { match: (p) => p.includes("/chat"), slug: "chat" },

  // Staff Management
  { match: (p) => /\/[^/]+\/staff(?:\/|$)/.test(p) && !p.startsWith("/staff/"), slug: "staff_management" },

  // Attendance (all sub-modules)
  { match: (p) => p.includes("/attendance"), slug: "attendance" },
  { match: (p) => p.includes("/department-roster"), slug: "attendance" },
  { match: (p) => p.includes("/enhanced-attendance"), slug: "attendance" },
  { match: (p) => p.includes("/roster"), slug: "attendance" },

  // Room Services (all F&B sub-modules)
  { match: (p) => p.includes("/room_services"), slug: "room_services" },
  { match: (p) => p.includes("/breakfast"), slug: "room_services" },
  { match: (p) => p.includes("/menus_management"), slug: "room_services" },
  { match: (p) => p.includes("/restaurants"), slug: "room_services" },

  // Maintenance
  { match: (p) => p.startsWith("/maintenance"), slug: "maintenance" },

  // Stock Tracker
  { match: (p) => p.startsWith("/stock_tracker"), slug: "stock_tracker" },

  // Hotel Info (includes good_to_know)
  { match: (p) => p.startsWith("/hotel_info"), slug: "hotel_info" },
  { match: (p) => p.startsWith("/good_to_know_console"), slug: "hotel_info" },

  // Entertainment
  { match: (p) => p.startsWith("/games"), slug: "entertainment" },

  // Admin Settings
  { match: (p) => p.includes("/settings") && p.includes("/staff/"), slug: "admin_settings" },
  { match: (p) => p.includes("/section-editor"), slug: "admin_settings" },
  { match: (p) => p.includes("/permissions"), slug: "admin_settings" },

  // Staff Home (catch-all for /staff/ prefix — MUST be last)
  { match: (p) => p.startsWith("/staff/"), slug: "home" },
];
```

**Removed:** `ADMIN_ONLY_ROUTES` array (replaced by `admin_settings` slug in mapping above).

---

## 4. EXACT DEFAULT_NAV_ITEMS (after refactor)

Replace the entire `DEFAULT_NAV_ITEMS` array in `useNavigation.js` with:

```javascript
/* @deprecated — remove when backend guarantees navigation_items on every login */
export const DEFAULT_NAV_ITEMS = [
  { slug: 'home', name: 'Home', path: '/staff/{hotelSlug}/feed', icon: 'house' },
  { slug: 'chat', name: 'Chat', path: '/hotel/{hotelSlug}/chat', icon: 'chat-dots' },
  { slug: 'rooms', name: 'Rooms', path: '/rooms', icon: 'door-closed' },
  { slug: 'housekeeping', name: 'Housekeeping', path: '/staff/hotel/{hotelSlug}/housekeeping', icon: 'house-gear' },
  { slug: 'bookings', name: 'Bookings', path: '/staff/hotel/{hotelSlug}/room-bookings', icon: 'bed', hasDropdown: true },
  { slug: 'staff_management', name: 'Staff', path: '/{hotelSlug}/staff', icon: 'person-badge' },
  { slug: 'attendance', name: 'Attendance', path: '/attendance/{hotelSlug}', icon: 'clock-history' },
  { slug: 'room_services', name: 'Room Service', path: '/room_services/{hotelSlug}/orders-management', icon: 'box' },
  { slug: 'maintenance', name: 'Maintenance', path: '/maintenance', icon: 'tools' },
  { slug: 'hotel_info', name: 'Hotel Info', path: '/hotel_info/{hotelSlug}', icon: 'info-circle' },
  { slug: 'stock_tracker', name: 'Stock Tracker', path: '/stock_tracker/{hotelSlug}', icon: 'graph-up' },
  { slug: 'entertainment', name: 'Entertainment', path: '/games/?hotel={hotelSlug}', icon: 'controller' },
  { slug: 'admin_settings', name: 'Settings', path: '/staff/{hotelSlug}/settings', icon: 'gear', requiresHotelSlug: true },
];
```

**Removed items:** `reception`, `guests`, `staff` (renamed), `department_roster`, `management_analytics`, `restaurants`, `room-bookings` (renamed), `restaurant-bookings`, `good_to_know`, `games` (renamed), `settings` (renamed), `room_service` (renamed), `breakfast`, `menus_management`, `room_management`.

**Removed props:** `allowedRoles` on all items.

---

## 5. EXACT NAV_ITEM_CATEGORY_MAP (after refactor)

Replace the entire `NAV_ITEM_CATEGORY_MAP` in `navigationCategories.js` with:

```javascript
export const NAV_ITEM_CATEGORY_MAP = {
  // Front Office
  'rooms': 'front-office',
  'bookings': 'front-office',
  'chat': 'front-office',
  'housekeeping': 'front-office',

  // F&B / Services
  'room_services': 'fnb',

  // Staff & Operations
  'staff_management': 'staff',
  'attendance': 'staff',
  'maintenance': 'staff',

  // Guest Relations
  'hotel_info': 'guest-relations',
  'entertainment': 'guest-relations',
  'stock_tracker': 'guest-relations',

  // Uncategorized (rendered outside category groups)
  'home': null,
  'admin_settings': null,
};
```

---

## 6. EXACT staffRoutes.jsx requiredSlug CHANGES

Every route below changes its `requiredSlug`. Routes not listed keep their current value.

| Route Path | Current `requiredSlug` | New `requiredSlug` |
|-----------|----------------------|-------------------|
| `/reception` | `reception` | `rooms` |
| `/department-roster/:hotelSlug` | `department_roster` | `attendance` |
| `/enhanced-attendance/:hotelSlug` | `management_analytics` | `attendance` |
| `/hotel-:hotelSlug/restaurants` | `restaurants` | `room_services` |
| `/:hotelSlug/:restaurantSlug` | `restaurants` | `room_services` |
| `/room_services/:hotelIdentifier/orders` | `room_service` | `room_services` |
| `/room_services/:hotelIdentifier/orders-summary` | `room_service` | `room_services` |
| `/room_services/:hotelIdentifier/orders-management` | `room_service` | `room_services` |
| `/room_services/:hotelIdentifier/breakfast-orders` | `breakfast` | `room_services` |
| `/menus_management/:hotelSlug` | `menus_management` | `room_services` |
| `/:hotelIdentifier/guests` | `guests` | `rooms` |
| `/:hotelIdentifier/guests/:guestId/edit` | `guests` | `rooms` |
| `/staff/hotel/:hotelSlug/room-bookings` | `room_bookings` | `bookings` |
| `/staff/hotel/:hotelSlug/booking-management` | `room_bookings` | `bookings` |
| `/good_to_know_console/:hotel_slug` | `good_to_know` | `hotel_info` |
| `/staff/:hotelSlug/settings` | *(auto-mapped to `home`)* | `admin_settings` (explicit) |
| `/staff/:hotelSlug/section-editor` | *(auto-mapped to `home`)* | `admin_settings` (explicit) |

Routes that have correct canonical slugs already (NO CHANGE):
- `rooms`, `housekeeping`, `bookings`, `chat`, `stock_tracker`, `hotel_info`, `maintenance`, `attendance`, `staff_management`

**All stock_tracker sub-routes** (`/stock_tracker/:hotel_slug/analytics`, etc.) that lack `requiredSlug` must add `requiredSlug: 'stock_tracker'` explicitly to avoid falling through to the `/staff/` catch-all mapping.

---

## 7. FRONTEND ACCESS MODEL (after refactor)

```
┌──────────────────────────────────────────────────────────┐
│                 BACKEND (Source of Truth)                  │
│                                                           │
│  POST /staff/login/ returns:                              │
│    tier:             "super_staff_admin" | "staff_admin"   │
│                      | "regular_staff"                     │
│    role_slug:        "manager" | "housekeeping" | ...      │
│    effective_navs:   ["rooms", "bookings", "chat", ...]    │
│    navigation_items: [{ slug, name, path, icon }, ...]     │
│    is_superuser:     boolean                               │
│    access_level:     same as tier                          │
│    hotel_slug:       string (entity slug, not RBAC)        │
└──────────────────────┬────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              FRONTEND (Mirrors Backend)                    │
│                                                           │
│  A. NAV VISIBILITY → useNavigation()                      │
│     Input: navigation_items from backend                  │
│     Output: visibleNavItems (zero client filtering)       │
│                                                           │
│  B. ROUTE ENTRY → ProtectedRoute + staffAccessPolicy      │
│     Input: effective_navs vs route's requiredSlug         │
│     Gate: is_superuser → ALLOW; else slug in              │
│           effective_navs → ALLOW; else DENY               │
│     NO super_staff_admin bypass.                          │
│     NO ADMIN_ONLY_ROUTES.                                 │
│                                                           │
│  C. ACTION GATING → usePermissions()                      │
│     Input: tier/access_level, role_slug, is_superuser     │
│     Output: isAdmin, isSuperStaffAdmin, hasTier(),        │
│             canAccess(), hasNavAccess()                    │
└──────────────────────────────────────────────────────────┘
```

### usePermissions() Return Shape (after refactor)

```javascript
{
  // Identity booleans
  isSuperUser:       user.is_superuser,
  isSuperStaffAdmin: user.access_level === 'super_staff_admin',
  isStaffAdmin:      user.access_level === 'staff_admin',
  isAdmin:           isSuperUser || isSuperStaffAdmin || isStaffAdmin,

  // Tier check
  hasTier(t):        user.access_level === t || isSuperUser,

  // Department-role check (for action gating within pages)
  canAccess(roles[]): role_slug or access_level in roles; superuser bypasses,

  // Nav/module access check
  hasNavAccess(slug): slug in effective_navs; superuser bypasses,
  effectiveNavs:      user.effective_navs || [],

  // Deprecated (remove in Phase 2)
  allowedNavs:        alias for effectiveNavs,
  canAccessNav(slug): alias for hasNavAccess(slug),
  accessLevel:        user.access_level,
}
```

---

## 8. CURRENT BUGS FIXED BY THIS REFACTOR

| # | Bug | File | Root Cause | Fix |
|---|-----|------|-----------|-----|
| 1 | `isSuperStaffAdmin` is `undefined` | `SectionEditorPage.jsx` | `usePermissions()` does not export `isSuperStaffAdmin` | Phase 1A: add export to `usePermissions.js` |
| 2 | `super_admin` used instead of `super_staff_admin` | `AttendanceDashboard.jsx` | Typo — `super_admin` is not a valid access_level | Phase 1E: replace with `usePermissions().isSuperStaffAdmin` |
| 3 | `super_staff_admin` bypasses all route checks | `staffAccessPolicy.js` L158-163 | Frontend grants full access to hotel-level admins regardless of `effective_navs` | Phase 1B: delete bypass block |
| 4 | `stock_tracker` + `housekeeping` hidden from nav | `useNavigation.js` `HIDDEN_NAV_SLUGS` | Frontend overrides backend visibility | Phase 1C: delete `HIDDEN_NAV_SLUGS` |
| 5 | Settings auto-maps to `home` slug | `staffAccessPolicy.js` PATH_TO_NAV_MAPPING | `/staff/` prefix catch-all matches before settings-specific rule | Phase 1B: add explicit `admin_settings` mapping before catch-all |
| 6 | Section editor auto-maps to `home` slug | Same as above | Same catch-all problem | Phase 1B: add explicit `admin_settings` mapping |
| 7 | `restaurant-bookings` nav item → 404 | `useNavigation.js` | Nav item exists but no route handles `/restaurant-bookings` | Phase 1C: remove orphan nav item |

---

## 9. RUNTIME VERIFICATION (before coding)

These are checks that require a running backend to confirm the actual payload shape. They are NOT speculative design questions — the contract is locked. These verify the deployment is live.

| # | Check | How | Pass Criteria |
|---|-------|-----|---------------|
| 1 | `effective_navs` field present in login response | `POST /staff/login/` → inspect JSON | Response body contains `effective_navs` as a string array |
| 2 | `tier` field present in login response | Same as above | Response body contains `tier` as a string |
| 3 | `role_slug` field present in login response | Same as above | Response body contains `role_slug` as a string |
| 4 | `navigation_items` populated for all tiers | Login as `regular_staff`, `staff_admin`, `super_staff_admin` | All three return non-empty `navigation_items` array |
| 5 | `effective_navs` uses only canonical slugs | Login as any user → check array values | Every value in `effective_navs` is one of the 13 canonical slugs |
| 6 | `super_staff_admin` gets full slug set via `effective_navs` | Login as `super_staff_admin` → check `effective_navs` | Array contains all 13 canonical slugs |
| 7 | `navigation_items[].slug` matches `effective_navs` values | Compare arrays from same login response | Every `navigation_items[].slug` exists in `effective_navs` |

If check 1-3 fail: backend has not deployed the new field names yet. Frontend must use fallback mapping (`allowed_navs` → `effective_navs`, `access_level` → `tier`, `role` → `role_slug`) in `useLogin.js` until backend deploys.

If check 4 fails: keep `DEFAULT_NAV_ITEMS` fallback active.

If check 6 fails: `super_staff_admin` bypass removal will break their access. Do not proceed with Phase 1B until fixed.

---

## 10. IMPLEMENTATION SEQUENCE

```
Phase 1A  →  useLogin.js, usePermissions.js, AuthContext.jsx
              (no breaking changes — additive only, backward compat aliases)

Phase 1B  →  staffAccessPolicy.js
              (remove bypass, rewrite slug mapping to canonical)
              DEPENDS ON: 1A complete + runtime check #6 passes

Phase 1C  →  useNavigation.js, navigationCategories.js
              (remove client-side filtering, align slugs)
              DEPENDS ON: 1A complete

Phase 1D  →  staffRoutes.jsx
              (update all requiredSlug values)
              DEPENDS ON: 1B complete

Phase 1E  →  SectionEditorPage.jsx, AttendanceDashboard.jsx
              (P0 bug fixes)
              DEPENDS ON: 1A complete

Phase 1F  →  13 page-level files (P1 + P2 fixes)
              DEPENDS ON: 1A complete
```

Phases 1A, 1C, 1E, 1F can proceed in parallel after 1A lands.  
Phase 1B requires runtime check #6.  
Phase 1D requires 1B.

---

## 11. PHASE 2 CLEANUP (not Phase 1 scope)

These are deferred until Phase 1 is stable and verified:

1. Delete `src/components/layout/Navbar.jsx` (confirm zero imports first)
2. Remove `DEFAULT_NAV_ITEMS` fallback (after runtime check #4 consistently passes)
3. Remove deprecated aliases from `usePermissions.js` (`allowedNavs`, `canAccessNav`)
4. Remove `allowed_navs` from `useLogin.js` user object (after all consumers migrated)
5. Remove debug `console.log('🔍 ...')` statements from login flow
6. Remove `ENABLE_ROUTE_PERMISSIONS` feature flag
