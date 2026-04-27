# FRONTEND_EXISTING_RBAC_AUDIT

**Scope:** Read-only audit of the current frontend RBAC / permission system as it exists today in `hotelmate-frontend/`. No code changes. Source: frontend code only.

**Critical finding up-front:** `user.rbac` is **NOT preserved** by [hotelmate-frontend/src/hooks/useLogin.js](hotelmate-frontend/src/hooks/useLogin.js) when normalising the login response, yet the action-gating layer in [hotelmate-frontend/src/rbac/can.js](hotelmate-frontend/src/rbac/can.js) reads exclusively from `user.rbac.<module>.actions.<action>`. Every `useCan(...)` / `<Can …>` / `can('module','action')` call site therefore fails closed (returns `false`) for non-superusers today. This is the single largest defect in the existing system and must be the first thing fixed in any migration.

---

## 1. Current auth payload handling

### 1.1 Where the login response is normalised

[hotelmate-frontend/src/hooks/useLogin.js](hotelmate-frontend/src/hooks/useLogin.js#L29-L52) — `loginUser()` posts to `/staff/login/` and assembles a `userToSave` object that is then passed to `AuthContext.login(...)`.

```js
const userToSave = {
  id: data.staff_id,
  staff_id: data.staff_id,
  token: data.token,
  username: data.username,
  hotel_id: data.hotel_id,
  hotel_name: data.hotel_name,
  hotel_slug: data.hotel_slug,
  is_staff: data.is_staff || data.is_superuser,
  is_superuser: data.is_superuser,
  // Canonical backend fields
  tier: data.tier || data.access_level,
  access_level: data.access_level,
  role_slug: data.role_slug || data.role,
  effective_navs: data.effective_navs || data.allowed_navs || [],
  navigation_items: data.navigation_items || [],
  department: data.department,
  role: data.role,
  profile_image_url: profileImageUrl,
  hotel: { id, name, slug },
};
```

### 1.2 Where the user is stored

[hotelmate-frontend/src/context/AuthContext.jsx](hotelmate-frontend/src/context/AuthContext.jsx#L40-L51) — `login(userData)` writes the object verbatim to React state, to `localStorage['user']`, and to the non-React bridge via `setAuthUser(userData)` ([hotelmate-frontend/src/lib/authStore.js](hotelmate-frontend/src/lib/authStore.js)). On reload, [hotelmate-frontend/src/context/AuthContext.jsx](hotelmate-frontend/src/context/AuthContext.jsx#L7-L13) re-hydrates from `localStorage` and re-seeds the bridge.

### 1.3 What is stored / preserved / dropped

| Backend field | Stored as | Status |
|---|---|---|
| `staff_id` | `id`, `staff_id` | preserved |
| `token` | `token` | preserved |
| `username` | `username` | preserved |
| `hotel_id`, `hotel_name`, `hotel_slug` | same + nested `hotel` object | preserved |
| `is_staff`, `is_superuser` | same | preserved |
| `tier` | `tier` (fallback to `access_level`) | preserved |
| `access_level` | `access_level` | preserved |
| `role_slug` | `role_slug` (fallback to `role`) | preserved |
| `role` | `role` | preserved |
| `effective_navs` | `effective_navs` (fallback to `allowed_navs`, default `[]`) | preserved |
| `allowed_navs` | folded into `effective_navs` | **dropped as a distinct field** |
| `navigation_items` | `navigation_items` (default `[]`) | preserved |
| `department` | `department` | preserved |
| `profile_image_url` | `profile_image_url` (URL-normalised) | preserved |
| **`rbac`** | — | **DROPPED — never copied into `userToSave`** |
| `allowed_capabilities` | — | not read anywhere |

### 1.4 Consequences

- `user.rbac` is `undefined` in state for every authenticated user. Action gating ([hotelmate-frontend/src/rbac/can.js](hotelmate-frontend/src/rbac/can.js#L18-L26)) returns `false` for everyone except superusers (who never reach `can()` because superuser bypass lives elsewhere — see §2).
- `allowed_navs` and `effective_navs` are conflated. Anything that wants the raw backend distinction has lost it after normalisation.

---

## 2. Existing permission helpers

### 2.1 [hotelmate-frontend/src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js)

| Helper | File | Reads | Returns | Used for |
|---|---|---|---|---|
| `role` | usePermissions.js#L6 | `user.role_slug` ?? `user.role` (lowercased) | string \| undefined | Legacy role-string gating in `canAccess()` |
| `isSuperUser` | usePermissions.js#L7 | `user.is_superuser` | boolean | Bypass flag used by every helper here and in `staffAccessPolicy` |
| `accessLevel` | usePermissions.js#L8 | `user.tier` ?? `user.access_level` | string \| undefined | Tier comparisons; backs `isStaffAdmin` / `isSuperStaffAdmin` |
| `effectiveNavs` | usePermissions.js#L9 | `user.effective_navs ?? []` | string[] | Source of truth for nav slug membership |
| `isSuperStaffAdmin` | usePermissions.js#L12 | `accessLevel === 'super_staff_admin'` | boolean | Tier gate; used by Theme, SectionEditor, RoomList |
| `isStaffAdmin` | usePermissions.js#L13 | `accessLevel === 'staff_admin'` | boolean | Tier gate |
| `isAdmin` | usePermissions.js#L14 | `isSuperUser \|\| isSuperStaffAdmin \|\| isStaffAdmin` | boolean | Compound admin gate (Settings, public pages, etc.) |
| `hasTier(t)` | usePermissions.js#L17-L22 | `user`, `isSuperUser`, `accessLevel` | boolean | Tier-equality check; superuser bypass |
| `hasNavAccess(slug)` | usePermissions.js#L24-L30 | `user`, `isSuperUser`, `effectiveNavs` | boolean | **Primary nav/module gate** (used by route policy, navbars, notification contexts) |
| `canAccess(allowedRoles)` | usePermissions.js#L32-L39 | `user`, `isSuperUser`, `role`, `accessLevel` | boolean | **Legacy role-string array gate** — matches lower-cased role or accessLevel against `[…]` |

### 2.2 [hotelmate-frontend/src/rbac/can.js](hotelmate-frontend/src/rbac/can.js)

| Helper | Reads | Returns | Used for |
|---|---|---|---|
| `can(user, module, action)` | `user.rbac[module].actions[action] === true` | boolean | Action gating per backend RBAC payload |
| `canAny(user, module, actions[])` | iterates `can()` | boolean | "any of" action checks |
| `canAll(user, module, actions[])` | iterates `can()` | boolean | "all of" action checks |

**No superuser bypass inside `can()`.** Combined with §1.4, every non-trivial `can()` call returns `false` today.

### 2.3 [hotelmate-frontend/src/rbac/useCan.js](hotelmate-frontend/src/rbac/useCan.js)

`useCan(module, action)` returns `{ user, allowed, can, canAny, canAll }`, where `can`/`canAny`/`canAll` are bound to the current user. Memoised on `[user, module, action]`.

### 2.4 [hotelmate-frontend/src/rbac/Can.jsx](hotelmate-frontend/src/rbac/Can.jsx)

Render-prop / wrapper component: `<Can module="…" action="…" anyOf={…} allOf={…} fallback={…}>`. Identical truth source as `can()`.

### 2.5 [hotelmate-frontend/src/rbac/index.js](hotelmate-frontend/src/rbac/index.js)

Barrel export: `can`, `canAny`, `canAll`, `useCan`, `Can`.

### 2.6 Route policy helper — [hotelmate-frontend/src/policy/staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js)

| Helper | Reads | Returns | Used for |
|---|---|---|---|
| `findRequiredNavSlug(pathname)` | `staffRoutes` regex map (lines 19–38) | slug \| `null` | Maps URL → required nav slug |
| `canAccessStaffPath({pathname,user,requiredSlug})` | `user.is_staff`, `user.is_superuser`, `user.effective_navs` | `{ allowed, redirectTo, reason }` | Single source of truth for staff route auth |
| `validateUserPermissions(user)` | `is_staff`, `is_superuser`, `effective_navs`, `access_level` | `{ valid, issues[] }` | Dev-time payload sanity check |

### 2.7 Nav hooks

- [hotelmate-frontend/src/hooks/useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js) — assembles `visibleNavItems` from `user.navigation_items` (with a hard-coded `DEFAULT_NAV_ITEMS` fallback at lines 7–22). **No filtering by `effective_navs`** here — backend list is taken at face value.
- [hotelmate-frontend/src/hooks/useDesktopNav.js](hotelmate-frontend/src/hooks/useDesktopNav.js#L25-L71) — adds synthetic `home` and `overview` items, then filters `visibleNavItems` by `isSuperUser || effectiveNavs.includes(slug)` and conditionally appends a `Settings` item using the same gate against the `admin_settings` slug.
- [hotelmate-frontend/src/hooks/useOverviewLanding.js](hotelmate-frontend/src/hooks/useOverviewLanding.js) — uses `effectiveNavs` and `shouldRedirectToOverview(...)` to redirect users with operational signals to Overview once per session.

---

## 3. Existing route / nav gating

| Surface | Current gate | Source field/helper | Notes |
|---|---|---|---|
| `<ProtectedRoute mode="auth">` | `!!user` | `useAuth().user` | [hotelmate-frontend/src/components/auth/ProtectedRoute.jsx](hotelmate-frontend/src/components/auth/ProtectedRoute.jsx#L17-L20) |
| `<ProtectedRoute mode="staff" requiredSlug="…">` | `canAccessStaffPath(...)` | `staffAccessPolicy` | redirects on deny; logs to console with reason |
| `staffAccessPolicy.canAccessStaffPath` | `user.is_staff`, `user.is_superuser`, `user.effective_navs.includes(slug)` | `effective_navs` | superuser bypass; unmapped path → deny + redirect |
| Route → slug map | regex table | hard-coded | maps `/rooms`, `/room-bookings`, `/booking-management` → `room_bookings`; `/restaurants` → `restaurant_bookings`; `/room_services`, `/breakfast`, `/menus_management` → `room_services`; `/settings` (under `/staff/`) → `admin_settings`; etc. |
| Desktop nav items | `isSuperUser \|\| effectiveNavs.includes(item.slug)` | `useDesktopNav.js` | filters out `home` and `admin_settings` from the rbac list and injects them as separate synthetic / settings items |
| Mobile navbar | `hasNavAccess(slug)` per item | [hotelmate-frontend/src/components/layout/MobileNavbar.jsx](hotelmate-frontend/src/components/layout/MobileNavbar.jsx) | **Slug used at line 362 is `'bookings'`** — does not match any backend slug (`room_bookings` / `restaurant_bookings`). Likely dead branch. |
| Mobile navbar `canAccess(...)` | role-string check | usePermissions.canAccess | legacy |
| `BigScreenNavbar` "manager / admin" branch | `canAccess(['manager','admin','super_staff_admin','staff_admin'])` | role-string array | [hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx](hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx#L148) |
| Navbars "Super User" link | `user?.is_superuser` | direct field read | MobileNavbar.jsx#L221, BigScreenNavbar.jsx#L661 |
| Overview landing redirect | `shouldRedirectToOverview({ effectiveNavs, … })` | `effective_navs` | [hotelmate-frontend/src/hooks/useOverviewLanding.js](hotelmate-frontend/src/hooks/useOverviewLanding.js) |
| Settings access (top-level component) | `isAdmin` | tier-derived | [hotelmate-frontend/src/components/utils/Settings.jsx](hotelmate-frontend/src/components/utils/Settings.jsx) |
| Section editor redirect | `!isSuperStaffAdmin → redirect` | tier | [hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx#L28-L40) |
| Notification listeners (room services) | `hasNavAccess('room_services')` | `effective_navs` | [hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx) |
| Notification listeners (bookings) | `hasNavAccess('restaurant_bookings') \|\| hasNavAccess('room_bookings')` | `effective_navs` | [hotelmate-frontend/src/context/BookingNotificationContext.jsx](hotelmate-frontend/src/context/BookingNotificationContext.jsx) |
| Public-page edit gating | `isAdmin` | tier-derived | [hotelmate-frontend/src/hooks/usePublicPagePermissions.js](hotelmate-frontend/src/hooks/usePublicPagePermissions.js) |

---

## 4. Existing action gating

### 4.1 RBAC-style (intended) action gates — `useCan` / `can()` / `<Can>`

These already speak the canonical `module + action` shape, but as noted in §1.4 they all currently fail closed because `user.rbac` is dropped at login.

| File | Component / function | UI / action gated | Current gate | Problem |
|---|---|---|---|---|
| [hotelmate-frontend/src/components/staff/StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L31-L35) | `StaffDetails` | edit profile, nav assign, dept manage, role manage | `can('staff_management', 'staff_update_profile' \| 'navigation_read' \| 'department_manage' \| 'role_manage')` | rbac dropped → always false off-superuser |
| [hotelmate-frontend/src/components/staff/Staff.jsx](hotelmate-frontend/src/components/staff/Staff.jsx#L18-L21) | `Staff` | tabs: registration packages, pending, departments, roles | `can / canAny('staff_management', …)` | same |
| [hotelmate-frontend/src/components/staff/StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx#L32-L33) | `StaffCreate` | Create staff submit | `can('staff_management','staff_create')` | same |
| [hotelmate-frontend/src/components/staff/RegistrationPackagesPanel.jsx](hotelmate-frontend/src/components/staff/RegistrationPackagesPanel.jsx#L20-L24) | `RegistrationPackagesPanel` | read / create / email / print package | `can('staff_management', 'registration_package_*')` | same |
| [hotelmate-frontend/src/utils/settings-sections/SectionStaffRegistration.jsx](hotelmate-frontend/src/utils/settings-sections/SectionStaffRegistration.jsx#L15-L17) | `SectionStaffRegistration` | tabs / create | `can('staff_management', 'registration_package_read' / 'registration_package_create')` | same |
| [hotelmate-frontend/src/utils/settings-sections/SectionDepartmentsRoles.jsx](hotelmate-frontend/src/utils/settings-sections/SectionDepartmentsRoles.jsx#L11-L15) | `SectionDepartmentsRoles` | dept / role read / manage | `can('staff_management', 'department_*' / 'role_*')` | same |
| [hotelmate-frontend/src/components/maintenance/MaintenanceRequests.jsx](hotelmate-frontend/src/components/maintenance/MaintenanceRequests.jsx#L22-L25) | `MaintenanceRequests` | edit / delete / comment | `can('maintenance', 'request_update' / 'request_delete' / 'comment_create')` | same |
| [hotelmate-frontend/src/components/rooms/RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx#L54-L60) | `RoomDetails` | status transition, destructive checkout, inspect, maintenance flag/clear, housekeeping override | `can('rooms' / 'housekeeping', '<action>')` | same; mixed module names (`rooms.*` and `housekeeping.*`) |
| [hotelmate-frontend/src/components/rooms/RoomCard.jsx](hotelmate-frontend/src/components/rooms/RoomCard.jsx#L24-L28) | `RoomCard` | quick actions | `can('rooms' / 'housekeeping', …)` | same |
| [hotelmate-frontend/src/components/staff/bookings/BookingActions.jsx](hotelmate-frontend/src/components/staff/bookings/BookingActions.jsx#L27-L30) | `BookingActions` | communicate, override conflicts, assign room | `can('bookings', '<action>')` | **module name `bookings`** — does it match the backend `user.rbac.bookings` (room bookings authority)? Per backend contract yes — but this code currently gates room-booking actions under `bookings`, while route policy uses `room_bookings`. Naming drift. |
| [hotelmate-frontend/src/pages/staff/room-management/RoomTypesTab.jsx](hotelmate-frontend/src/pages/staff/room-management/RoomTypesTab.jsx#L46-L48) | `RoomTypesTab` | type / media manage | `can('rooms', 'type_manage' / 'media_manage')` | rbac dropped |
| [hotelmate-frontend/src/pages/staff/room-management/RoomsTab.jsx](hotelmate-frontend/src/pages/staff/room-management/RoomsTab.jsx#L48-L49) | `RoomsTab` | create room | `can('rooms', 'inventory_create')` | rbac dropped |
| [hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx) | `HousekeepingRoomDetails` | housekeeping actions | `useCan(...)` | same |

### 4.2 Legacy / non-RBAC action gates

| File | Component / function | UI / action gated | Current gate | Problem |
|---|---|---|---|---|
| [hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx](hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx#L148) | `BigScreenNavbar` | "manager or admin" branch in staff_chat area | `canAccess(['manager','admin','super_staff_admin','staff_admin'])` | role-string array; no module/action mapping |
| [hotelmate-frontend/src/components/layout/MobileNavbar.jsx](hotelmate-frontend/src/components/layout/MobileNavbar.jsx#L31) | `MobileNavbar` | mixed | `canAccess`, `hasNavAccess` | mix of legacy + nav gate |
| [hotelmate-frontend/src/components/layout/MobileNavbar.jsx](hotelmate-frontend/src/components/layout/MobileNavbar.jsx#L362) | `MobileNavbar` | a "bookings" nav entry | `hasNavAccess('bookings')` | slug `bookings` does not match backend nav slugs |
| [hotelmate-frontend/src/staff_chat/components/ConversationView.jsx](hotelmate-frontend/src/staff_chat/components/ConversationView.jsx#L147-L148) | `ConversationView` | chat moderation (e.g. delete) | `canAccess(['manager','admin','super_staff_admin','staff_admin'])` | role-string array; nav used as authority for action |
| [hotelmate-frontend/src/components/staff/StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L391) | `StaffDetails` | revoke / edit buttons | `canAccess(['staff_admin','super_staff_admin','manager'])` | duplicates `staff_management.*` action gates from the same file |
| [hotelmate-frontend/src/components/utils/Settings.jsx](hotelmate-frontend/src/components/utils/Settings.jsx#L14) | `Settings` | settings page entry | `isAdmin` | tier-derived; bypasses `admin_settings` slug |
| [hotelmate-frontend/src/context/ThemeContext.jsx](hotelmate-frontend/src/context/ThemeContext.jsx#L29) | `ThemeProvider` | theme update mutation | `isSuperStaffAdmin` (and `!isSuperUser && !isSuperStaffAdmin` at lines 200/235) | tier; no theme module/action defined |
| [hotelmate-frontend/src/context/ThemeContext.jsx](hotelmate-frontend/src/context/ThemeContext.jsx#L56-L57) | `ThemeProvider` | staff detection fallback | `access_level === 'staff_admin' \|\| === 'super_staff_admin'` | raw tier-string compare |
| [hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx#L28-L40) | `SectionEditorPage` | full page access | `!isSuperStaffAdmin → navigate away` | tier; should be `admin_settings` action |
| [hotelmate-frontend/src/hooks/usePublicPagePermissions.js](hotelmate-frontend/src/hooks/usePublicPagePermissions.js#L20-L27) | `usePublicPagePermissions` | edit / publish public pages | `isAdmin` | tier; no module/action |
| [hotelmate-frontend/src/components/rooms/RoomList.jsx](hotelmate-frontend/src/components/rooms/RoomList.jsx#L53) | `RoomList` | hotel slug debug display | `isSuperStaffAdmin` | tier; cosmetic / debug |
| [hotelmate-frontend/src/components/layout/MobileNavbar.jsx](hotelmate-frontend/src/components/layout/MobileNavbar.jsx#L221), [BigScreenNavbar.jsx#L661](hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx#L661) | navbars | "Super User" link | `user?.is_superuser` | direct field read |

---

## 5. Existing backend RBAC consumption

| Source field | Read by | Purpose |
|---|---|---|
| `user.rbac.<module>.actions.<action>` | [hotelmate-frontend/src/rbac/can.js](hotelmate-frontend/src/rbac/can.js#L18-L26) | only consumer; the entire `useCan` / `<Can>` surface routes through here |
| `user.effective_navs` | [hotelmate-frontend/src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js#L9), [hotelmate-frontend/src/policy/staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js#L107), validation #L178 | nav / route gate |
| `user.navigation_items` | [hotelmate-frontend/src/hooks/useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js#L39) | nav assembly |
| `user.tier` | [hotelmate-frontend/src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js#L8) | preferred over `access_level` |
| `user.access_level` | [hotelmate-frontend/src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js#L8), staffAccessPolicy validation #L182, ThemeContext #L56-L57 | tier fallback / validation |
| `user.role_slug`, `user.role` | [hotelmate-frontend/src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js#L6) | legacy `canAccess()` matching |
| `user.is_staff`, `user.is_superuser` | AuthContext #L29, useLogin #L37-L38, usePermissions #L7, staffAccessPolicy #L78-L88, navbars | mode + bypass |
| `allowed_navs` | [hotelmate-frontend/src/hooks/useLogin.js](hotelmate-frontend/src/hooks/useLogin.js#L42) | only as a fallback source for `effective_navs`; never read again afterwards |
| `allowed_capabilities` | — | **not referenced anywhere in the frontend** |
| `actions.<x>` (outside of `user.rbac`) | — | none |
| `.visible`, `.read` (as RBAC fields) | — | none |

**Net:** the only place that reads canonical action RBAC (`user.rbac.module.actions.action`) is `src/rbac/can.js`. The infrastructure is already shaped correctly; the missing piece is plumbing the `rbac` field through login normalisation.

---

## 6. Existing legacy / unsafe patterns

1. **Role-string array gates** — `canAccess(['manager','admin','staff_admin','super_staff_admin'])` used in `BigScreenNavbar.jsx#L148`, `ConversationView.jsx#L147-L148`, `StaffDetails.jsx#L391`. Hard-codes role names; no relation to backend RBAC.
2. **Tier-as-action gate** — `isSuperStaffAdmin` / `isStaffAdmin` / `isAdmin` used to gate destructive operations (Theme writes, Section editor, Settings, public-page edit, room debug display). Tier is not the right authority for an action; this is "tier == admin → allow" which violates least privilege.
3. **Raw tier string comparisons** — `ThemeContext.jsx#L56-L57` (`access_level === 'staff_admin' || === 'super_staff_admin'`).
4. **Nav slug used as action authority** — notification listeners, theme writes, and several component branches treat presence in `effective_navs` as permission to *act*, not just to *see*. For room services / bookings notifications this is acceptable (subscribing != acting), but the same shape leaks into action gates elsewhere.
5. **Duplicated permission logic in same component** — `StaffDetails.jsx` uses both `can('staff_management', '<action>')` (lines 31–35, modern) **and** `canAccess(['staff_admin','super_staff_admin','manager'])` (line 391, legacy) for adjacent UI in the same file.
6. **Fallback / hard-coded nav lists** — `useNavigation.js` `DEFAULT_NAV_ITEMS` (lines 7–22) is a 12-item static list rendered when `user.navigation_items` is empty. Bypasses backend nav authority entirely on a misconfigured payload.
7. **`allowed_navs` vs `effective_navs` confusion** — `useLogin.js#L42` collapses both into one field; no caller can tell which the backend actually sent.
8. **Slug naming drift between frontend layers**
   - Route policy: `room_bookings`, `restaurant_bookings`, `room_services`, `staff_management`, `admin_settings`, `housekeeping`, `attendance`, `rooms`, `chat`, `maintenance`, `hotel_info`, `home`.
   - `MobileNavbar.jsx#L362` checks `hasNavAccess('bookings')` — there is no `bookings` slug in either the route map or backend contract. Dead branch.
   - `BookingActions.jsx` calls `can('bookings', …)` — per backend contract `user.rbac.bookings = room bookings authority`, so this is the *correct* RBAC module name, but it differs from the `room_bookings` nav slug, which makes the system look inconsistent.
9. **`user.rbac` dropped at login** (§1.4). The most severe legacy issue: the action helpers exist but are starved of input.
10. **Direct `user.is_superuser` reads in UI** (`MobileNavbar.jsx#L221`, `BigScreenNavbar.jsx#L661`) — tolerable, but bypasses the helper layer.

---

## 7. Existing reusable pieces we should keep

- **AuthContext as the canonical store** — [hotelmate-frontend/src/context/AuthContext.jsx](hotelmate-frontend/src/context/AuthContext.jsx) already stores the raw user, hydrates `localStorage`, and seeds the non-React `authStore` bridge. Shape is correct; it just needs the normalised user to include `rbac`.
- **Non-React bridge** — [hotelmate-frontend/src/lib/authStore.js](hotelmate-frontend/src/lib/authStore.js) gives axios interceptors / Pusher auth a current-user view without re-reading `localStorage`. Keep.
- **`ProtectedRoute`** — [hotelmate-frontend/src/components/auth/ProtectedRoute.jsx](hotelmate-frontend/src/components/auth/ProtectedRoute.jsx) — clean two-layer guard (`mode='auth'` and `mode='staff'`) delegating to `staffAccessPolicy`. Keep as is.
- **`staffAccessPolicy.canAccessStaffPath`** — central route → slug map plus a single `effective_navs` check with superuser bypass. Already the right place to evolve route gating.
- **`usePermissions.hasNavAccess`** — correct shape for nav/module visibility. Keep.
- **`useNavigation` / `useDesktopNav` / `useOverviewLanding`** — backend-driven nav assembly with a clean `effectiveNavs` filter in `useDesktopNav`. Keep; remove the static fallback later.
- **`src/rbac/{can,useCan,Can}`** — canonical action-gating layer, correct shape (`module + action`, fail-closed, superuser handled at gate sites or above). Keep and extend; no need to invent another helper.
- **`validateUserPermissions`** — useful dev-time guardrail; extend to also assert `rbac` is an object once it is preserved.

---

## 8. Recommended migration plan (no implementation)

### 8.1 Keep
- `AuthContext`, `authStore` bridge, `ProtectedRoute`, `staffAccessPolicy`, `usePermissions.hasNavAccess`, `useNavigation` / `useDesktopNav` / `useOverviewLanding`, `src/rbac/*`.

### 8.2 Replace
- All `canAccess([...role strings])` action gates → `useCan('<module>', '<action>')`.
- Tier-based action gates (`isAdmin`, `isStaffAdmin`, `isSuperStaffAdmin`) at action sites → `useCan(...)` with backend-defined actions; reserve tier for view-mode / global UI affordances.
- `MobileNavbar.jsx#L362` `hasNavAccess('bookings')` → use `room_bookings` and/or `restaurant_bookings` per backend contract.
- `Settings.jsx`, `SectionEditorPage.jsx`, `usePublicPagePermissions.js` admin checks → `hasNavAccess('admin_settings')` for visibility, plus `useCan('admin_settings', '<action>')` for actions **once** the backend exposes an `admin_settings` module (per the backend contract it does **not** today; until then, `hasNavAccess('admin_settings')` is the most accurate gate available).
- `ThemeContext.jsx` write gates → action under whatever module the backend assigns (no module today; treat as nav-level for now).

### 8.3 Create
- **Nothing new in `src/rbac/`**. The helpers already exist (`can`, `canAny`, `canAll`, `useCan`, `<Can>`).
- **One change in `useLogin.js`**: copy `data.rbac` (and any future top-level RBAC fields) into `userToSave`. This is the single highest-leverage fix and unblocks every existing `useCan` call site at once.
- Optional: a small typed mapping of frontend nav slugs ↔ backend RBAC module names to make the `bookings` (rbac module) vs `room_bookings` (nav slug) distinction explicit and grep-able. Not a new helper, just a constants file.

### 8.4 Remove later
- `usePermissions.canAccess` once all role-string array call sites are migrated.
- `usePermissions.isStaffAdmin` / `isSuperStaffAdmin` from action-gate call sites (they can stay in the helper as long as nothing in `src/components`, `src/pages`, `src/utils/settings-sections`, `src/staff_chat` uses them for actions).
- `DEFAULT_NAV_ITEMS` static fallback in `useNavigation.js` once backend `navigation_items` is reliably populated.
- `allowed_navs` fallback in `useLogin.js` once backend stops sending the legacy field.

### 8.5 Safest app-by-app order

1. **Plumb `user.rbac` through `useLogin.js` and persist it** (one-line change with massive blast radius). Validate via `validateUserPermissions`. Until this lands, every other RBAC migration is moot.
2. **Booking module naming alignment** — confirm `BookingActions.jsx` uses `bookings` (RBAC module) while routes/nav use `room_bookings` (nav slug); document in code or constants.
3. **Staff module migration** — `StaffDetails.jsx#L391` and any remaining `canAccess([...])` calls inside `src/components/staff/*` → `useCan('staff_management', ...)`. This module has the most existing `useCan` coverage already.
4. **Maintenance module** — already mostly `can('maintenance', ...)`; just verify no legacy gate remains.
5. **Rooms / Housekeeping** — sort out the `rooms.*` vs `housekeeping.*` action-namespacing inside `RoomDetails.jsx` and `RoomCard.jsx` against the backend contract before broader migration.
6. **Restaurant bookings / Room services** — currently only nav-gated; introduce action gates only where backend exposes actions (`restaurant_bookings`, `room_services` per the contract).
7. **Staff chat** — replace `canAccess([...])` in `BigScreenNavbar.jsx#L148` and `ConversationView.jsx#L147-L148`. Define the canonical module name with the backend (`staff_chat`?) before migration.
8. **Settings / Theme / Section editor / Public pages** — these gate against `admin_settings` (no RBAC module per backend contract). Move to `hasNavAccess('admin_settings')` for visibility; leave action gating as-is until backend introduces a module.
9. **Final sweep** — remove `canAccess`, role-string arrays, tier-as-action gates, and the static nav fallback.

### 8.6 Hard rules during migration
- `home` and `admin_settings` have no RBAC module on the backend — do not invent one client-side.
- `room_bookings` / `restaurant_bookings` / `room_services` are nav slugs; the corresponding RBAC module names per the backend contract are `bookings` (room bookings authority), `restaurant_bookings`, and `room_services`. Treat nav-slug and rbac-module namespaces as separate.
- Action gates must read through `useCan` / `<Can>` only. No new direct `user.role*` / `user.tier` / `user.access_level` reads in components.

---

**End of audit.** No code, tests, or backend assumptions were modified.
