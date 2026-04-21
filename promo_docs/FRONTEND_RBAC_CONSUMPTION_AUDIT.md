# Frontend RBAC Consumption Audit

**Scope:** `hotelmate-frontend/src` (React)
**Goal:** Verify the frontend is a pure **consumer** of backend permission truth (no independent authority computation, no competing sources, no leaking UI for unpermitted modules).
**Out of scope:** Backend changes.

---

## 1. Findings (Architecture Summary)

The frontend has a **mostly clean, single-source RBAC architecture** layered as:

1. **Login normalization** — [hotelmate-frontend/src/hooks/useLogin.js](hotelmate-frontend/src/hooks/useLogin.js#L43) normalizes backend payload: `effective_navs || allowed_navs || []`.
2. **Auth state** — [hotelmate-frontend/src/context/AuthContext.jsx](hotelmate-frontend/src/context/AuthContext.jsx) stores the full user payload + derives `isStaff` from `is_staff || is_superuser`.
3. **Module bridge** — [hotelmate-frontend/src/lib/authStore.js](hotelmate-frontend/src/lib/authStore.js) mirrors user for non-React code.
4. **Permission hook (canonical)** — [hotelmate-frontend/src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js) is the single derivation point for `effectiveNavs`, `isAdmin`, `isSuperStaffAdmin`, `isStaffAdmin`, `isSuperUser`, `hasNavAccess(slug)`, `hasTier(tier)`, `canAccess(roles)`.
5. **Route policy** — [hotelmate-frontend/src/policy/staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js) maps URL prefixes to canonical nav slugs and gates via `effective_navs`.
6. **Route guard** — [hotelmate-frontend/src/components/auth/ProtectedRoute.jsx](hotelmate-frontend/src/components/auth/ProtectedRoute.jsx) consumes the policy.
7. **Nav/launcher** — [hotelmate-frontend/src/hooks/useDesktopNav.js](hotelmate-frontend/src/hooks/useDesktopNav.js) filters via `effectiveNavs.includes(slug)`.
8. **Dashboard** — [hotelmate-frontend/src/pages/staff/OverviewPage.jsx](hotelmate-frontend/src/pages/staff/OverviewPage.jsx) filters modules using the same `effectiveNavs`.

**Overall verdict:** Strong backbone. Localized leaks remain in a handful of action-button/notification components that still use raw role-name string matching.

---

## 2. Canonical Source Audit

### Where canonical data enters the frontend

- Entry point: login response, normalized in [hotelmate-frontend/src/hooks/useLogin.js](hotelmate-frontend/src/hooks/useLogin.js#L43).
- Stored in: `AuthContext` (React) + `authStore` (non-React bridge).
- Consumed through: `usePermissions()` hook.

### Canonical fields

| Field | Role | Status |
|-------|------|--------|
| `user.effective_navs` | Nav/module permission list | **Primary** — used everywhere |
| `user.tier` (fallback `user.access_level`) | Admin tier | **Primary** for admin gates |
| `user.is_superuser` | Blanket bypass | **Primary** |
| `user.is_staff` | Staff-mode guard | **Primary** |
| `user.hotel_slug` | Multi-tenant isolation | **Primary** |
| `user.allowed_navs` | Legacy | **Fallback only** in `useLogin` (line 43) — not read elsewhere |
| `user.navigation_items` | Backend-built nav tree | Used by [useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js) |
| `user.role` / `user.role_slug` | Department role | **Mixed** — used canonically in `canAccess()`, but also used non-canonically in RoomCard, HousekeepingRoomDetails, notification contexts |

### Competing sources

- **None for navigation/module visibility.** `usePermissions()` is the sole hook.
- **One secondary surface:** raw `user.role` string matching in a few files (see §4). These are not a competing *model*, but they bypass `usePermissions()` and can drift.

---

## 3. UI Exposure Audit

### 3.1 Sidebar / Navbar / App shell — ✅ ALIGNED

- [hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx](hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx#L44) and [MobileNavbar.jsx](hotelmate-frontend/src/components/layout/MobileNavbar.jsx#L31) consume `visibleNavItems` from [useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js).
- [useDesktopNav.js](hotelmate-frontend/src/hooks/useDesktopNav.js#L47) applies: `return effectiveNavs.includes(item.slug)` with `isSuperUser` bypass.
- No role-name heuristics in the shell.

### 3.2 Protected routes — ✅ ALIGNED

- All staff routes in [hotelmate-frontend/src/routes/staffRoutes.jsx](hotelmate-frontend/src/routes/staffRoutes.jsx) declare `protected: true, mode: 'staff', requiredSlug: '<canonical slug>'`.
- [ProtectedRoute.jsx](hotelmate-frontend/src/components/auth/ProtectedRoute.jsx#L29) delegates to `canAccessStaffPath()` in [staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js#L84), which checks `effective_navs` (with `is_superuser` bypass).
- Route→slug mapping defined in one place: [staffAccessPolicy.js lines 15–60](hotelmate-frontend/src/policy/staffAccessPolicy.js#L15-L60).

### 3.3 Dashboard cards / widgets — ✅ ALIGNED (minor caveat)

- [OverviewPage.jsx](hotelmate-frontend/src/pages/staff/OverviewPage.jsx#L120) filters `OVERVIEW_MODULES` by `effectiveNavs.includes(m)` with `isSuperUser` bypass.
- `OVERVIEW_MODULES` in [overviewSignalsStore.jsx](hotelmate-frontend/src/realtime/stores/overviewSignalsStore.jsx#L10-L12) is a hardcoded subset: `['room_bookings','room_services','housekeeping']`. Documented, but must be manually kept in sync with backend nav catalog when new operational modules are added — see §5.

### 3.4 Action buttons — ⚠️ MIXED

**Canonical (good):**
- [Settings.jsx](hotelmate-frontend/src/components/utils/Settings.jsx#L14) — `isAdmin` via `usePermissions()`
- [Staff.jsx](hotelmate-frontend/src/components/staff/Staff.jsx#L14) — `isAdmin`
- [RegistrationPackagesPanel.jsx](hotelmate-frontend/src/components/staff/RegistrationPackagesPanel.jsx#L85) — `if (!isAdmin) return null`
- [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L186) and line 377 — `isAdmin` and `canAccess([...])`
- [SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx#L28) — `isSuperStaffAdmin`

**Non-canonical (bad):**
- [RoomCard.jsx](hotelmate-frontend/src/components/rooms/RoomCard.jsx#L23) — `["housekeeping","admin","manager"].includes(userRole?.toLowerCase())`
- [HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L53-L54) — same pattern + `userData?.is_manager` + `role === 'manager'`

### 3.5 Tabs — ✅ ALIGNED

- [Staff.jsx](hotelmate-frontend/src/components/staff/Staff.jsx#L15-L22) tabs defined with `show: isAdmin`; conditional render mirrors at [lines 171–177](hotelmate-frontend/src/components/staff/Staff.jsx#L171-L177).

### 3.6 Empty-state CTAs / direct links — ✅ ALIGNED (no violations found)

- No `<Link to="/...">` references to staff modules outside permission-aware wrappers were found. Deep-linked screens are guarded by `ProtectedRoute`.

---

## 4. Anti-patterns Found

### 4.1 Role-name string heuristics (**Critical**)

| File | Line | Code | Why it's bad |
|------|------|------|-------------|
| [hotelmate-frontend/src/components/rooms/RoomCard.jsx](hotelmate-frontend/src/components/rooms/RoomCard.jsx#L23) | 23 | `["housekeeping","admin","manager"].includes(userRole?.toLowerCase())` | Hardcoded role names, no backend sync. Will break if backend renames a role or introduces a new qualifying role. |
| [hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L53) | 53 | `['housekeeping','admin','manager'].includes(userData?.role?.toLowerCase())` | Same. |
| [hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L54) | 54 | `userData?.is_manager \|\| userData?.role?.toLowerCase() === 'manager'` | Non-canonical `is_manager` flag + role-string match. |

### 4.2 Department / role slug hardcoding in realtime contexts (**High**)

| File | Line | Code |
|------|------|------|
| [hotelmate-frontend/src/context/BookingNotificationContext.jsx](hotelmate-frontend/src/context/BookingNotificationContext.jsx#L26) | 26 | `const roleSlug = user.role?.toLowerCase().replace(/ /g, '_')` |
| [hotelmate-frontend/src/context/BookingNotificationContext.jsx](hotelmate-frontend/src/context/BookingNotificationContext.jsx#L29) | 29 | `if (deptSlug === "food-and-beverage") ...` |
| [hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx#L27) | 27 | `const roleSlug = user.role?.toLowerCase().replace(/ /g, '_')` |
| [hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx#L30-L35) | 30-35 | Hardcoded `"kitchen"`, `"food-and-beverage"`, `"porter"`, `"room_service_waiter"` |

These contexts construct subscription filters from fragile role-name parsing instead of canonical payload (`effective_navs` or a dedicated backend-provided channel list).

### 4.3 Legacy `allowed_navs` fallback (**Low**)

- [hotelmate-frontend/src/hooks/useLogin.js](hotelmate-frontend/src/hooks/useLogin.js#L43) — `effective_navs: data.effective_navs || data.allowed_navs || []`. Acceptable during migration; remove once backend guarantees `effective_navs`.

### 4.4 Defensive `is_staff` auto-correction (**Low — smell**)

- [hotelmate-frontend/src/context/ThemeContext.jsx](hotelmate-frontend/src/context/ThemeContext.jsx#L50-L64) promotes `is_staff = true` locally if `access_level` implies staff but `is_staff` is falsy. Indicates backend payload drift; frontend is silently patching.

### 4.5 Duplicate permission helpers — ✅ None found

Only two permission surfaces: `useAuth()` (raw user) and `usePermissions()` (derived). Good.

### 4.6 Non-canonical usages — confirmed NOT present

- No `localStorage.getItem('role' | 'permissions' | 'access_level')` direct reads.
- No `isAdmin`/`isStaff` defined outside `usePermissions()` / `AuthContext`.
- No duplicate route guards.

---

## 5. Sync Gaps with Backend

| Gap | Location | Drift risk |
|-----|----------|-----------|
| Hardcoded role-name list | [RoomCard.jsx:23](hotelmate-frontend/src/components/rooms/RoomCard.jsx#L23), [HousekeepingRoomDetails.jsx:53-54](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L53-L54) | **High** — Backend renames/adds roles → UI silently wrong |
| Hardcoded dept slug `"food-and-beverage"`, `"kitchen"` | [BookingNotificationContext.jsx:29](hotelmate-frontend/src/context/BookingNotificationContext.jsx#L29), [RoomServiceNotificationContext.jsx:30-35](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx#L30-L35) | **High** — realtime subscriptions break on backend rename |
| Hardcoded role slugs `"porter"`, `"room_service_waiter"` | [RoomServiceNotificationContext.jsx:35](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx#L35) | **High** — same |
| 13 RBAC slugs duplicated in policy file | [staffAccessPolicy.js:15-60](hotelmate-frontend/src/policy/staffAccessPolicy.js#L15-L60) | **Medium** — must match backend RBAC catalog |
| `OVERVIEW_MODULES` hardcoded subset | [overviewSignalsStore.jsx:10-12](hotelmate-frontend/src/realtime/stores/overviewSignalsStore.jsx#L10-L12) | **Medium** — new operational modules won't auto-appear on dashboard |
| `DEFAULT_NAV_ITEMS` fallback list | [useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js) | **Low** — only used if backend omits `navigation_items` |
| No runtime validation of `effective_navs` shape in prod | [staffAccessPolicy.js:175-176](hotelmate-frontend/src/policy/staffAccessPolicy.js#L175-L176) (test-only) | **Medium** — a null/string payload would silently deny all routes |
| `is_staff` auto-correction in ThemeContext | [ThemeContext.jsx:50-64](hotelmate-frontend/src/context/ThemeContext.jsx#L50-L64) | **Low** — masks backend issues |

---

## 6. Refactor Plan (frontend-only)

### Step 1 — Eliminate role-name string matching
Replace ad-hoc role string checks with canonical `usePermissions()` methods:

- **[RoomCard.jsx](hotelmate-frontend/src/components/rooms/RoomCard.jsx#L23)**: Replace `canPerformQuickActions` with `hasNavAccess('housekeeping') || hasNavAccess('rooms') || isSuperUser` — or expose a new `can('room.quick_action')` capability gate that the backend drives.
- **[HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L53-L54)**: Replace `canManageRooms` with `hasNavAccess('housekeeping') || isAdmin`. Replace `canUseManagerOverride` with `canAccess(['manager'])` (already canonical via `usePermissions`) — remove the `is_manager` fallback.

### Step 2 — Drive realtime subscription targeting from backend
[BookingNotificationContext.jsx](hotelmate-frontend/src/context/BookingNotificationContext.jsx) and [RoomServiceNotificationContext.jsx](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx) should:
- Stop constructing `roleSlug` from `user.role.toLowerCase().replace(...)`.
- Read `user.role_slug` (already normalized) or a new backend-provided `notification_channels` / `subscribed_dept_slugs` field.
- Remove hardcoded `"food-and-beverage"`, `"kitchen"`, `"porter"`, `"room_service_waiter"` branches — gate on `hasNavAccess('room_services')` / `hasNavAccess('room_bookings')` instead of role name.

### Step 3 — Centralize canonical slug constants
Create `hotelmate-frontend/src/policy/canonicalNavSlugs.js` exporting the 13 slugs used in [staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js) and consume from:
- `staffAccessPolicy.js`
- `overviewSignalsStore.jsx`
- `useNavigation.js` (for `DEFAULT_NAV_ITEMS` sanity)

### Step 4 — Harden runtime guard
In [staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js#L104), add:
```js
const effectiveNavs = Array.isArray(user.effective_navs) ? user.effective_navs : [];
```
and log/telemetry when payload shape is wrong.

### Step 5 — Remove legacy fallback
Once backend is confirmed to always emit `effective_navs`, drop the `|| data.allowed_navs` branch in [useLogin.js:43](hotelmate-frontend/src/hooks/useLogin.js#L43).

### Step 6 — Drop defensive `is_staff` patch
Remove the auto-correction in [ThemeContext.jsx:50-64](hotelmate-frontend/src/context/ThemeContext.jsx#L50-L64). If `is_staff` is wrong from backend, that is a backend bug — surface it, don't mask it.

### Step 7 — Dashboard auto-population
Change [OverviewPage.jsx](hotelmate-frontend/src/pages/staff/OverviewPage.jsx) to iterate `effectiveNavs ∩ MODULE_CONFIG.keys`, instead of a fixed `OVERVIEW_MODULES` list. New modules then light up on the dashboard automatically when granted.

---

## 7. Priority

### Critical
1. **Role-string heuristics in RoomCard / HousekeepingRoomDetails** — user with wrong `role` label sees or loses action buttons contrary to their backend permissions.
2. **Notification contexts keyed by raw `user.role` and hardcoded dept slugs** — realtime events routed wrong on backend rename; user may see or miss notifications for modules they shouldn't/should have.

### High
3. **Hardcoded dept/role slug branches** in notification contexts (`food-and-beverage`, `kitchen`, `porter`, `room_service_waiter`) — tightly couples frontend to backend naming.
4. **Missing runtime validation** of `effective_navs` shape in production route guard.

### Medium
5. **Centralize canonical nav slug constants** — eliminate duplication between `staffAccessPolicy.js`, `overviewSignalsStore.jsx`, and `useNavigation.js`.
6. **Replace `OVERVIEW_MODULES` hardcoded list** with automatic derivation from `effective_navs ∩ MODULE_CONFIG`.
7. **`ThemeContext` defensive `is_staff` patch** — remove or log.

### Low
8. **Legacy `allowed_navs` fallback** in `useLogin.js` — remove once backend is stable on `effective_navs`.
9. **`DEFAULT_NAV_ITEMS` fallback** in `useNavigation.js` — already `@deprecated`, safe to delete when backend always sends `navigation_items`.

---

## Appendix — Confirmed canonical call sites (for reference)

- `effectiveNavs` read:
  - [usePermissions.js#L9](hotelmate-frontend/src/hooks/usePermissions.js#L9)
  - [useDesktopNav.js#L47](hotelmate-frontend/src/hooks/useDesktopNav.js#L47)
  - [staffAccessPolicy.js#L104](hotelmate-frontend/src/policy/staffAccessPolicy.js#L104)
  - [OverviewPage.jsx#L121](hotelmate-frontend/src/pages/staff/OverviewPage.jsx#L121)
- `isAdmin` / `isSuperStaffAdmin` consumers:
  - [Settings.jsx#L14](hotelmate-frontend/src/components/utils/Settings.jsx#L14)
  - [Staff.jsx#L14](hotelmate-frontend/src/components/staff/Staff.jsx#L14)
  - [RegistrationPackagesPanel.jsx#L17](hotelmate-frontend/src/components/staff/RegistrationPackagesPanel.jsx#L17)
  - [StaffDetails.jsx#L25](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L25)
  - [SectionEditorPage.jsx#L28](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx#L28)
  - [ThemeContext.jsx#L29](hotelmate-frontend/src/context/ThemeContext.jsx#L29)
- Route guard: [ProtectedRoute.jsx#L29](hotelmate-frontend/src/components/auth/ProtectedRoute.jsx#L29) → [staffAccessPolicy.js#L84](hotelmate-frontend/src/policy/staffAccessPolicy.js#L84)
