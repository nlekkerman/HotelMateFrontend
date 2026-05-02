# RBAC Frontend Final Audit

> Final-sweep audit. Findings are derived directly from source under
> `hotelmate-frontend/src/`. No code was modified.

## Summary

- **Total issues found:** 13
- **Categories:**
  - Legacy authority usage (tier / `access_level` / `isAdmin` / `isSuperStaffAdmin` / `canAccess`): **7**
  - Missing RBAC gates (action with no `can()` check): **2**
  - Ownership-only authority leaks: **1** (residual prop / legacy compute)
  - Hardcoded permission booleans: **2**
  - Legacy data plumbing feeding tier checks: **1**

The single root cause behind most legacy-authority issues is `hooks/usePermissions.js`, which still exports `isAdmin`, `isStaffAdmin`, `isSuperStaffAdmin`, `hasTier`, and `canAccess`. Every consumer that imports these for **action** decisions (not nav visibility) is non-compliant.

---

## Issues

### 1. `usePermissions` exports forbidden authority primitives

**File:** [hotelmate-frontend/src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js)

**Current code:**
```js
const role = user?.role_slug?.toLowerCase() || user?.role?.toLowerCase();
const accessLevel = user?.tier || user?.access_level;
const isSuperStaffAdmin = accessLevel === 'super_staff_admin';
const isStaffAdmin     = accessLevel === 'staff_admin';
const isAdmin          = isSuperUser || isSuperStaffAdmin || isStaffAdmin;

const canAccess = (allowedRoles = []) => {
  if (!user) return false;
  if (isSuperUser) return true;
  const normalized = allowedRoles.map(r => r.toLowerCase());
  if (role && normalized.includes(role)) return true;
  if (accessLevel && normalized.includes(accessLevel.toLowerCase())) return true;
  return false;
};
```

**Problem:**
Computes authority from `role`, `role_slug`, `access_level`, `tier`. Exposes `isAdmin`, `isStaffAdmin`, `isSuperStaffAdmin`, `hasTier`, `canAccess` — every one of these is on the hard-banned list. As long as this hook keeps these exports, every consumer is one import away from a violation.

**Fix:**
Reduce the hook to visibility-only primitives (`effectiveNavs`, `hasNavAccess`, `isSuperUser`). Remove `role`, `accessLevel`, `tier`, `isAdmin`, `isStaffAdmin`, `isSuperStaffAdmin`, `hasTier`, `canAccess`. All call sites must migrate to `useCan()` + `can(module, action)`.

---

### 2. Theme update gated by tier flags

