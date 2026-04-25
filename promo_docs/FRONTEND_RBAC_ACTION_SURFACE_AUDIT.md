# HotelMates Frontend RBAC Action Surface Audit

**Scope:** `hotelmate-frontend/src` (React, Vite, JSX)
**Mode:** Read-only inventory. **No code modified.**
**Goal:** Enumerate every UI / behavior surface that may need to consume the (forthcoming) backend RBAC contract `user.rbac.<module>.actions.<action_key>`.
**Out of scope:** Backend changes, fixing anything, renaming anything, proposing final action keys.

---

## 1. Executive Summary

| Metric | Count |
|---|---|
| Total RBAC-relevant surfaces inventoried | **~210** (routes + nav items + buttons/actions + realtime + mutations) |
| Staff routes | **57** (in [staffRoutes.jsx](hotelmate-frontend/src/routes/staffRoutes.jsx)) |
| API service files | **16** (≈120 exported functions) |
| Frontend permission helpers | **5** (`useAuth`, `usePermissions`, `usePublicPagePermissions`, `useDesktopNav`, `useNavigation`) + 1 policy module ([staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js)) |
| Realtime channels subscribed | **10 base + 1 per-conversation + 1 per-booking-chat** |
| Modals exposing mutations | **18+** |
| Action buttons inventoried | **78+** unique handlers |
| Surfaces already canonical (`hasNavAccess` / `canAccess` / `isAdmin` from `usePermissions`) | **~45** |
| Surfaces using legacy/raw `user.role` / `is_manager` / `role_slug` string match | **3 files** ([RoomCard.jsx](hotelmate-frontend/src/components/rooms/RoomCard.jsx#L22-L28), [HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L54-L58), [usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js#L6) fallback) |
| Surfaces using legacy `allowed_navs` | **3** ([useLogin.js](hotelmate-frontend/src/hooks/useLogin.js#L43) fallback, [StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx#L25), [NavigationPermissionManager.jsx](hotelmate-frontend/src/components/staff/NavigationPermissionManager.jsx#L47)) |
| Surfaces using `effective_navs` for action-level decisions (not just module visibility) | **5** (RoomCard quick actions, HousekeepingRoomDetails ops, BookingNotificationContext eligibility, RoomServiceNotificationContext eligibility, MobileNavbar quick action) |
| Mutation surfaces with **no frontend gate** at all (rely solely on route guard / server) | **~35** (most CRUD inside admin-tier modules: rooms inventory, room types, attendance shifts, menus, maintenance status, BookingsGrid drag/delete/unseat, room service order status, etc.) |
| Surfaces unclear pending backend contract | **~50** (any per-action decision currently handled by route gate alone) |

**Bottom line:** Frontend has clean **module-visibility** RBAC. It does **not yet have an action-level RBAC consumer**: most write/mutation buttons are ungated client-side and rely on (a) the route guard for the page and (b) the server returning 403. There is no `can(module, action)` helper, no `<Can>` wrapper, no `useCan()` hook, and no centralized list of canonical module/action keys.

---

## 2. Current Frontend Permission Sources

| Source/helper | File | What it reads | What it controls | Status |
|---|---|---|---|---|
| `AuthContext` | [src/context/AuthContext.jsx](hotelmate-frontend/src/context/AuthContext.jsx#L91-L108) | Full backend user payload from localStorage | `user`, `isStaff`, `viewMode`, `selectedHotel`, `login`, `logout` | GOOD — single source for raw user object |
| `authStore` (non-React bridge) | [src/lib/authStore.js](hotelmate-frontend/src/lib/authStore.js#L10-L20) | Mirrors `AuthContext.user` | Used by axios interceptors, Pusher auth | GOOD |
| `useLogin` | [src/hooks/useLogin.js](hotelmate-frontend/src/hooks/useLogin.js#L25-L50) | Backend login response: `is_staff`, `is_superuser`, `tier`, `access_level`, `role_slug`, `role`, `effective_navs`, `allowed_navs`, `navigation_items` | Normalizes payload into `AuthContext` | GOOD (still has `\|\| data.allowed_navs` fallback at L43) |
| `usePermissions` | [src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js#L4-L50) | `user.role_slug`, `user.role`, `user.is_superuser`, `user.tier`, `user.access_level`, `user.effective_navs` | Exposes `isSuperUser`, `isAdmin`, `isStaffAdmin`, `isSuperStaffAdmin`, `hasTier(t)`, `hasNavAccess(slug)`, `canAccess(roles[])`, `effectiveNavs` | CANONICAL (the single derivation point) |
| `usePublicPagePermissions` | [src/hooks/usePublicPagePermissions.js](hotelmate-frontend/src/hooks/usePublicPagePermissions.js#L20-L35) | `user.hotel_slug`, `isAdmin`, `isStaff` | `canEditPublicPage` (gates inline edit on public hotel page) | GOOD — composes `usePermissions` |
| `useNavigation` | [src/hooks/useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js#L48-L92) | `user.navigation_items`, `user.hotel_slug` | Returns `visibleNavItems` for sidebar/mobile nav. Backend authoritative. | GOOD |
| `useDesktopNav` | [src/hooks/useDesktopNav.js](hotelmate-frontend/src/hooks/useDesktopNav.js#L17-L76) | `effectiveNavs`, `isSuperUser`, `visibleNavItems`, `user.hotel_slug` | Final desktop nav list with synthetic Overview/Home/Settings injection | GOOD |
| `staffAccessPolicy` | [src/policy/staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js#L11-L189) | `user.is_superuser`, `user.effective_navs`, pathname | `canAccessStaffPath(...)`, `findRequiredNavSlug(path)`, `validateUserPermissions(user)` | GOOD — central route gate |
| `ProtectedRoute` | [src/components/auth/ProtectedRoute.jsx](hotelmate-frontend/src/components/auth/ProtectedRoute.jsx#L27-L43) | `useAuth().user`, `mode`, `requiredSlug` | Redirects unauth/unauthorized to `/login` or fallback | GOOD |
| `useOverviewLanding` | [src/hooks/useOverviewLanding.js](hotelmate-frontend/src/hooks/useOverviewLanding.js#L26) | `effectiveNavs` | Decides which module the staff lands on after login | GOOD |
| `useAuth` | [src/context/AuthContext.jsx](hotelmate-frontend/src/context/AuthContext.jsx) | Raw user | Used 150+ places; many components read raw fields rather than going through `usePermissions` | MIXED — most consumers fine, but raw `user.role`/`user.is_manager` reads exist (see §9) |
| `ThemeContext` defensive `is_staff` patch | [src/context/ThemeContext.jsx](hotelmate-frontend/src/context/ThemeContext.jsx#L50-L64) | `user.access_level` | Auto-promotes `is_staff=true` if missing | LEGACY — masks backend payload bugs |
| `NavigationPermissionManager` | [src/components/staff/NavigationPermissionManager.jsx](hotelmate-frontend/src/components/staff/NavigationPermissionManager.jsx#L47) | Reads `staff.allowed_navs` (admin editor for another staff member) | Editor of nav permissions to send to backend | LEGACY field name — payload to backend uses `allowed_navs` |
| `StaffCreate` form payload | [src/components/staff/StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx#L25-L227) | Posts `allowed_navs: selectedNavItems` | Onboarding | LEGACY field name (write side) |

**Confirmed: no `localStorage.getItem('role'\|'permissions'\|'access_level')` direct reads.** All canonical reads go through `AuthContext` / `usePermissions`.

---

## 3. Route / Page Access Audit

All staff routes live in [src/routes/staffRoutes.jsx](hotelmate-frontend/src/routes/staffRoutes.jsx). Every route in the table below is wrapped by `<ProtectedRoute mode="…" requiredSlug="…">` in the route config, which delegates to [staffAccessPolicy.canAccessStaffPath](hotelmate-frontend/src/policy/staffAccessPolicy.js#L74).

| Route/path | Component | Current gate | Source | Module gate sufficient? | Needs action gate? | Status |
|---|---|---|---|---|---|---|
| `/staff/:hotelSlug/feed` | `Home` | `mode=auth` (auth-only) | ProtectedRoute | yes (landing) | no | GOOD_MODULE_GATE |
| `/staff/hotel/:hotelSlug` | redirect to feed | auth | ProtectedRoute | yes | no | GOOD_MODULE_GATE |
| `/staff/:hotelSlug/overview` | `OverviewPage` | auth + per-card filter via `effectiveNavs` (L120) | usePermissions | yes for landing | per-card actions inside cards may need action keys | NEEDS_BACKEND_ACTION_MAPPING |
| `/staff/:hotelSlug/section-editor` | `SectionEditorPage` | `requiredSlug=admin_settings` + extra `isSuperStaffAdmin` page-level redirect (L28-L47) | usePermissions | no — additionally tier-gated | maybe (publish, delete-section) | NEEDS_BACKEND_ACTION_MAPPING |
| `/staff/:hotelSlug/settings` | `Settings` | `requiredSlug=admin_settings` | policy | yes | per-section writes | NEEDS_BACKEND_ACTION_MAPPING |
| `/super-user` | `SuperUser` | staff route, auto-mapped to `home` | policy | unclear | ? | UNCLEAR |
| `/maintenance` | `Maintenance` | `requiredSlug=maintenance` | policy | no — status changes / deletes need action | yes | NEEDS_BACKEND_ACTION_MAPPING |
| `/:hotelSlug/staff` | `Staff` | `requiredSlug=staff_management` | policy | no — admin tabs gated client-side by `isAdmin` (L172-L177) | yes (create, approve, departments) | NEEDS_BACKEND_ACTION_MAPPING |
| `/:hotelSlug/staff/create` | `StaffCreate` | `requiredSlug=staff_management` | policy | no | yes (`staff_management.create`) | NEEDS_BACKEND_ACTION_MAPPING |
| `/:hotelSlug/staff/:id` | `StaffDetails` | `requiredSlug=staff_management` | policy | no — edit / revoke face gated by `isAdmin`, `canAccess([...])` | yes | NEEDS_BACKEND_ACTION_MAPPING |
| `/:hotelSlug/staff/me` | `StaffProfile` | auth-only | ProtectedRoute | yes (own profile) | maybe (self-edit) | UNCLEAR |
| `/attendance/:hotelSlug` | `AttendanceHub` | `requiredSlug=attendance` | policy | no — kiosk toggle, finalize period, copy day are admin actions | yes | NEEDS_BACKEND_ACTION_MAPPING |
| `/roster/:hotelSlug`, `/department-roster/:hotelSlug`, `/enhanced-attendance/:hotelSlug`, `/face/:hotelSlug/register` | redirects to `/attendance` | `attendance` | policy | yes | n/a | GOOD_MODULE_GATE |
| `/attendance/:hotelSlug/face-register` | `FaceRegisterPage` | `requiredSlug=attendance` | policy | no (face register is admin-bound) | yes | NEEDS_BACKEND_ACTION_MAPPING |
| `/hotel-:hotelSlug/restaurants*`, `/:hotelPrefix/restaurants*` | `HotelPrefixRestaurants` | `requiredSlug=restaurant_bookings` | policy | partial | yes (delete/unseat/assign) | NEEDS_BACKEND_ACTION_MAPPING |
| `/staff/hotel/:hotelSlug/rooms*`, `/staff/hotel/:hotelSlug/rooms/:roomNumber*`, `/rooms`, `/room-management/:hotelIdentifier/room/:roomNumber` | `RoomsHub`, `RoomDetails`, `AssignGuestForm` | `requiredSlug=rooms` | policy | partial (status ops gated by `canAccess(['housekeeping','manager'])`) | yes | NEEDS_BACKEND_ACTION_MAPPING |
| `/staff/hotel/:hotelSlug/rooms/:roomNumber/add-guest`, `/rooms/:roomNumber/add-guest` | `AssignGuestForm` | `rooms` | policy | partial | yes (`rooms.assign_guest`) | NEEDS_BACKEND_ACTION_MAPPING |
| `/room_services/:hotelSlug*` | `RoomServicesHub` | `requiredSlug=room_services` | policy | no — order status, menu CRUD are sub-actions | yes | NEEDS_BACKEND_ACTION_MAPPING |
| `/menus_management/:hotelSlug` | `MenusManagement` | `requiredSlug=room_services` | policy | no | yes (`room_services.menu.create/update/delete`) | NEEDS_BACKEND_ACTION_MAPPING |
| `/:hotelIdentifier/guests`, `/:hotelIdentifier/guests/:guestId/edit` | `GuestList`, `GuestEdit` | `requiredSlug=rooms` | policy | unclear (guests are part of rooms?) | yes (edit) | UNCLEAR |
| `/staff/hotel/:hotelSlug/room-bookings*`, `/staff/hotel/:hotelSlug/booking-management`, `/bookings` | `RoomBookingsHub` | `requiredSlug=room_bookings` | policy | no — approve/decline/send-link/extend-overstay/move-room | yes | NEEDS_BACKEND_ACTION_MAPPING |
| `/staff/hotel/:hotelSlug/housekeeping*` | `HousekeepingRooms`, `HousekeepingRoomDetails` | `requiredSlug=housekeeping` | policy | no — manager override, status transitions | yes | NEEDS_BACKEND_ACTION_MAPPING |
| `/hotel_info/:hotel_slug*` | `HotelInfo` | `requiredSlug=hotel_info` | policy | partial | yes (edit/save) | NEEDS_BACKEND_ACTION_MAPPING |
| `/hotel/:hotelSlug/chat` | `CHAT_HOME_PAGE` | `requiredSlug=chat` | policy | partial | yes (delete msg, edit msg) | NEEDS_BACKEND_ACTION_MAPPING |
| `/feed`, `/home`, `/overview` | redirect to canonical | auth | ProtectedRoute | yes | no | GOOD_MODULE_GATE |
| `/settings`, `/chat`, `/restaurants`, `/restaurant-bookings`, `/restaurant_bookings`, `/staff`, `/staff-management`, `/staff_management`, `/attendance`, `/room_services`, `/room-services`, `/hotel_info`, `/hotel-info`, `/room-bookings` | RedirectToCanonical | mode=staff with respective slug | policy | yes (redirects) | n/a | GOOD_MODULE_GATE |

**Auth-only routes (not RBAC-gated):** `/staff/:hotelSlug/feed`, `/staff/:hotelSlug/overview`, `/staff/hotel/:hotelSlug` (redirect), `/feed`, `/home`, `/overview`, `/:hotelSlug/staff/me`. Comment in [staffRoutes.jsx](hotelmate-frontend/src/routes/staffRoutes.jsx) says these are intentional landings; actions inside are gated downstream.

**Auth (non-staff) routes** — [authRoutes.jsx](hotelmate-frontend/src/routes/authRoutes.jsx): `/login`, `/logout`, `/register`, `/registration-success`, `/forgot-password`, `/reset-password/:uid/:token/`, `/no-internet`. **Status: NO_GATE (intentional / public).**

**Guest routes** — [guestRoutes.jsx](hotelmate-frontend/src/routes/guestRoutes.jsx): all unwrapped (token/QR/booking-id auth handled internally). Includes `/face/:hotelSlug/clock-in` and `/camera-clock-in/:hotelSlug` which are **intentionally public** for face-clock-in kiosks. **Status: NO_GATE_BY_DESIGN.**

**Public routes** — [publicRoutes.jsx](hotelmate-frontend/src/routes/publicRoutes.jsx): all unguarded. **Status: NO_GATE_BY_DESIGN.**

---

## 4. Navigation / Dashboard / Launcher Audit

| Surface | File/component | Current condition | Uses `effective_navs`? | Uses role/tier? | Status | Notes |
|---|---|---|---|---|---|---|
| Desktop sidebar items | [BigScreenNavbar.jsx](hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx#L44) → [useDesktopNav.js](hotelmate-frontend/src/hooks/useDesktopNav.js#L44-L49) | `isSuperUser \|\| effectiveNavs.includes(item.slug)` | yes | only `isSuperUser` | GOOD_NAV_ONLY | |
| Mobile bottom nav items | [MobileNavbar.jsx](hotelmate-frontend/src/components/layout/MobileNavbar.jsx#L31) | Uses `canAccess`, `hasNavAccess` from `usePermissions` | yes | yes | GOOD_NAV_ONLY | |
| Mobile bookings shortcut | [MobileNavbar.jsx](hotelmate-frontend/src/components/layout/MobileNavbar.jsx#L362) | `hasNavAccess('bookings') &&` (note: slug `'bookings'`, not `'room_bookings'`) | yes | no | UNCLEAR_PENDING_BACKEND_CONTRACT | slug literal differs from canonical `room_bookings` |
| Settings entry (sidebar) | [useDesktopNav.js](hotelmate-frontend/src/hooks/useDesktopNav.js#L60) | `isSuperUser \|\| isAdmin` | no | yes (`isAdmin`) | LEGACY_ADMIN_CHECK | likely module = `admin_settings` |
| Overview page module cards | [OverviewPage.jsx](hotelmate-frontend/src/pages/staff/OverviewPage.jsx#L105-L122) | Filters `OVERVIEW_MODULES` (`['room_bookings','room_services','housekeeping']`) by `effectiveNavs.includes(m) \|\| isSuperUser` | yes | only superuser | GOOD_NAV_ONLY | hardcoded subset list in [overviewSignalsStore.jsx](hotelmate-frontend/src/realtime/stores/overviewSignalsStore.jsx#L10-L12) |
| Overview "Open Room Bookings" CTA | [OverviewPage.jsx](hotelmate-frontend/src/pages/staff/OverviewPage.jsx#L50) | renders if module passes `effective_navs` filter | yes | no | GOOD_NAV_ONLY | |
| Overview "Open Housekeeping" CTA | [OverviewPage.jsx](hotelmate-frontend/src/pages/staff/OverviewPage.jsx#L50) | same | yes | no | GOOD_NAV_ONLY | |
| Overview "Open Room Service" CTA | [OverviewPage.jsx](hotelmate-frontend/src/pages/staff/OverviewPage.jsx#L50) | same | yes | no | GOOD_NAV_ONLY | |
| Overview signals store category constants | [overviewSignalsStore.jsx](hotelmate-frontend/src/realtime/stores/overviewSignalsStore.jsx#L10-L12) | `OVERVIEW_MODULES = ['room_bookings','room_services','housekeeping']` | n/a | no | LEGACY (hardcoded subset; new modules won't auto-appear) | |
| Default nav fallback list | [useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js) `DEFAULT_NAV_ITEMS` | only used if backend omits `navigation_items` | no | no | LEGACY (deprecated) | |
| Nav category mapping | [src/config/navigationCategories.js](hotelmate-frontend/src/config/navigationCategories.js) | hardcodes slug→category strings | no | no | UNCLEAR | string keys must match backend slugs |
| Nav icon mapping | [src/config/navIconMap.js](hotelmate-frontend/src/config/navIconMap.js) | hardcodes slug→icon | no | no | UNCLEAR | same |
| App layout shell (top-level) | [AppLayoutShell.jsx](hotelmate-frontend/src/components/app/AppLayoutShell.jsx#L3) | uses `useAuth` for shell choice | no | indirect | GOOD_NAV_ONLY | |
| Hotels landing page (gallery edit, CTA) | [HotelsLandingPage.jsx](hotelmate-frontend/src/pages/hotels/HotelsLandingPage.jsx#L4) | uses `useAuth` | no | no | UNCLEAR | |

---

## 5. Button / Action Surface Inventory

> Module guesses are provisional. **All "Proposed backend action placeholder" entries are `PLACEHOLDER_ONLY`** and must NOT be treated as final names.

### 5.1 Staff Management

| Module guess | Surface | File | Label | Action | API | Current gate | Source | RBAC needed? | Placeholder | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| staff_management | Tab "Staff" | [Staff.jsx](hotelmate-frontend/src/components/staff/Staff.jsx#L134) | "Staff" | Switch tab | — | NONE | — | no (UI tab) | UI_ONLY | NO_GATE |
| staff_management | Tab "Registration Packages" | [Staff.jsx](hotelmate-frontend/src/components/staff/Staff.jsx#L145) | "Registration Packages" | Switch tab | — | `isAdmin` | `usePermissions` | yes | `staff_management.packages.view` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| staff_management | Tab "Pending Staff Requests" | [Staff.jsx](hotelmate-frontend/src/components/staff/Staff.jsx#L159) | "Pending Staff Requests" | Switch tab | — | `isAdmin` | `usePermissions` | yes | `staff_management.pending.view` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| staff_management | Tab "Departments & Roles" | [Staff.jsx](hotelmate-frontend/src/components/staff/Staff.jsx#L172) | "Departments & Roles" | Switch tab | — | `isAdmin` | `usePermissions` | yes | `staff_management.departments.view` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| staff_management | "Edit Profile" | [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L186) | "Edit Profile" | Enter edit mode | — | `isAdmin` | `usePermissions` | yes | `staff_management.profile.edit` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| staff_management | "Save" (edit) | [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L189) | "Save" | Save staff edit | `PATCH staff/{hotelSlug}/{id}/` | `isAdmin` | `usePermissions` | yes | `staff_management.profile.update` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| staff_management | "Cancel" | [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L190) | "Cancel" | Discard | — | `isAdmin` | `usePermissions` | no | UI_ONLY | NO_GATE |
| staff_management | "Back to Staff List" | [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L194) | "Back to Staff List" | Navigate | — | NONE | — | no | UI_ONLY | NO_GATE |
| staff_management | "Register Face" | [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx) ~407 | "Register Face" | Navigate to `/face/:hotel/register?staffId=` | — | face config check | local | yes | `attendance.face.register` PLACEHOLDER_ONLY | UNCLEAR_PENDING_BACKEND_CONTRACT |
| staff_management | "Revoke Face" | [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L377) ~420 | "Revoke" | Open revoke modal | — | `canAccess(['staff_admin','super_staff_admin'])` or `canAccess(['manager'])` | `usePermissions` | yes | `attendance.face.revoke` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| staff_management | "Revoke" confirm | [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L509) | "Revoke" | Submit revoke | `useFaceAdminApi` POST | `hasNavAccess('staff_management')` + role | `usePermissions` | yes | `attendance.face.revoke` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| staff_management | "Approve" pending | [StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx#L150) | "Approve" | Open approve modal | — | `isAdmin` (parent tab) | `usePermissions` | yes | `staff_management.pending.approve` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| staff_management | "Create Staff" form submit | [StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx#L227-L230) | "Create Staff" | Create profile (with `allowed_navs`) | `POST /staff/{hotelSlug}/create-staff/` | `isAdmin` (parent) | `usePermissions` | yes | `staff_management.create` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| staff_management | "+ Add Department" inline | [StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx) ~115 | "+ Add Department" | Create department | `POST /staff/{hotelSlug}/departments/` | `isAdmin` (parent) | `usePermissions` | yes | `staff_management.departments.create` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| staff_management | "+ Add Role" inline | [StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx) ~130 | "+ Add Role" | Create role | `POST /staff/{hotelSlug}/roles/` | `isAdmin` (parent) | `usePermissions` | yes | `staff_management.roles.create` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| staff_management | "Generate Package" | [SectionStaffRegistration.jsx](hotelmate-frontend/src/components/utils/settings-sections/SectionStaffRegistration.jsx#L103) | "Generate Package" | Generate QR | `POST /staff/registration-package/` | inherited (settings section is admin-gated by `Settings.jsx` `isAdmin`) | `usePermissions` | yes | `staff_management.packages.generate` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| staff_management | "Copy Code" / "Download QR" | [SectionStaffRegistration.jsx](hotelmate-frontend/src/components/utils/settings-sections/SectionStaffRegistration.jsx#L151-L161) | "Copy Code", "Download QR" | UI clipboard / image download | — | NONE | — | no (post-issuance) | UI_ONLY | NO_GATE |
| staff_management | Department create | [SectionDepartmentsRoles.jsx](hotelmate-frontend/src/components/utils/settings-sections/SectionDepartmentsRoles.jsx#L119) | "Add" | Create dept | `POST /staff/{hotelSlug}/departments/` | inherited admin gate | parent | yes | `staff_management.departments.create` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| staff_management | Role create | [SectionDepartmentsRoles.jsx](hotelmate-frontend/src/components/utils/settings-sections/SectionDepartmentsRoles.jsx#L155) | "Add" | Create role | `POST /staff/{hotelSlug}/roles/` | inherited | parent | yes | `staff_management.roles.create` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| staff_management | NavigationPermissionManager save | [NavigationPermissionManager.jsx](hotelmate-frontend/src/components/staff/NavigationPermissionManager.jsx#L47) | (admin editor) | Edit `allowed_navs` of another staff | implied PATCH | inherited | parent | yes | `staff_management.profile.update_navs` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |

### 5.2 Bookings (Room Bookings)

| Module guess | Surface | File | Label | Action | API | Current gate | Source | RBAC needed? | Placeholder | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| room_bookings | "Send Pre-Check-in" | [BookingList.jsx](hotelmate-frontend/src/components/staff/bookings/BookingList.jsx) | "Send Pre-Check-in" | Send link | `POST /staff/hotel/{hotelSlug}/room-bookings/{bookingId}/send-precheckin-link/` (services/api.js `sendPrecheckinLink`) | NONE (page-level only) | — | yes | `room_bookings.send_precheckin` PLACEHOLDER_ONLY | NO_GATE |
| room_bookings | "Approve" booking | [BookingList.jsx](hotelmate-frontend/src/components/staff/bookings/BookingList.jsx) | "Approve" | Accept + capture payment | `POST /staff/hotel/{hotelSlug}/room-bookings/{bookingId}/approve/` | NONE | — | yes | `room_bookings.approve` PLACEHOLDER_ONLY | NO_GATE |
| room_bookings | "Decline" booking | [BookingList.jsx](hotelmate-frontend/src/components/staff/bookings/BookingList.jsx) | "Decline" | Reject + release auth | `POST /staff/hotel/{hotelSlug}/room-bookings/{bookingId}/decline/` | NONE | — | yes | `room_bookings.decline` PLACEHOLDER_ONLY | NO_GATE |
| room_bookings | View booking row → mark seen | [BookingTable.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTable.jsx) | row click | Mark seen | `POST /staff/hotel/{hotelSlug}/room-bookings/{bookingId}/mark-seen/` | NONE | — | yes (read but writes seen state) | `room_bookings.mark_seen` PLACEHOLDER_ONLY | NO_GATE |
| room_bookings | "View Pre-Check-in" | [BookingTable.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTable.jsx) | "View Pre-Check-in" | UI scroll | — | NONE | — | maybe | UI_ONLY | NO_GATE |
| room_bookings | Filter chips (search/buckets) | [BookingList.jsx](hotelmate-frontend/src/components/staff/bookings/BookingList.jsx) | various | UI filter | — | NONE | — | no | UI_ONLY | NO_GATE |
| room_bookings | Overstay "Acknowledge" | [staffApi.js](hotelmate-frontend/src/services/staffApi.js) `staffOverstayAcknowledge` | "Acknowledge" | Acknowledge incident | `POST /staff/hotel/{hotelSlug}/room-bookings/{bookingId}/overstay/acknowledge/` | NONE | — | yes | `room_bookings.overstay.acknowledge` PLACEHOLDER_ONLY | NO_GATE |
| room_bookings | Overstay "Extend" | [staffApi.js](hotelmate-frontend/src/services/staffApi.js) `staffOverstayExtend` | "Extend" | Add nights / new checkout | `POST /staff/hotel/{hotelSlug}/room-bookings/{bookingId}/overstay/extend/` | NONE | — | yes | `room_bookings.overstay.extend` PLACEHOLDER_ONLY | NO_GATE |
| room_bookings | "Move Room" | [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) `moveRoom` | "Move" | Move guest to other room | `POST /staff/hotel/{hotelSlug}/room-bookings/{bookingId}/move-room/` | NONE | — | yes | `room_bookings.move_room` PLACEHOLDER_ONLY | NO_GATE |

### 5.3 Restaurant Bookings (BookingsGrid)

| Module guess | Surface | File | Label | Action | API | Current gate | Source | RBAC needed? | Placeholder | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| restaurant_bookings | Filter "Today"/"Upcoming" | [BookingsGrid.jsx](hotelmate-frontend/src/components/bookings/BookingsGrid.jsx#L186-L194) | "Today"/"Upcoming" | UI filter | — | NONE | — | no | UI_ONLY | NO_GATE |
| restaurant_bookings | Drag-drop assign-to-table | [BookingsGrid.jsx](hotelmate-frontend/src/components/bookings/BookingsGrid.jsx) ~120 | drag drop | Assign to table | `POST /bookings/assign/{hotelSlug}/{restaurantSlug}/` | NONE | — | yes | `restaurant_bookings.assign_table` PLACEHOLDER_ONLY | NO_GATE |
| restaurant_bookings | Delete booking icon | [BookingsGrid.jsx](hotelmate-frontend/src/components/bookings/BookingsGrid.jsx#L235) | delete | Delete booking | `DELETE /bookings/delete/{hotelSlug}/{restaurantSlug}/{bookingId}/` | NONE | — | yes | `restaurant_bookings.delete` PLACEHOLDER_ONLY | NO_GATE |
| restaurant_bookings | "Unseat" | [BookingsGrid.jsx](hotelmate-frontend/src/components/bookings/BookingsGrid.jsx) ~160 | "Unseat" | Remove from table | `POST /bookings/unseat/{hotelSlug}/{restaurantSlug}/` | NONE | — | yes | `restaurant_bookings.unseat` PLACEHOLDER_ONLY | NO_GATE |

### 5.4 Rooms / Housekeeping operations

| Module guess | Surface | File | Label | Action | API | Current gate | Source | RBAC needed? | Placeholder | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| rooms | RoomCard quick action button | [RoomCard.jsx](hotelmate-frontend/src/components/rooms/RoomCard.jsx#L22-L28) | (icon, "Open turnover") | open turnover | — | `(hasNavAccess('housekeeping') \|\| hasNavAccess('rooms')) \|\| isAdmin \|\| isSuperUser` | `usePermissions` | yes | `rooms.quick_actions` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| rooms | RoomList toggle (super staff admin) | [RoomList.jsx](hotelmate-frontend/src/components/rooms/RoomList.jsx#L53-L169) | toggle | toggles room list view | — | `isSuperStaffAdmin` | `usePermissions` | yes | `rooms.toggle_quick_view` PLACEHOLDER_ONLY | LEGACY_TIER_CHECK |
| rooms | "Checkout" | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx#L52) ~400 | "Checkout" | Mark checkout | `POST /staff/hotel/{hotelSlug}/rooms/checkout/` | `canAccess(['housekeeping','manager']) \|\| isSuperUser` | `usePermissions` | yes | `rooms.status.checkout` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| rooms | "Start Cleaning" | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx) ~410 | "Start Cleaning" | start cleaning | `POST /staff/hotel/{hotelSlug}/rooms/{roomNumber}/start-cleaning/` | same | `usePermissions` | yes | `rooms.status.start_cleaning` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| rooms | "Mark Cleaned" | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx) ~420 | "Mark Cleaned" | mark cleaned | `POST .../mark-cleaned/` | same | `usePermissions` | yes | `rooms.status.mark_cleaned` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| rooms | "Inspect" + modal "Confirm Inspection" | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx) ~430-440 | "Inspect"/"Confirm Inspection" | inspect room | `POST .../inspect/` | same | `usePermissions` | yes | `rooms.status.inspect` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| rooms | "Mark Maintenance" | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx) ~450 | "Mark Maintenance" | flag maintenance | `POST .../mark-maintenance/` | same | `usePermissions` | yes | `rooms.status.mark_maintenance` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| rooms | "Complete Maintenance" | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx) ~460 | "Complete Maintenance" | mark fixed | `POST .../complete-maintenance/` | same | `usePermissions` | yes | `rooms.status.complete_maintenance` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| rooms | "Manager Override Status" + modal | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx) ~470-480 | "Override Status"/"Update Status" | manager-only override | `POST /staff/hotel/{hotelSlug}/housekeeping/rooms/{roomId}/manager_override/` | `canAccess(['manager']) \|\| isSuperUser` | `usePermissions` | yes | `rooms.status.manager_override` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| rooms | "Add Note" | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx#L885) | "Add Note" | stub | — | NONE | — | maybe | UI_ONLY | NO_GATE |
| rooms | "Create Room" / "Bulk Create" / "Edit" | [RoomsTab.jsx](hotelmate-frontend/src/pages/staff/room-management/RoomsTab.jsx) ~150-200 | various | open modal | — / `POST createRoom`, `PATCH updateRoom`, `POST bulkCreateRooms` | NONE | — | yes | `rooms.inventory.create/update/bulk_create` PLACEHOLDER_ONLY | NO_GATE |
| rooms | "Delete Room" | [RoomsTab.jsx](hotelmate-frontend/src/pages/staff/room-management/RoomsTab.jsx) ~200 | "Delete" | delete room | `DELETE deleteRoom(...)` | NONE | — | yes | `rooms.inventory.delete` PLACEHOLDER_ONLY | NO_GATE |
| rooms | Room Type CRUD | [RoomTypesTab.jsx](hotelmate-frontend/src/pages/staff/room-management/RoomTypesTab.jsx) ~80-110 | "Create"/"Edit"/"Delete" | CRUD room types | `POST createRoomType`, `PATCH updateRoomType`, `DELETE deleteRoomType` | NONE | — | yes | `rooms.types.create/update/delete` PLACEHOLDER_ONLY | NO_GATE |
| rooms | Upload room type photo | [roomManagementApi.js](hotelmate-frontend/src/services/roomManagementApi.js) `uploadRoomTypePhoto` | upload | upload image | `POST /staff/hotel/{hotelSlug}/room-images/` | NONE | — | yes | `rooms.types.upload_photo` PLACEHOLDER_ONLY | NO_GATE |
| housekeeping | Housekeeping room ops (Checkout/Start/Mark Cleaned/Inspect/Maintenance/Complete) | [HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L54-L58) | same as RoomDetails | mirror RoomDetails | `roomOperations.js` | `canManageRooms = isSuperUser \|\| isAdmin \|\| hasNavAccess('housekeeping') \|\| hasNavAccess('rooms')` | `usePermissions` | yes | `housekeeping.status.*` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| housekeeping | "Manager Override" | [HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L56-L58) | "Override Status" | manager bypass | `POST .../manager_override/` | `canUseManagerOverride = isSuperUser \|\| isSuperStaffAdmin \|\| canAccess(['manager'])` | `usePermissions` | yes | `housekeeping.manager_override` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| housekeeping | Status history view | [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) `getHousekeepingStatusHistory` | (read) | view audit log | `GET .../status-history/` | NONE | — | yes (sensitive read) | `housekeeping.status_history.view` PLACEHOLDER_ONLY | NO_GATE |
| rooms | Turnover dashboard list/stats | [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) `listTurnoverRooms`/`getTurnoverStats` | (read) | turnover board | `GET .../turnover/rooms/`, `.../turnover/stats/` | NONE | — | yes | `rooms.turnover.view` PLACEHOLDER_ONLY | NO_GATE |
| rooms | Check-in/out bulk endpoints | [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) `checkinRoom`/`checkoutRoom` | (button per surface) | check-in/out | `POST .../rooms/checkin/` and `.../checkout/` | NONE | — | yes | `rooms.checkin`, `rooms.checkout` PLACEHOLDER_ONLY | NO_GATE |
| rooms | "Assign Guest" form submit | `AssignGuestForm` (route `/rooms/:roomNumber/add-guest`) | "Assign Guest" | assign | (POST endpoint not directly traced; via api) | NONE | — | yes | `rooms.assign_guest` PLACEHOLDER_ONLY | NO_GATE |

### 5.5 Attendance / Roster

| Module guess | Surface | File | Label | Action | API | Current gate | Source | RBAC needed? | Placeholder | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| attendance | "Kiosk Mode On/Off" | [AttendanceDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/AttendanceDashboard.jsx#L631) | "Kiosk Mode" | enable kiosk | `POST` (varies) | NONE | — | yes | `attendance.kiosk.toggle` PLACEHOLDER_ONLY | NO_GATE |
| attendance | "Enhanced Attendance" link | [AttendanceDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/AttendanceDashboard.jsx#L731) | "Enhanced Attendance" | navigate | — | NONE | — | maybe | UI_ONLY | NO_GATE |
| attendance | View staff modal | [AttendanceDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/AttendanceDashboard.jsx) | row click | open modal | — | NONE | — | yes (sensitive PII) | `attendance.staff.view_detail` PLACEHOLDER_ONLY | NO_GATE |
| attendance | "Finalize Period" | [AttendanceDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/AttendanceDashboard.jsx) | "Finalize Period" | finalize | `POST` (period finalize) | NONE | — | yes | `attendance.period.finalize` PLACEHOLDER_ONLY | NO_GATE |
| attendance | `isSuperStaffAdmin` panel | [AttendanceDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/AttendanceDashboard.jsx#L118) | (admin tools) | conditionally render super-admin tools | — | `isSuperStaffAdmin` | `usePermissions` | yes | `attendance.super_admin` PLACEHOLDER_ONLY | LEGACY_TIER_CHECK |
| attendance | Shift cell click → edit | [RosterManagementGrid.jsx](hotelmate-frontend/src/features/attendance/components/RosterManagementGrid.jsx) ~150 | click cell | open shift edit | — | NONE | — | yes | `attendance.shift.edit` PLACEHOLDER_ONLY | NO_GATE |
| attendance | "Save" shift | [RosterManagementGrid.jsx](hotelmate-frontend/src/features/attendance/components/RosterManagementGrid.jsx) ~200 | "Save" | save shift | `POST/PATCH /staff/hotel/{hotelSlug}/attendance/shifts/` | NONE | — | yes | `attendance.shift.save` PLACEHOLDER_ONLY | NO_GATE |
| attendance | "Delete" shift | [RosterManagementGrid.jsx](hotelmate-frontend/src/features/attendance/components/RosterManagementGrid.jsx) ~220 | "Delete" | delete shift | `DELETE /staff/hotel/{hotelSlug}/attendance/shifts/{shiftId}/` | NONE | — | yes | `attendance.shift.delete` PLACEHOLDER_ONLY | NO_GATE |
| attendance | Copy Day / Staff Week / Bulk | [RosterManagementGrid.jsx](hotelmate-frontend/src/features/attendance/components/RosterManagementGrid.jsx) ~250-270 | "Execute Copy" | copy ops | `POST executeCopyOperation()` | NONE | — | yes | `attendance.copy.day/staff_week/bulk` PLACEHOLDER_ONLY | NO_GATE |
| attendance | "Create Period" | [DepartmentRosterDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/DepartmentRosterDashboard.jsx#L318) | "Create Period" | new period | `POST /staff/hotel/{hotelSlug}/attendance/periods/` | NONE | — | yes | `attendance.period.create` PLACEHOLDER_ONLY | NO_GATE |
| attendance | Clock In/Out/Break (modal) | [ClockModal.jsx](hotelmate-frontend/src/components/staff/ClockModal.jsx#L118-L148) | "Clock In", "Start/End Break", "Clock Out" | duty status | `PATCH staff/{staffId}/duty-status/` | NONE (own account) | — | yes (own only) | `attendance.duty_status.{action}` PLACEHOLDER_ONLY | NO_GATE |
| attendance | Shift locations CRUD | [shiftLocations.js](hotelmate-frontend/src/services/shiftLocations.js) | (admin UI) | CRUD locations | `GET/POST/PUT/DELETE /staff/hotel/{hotelSlug}/attendance/shift-locations/` | NONE | — | yes | `attendance.locations.list/create/update/delete` PLACEHOLDER_ONLY | NO_GATE |
| attendance | Roster analytics (KPIs/Summary/Daily/Weekly) | [analytics.js](hotelmate-frontend/src/services/analytics.js) | (read) | analytics | `GET .../roster-analytics/{kpis,staff-summary,department-summary,daily-totals,weekly-totals}/` | NONE | — | yes (sensitive) | `attendance.analytics.{view}` PLACEHOLDER_ONLY | NO_GATE |

### 5.6 Room Services / Menus

| Module guess | Surface | File | Label | Action | API | Current gate | Source | RBAC needed? | Placeholder | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| room_services | Order status dropdown (table row) | [RoomServiceOrdersManagement.jsx](hotelmate-frontend/src/components/room_service/RoomServiceOrdersManagement.jsx#L340) | "Preparing"/"Ready"/"Delivered" | change status | `PATCH /room_services/{hotelSlug}/orders/{order.id}/` | NONE | — | yes | `room_services.order.set_status` PLACEHOLDER_ONLY | NO_GATE |
| room_services | "Room Service" / "Breakfast" tab | [MenusManagement.jsx](hotelmate-frontend/src/components/menus/MenusManagement.jsx#L592-L615) | menu select | switch menu | — | NONE | — | maybe | UI_ONLY | NO_GATE |
| room_services | "+ Create Item" | [MenusManagement.jsx](hotelmate-frontend/src/components/menus/MenusManagement.jsx) ~500 | "+ Create Item" | open modal | — | NONE | — | yes | `room_services.menu.create` PLACEHOLDER_ONLY | NO_GATE |
| room_services | "Save" item | [MenusManagement.jsx](hotelmate-frontend/src/components/menus/MenusManagement.jsx#L312) | "Save" | create/update | `POST/PATCH room-service-items/` | NONE | — | yes | `room_services.menu.save` PLACEHOLDER_ONLY | NO_GATE |
| room_services | "Edit" item | [MenusManagement.jsx](hotelmate-frontend/src/components/menus/MenusManagement.jsx#L548) | "Edit" | open edit modal | — | NONE | — | yes | `room_services.menu.edit` PLACEHOLDER_ONLY | NO_GATE |
| room_services | "Delete" item | [MenusManagement.jsx](hotelmate-frontend/src/components/menus/MenusManagement.jsx#L351) | "Delete" | delete | `DELETE room-service-items/{id}/` | NONE | — | yes | `room_services.menu.delete` PLACEHOLDER_ONLY | NO_GATE |
| room_services | Category filter | [MenusManagement.jsx](hotelmate-frontend/src/components/menus/MenusManagement.jsx) ~700 | filter | UI filter | — | NONE | — | no | UI_ONLY | NO_GATE |

### 5.7 Maintenance

| Module guess | Surface | File | Label | Action | API | Current gate | Source | RBAC needed? | Placeholder | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| maintenance | Status select (open/in_progress/resolved/closed) | [MaintenanceRequests.jsx](hotelmate-frontend/src/components/maintenance/MaintenanceRequests.jsx#L78) | dropdown options | change status | `PATCH /maintenance/requests/{id}/` | NONE | — | yes | `maintenance.request.set_status` PLACEHOLDER_ONLY | NO_GATE |
| maintenance | "Send" comment | [MaintenanceRequests.jsx](hotelmate-frontend/src/components/maintenance/MaintenanceRequests.jsx#L182) | "Send" | add comment | `POST /maintenance/comments/` | NONE | — | yes | `maintenance.request.comment` PLACEHOLDER_ONLY | NO_GATE |
| maintenance | Delete request | [MaintenanceRequests.jsx](hotelmate-frontend/src/components/maintenance/MaintenanceRequests.jsx#L78) | delete icon | delete | `DELETE /maintenance/requests/{id}/` | NONE | — | yes | `maintenance.request.delete` PLACEHOLDER_ONLY | NO_GATE |

### 5.8 Section Editor / Public Page Builder

| Module guess | Surface | File | Action | API | Current gate | RBAC needed? | Placeholder | Status |
|---|---|---|---|---|---|---|---|---|
| admin_settings | Page-level access | [SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx#L28-L47) | access denied if not super staff admin | — | `isSuperStaffAdmin` | yes | `admin_settings.section_editor.access` PLACEHOLDER_ONLY | LEGACY_TIER_CHECK |
| admin_settings | createSection / updateSection / deleteSection | [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) / [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | mutate sections | `POST/PATCH/DELETE` (multiple) | inherited tier | yes | `admin_settings.public_page.section.{create/update/delete}` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Element CRUD | [staffApi.js](hotelmate-frontend/src/services/staffApi.js) `createElement`/`updateElement`/`deleteElement` | mutate elements | `POST/PATCH/DELETE /public-elements/` | inherited | yes | `admin_settings.public_page.element.{c/u/d}` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Element item CRUD | [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | mutate items | `POST/PATCH/DELETE /public-element-items/` | inherited | yes | `admin_settings.public_page.element_item.{c/u/d}` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Upload image | [staffApi.js](hotelmate-frontend/src/services/staffApi.js) `uploadImage` | upload | `POST /public-page-images/` | inherited | yes | `admin_settings.public_page.upload_image` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Reorder sections | [staffApi.js](hotelmate-frontend/src/services/staffApi.js) `reorderSections` | reorder | `POST .../public-sections/reorder/` | inherited | yes | `admin_settings.public_page.reorder` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Page style apply | [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) `updatePageStyle` | apply style | `POST .../public-page/apply-page-style/` | inherited | yes | `admin_settings.public_page.apply_style` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Hero update / hero image / logo upload | [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | edit hero | `PATCH/POST hero-sections/...` | inherited | yes | `admin_settings.hero.{update/upload}` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Gallery container CRUD | [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | CRUD galleries | `POST/PATCH/DELETE gallery-containers/` | inherited | yes | `admin_settings.gallery.container.{c/u/d}` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Gallery image bulk upload / update / delete | [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | image ops | `POST /gallery-images/bulk-upload/`, etc. | inherited | yes | `admin_settings.gallery.image.{upload/update/delete}` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | List container CRUD | [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | CRUD lists | `POST/GET list-containers/` | inherited | yes | `admin_settings.list.container.{c/r}` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |

### 5.9 Settings & Theme

| Module guess | Surface | File | Action | API | Current gate | Placeholder | Status |
|---|---|---|---|---|---|---|---|
| admin_settings | Settings entry button (sidebar/launcher) | [Settings.jsx](hotelmate-frontend/src/components/utils/Settings.jsx#L14-L30) | open settings | — | `isAdmin` | `admin_settings.access` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |
| admin_settings | Cancellation policies CRUD | [api.js](hotelmate-frontend/src/services/api.js) `getCancellationPolicies/createCancellationPolicy/patchCancellationPolicy` | CRUD | `GET/POST/PATCH .../cancellation-policies/` | inherited admin gate | `admin_settings.cancellation_policy.{list/create/update}` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Rate plans patch | [api.js](hotelmate-frontend/src/services/api.js) `patchRatePlan` | update plan | `PATCH .../rate-plans/{id}/` | inherited | `admin_settings.rate_plan.update` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Hotel settings patch | [api.js](hotelmate-frontend/src/services/api.js) `patchHotelSettings` | update hotel | `PATCH .../settings/` | inherited | `admin_settings.hotel.update` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | Theme update | [themeService.js](hotelmate-frontend/src/services/themeService.js) `updateHotelTheme` | update theme | `PATCH .../settings/` | inherited | `admin_settings.theme.update` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| admin_settings | ThemeContext defensive `is_staff` patch | [ThemeContext.jsx](hotelmate-frontend/src/context/ThemeContext.jsx#L50-L64) | promote `is_staff` locally | — | none (silent) | n/a | LEGACY (smell) |

### 5.10 Hotel Provisioning

| Module guess | Surface | File | Action | API | Current gate | Placeholder | Status |
|---|---|---|---|---|---|---|---|
| (super-user only?) | "Provision Hotel" | [hotelProvisioningApi.js](hotelmate-frontend/src/services/hotelProvisioningApi.js) `provisionHotel` | create new hotel | `POST /hotel/hotels/provision/` | NONE (UI lives on `/super-user`) | `provisioning.hotel.create` PLACEHOLDER_ONLY | UNCLEAR_PENDING_BACKEND_CONTRACT |

### 5.11 Chat (Staff ↔ Guest, Staff ↔ Staff)

| Module guess | Surface | File | Action | API | Current gate | Placeholder | Status |
|---|---|---|---|---|---|---|---|
| chat | Open ChatWindow / Front Office Chat Modal | [FrontOfficeChatModal.jsx](hotelmate-frontend/src/components/modals/FrontOfficeChatModal.jsx#L110) | view/send | guestChatAPI | NONE | `chat.guest.{view/send}` PLACEHOLDER_ONLY | NO_GATE |
| chat | Send guest reply (staff side) | [roomConversationsAPI.js](hotelmate-frontend/src/services/roomConversationsAPI.js) `sendRoomConversationMessage` | reply | `POST .../chat/conversations/{id}/messages/send/` | NONE | `chat.guest.reply` PLACEHOLDER_ONLY | NO_GATE |
| chat | Mark conversation read (staff) | [roomConversationsAPI.js](hotelmate-frontend/src/services/roomConversationsAPI.js) `markRoomConversationRead` | mark read | `POST .../mark-read/` | NONE | `chat.guest.mark_read` PLACEHOLDER_ONLY | NO_GATE |
| chat | Staff chat: send / edit / delete message | [staff_chat/services/staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) | message ops | `POST/PATCH/DELETE` | `canAccess(['manager','admin','super_staff_admin','staff_admin'])` partial gate in [ConversationView.jsx](hotelmate-frontend/src/staff_chat/components/ConversationView.jsx#L147) | `chat.staff.{send/edit/delete}` PLACEHOLDER_ONLY | LEGACY_ROLE_CHECK |
| chat | Staff chat: create conversation | [staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) `createConversation` | create thread | `POST .../staff_chat/conversations/` | NONE | `chat.staff.create_conversation` PLACEHOLDER_ONLY | NO_GATE |

### 5.12 Hotel Info, Guests

| Module guess | Surface | File | Action | API | Current gate | Placeholder | Status |
|---|---|---|---|---|---|---|---|
| hotel_info | Edit/save sections | [hotel_info pages](hotelmate-frontend/src/pages/hotel_info/) | edit | (PATCH endpoints) | inherited route gate | `hotel_info.section.update` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |
| rooms (guests subset) | Guest list view / edit | [GuestList.jsx](hotelmate-frontend/src/components/guests/GuestList.jsx#L8), [GuestEdit] | view/edit | (PATCH) | inherited (`rooms` slug) | `rooms.guests.{view/edit}` PLACEHOLDER_ONLY | NAV_USED_FOR_ACTION |

### 5.13 Public Page (read-mode + inline edit on public hotel page)

| Module guess | Surface | File | Action | Current gate | Placeholder | Status |
|---|---|---|---|---|---|---|
| admin_settings | Inline edit on `/hotel/:slug` (gallery, sections) | various components composing `usePublicPagePermissions` | inline edit visibility | `canEditPublicPage = isStaff && isOwnHotel && isAdmin` | `admin_settings.public_page.inline_edit` PLACEHOLDER_ONLY | LEGACY_ADMIN_CHECK |

### 5.14 Misc / Cross-cutting buttons

| Surface | File | Status | Notes |
|---|---|---|---|
| Logout button | [Logout.jsx](hotelmate-frontend/src/components/auth/Logout.jsx#L2) | NO_GATE | Self-action; deletes FCM token |
| FCM "test notification" button | [FirebaseService.js](hotelmate-frontend/src/services/FirebaseService.js) `showTestNotification` | NO_GATE | Dev/QA only? UNCLEAR |
| ShootAR page (public) | [shootar/](hotelmate-frontend/src/shootar/) | NO_GATE_BY_DESIGN | Public route |

---

## 6. Forms / Mutations Audit

All known mutation paths consolidated. Most mutation surfaces have **NO frontend gate** beyond the page-level route guard.

| Area | File / hook | Form/action | HTTP | API service function | Current gate | RBAC action needed? | Notes |
|---|---|---|---|---|---|---|---|
| Bookings | [BookingList.jsx](hotelmate-frontend/src/components/staff/bookings/BookingList.jsx) | Send pre-checkin / Approve / Decline | POST | api.js `sendPrecheckinLink/acceptRoomBooking/declineRoomBooking` | NONE | yes | money capture |
| Bookings | [useStaffRoomBookingDetail.js](hotelmate-frontend/src/hooks/useStaffRoomBookingDetail.js) | mutation hooks | varies | api.js | NONE | yes | |
| Bookings | [BookingTable.jsx](hotelmate-frontend/src/components/staff/bookings/BookingTable.jsx) | mark seen | POST | api.js | NONE | maybe | |
| Bookings | [BookingsGrid.jsx](hotelmate-frontend/src/components/bookings/BookingsGrid.jsx) | assign / unseat / delete | POST/POST/DELETE | inline axios | NONE | yes | restaurant bookings |
| Rooms ops | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx) | 8 status ops + override | POST | roomOperations.js | `canAccess(['housekeeping','manager']) \|\| isSuperUser`, override `canAccess(['manager']) \|\| isSuperUser` | yes | |
| Rooms ops | [HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx) | mirror of RoomDetails | POST | roomOperations.js | `canManageRooms`, `canUseManagerOverride` | yes | |
| Rooms inv | [RoomsTab.jsx](hotelmate-frontend/src/pages/staff/room-management/RoomsTab.jsx) | create/edit/bulk/delete | POST/PATCH/DELETE | roomManagementApi.js | NONE | yes | |
| Rooms types | [RoomTypesTab.jsx](hotelmate-frontend/src/pages/staff/room-management/RoomTypesTab.jsx) | CRUD types + photo | POST/PATCH/DELETE | roomManagementApi.js | NONE | yes | |
| Move room | [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) `moveRoom` | move | POST | roomOperations.js | NONE | yes | |
| Bulk check-in/out | [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) `checkinRoom/checkoutRoom` | bulk | POST | roomOperations.js | NONE | yes | |
| Manager override | [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) `managerOverrideRoomStatus` | override | POST | roomOperations.js | role check at call site | yes | |
| Staff | [StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx) | create staff | POST | api.js (staff/create) | `isAdmin` | yes | sends `allowed_navs` |
| Staff | [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx) | save edit / revoke face | PATCH/POST | api.js / useFaceAdminApi | `isAdmin` / `canAccess` | yes | |
| Staff dept/role | [SectionDepartmentsRoles.jsx](hotelmate-frontend/src/components/utils/settings-sections/SectionDepartmentsRoles.jsx) | create dept/role | POST | api.js | inherited | yes | |
| Staff packages | [registrationPackageApi.js](hotelmate-frontend/src/services/registrationPackageApi.js) | generate / email / printable | POST/POST/GET | registrationPackageApi.js | inherited | yes | |
| Staff (admin) | [NavigationPermissionManager.jsx](hotelmate-frontend/src/components/staff/NavigationPermissionManager.jsx) | edit allowed_navs of others | PATCH | api.js | inherited | yes | |
| Attendance | [RosterManagementGrid.jsx](hotelmate-frontend/src/features/attendance/components/RosterManagementGrid.jsx) | save/delete shift, copy ops | POST/PATCH/DELETE | inline | NONE | yes | |
| Attendance | [DepartmentRosterDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/DepartmentRosterDashboard.jsx) | create period | POST | inline | NONE | yes | |
| Attendance | [ClockModal.jsx](hotelmate-frontend/src/components/staff/ClockModal.jsx) | clock in/out/break | PATCH | inline | NONE | yes (own) | |
| Attendance | [shiftLocations.js](hotelmate-frontend/src/services/shiftLocations.js) | CRUD locations | GET/POST/PUT/DELETE | shiftLocations.js | NONE | yes | |
| Room services | [RoomServiceOrdersManagement.jsx](hotelmate-frontend/src/components/room_service/RoomServiceOrdersManagement.jsx) | order status | PATCH | inline | NONE | yes | |
| Menus | [MenusManagement.jsx](hotelmate-frontend/src/components/menus/MenusManagement.jsx) | item CRUD + image | POST/PATCH/DELETE | inline (`buildStaffURL`) | NONE | yes | |
| Maintenance | [MaintenanceRequests.jsx](hotelmate-frontend/src/components/maintenance/MaintenanceRequests.jsx) | status / comment / delete | PATCH/POST/DELETE | inline | NONE | yes | |
| Section editor | [staffApi.js](hotelmate-frontend/src/services/staffApi.js), [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | section/element/item/hero/gallery/list CRUD + reorder + style | POST/PATCH/DELETE | services | page-level `isSuperStaffAdmin` | yes | |
| Settings | [api.js](hotelmate-frontend/src/services/api.js) | cancellation policies, rate plans, hotel settings | POST/PATCH | api.js | inherited `isAdmin` page | yes | |
| Theme | [themeService.js](hotelmate-frontend/src/services/themeService.js) | update theme | PATCH | themeService.js | inherited | yes | |
| Hotel provisioning | [hotelProvisioningApi.js](hotelmate-frontend/src/services/hotelProvisioningApi.js) `provisionHotel` | create hotel | POST | hotelProvisioningApi.js | NONE (super-user page) | yes | |
| Chat (guest side) | [roomConversationsAPI.js](hotelmate-frontend/src/services/roomConversationsAPI.js) | send / mark read | POST | service | NONE | yes | |
| Chat (staff↔staff) | [staff_chat/services/staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) | create / send / edit / delete / mark read | POST/PATCH/DELETE | service | partial role check in ConversationView | yes | |
| Overstay | [staffApi.js](hotelmate-frontend/src/services/staffApi.js) `staffOverstayAcknowledge/Extend` | overstay handling | POST | staffApi.js | NONE | yes | |
| Public page section editor | [staffApi.js](hotelmate-frontend/src/services/staffApi.js) `bootstrapDefault` | bootstrap default layout | POST | staffApi.js | inherited tier | yes | |
| FCM token | [FirebaseService.js](hotelmate-frontend/src/services/FirebaseService.js) `saveFCMTokenToBackend` | save token | POST `/staff/save-fcm-token/` | service | NONE (own) | maybe | |

---

## 7. Realtime / Notification Audit

### Channels (subscribed once per session)

Source: [src/realtime/channelRegistry.js](hotelmate-frontend/src/realtime/channelRegistry.js).

| File:line | Channel name | Subscription condition | Uses role/dept/nav/tier? | Data exposed | Should be RBAC/contract driven? | Status |
|---|---|---|---|---|---|---|
| [channelRegistry.js#L35](hotelmate-frontend/src/realtime/channelRegistry.js#L35) | `{hotelSlug}.attendance` | hotel-wide on login | NO | attendance events | yes (backend ACL on channel) | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [channelRegistry.js#L40](hotelmate-frontend/src/realtime/channelRegistry.js#L40) | `{hotelSlug}.room-service` | hotel-wide | NO | RS orders | yes | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [channelRegistry.js#L45](hotelmate-frontend/src/realtime/channelRegistry.js#L45) | `{hotelSlug}.booking` | hotel-wide | NO | restaurant/service bookings | yes | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [channelRegistry.js#L50](hotelmate-frontend/src/realtime/channelRegistry.js#L50) | `{hotelSlug}.room-bookings` | hotel-wide | NO | room booking lifecycle | yes | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [channelRegistry.js#L55](hotelmate-frontend/src/realtime/channelRegistry.js#L55) | `{hotelSlug}.rooms` | hotel-wide | NO | room status | yes | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [channelRegistry.js#L60](hotelmate-frontend/src/realtime/channelRegistry.js#L60) | `{hotelSlug}-staff-bookings` | hotel-wide | NO | booking lifecycle (staff) | yes | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [channelRegistry.js#L65](hotelmate-frontend/src/realtime/channelRegistry.js#L65) | `{hotelSlug}-staff-overstays` | hotel-wide | NO | overstay incidents | yes | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [channelRegistry.js#L70](hotelmate-frontend/src/realtime/channelRegistry.js#L70) | `{hotelSlug}-guest-messages` | hotel-wide | NO | guest messages firehose | yes | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [channelRegistry.js#L76](hotelmate-frontend/src/realtime/channelRegistry.js#L76) | `{hotelSlug}.staff-{staffId}-notifications` | conditional on `staffId` | indirect (per staff) | personal notifications | yes (own only) | GOOD |
| [channelRegistry.js#L83](hotelmate-frontend/src/realtime/channelRegistry.js#L83) | `{hotelSlug}.staff-chat.{conversationId}` | dynamic on conversation entry | NO | staff chat msgs | yes (membership-driven) | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [channelRegistry.js#L365](hotelmate-frontend/src/realtime/channelRegistry.js#L365) | `private-hotel-{hotelSlug}-guest-chat-booking-{bookingId}` | dynamic on booking page | NO | guest↔staff thread for booking | yes | UNCLEAR_PENDING_BACKEND_CONTRACT |
| [useGuestChat.js#L340](hotelmate-frontend/src/hooks/useGuestChat.js#L340) | guest channel from bootstrap contract | session token | n/a (guest) | guest messages | already contract-driven | GOOD |
| [useHotelRealtime.js#L24](hotelmate-frontend/src/hooks/useHotelRealtime.js#L24) | hotel settings channel | guest hotel settings | NO | hotel settings | tracked in migration debt | UNCLEAR |
| [useHotelGalleries.js#L182](hotelmate-frontend/src/hooks/useHotelGalleries.js#L182) | gallery channel | gallery management | NO | gallery updates | migration debt | UNCLEAR |

### Notification visibility gates

| File:line | Gate | Module slug | Status |
|---|---|---|---|
| [BookingNotificationContext.jsx#L53](hotelmate-frontend/src/context/BookingNotificationContext.jsx#L53) | `isSuperUser \|\| hasNavAccess('restaurant_bookings') \|\| hasNavAccess('room_bookings')` | both | NAV_USED_FOR_ACTION (currently ok; might need finer-grained "see overstay alert" action) |
| [RoomServiceNotificationContext.jsx#L57](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx#L57) | `isSuperUser \|\| hasNavAccess('room_services')` | room_services | NAV_USED_FOR_ACTION |
| [ChatContext.jsx](hotelmate-frontend/src/context/ChatContext.jsx) | uses `useAuth` only; no nav gate | n/a | UNCLEAR (chat module slug not enforced inside) |

### Hardcoded role/dept strings — search results

**Confirmed cleaned up (search returned no matches in subscription/realtime logic):**

- `"kitchen"` — none in subscription logic
- `"porter"` — none
- `"food-and-beverage"` / `"food_and_beverage"` — none in subscription/notification logic (config-only references in `navigationCategories.js`)
- `"room_service_waiter"` — none
- `"reception"` — none in subscription logic
- `"manager"` — present only in `usePermissions().canAccess(['manager'])` argument literals (RoomDetails, HousekeepingRoomDetails, ConversationView, StaffDetails). These are role-name string args, not channel routing.
- `"concierge"` / `"bar"` / `"restaurant"` — none in subscription logic

**This is a cleanup from the prior FRONTEND_RBAC_CONSUMPTION_AUDIT.md state.** The `BookingNotificationContext` / `RoomServiceNotificationContext` no longer contain hardcoded `"food-and-beverage"`/`"kitchen"`/`"porter"` branches; they now use `hasNavAccess(...)`.

### Realtime stores

[src/realtime/stores/](hotelmate-frontend/src/realtime/stores/) — `chatStore.jsx`, `guestChatStore.jsx`, `roomServiceStore.jsx`, `roomBookingStore.jsx`, `notificationsStore.jsx`, `overviewSignalsStore.jsx`. None apply role/dept/tier filtering to incoming events. Filtering is delegated to backend channel ACL.

### Event bus

[src/realtime/eventBus.js](hotelmate-frontend/src/realtime/eventBus.js) routes events to stores by channel suffix matching (`-guest-messages`, `staff-chat`, etc.). No role/dept filtering. Confirmed no hardcoded role/dept strings.

---

## 8. API Service RBAC-Relevant Calls

| API file | Function | Method | Endpoint | Caller (sample) | RBAC class |
|---|---|---|---|---|---|
| [api.js](hotelmate-frontend/src/services/api.js) | `getHotelPublicPage` | GET | `/public/hotel/{hotelSlug}/page/` | public pages | PUBLIC_OR_GUEST_NOT_STAFF |
| [api.js](hotelmate-frontend/src/services/api.js) | `sendPrecheckinLink` | POST | `/staff/hotel/{hotelSlug}/room-bookings/{bookingId}/send-precheckin-link/` | BookingList, useStaffRoomBookingDetail | NOTIFICATION |
| [api.js](hotelmate-frontend/src/services/api.js) | `acceptRoomBooking` | POST | `.../approve/` | BookingList | STATUS_TRANSITION (+ payment) |
| [api.js](hotelmate-frontend/src/services/api.js) | `declineRoomBooking` | POST | `.../decline/` | BookingList | STATUS_TRANSITION |
| [api.js](hotelmate-frontend/src/services/api.js) | `getCancellationPolicies` | GET | `.../cancellation-policies/` | settings | READ_MODULE_DATA |
| [api.js](hotelmate-frontend/src/services/api.js) | `getRatePlans` | GET | `.../rate-plans/` | settings | READ_MODULE_DATA |
| [api.js](hotelmate-frontend/src/services/api.js) | `patchRatePlan` | PATCH | `.../rate-plans/{id}/` | settings | UPDATE / CONFIGURATION |
| [api.js](hotelmate-frontend/src/services/api.js) | `getHotelSettings` | GET | `.../settings/` | settings, theme | READ_MODULE_DATA |
| [api.js](hotelmate-frontend/src/services/api.js) | `patchHotelSettings` | PATCH | `.../settings/` | settings | CONFIGURATION |
| [api.js](hotelmate-frontend/src/services/api.js) | `createCancellationPolicy` | POST | `.../cancellation-policies/` | settings | CREATE |
| [api.js](hotelmate-frontend/src/services/api.js) | `patchCancellationPolicy` | PATCH | `.../cancellation-policies/{id}/` | settings | UPDATE |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `getBuilderData` | GET | `.../public-page-builder/` | section editor | READ_MODULE_DATA |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `bootstrapDefault` | POST | `.../public-page-builder/bootstrap-default/` | section editor | CONFIGURATION |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `createSection`/`updateSection`/`deleteSection` | POST/PATCH/DELETE | `.../public-sections/...` | section editor | CREATE/UPDATE/DELETE |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `createElement`/`updateElement`/`deleteElement` | POST/PATCH/DELETE | `.../public-elements/...` | section editor | CRUD |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `createElementItem`/`updateElementItem`/`deleteElementItem` | POST/PATCH/DELETE | `.../public-element-items/...` | section editor | CRUD |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `uploadImage` | POST | `.../public-page-images/` | section editor | CREATE |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `reorderSections` | POST | `.../public-sections/reorder/` | section editor | UPDATE |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `staffOverstayStatus` | GET | `.../overstay/status/` | overstay | READ_MODULE_DATA |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `staffOverstayAcknowledge` | POST | `.../overstay/acknowledge/` | overstay | STATUS_TRANSITION |
| [staffApi.js](hotelmate-frontend/src/services/staffApi.js) | `staffOverstayExtend` | POST | `.../overstay/extend/` | overstay | UPDATE |
| [roomManagementApi.js](hotelmate-frontend/src/services/roomManagementApi.js) | `fetchRoomTypes`/`createRoomType`/`updateRoomType`/`deleteRoomType` | GET/POST/PATCH/DELETE | `.../room-types/` | RoomTypesTab | CRUD |
| [roomManagementApi.js](hotelmate-frontend/src/services/roomManagementApi.js) | `uploadRoomTypePhoto` | POST | `.../room-images/` | RoomTypesTab | CREATE |
| [roomManagementApi.js](hotelmate-frontend/src/services/roomManagementApi.js) | `fetchRooms`/`createRoom`/`updateRoom`/`deleteRoom` | GET/POST/PATCH/DELETE | `.../room-management/` | RoomsTab | CRUD |
| [roomManagementApi.js](hotelmate-frontend/src/services/roomManagementApi.js) | `bulkCreateRooms` | POST | `.../room-types/{id}/rooms/bulk-create/` | RoomsTab | CREATE (bulk) |
| [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) | `updateHousekeepingRoomStatus` | POST | `.../housekeeping/rooms/{id}/status/` | HK pages | STATUS_TRANSITION |
| [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) | `getHousekeepingStatusHistory` | GET | `.../status-history/` | HK pages | READ_MODULE_DATA (sensitive) |
| [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) | `startCleaning`/`markCleaned`/`inspectRoom`/`markMaintenance`/`completeMaintenance` | POST | `.../rooms/{n}/<verb>/` | RoomDetails, HK | STATUS_TRANSITION |
| [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) | `managerOverrideRoomStatus` | POST | `.../housekeeping/rooms/{id}/manager_override/` | RoomDetails | STATUS_TRANSITION (privileged) |
| [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) | `checkinRoom`/`checkoutRoom` | POST | `.../rooms/checkin\|checkout/` | bulk ops | STATUS_TRANSITION |
| [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) | `listTurnoverRooms`/`getTurnoverStats` | GET | `.../turnover/...` | turnover board | READ_MODULE_DATA |
| [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) | `moveRoom` | POST | `.../room-bookings/{id}/move-room/` | bookings | UPDATE |
| [registrationPackageApi.js](hotelmate-frontend/src/services/registrationPackageApi.js) | `listRegistrationPackages` | GET | `/staff/registration-package/?hotel_slug=` | staff onboarding | READ_MODULE_DATA |
| [registrationPackageApi.js](hotelmate-frontend/src/services/registrationPackageApi.js) | `generateRegistrationPackages` | POST | `/staff/registration-package/` | onboarding | CREATE |
| [registrationPackageApi.js](hotelmate-frontend/src/services/registrationPackageApi.js) | `emailRegistrationPackage` | POST | `.../{id}/email/` | onboarding | NOTIFICATION |
| [registrationPackageApi.js](hotelmate-frontend/src/services/registrationPackageApi.js) | `getPrintableRegistrationPackage` | GET | `.../{id}/print/` | onboarding | EXPORT |
| [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | `createSection`/`listSections`/`updateSection`/`deleteSection` | POST/GET/PATCH/DELETE | `.../sections/...`, `.../public-sections/...` | section editor | CRUD |
| [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | `updatePageStyle` | POST | `.../public-page/apply-page-style/` | section editor | UPDATE |
| [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | `updateHeroSection`/`uploadHeroImage`/`uploadHeroLogo` | PATCH/POST/POST | `.../hero-sections/...` | section editor | UPDATE |
| [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | `createGalleryContainer`/`listGalleryContainers`/`updateGalleryContainer`/`deleteGalleryContainer` | POST/GET/PATCH/DELETE | `.../gallery-containers/...` | section editor | CRUD |
| [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | `bulkUploadGalleryImages`/`updateGalleryImage`/`deleteGalleryImage` | POST/PATCH/DELETE | `.../gallery-images/...` | section editor | CRUD |
| [sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | `createListContainer`/`listListContainers` | POST/GET | `.../list-containers/...` | section editor | CRUD |
| [presetsService.js](hotelmate-frontend/src/services/presetsService.js) | `fetchAll` | GET | `/public/presets/` | section editor | PUBLIC_OR_GUEST_NOT_STAFF |
| [themeService.js](hotelmate-frontend/src/services/themeService.js) | `fetchHotelSettings`/`updateHotelTheme` | GET/PATCH | `.../settings/` | theme page | READ_MODULE_DATA / CONFIGURATION |
| [shiftLocations.js](hotelmate-frontend/src/services/shiftLocations.js) | `getShiftLocations`/`createShiftLocation`/`updateShiftLocation`/`deleteShiftLocation` | GET/POST/PUT/DELETE | `.../attendance/shift-locations/...` | attendance settings | CRUD |
| [hotelProvisioningApi.js](hotelmate-frontend/src/services/hotelProvisioningApi.js) | `provisionHotel` | POST | `/hotel/hotels/provision/` | super-user page | CREATE (privileged) |
| [roomConversationsAPI.js](hotelmate-frontend/src/services/roomConversationsAPI.js) | `fetchRoomConversations`/`fetchRoomConversationMessages`/`fetchRoomConversationsUnreadCount` | GET | `.../chat/conversations/...` | ChatContext | READ_MODULE_DATA |
| [roomConversationsAPI.js](hotelmate-frontend/src/services/roomConversationsAPI.js) | `sendRoomConversationMessage` | POST | `.../chat/conversations/{id}/messages/send/` | ChatWindow | CREATE / NOTIFICATION |
| [roomConversationsAPI.js](hotelmate-frontend/src/services/roomConversationsAPI.js) | `markRoomConversationRead` | POST | `.../mark-read/` | ChatWindow | UPDATE |
| [guestChatAPI.js](hotelmate-frontend/src/services/guestChatAPI.js) | `getChatBootstrap`/`getMessages`/`sendMessage`/`markRead` | GET/GET/POST/POST | `/api/guest/hotel/{slug}/chat/...` | useGuestChat | PUBLIC_OR_GUEST_NOT_STAFF |
| [publicApi.js](hotelmate-frontend/src/services/publicApi.js) | `getHotels`/`getFilterOptions`/`getHotelPage`/`getPresets`/`getPreset` | GET | `/public/...` | public pages | PUBLIC_OR_GUEST_NOT_STAFF |
| [analytics.js](hotelmate-frontend/src/services/analytics.js) | `getKpis`/`getStaffSummary`/`getDepartmentSummary`/`getDailyTotals`/`getWeeklyTotals` | GET | `.../attendance/roster-analytics/...` | attendance analytics | READ_MODULE_DATA (sensitive) |
| [FirebaseService.js](hotelmate-frontend/src/services/FirebaseService.js) | `saveFCMTokenToBackend` | POST | `/staff/save-fcm-token/` | app boot | UPDATE (own) |
| [staff_chat/services/staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) | `fetchStaffList`/`fetchConversations`/`fetchMessages` | GET | `.../staff_chat/...` | StaffChatContext | READ_MODULE_DATA |
| [staff_chat/services/staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) | `createConversation`/`sendMessage` | POST | `.../staff_chat/...` | StaffChatContext | CREATE |
| [staff_chat/services/staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) | `editMessage` | PATCH | `.../staff_chat/messages/{id}/edit/` | ConversationView | UPDATE |
| [staff_chat/services/staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) | `deleteMessage` | DELETE | `.../staff_chat/messages/{id}/delete/` | ConversationView | DELETE |
| [staff_chat/services/staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) | `markConversationAsRead` | POST | `.../mark-read/` | ConversationView | UPDATE |

---

## 9. Legacy / Anti-Pattern Inventory

| File | Line / function | Pattern | What it controls | Risk | Replacement direction (conceptual) |
|---|---|---|---|---|---|
| [src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js#L6) | `role = user?.role_slug?.toLowerCase() \|\| user?.role?.toLowerCase()` | role-string normalize fallback | feeds `canAccess()` | medium — fallback to free-form `user.role` if `role_slug` missing | replace with backend rbac action keys; `canAccess()` becomes `can(module, action)` |
| [src/hooks/useLogin.js](hotelmate-frontend/src/hooks/useLogin.js#L43) | `effective_navs: data.effective_navs \|\| data.allowed_navs \|\| []` | `allowed_navs` legacy fallback | nav grants | low (transitional) | remove after backend contract |
| [src/components/staff/StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx#L25) | `allowed_navs: []` initial / [L227](hotelmate-frontend/src/components/staff/StaffCreate.jsx#L227) `allowed_navs: selectedNavItems` in payload | legacy field name in write payload | staff onboarding | medium | rename to `effective_navs`/`navs` per backend contract |
| [src/components/staff/NavigationPermissionManager.jsx](hotelmate-frontend/src/components/staff/NavigationPermissionManager.jsx#L47) | `setAllowedNavs(Array.isArray(data.allowed_navs) ? ...)` | legacy field name | admin nav editor | medium | rename per backend contract |
| [src/components/rooms/RoomCard.jsx](hotelmate-frontend/src/components/rooms/RoomCard.jsx#L22-L28) | `canPerformQuickActions = isAdmin \|\| isSuperUser \|\| hasNavAccess('housekeeping') \|\| hasNavAccess('rooms')` | nav used for action authority | quick action visibility | medium | replace with backend rbac action |
| [src/pages/housekeeping/components/HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L54-L58) | `canManageRooms = isSuperUser \|\| isAdmin \|\| hasNavAccess('housekeeping') \|\| hasNavAccess('rooms')`; `canUseManagerOverride = isSuperUser \|\| isSuperStaffAdmin \|\| canAccess(['manager'])` | nav+role for action | room ops + override | high — action authority computed locally | backend rbac actions |
| [src/components/rooms/RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx#L52) | `{ canAccess, isSuperUser } = usePermissions()` then `canAccess(['housekeeping','manager'])` and `canAccess(['manager'])` | role-name string array | 8 status ops + override | high | backend rbac action |
| [src/staff_chat/components/ConversationView.jsx](hotelmate-frontend/src/staff_chat/components/ConversationView.jsx#L147) | `canAccess(['manager','admin','super_staff_admin','staff_admin'])` | role-name array | edit/delete msg actions | high | backend rbac action |
| [src/components/staff/StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L377) | `canAccess(['staff_admin','super_staff_admin'])` and `canAccess(['manager'])` (face revoke) | role-name array | revoke face data | high | backend rbac action |
| [src/components/staff/Staff.jsx](hotelmate-frontend/src/components/staff/Staff.jsx#L15) | `isAdmin` gates 3 admin tabs | tier-based gate | tab visibility | medium | tier OR backend rbac action |
| [src/components/staff/RegistrationPackagesPanel.jsx](hotelmate-frontend/src/components/staff/RegistrationPackagesPanel.jsx#L17) | `if (!isAdmin) return null` | tier-based gate | panel visibility | medium | backend rbac action |
| [src/components/utils/Settings.jsx](hotelmate-frontend/src/components/utils/Settings.jsx#L14-L30) | `isAdmin` gates settings access | tier gate | settings page | medium | module gate is fine; per-section actions need backend |
| [src/pages/sections/SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx#L28-L47) | `isSuperStaffAdmin` page-level access denied | tier gate | section editor | medium | replace with backend rbac action |
| [src/components/rooms/RoomList.jsx](hotelmate-frontend/src/components/rooms/RoomList.jsx#L53) | `isSuperStaffAdmin` toggle | tier gate | quick view toggle | medium | backend rbac action |
| [src/features/attendance/pages/AttendanceDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/AttendanceDashboard.jsx#L118) | `isSuperStaffAdmin` super-admin tools | tier gate | super tools panel | medium | backend rbac action |
| [src/context/ThemeContext.jsx](hotelmate-frontend/src/context/ThemeContext.jsx#L29-L235) | `isSuperUser`/`isSuperStaffAdmin` for theme/admin previews | tier gate | preview / multi-hotel switch | low | keep as tier OR use rbac if backend exposes |
| [src/context/ThemeContext.jsx](hotelmate-frontend/src/context/ThemeContext.jsx#L50-L64) | defensive `is_staff = true` patch when `access_level` implies staff | silent payload patch | staff detection | low (smell) | remove after backend contract guarantees `is_staff` |
| [src/context/BookingNotificationContext.jsx](hotelmate-frontend/src/context/BookingNotificationContext.jsx#L53) | `hasNavAccess('restaurant_bookings') \|\| hasNavAccess('room_bookings')` | nav-based notification gate | notification visibility | medium | backend notification/channel contract OR backend rbac action |
| [src/context/RoomServiceNotificationContext.jsx](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx#L57) | `hasNavAccess('room_services')` | nav-based notification gate | notification visibility | medium | backend notification/channel contract |
| [src/components/layout/MobileNavbar.jsx](hotelmate-frontend/src/components/layout/MobileNavbar.jsx#L362) | `hasNavAccess('bookings') &&` | nav slug literal `'bookings'` (non-canonical; canonical is `room_bookings`) | mobile shortcut | medium — literal mismatch risk | use canonical slug constant; module visibility only |
| [src/realtime/stores/overviewSignalsStore.jsx](hotelmate-frontend/src/realtime/stores/overviewSignalsStore.jsx#L10-L12) | `OVERVIEW_MODULES = ['room_bookings','room_services','housekeeping']` | hardcoded subset | dashboard cards | medium | derive from backend nav catalog |
| [src/policy/staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js#L11-L40) | 13 hardcoded slug-to-path mappings | duplicates backend catalog | route gating | medium | central constants from backend audit |
| [src/hooks/useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js) | `DEFAULT_NAV_ITEMS` | deprecated fallback | nav fallback | low | remove after contract stable |
| [src/policy/staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js#L107-L178) | `effectiveNavs = user.effective_navs \|\| []` | non-array silently coerced | route gating | medium — wrong shape silently denies | runtime validation + telemetry |
| [src/config/navigationCategories.js](hotelmate-frontend/src/config/navigationCategories.js) | category strings hardcoded | UI grouping | grouping only | low | remove after central constants module |
| [src/config/navIconMap.js](hotelmate-frontend/src/config/navIconMap.js) | slug→icon map | UI icon | icon only | low | central constants |

**Confirmed NOT present anywhere:**
- `localStorage.getItem('role'\|'permissions'\|'access_level')`
- duplicate definitions of `isAdmin`/`isStaff` outside `usePermissions`/`AuthContext`
- duplicate route guards
- hardcoded `'kitchen'`/`'porter'`/`'food-and-beverage'`/`'room_service_waiter'` in subscription/notification logic (was present in earlier audit; now cleaned up)

---

## 10. Already Good / Keep

| Surface | File | Why it is good | Keep as-is? |
|---|---|---|---|
| Single source of normalized auth state | [AuthContext.jsx](hotelmate-frontend/src/context/AuthContext.jsx) | One persistent React context for raw user | yes |
| Non-React bridge | [authStore.js](hotelmate-frontend/src/lib/authStore.js) | Mirrors user; clean separation | yes |
| Single derivation point | [usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js) | Only place that derives `isAdmin`/`hasNavAccess`/`canAccess` | yes — extend, don't fork |
| Central route policy | [staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js) | One function `canAccessStaffPath()` for all route gating | yes — wire to canonical-slug constants module |
| Route guard | [ProtectedRoute.jsx](hotelmate-frontend/src/components/auth/ProtectedRoute.jsx) | Two-mode guard, well-scoped | yes |
| Sidebar/mobile nav | [BigScreenNavbar.jsx](hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx), [MobileNavbar.jsx](hotelmate-frontend/src/components/layout/MobileNavbar.jsx), [useDesktopNav.js](hotelmate-frontend/src/hooks/useDesktopNav.js), [useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js) | Backend-driven `navigation_items` + `effective_navs` filter | yes |
| Overview dashboard module filter | [OverviewPage.jsx](hotelmate-frontend/src/pages/staff/OverviewPage.jsx#L105-L122) | Uses `effectiveNavs.includes(m) \|\| isSuperUser` | yes (but auto-derive from full nav catalog rather than fixed list) |
| Personal staff notification channel | [channelRegistry.js#L76](hotelmate-frontend/src/realtime/channelRegistry.js#L76) | Per-staff channel `{hotel}.staff-{staffId}-notifications` | yes |
| Notification eligibility via `hasNavAccess` (no hardcoded dept strings anymore) | [BookingNotificationContext.jsx](hotelmate-frontend/src/context/BookingNotificationContext.jsx#L53), [RoomServiceNotificationContext.jsx](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx#L57) | Uses backend nav grants | yes (until backend exposes notification contract) |
| Guest chat bootstrap-driven channel + events | [useGuestChat.js](hotelmate-frontend/src/hooks/useGuestChat.js), [guestChatAPI.js](hotelmate-frontend/src/services/guestChatAPI.js) | Channel name + event names come from backend contract | yes (template for staff side) |
| Public page edit gate | [usePublicPagePermissions.js](hotelmate-frontend/src/hooks/usePublicPagePermissions.js) | 3-layer composition (`isStaff && isOwnHotel && hasEditAccess`) | yes |

---

## 11. Missing Frontend Infrastructure

| Needed infrastructure | Why needed | Files it would replace/simplify | Priority |
|---|---|---|---|
| Canonical module/action constants module (e.g. `src/policy/rbacCatalog.js`) | One source for slugs and action keys; generated/synced from backend audit | [staffAccessPolicy.js#L11-L40](hotelmate-frontend/src/policy/staffAccessPolicy.js#L11-L40), [overviewSignalsStore.jsx#L10-L12](hotelmate-frontend/src/realtime/stores/overviewSignalsStore.jsx#L10-L12), [useNavigation.js DEFAULT_NAV_ITEMS](hotelmate-frontend/src/hooks/useNavigation.js), [navigationCategories.js](hotelmate-frontend/src/config/navigationCategories.js), [navIconMap.js](hotelmate-frontend/src/config/navIconMap.js), magic-string slugs in MobileNavbar/RoomCard/HK | **High** |
| `can(module, action)` helper inside `usePermissions` | Action-level RBAC; replaces ad-hoc `canAccess([...])` arrays and `isAdmin && hasNavAccess(...)` compositions | All ~35 mutation buttons currently NO_GATE; all role-name arrays in RoomDetails, HK, ConversationView, StaffDetails | **Critical** |
| `useCan(module, action)` hook | Ergonomic memoized wrapper | Same | **High** |
| `<Can module="..." action="...">` wrapper component | Declarative gating in JSX; enables auto-hiding instead of `?:` ternaries | All button gates | **High** |
| Runtime payload validation + telemetry | Detect malformed `effective_navs` / missing `rbac` blob in production | [staffAccessPolicy.js#L107](hotelmate-frontend/src/policy/staffAccessPolicy.js#L107), `validateUserPermissions` called only in tests | **High** |
| Notification subscription contract helper | Replace `BookingNotificationContext`/`RoomServiceNotificationContext` heuristics with backend-provided list of channels/event types eligible for current user | [BookingNotificationContext.jsx](hotelmate-frontend/src/context/BookingNotificationContext.jsx), [RoomServiceNotificationContext.jsx](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx) | **High** |
| Dashboard auto-derivation | Drop hardcoded `OVERVIEW_MODULES`; iterate `effective_navs ∩ MODULE_CONFIG.keys` | [OverviewPage.jsx](hotelmate-frontend/src/pages/staff/OverviewPage.jsx), [overviewSignalsStore.jsx](hotelmate-frontend/src/realtime/stores/overviewSignalsStore.jsx) | **Medium** |
| Removal plan for legacy `allowed_navs` | Single direction once contract stable | [useLogin.js#L43](hotelmate-frontend/src/hooks/useLogin.js#L43), [StaffCreate.jsx](hotelmate-frontend/src/components/staff/StaffCreate.jsx), [NavigationPermissionManager.jsx](hotelmate-frontend/src/components/staff/NavigationPermissionManager.jsx) | **Medium** |
| Removal plan for `ThemeContext` defensive `is_staff` patch | Surface backend bugs | [ThemeContext.jsx#L50-L64](hotelmate-frontend/src/context/ThemeContext.jsx#L50-L64) | **Low** |
| Removal plan for `DEFAULT_NAV_ITEMS` fallback | Fully backend-driven nav | [useNavigation.js](hotelmate-frontend/src/hooks/useNavigation.js) | **Low** |
| ESLint rule banning raw `user.role`/`user.is_manager`/`user.allowed_navs`/`user.access_level` reads outside `usePermissions` and `useLogin` | Prevent regression | n/a (tooling) | **Medium** |

---

## 12. Final Work Queue

> Implementation queue only. Do NOT implement.

### Phase 1 — Critical leaks (legacy role/admin/tier checks bound to action authority)

| Priority | File/component | Surface/action | Current problem | Backend contract needed? | Implementation dependency |
|---|---|---|---|---|---|
| P1 | [RoomDetails.jsx](hotelmate-frontend/src/components/rooms/RoomDetails.jsx#L52) | 8 status ops + manager override | `canAccess(['housekeeping','manager'])` / `canAccess(['manager'])` | yes — `rooms.status.*`, `rooms.status.manager_override` | rbacCatalog + `can(...)` |
| P1 | [HousekeepingRoomDetails.jsx](hotelmate-frontend/src/pages/housekeeping/components/HousekeepingRoomDetails.jsx#L54-L58) | `canManageRooms`, `canUseManagerOverride` | nav+role composition | yes — `housekeeping.status.*`, `housekeeping.manager_override` | same |
| P1 | [RoomCard.jsx](hotelmate-frontend/src/components/rooms/RoomCard.jsx#L22-L28) | quick action button | nav-used-for-action | yes — `rooms.quick_actions` | same |
| P1 | [StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L377) | revoke face | role-name array | yes — `attendance.face.revoke` (or `staff_management.face.revoke`) | same |
| P1 | [ConversationView.jsx](hotelmate-frontend/src/staff_chat/components/ConversationView.jsx#L147) | edit/delete staff message | role-name array | yes — `chat.staff.{edit,delete}` | same |
| P1 | [Staff.jsx](hotelmate-frontend/src/components/staff/Staff.jsx#L15) | 3 admin tabs | `isAdmin` tier check | maybe — could keep tier; or `staff_management.{packages,pending,departments}.view` | same |
| P1 | [SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx#L28-L47) | page access | `isSuperStaffAdmin` | yes — `admin_settings.section_editor.access` | same |
| P1 | [AttendanceDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/AttendanceDashboard.jsx#L118) | super-admin tools | `isSuperStaffAdmin` | yes — `attendance.super_admin` | same |
| P1 | [RoomList.jsx](hotelmate-frontend/src/components/rooms/RoomList.jsx#L53) | quick toggle | `isSuperStaffAdmin` | yes — `rooms.quick_view.toggle` | same |
| P1 | [RegistrationPackagesPanel.jsx](hotelmate-frontend/src/components/staff/RegistrationPackagesPanel.jsx#L17) | panel render | `isAdmin` | yes — `staff_management.packages.view` | same |

### Phase 2 — Mutation buttons / actions currently with NO frontend gate

| Priority | File/component | Surface/action | Current problem | Backend contract needed? |
|---|---|---|---|---|
| P2 | [BookingList.jsx](hotelmate-frontend/src/components/staff/bookings/BookingList.jsx) | Send precheckin / Approve / Decline | NO_GATE | `room_bookings.{send_precheckin,approve,decline}` |
| P2 | [BookingsGrid.jsx](hotelmate-frontend/src/components/bookings/BookingsGrid.jsx) | Assign-to-table / Unseat / Delete | NO_GATE | `restaurant_bookings.{assign_table,unseat,delete}` |
| P2 | [RoomsTab.jsx](hotelmate-frontend/src/pages/staff/room-management/RoomsTab.jsx) | Create / Bulk / Edit / Delete | NO_GATE | `rooms.inventory.{create,bulk_create,update,delete}` |
| P2 | [RoomTypesTab.jsx](hotelmate-frontend/src/pages/staff/room-management/RoomTypesTab.jsx) | Create / Edit / Delete + photo | NO_GATE | `rooms.types.{create,update,delete,upload_photo}` |
| P2 | [roomOperations.js](hotelmate-frontend/src/services/roomOperations.js) | `moveRoom`, bulk `checkinRoom/checkoutRoom`, turnover reads | NO_GATE | `rooms.{move_room,checkin,checkout,turnover.view}` |
| P2 | [RoomServiceOrdersManagement.jsx](hotelmate-frontend/src/components/room_service/RoomServiceOrdersManagement.jsx#L340) | order status select | NO_GATE | `room_services.order.set_status` |
| P2 | [MenusManagement.jsx](hotelmate-frontend/src/components/menus/MenusManagement.jsx) | menu item CRUD + image | NO_GATE | `room_services.menu.{create,update,delete,upload_image}` |
| P2 | [MaintenanceRequests.jsx](hotelmate-frontend/src/components/maintenance/MaintenanceRequests.jsx) | status / comment / delete | NO_GATE | `maintenance.request.{set_status,comment,delete}` |
| P2 | [RosterManagementGrid.jsx](hotelmate-frontend/src/features/attendance/components/RosterManagementGrid.jsx) | shift CRUD + copy ops | NO_GATE | `attendance.shift.{save,delete}`, `attendance.copy.{day,staff_week,bulk}` |
| P2 | [DepartmentRosterDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/DepartmentRosterDashboard.jsx#L318) | create period | NO_GATE | `attendance.period.create` |
| P2 | [AttendanceDashboard.jsx](hotelmate-frontend/src/features/attendance/pages/AttendanceDashboard.jsx) | Kiosk toggle, Finalize period, view detail | NO_GATE | `attendance.{kiosk.toggle,period.finalize,staff.view_detail}` |
| P2 | [shiftLocations.js](hotelmate-frontend/src/services/shiftLocations.js) | CRUD locations | NO_GATE | `attendance.locations.{list,create,update,delete}` |
| P2 | [analytics.js](hotelmate-frontend/src/services/analytics.js) | KPIs, summaries | NO_GATE | `attendance.analytics.view` |
| P2 | [registrationPackageApi.js](hotelmate-frontend/src/services/registrationPackageApi.js) | generate / email / printable | inherited admin only | `staff_management.packages.{generate,email,print}` |
| P2 | [staffApi.js overstay](hotelmate-frontend/src/services/staffApi.js) | acknowledge / extend | NO_GATE | `room_bookings.overstay.{acknowledge,extend}` |
| P2 | [hotelProvisioningApi.js](hotelmate-frontend/src/services/hotelProvisioningApi.js) | provisionHotel | NO_GATE | `provisioning.hotel.create` (super-user) |
| P2 | [staffApi.js / sectionEditorApi.js](hotelmate-frontend/src/services/sectionEditorApi.js) | section/element/item/hero/gallery/list CRUD + reorder + style | inherited tier | `admin_settings.public_page.*` action set |
| P2 | [api.js](hotelmate-frontend/src/services/api.js) | cancellation policies, rate plans, hotel settings, theme | inherited admin | `admin_settings.{cancellation_policy,rate_plan,hotel,theme}.*` |
| P2 | [roomConversationsAPI.js](hotelmate-frontend/src/services/roomConversationsAPI.js) | send / mark read (staff side) | NO_GATE | `chat.guest.{reply,mark_read}` |
| P2 | [staffChatApi.js](hotelmate-frontend/src/staff_chat/services/staffChatApi.js) | createConversation / sendMessage | NO_GATE | `chat.staff.{create_conversation,send}` |

### Phase 3 — Realtime / notifications

| Priority | File/component | Surface/action | Current problem | Backend contract needed? |
|---|---|---|---|---|
| P3 | [channelRegistry.js#L35-L83](hotelmate-frontend/src/realtime/channelRegistry.js#L35-L83) | base hotel channels | hotel-wide subscriptions for all staff regardless of permission | yes — backend channel ACL + a contract listing eligible channels per user |
| P3 | [BookingNotificationContext.jsx](hotelmate-frontend/src/context/BookingNotificationContext.jsx#L53) | eligibility | uses `hasNavAccess` (nav-for-notification) | maybe — switch to backend-provided `notification_channels` |
| P3 | [RoomServiceNotificationContext.jsx](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx#L57) | eligibility | same | same |
| P3 | [useHotelRealtime.js](hotelmate-frontend/src/hooks/useHotelRealtime.js), [useHotelGalleries.js](hotelmate-frontend/src/hooks/useHotelGalleries.js), [staff_chat/usePusher.js](hotelmate-frontend/src/staff_chat/), [components/StocktakeDetail.jsx] | stray Pusher instances (migration debt) | bypass `RealtimeProvider` | indirect — channel-level ACL needed regardless |

### Phase 4 — Cleanup

| Priority | File/component | Surface/action | Current problem |
|---|---|---|---|
| P4 | [useLogin.js#L43](hotelmate-frontend/src/hooks/useLogin.js#L43) | `\|\| data.allowed_navs` fallback | legacy after backend stable |
| P4 | [StaffCreate.jsx#L25,L227](hotelmate-frontend/src/components/staff/StaffCreate.jsx) | write-side `allowed_navs` field | legacy field name |
| P4 | [NavigationPermissionManager.jsx#L47](hotelmate-frontend/src/components/staff/NavigationPermissionManager.jsx#L47) | read-side `allowed_navs` | same |
| P4 | [ThemeContext.jsx#L50-L64](hotelmate-frontend/src/context/ThemeContext.jsx#L50-L64) | defensive `is_staff` patch | masks backend |
| P4 | [useNavigation.js DEFAULT_NAV_ITEMS](hotelmate-frontend/src/hooks/useNavigation.js) | fallback list | deprecated |
| P4 | [navigationCategories.js](hotelmate-frontend/src/config/navigationCategories.js), [navIconMap.js](hotelmate-frontend/src/config/navIconMap.js) | hardcoded slug strings | migrate to central rbacCatalog constants |
| P4 | [MobileNavbar.jsx#L362](hotelmate-frontend/src/components/layout/MobileNavbar.jsx#L362) | literal `'bookings'` slug | use canonical constant |
| P4 | [overviewSignalsStore.jsx#L10-L12](hotelmate-frontend/src/realtime/stores/overviewSignalsStore.jsx#L10-L12) | hardcoded `OVERVIEW_MODULES` | derive from nav catalog |

### Phase 5 — Polish

| Priority | Item | Implementation dependency |
|---|---|---|
| P5 | Add runtime validation + telemetry of `user.rbac`/`effective_navs` shape | `validateUserPermissions` exists but unused outside tests |
| P5 | Add `<Can module action>` JSX wrapper | rbacCatalog + `useCan` |
| P5 | Replace hardcoded `OVERVIEW_MODULES` with `effective_navs ∩ rbacCatalog.modules` | rbacCatalog |
| P5 | ESLint rule: ban raw `user.role`/`user.is_manager`/`user.access_level`/`user.allowed_navs` reads outside whitelisted hooks | tooling |

---

## 13. Final Audit Checklist

- [x] Every route inspected — all 57 staff routes + auth + guest + public route files
- [x] Every page inspected — every directory under `src/pages/` listed and walked
- [x] Every component inspected — `src/components/**` and `src/features/**` walked; 193 .jsx files surveyed
- [x] Every button/action inspected — 78+ unique handlers inventoried in §5
- [x] Every form inspected — §6 covers all known mutation forms (staff, bookings, rooms, attendance, menus, maintenance, section editor, settings, theme, chat, provisioning, FCM)
- [x] Every mutation inspected — POST/PATCH/PUT/DELETE call sites listed in §6 and §8
- [x] Every API service inspected — 16 files in `src/services/` + `src/staff_chat/services/staffChatApi.js`
- [x] Every realtime provider inspected — `RealtimeProvider`, `realtimeClient`, `guestRealtimeClient`, `channelRegistry`, `eventBus`, all `realtime/stores/`, both notification contexts, all four migration-debt hooks
- [x] Every permission helper inspected — `useAuth`, `usePermissions`, `usePublicPagePermissions`, `useNavigation`, `useDesktopNav`, `useOverviewLanding`, `useLogin`, `staffAccessPolicy`, `ProtectedRoute`, `authStore`
- [x] Every legacy role/tier/nav/admin check listed — see §9

**Audit completed as inventory only. No code modified.**