**File:** [hotelmate-frontend/src/context/ThemeContext.jsx](hotelmate-frontend/src/context/ThemeContext.jsx#L200)

**Current code:**
```js
// inside mutationFn (line ~200) and updateTheme (line ~235)
if (!isSuperUser && !isSuperStaffAdmin) {
  return Promise.reject(new Error('Theme updates are only allowed for superusers and super staff admins'));
}
```

Plus the staff-inference fallback at L56–57:
```js
const shouldBeStaff = bridgeUser.is_superuser ||
                     bridgeUser.access_level === 'staff_admin' ||
                     bridgeUser.access_level === 'super_staff_admin' ||
                     bridgeUser.staff_id;
```

**Problem:**
The PATCH `/staff/hotel/{slug}/settings/` action is gated entirely on `isSuperStaffAdmin` (tier). The `access_level === 'staff_admin' | 'super_staff_admin'` comparison is a direct legacy authority check.

**Fix:**
Replace the gate with the canonical action key, e.g.:
```js
const { can } = useCan();
if (!can('settings', 'theme_update')) {
  return Promise.reject(new Error('Not permitted'));
}
```
Remove the `bridgeUser.access_level === ...` branch entirely; rely on `user.is_staff` from the canonical auth payload.

---

### 3. Public-page edit access gated by `isAdmin`

**File:** [hotelmate-frontend/src/hooks/usePublicPagePermissions.js](hotelmate-frontend/src/hooks/usePublicPagePermissions.js#L20-L32)

**Current code:**
```js
const { isAdmin } = usePermissions();
...
const hasEditAccess = isAdmin;
const canEditPublicPage = Boolean(isStaff && isOwnHotel && hasEditAccess);
```

**Problem:**
`canEditPublicPage` is the authority that drives visibility/usability of all public-page edit controls. It is computed from the tier-derived `isAdmin` boolean.

**Fix:**
```js
const { can } = useCan();
const canEditPublicPage = isOwnHotel && can('public_page', 'edit');
```
(Replace `'edit'` with the exact backend action key.)

---

### 4. Section editor page gated by `isSuperStaffAdmin`

**File:** [hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx#L28-L47)

**Current code:**
```js
const { isSuperStaffAdmin } = usePermissions();
...
useEffect(() => {
  if (!isSuperStaffAdmin) {
    toast.error('You do not have permission to access this page');
    navigate(`/${hotelSlug}`);
    return;
  }
  fetchSections();
}, [hotelSlug, isSuperStaffAdmin, navigate]);
```

**Problem:**
Tier-based redirect; controls authority over read AND every create/update/delete on sections.

**Fix:**
```js
const { can } = useCan();
const canRead = can('sections', 'read');         // or canonical key
if (!canRead) { navigate(...); }
const canCreate = can('sections', 'section_create');
const canUpdate = can('sections', 'section_update');
const canDelete = can('sections', 'section_delete');
```
Gate each handler/button with the matching `can(...)` flag.

---

### 5. Staff settings page gated by `isAdmin`

**File:** [hotelmate-frontend/src/components/utils/Settings.jsx](hotelmate-frontend/src/components/utils/Settings.jsx#L14-L40)

**Current code:**
```js
const { isAdmin, isSuperUser } = usePermissions();
...
const canAccessSettings = isAdmin;
if (!canAccessSettings) { return <Alert ... /> }
```

**Problem:**
Whole-page authority via tier flag.

**Fix:**
```js
const { can } = useCan();
const canAccessSettings = can('settings', 'read'); // or the canonical visible/read pair
```

---

### 6. Face-management section in StaffDetails gated by `canAccess([...])`

**File:** [hotelmate-frontend/src/components/staff/StaffDetails.jsx](hotelmate-frontend/src/components/staff/StaffDetails.jsx#L428)

**Current code:**
```js
{(canAccess(['staff_admin', 'super_staff_admin']) || canAccess(['manager'])) && (
  <div className="mt-4">
    {/* Face Registration Management */}
```

**Problem:**
`canAccess` is on the hard-ban list. The inline comment acknowledges this is a temporary placeholder, but it is still a live tier/role-string authority check controlling whether the face-management section (revoke / register actions) is visible.

**Fix:**
Replace with the canonical attendance action key, e.g.:
```js
{can('attendance', 'face_manage') && ( ... )}
```

---

### 7. CommentItem: Edit & Delete have no RBAC gate, plus hardcoded `disabled={false}`

**File:** [hotelmate-frontend/src/components/home/CommentItem.jsx](hotelmate-frontend/src/components/home/CommentItem.jsx#L41-L139)

**Current code:**
```js
const isMyComment =
  user && (author.user_id ? user.id === author.user_id : false);
...
<button onClick={() => setEditing(true)} disabled={false /* or !isMyComment if you want to lock it */} >
  <i className="bi bi-pencil-fill"></i>
</button>
<button onClick={() => setShowDelete(true)} disabled={false /* or !isMyComment */} >
  <i className="bi bi-trash-fill"></i>
</button>
...
const confirmDelete = async () => {
  await api.delete(`home/${hotelSlug}/posts/${postId}/comments/${comment.id}/`);
  ...
};
```

**Problem:**
Three violations in one place:
1. `disabled={false}` — hardcoded boolean for permission control.
2. Edit and Delete have **no RBAC gating at all** — any authenticated user sees and can fire `confirmDelete`.
3. The `isMyComment` computation is a residual ownership-only authority candidate (commented as fallback) — would still be ownership-only authority if re-enabled.

**Fix:**
```js
const { can } = useCan();
const canEdit   = can('home', 'comment_update');
const canDelete = can('home', 'comment_delete');
...
{canEdit && (
  <button onClick={() => setEditing(true)} disabled={!canEdit}>...</button>
)}
{canDelete && (
  <button onClick={() => setShowDelete(true)} disabled={!canDelete}>...</button>
)}
```
Also gate the `confirmDelete` handler with an early `if (!canDelete) return;`.

---

### 8. Hardcoded `isAdmin={false}` props passed from BookingStatusPage

**File:** [hotelmate-frontend/src/pages/bookings/BookingStatusPage.jsx](hotelmate-frontend/src/pages/bookings/BookingStatusPage.jsx#L696-L703)

**Current code:**
```jsx
{activeService === "room_service" && canRoomService && (
  <RoomService isAdmin={false} roomNumber={roomNumber} hotelIdentifier={hotelSlug} />
)}
{activeService === "breakfast" && canBreakfast && (
  <Breakfast isAdmin={false} roomNumber={roomNumber} hotelIdentifier={hotelSlug} />
)}
```

**Problem:**
Hardcoded boolean used as a permission flag. Even though this is a guest-side render, the `isAdmin` channel is forbidden for permission control.

**Fix:**
Remove the `isAdmin` prop entirely from both call sites and from the receiving components (see #9). Authority should be derived inside each component via `useCan()` if needed (e.g. a staff-only admin view of the same component should be a separate gated render path, not a prop).

---

### 9. Legacy `isAdmin` prop on RoomService / Breakfast components

**Files:**
- [hotelmate-frontend/src/components/rooms/RoomService.jsx](hotelmate-frontend/src/components/rooms/RoomService.jsx#L11)
- [hotelmate-frontend/src/components/rooms/Breakfast.jsx](hotelmate-frontend/src/components/rooms/Breakfast.jsx#L20)

**Current code:**
```js
// RoomService.jsx
export default function RoomService({ isAdmin, roomNumber: propRoomNumber, hotelIdentifier: propHotelIdentifier }) {

// Breakfast.jsx
const Breakfast = ({ isAdmin = false, roomNumber: propRoomNumber, hotelIdentifier: propHotelIdentifier }) => {
```

**Problem:**
Public component API still exposes an `isAdmin` boolean for permission control. The prop is unreferenced inside the component bodies (dead authority surface), but its presence keeps the legacy contract alive and is a footgun for future callers.

**Fix:**
Remove the `isAdmin` parameter from both signatures. If a staff/admin view is needed later, gate it with `can('room_services', '<action>')` / `can('room_services', 'breakfast_<action>')` inside the component.

---

### 10. `useLogin` plumbs forbidden authority fields into auth user

**File:** [hotelmate-frontend/src/hooks/useLogin.js](hotelmate-frontend/src/hooks/useLogin.js#L40-L42)

**Current code:**
```js
tier: data.tier || data.access_level,
access_level: data.access_level,
role_slug: data.role_slug || data.role,
```

**Problem:**
This is the data pipe that fuels every `usePermissions` tier check. While persisting display-side fields can be defensible, copying `tier` / `access_level` / `role_slug` enables every legacy authority path; they should not be relied on for any gating decision.

**Fix:**
After all consumers migrate to `can(...)`, drop these fields from the persisted auth user object (or leave only as inert display strings, never read by any gate). Confirm `user.rbac` is the only authority source written by login.

---

### 11. Policy module operates on `access_level`

**File:** [hotelmate-frontend/src/policy/staffAccessPolicy.js](hotelmate-frontend/src/policy/staffAccessPolicy.js#L205-L206)

**Current code:**
```js
if (user.access_level && !["regular_staff", "staff_admin", "super_staff_admin"].includes(user.access_level)) {
  issues.push(`Invalid access_level: ${user.access_level}`);
}
```

**Problem:**
A frontend "policy" layer keyed on `access_level`. Even if it is invoked only for diagnostics, its existence implies authority logic on legacy fields and is referenced by `policyTests.js`. Out-of-spec per the contract.

**Fix:**
Delete the policy module (and its tests) or rewrite to read solely from `user.rbac.<module>.{visible,read,actions}`. No frontend policy should re-derive authority from `access_level`.

---

### 12. Notification eligibility driven by `hasNavAccess` (visibility-only check used for action surface)

**Files:**
- [hotelmate-frontend/src/context/BookingNotificationContext.jsx](hotelmate-frontend/src/context/BookingNotificationContext.jsx#L29-L36)
- [hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx](hotelmate-frontend/src/context/RoomServiceNotificationContext.jsx#L23-L30)

**Current code:**
```js
// BookingNotificationContext.jsx
const isEligibleForNotifications = useCallback(() => {
  if (!user) return false;
  if (isSuperUser) return true;
  return hasNavAccess('restaurant_bookings') || hasNavAccess('room_bookings');
}, [user, isSuperUser, hasNavAccess]);
```

**Problem:**
`hasNavAccess` is allowed for *visibility only*. Here it gates side-effects: showing toasts and calling `showNotification(...)`. This straddles the line — toast firing is a UI effect, not a domain action — but it is the **only** gate before invoking notification handlers. The same file already has `canMarkSeen = can("restaurant_bookings", "record_mark_seen")` proving the canonical source is available.

**Fix (recommended):**
Use a backend-driven action key for notification subscription, e.g.:
```js
return can('restaurant_bookings', 'notifications_subscribe')
    || can('room_bookings', 'notifications_subscribe');
```
If the backend treats notifications as pure visibility, document the carve-out explicitly in the RBAC contract; otherwise migrate.

---

### 13. `isAdmin` boolean still imported by Settings component (residual surface)

**File:** [hotelmate-frontend/src/components/utils/Settings.jsx](hotelmate-frontend/src/components/utils/Settings.jsx#L14)

(Already covered in #5; called out separately because the destructured `isAdmin, isSuperUser` import is the literal shape the audit forbids — it stays even after the page-level fix unless the destructure itself is removed.)

**Fix:**
After applying #5, also remove `usePermissions` import and replace with `useCan`. No file should retain `const { isAdmin } = usePermissions()`.

---

## Items reviewed and accepted (visibility-only — not violations)

These were inspected and confirmed compliant. They use `hasNavAccess` / `effectiveNavs` for **navigation visibility**, which is allowed:

- `components/layout/MobileNavbar.jsx` — `hasNavAccess('room_bookings')` gates a nav link only.
- `hooks/useDesktopNav.js` — uses `effectiveNavs` + `isSuperUser` to render the launcher.
- `pages/staff/OverviewPage.jsx` — filters Overview modules by `effectiveNavs`.
- `components/staff/NavigationPermissionManager.jsx` — read-only display of `access_level` / `allowed_navs` (data, not authority).
- `features/staffProfile/StaffProfileCard.jsx` — `access_level` rendered as a profile field, no gating.
- `staff_chat/components/ShareMessageModal.jsx` — `staff.role` used for label rendering only.
- `components/staff/StaffDetails.jsx` (top-level) — already uses `useCan`/`can('staff_management', ...)` for every action surface and has a `canReadModule = authUser?.rbac?.staff_management?.read` gate. The face-management section (#6) is the lone hold-out.
- `components/staff/StaffCreate.jsx` — `canCreateStaff = can('staff_management', 'staff_create')` correctly gates the Create button.
- `components/chat/ChatWindow.jsx` — message delete / attachment delete are gated by `can('chat', 'message_moderate')` and `can('chat', 'attachment_delete')`. `isMine` is layout-only (alignment), not authority.
- `components/utils/settings-sections/SectionDepartmentsRoles.jsx`, `SectionStaffRegistration.jsx` — fully `useCan`-driven.
- `features/attendance/**`, `components/menus/MenusManagement.jsx`, `components/maintenance/**` — fully `useCan`-driven.

---

## Final Status

**Is the frontend fully RBAC-compliant?** **NO.**

**Blocking issues:**
1. `usePermissions.js` still exports tier/role-derived authority primitives (`isAdmin`, `isStaffAdmin`, `isSuperStaffAdmin`, `hasTier`, `canAccess`). These primitives are consumed by:
   - `ThemeContext` (theme update)
   - `usePublicPagePermissions` (public page edit)
   - `SectionEditorPage` (entire editor + CRUD)
   - `Settings` (settings page entry)
   - `StaffDetails` (face-management section)
2. `CommentItem` has **no RBAC gating** on edit/delete and uses hardcoded `disabled={false}`.
3. Legacy `isAdmin` prop survives on `RoomService` / `Breakfast` and is passed as `isAdmin={false}` from `BookingStatusPage`.

**Ambiguous mappings requiring backend clarification:**
- `settings.theme_update` — exact action key for PATCHing hotel theme settings (`ThemeContext.jsx`).
- `settings.read` (or equivalent) — entry gate for the staff Settings page.
- `public_page.edit` (or equivalent) — gate for `usePublicPagePermissions`.
- `sections.{read|section_create|section_update|section_delete}` — confirm exact action keys for `SectionEditorPage`.
- `attendance.face_manage` (or split into `face_revoke` / `face_register`) — replacement for the `canAccess([...])` gate in `StaffDetails`.
- `home.comment_update` / `home.comment_delete` — replacement for the missing gate in `CommentItem`.
- `restaurant_bookings.notifications_subscribe` / `room_bookings.notifications_subscribe` / `room_services.notifications_subscribe` — confirm whether notification subscription is an action or pure visibility (drives the `hasNavAccess` carve-out in the two notification contexts).

Until those keys are confirmed and the items above are migrated, the frontend retains live legacy-authority paths.
