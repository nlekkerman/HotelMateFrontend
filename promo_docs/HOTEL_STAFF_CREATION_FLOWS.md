# Hotel Creation & Staff Creation — Full Frontend Flow Analysis

---

## 1. Hotel Creation (Superuser Flow)

### Component
`hotelmate-frontend/src/pages/SuperUser.jsx` — the entire hotel creation form is inline in this single page component.

### Who Can Access
- Route: `/super-user` (`staffRoutes.jsx`, `protected: true, mode: 'staff'`)
- **Client guard**: The component checks `user?.is_superuser` and renders an "Access Denied" alert if false.
- **Route guard**: `ProtectedRoute` Layer 2 (`staffAccessPolicy`) also runs, but the super-user path maps to `"home"` slug via the generic `/staff/` matcher — this is a mapping weakness (see Weak Spots).

### Fields Collected
| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Auto-generates `slug` and `subdomain` |
| `slug` | Yes | Auto-generated from name, regex: `^[a-z0-9-]+$` |
| `subdomain` | Yes | Auto-synced with slug |
| `city` | No | |
| `country` | No | |
| `address_line_1` | No | |
| `address_line_2` | No | |
| `postal_code` | No | |
| `phone` | No | Regex validated |
| `email` | No | Regex validated |
| `website` | No | Must start with `http://` or `https://` |
| `latitude` | No | Must be −90 to 90 |
| `longitude` | No | Must be −180 to 180 |
| `short_description` | No | |
| `tagline` | No | |
| `long_description` | No | |
| `is_active` | No | Default: `true` |
| `sort_order` | No | Default: `0` |

### API Call
```
POST /hotel/hotels/   (body: cleaned hotelData object)
```

### Post-Creation Bootstrap (3 parallel calls)
After the hotel is created, `Promise.all` fires:

1. **`bootstrapHotelPage(slug)`** — tries `POST /public/hotel/{slug}/bootstrap/`, falls back to `POST /staff/hotel/{slug}/public-page-bootstrap/`
2. **`createDefaultRoomTypes(slug)`** — creates 3 room types sequentially via `POST /staff/hotel/{slug}/room-types/` (Standard Single, Standard Double, Superior Room)
3. **`createDefaultNavigationItems(slug)`** — creates **15 default nav items** sequentially via `POST /staff/hotel/{slug}/navigation-items/` with fallback to `POST /staff/navigation-items/` (with `hotel_slug` in body)

The 15 default nav items: Home, Chat, Reception, Rooms, Housekeeping, Room Bookings, Staff, Room Service, Breakfast, Menus, Bookings, Guests, Stock Tracker, Attendance, Settings.

### After Creation — UI Behavior
- Success message displayed, form resets
- **No navigation to the new hotel** — the superuser stays on the SuperUser panel
- If bootstrap fails partially, a warning is shown: "some default setup failed"

### Maintenance Tools (same page)
- **Bootstrap Public Page**: Enter hotel slug → `POST /public/hotel/{slug}/bootstrap/`
- **Setup Navigation Icons**: Enter hotel slug → creates all 15 default nav items
- Link to Django Admin panel

---

## 2. Staff Registration Flow

### Entry Points
1. **QR Code scan** — a URL with `?token=xxx&hotel=slug` query params directs to `/register`
2. **Direct link** — `/register` with or without query params
3. **Manual code entry** — the registration form has a `registrationCode` field

### QR Code Generation (Admin Side)
Two components handle QR generation:
- `hotelmate-frontend/src/components/utils/QRRegistrationManager.jsx` — standalone component, calls `POST /staff/registration-package/` with `{ hotel_slug }`
- `hotelmate-frontend/src/components/utils/settings-sections/SectionStaffRegistration.jsx` — embedded in Settings page, same API call

Both generate a **registration package** containing: `registration_code`, `qr_code_url`. Admin can download/print the QR + code.

### Registration Component
`hotelmate-frontend/src/components/auth/Register.jsx`

### Registration Route
`/register` is defined in `hotelmate-frontend/src/routes/authRoutes.jsx` — note the element is `'REGISTER_WITH_TOKEN'` (a string sentinel), meaning the actual component is resolved in `AppLayoutShell` with a token guard.

### Required Fields
| Field | Required | Notes |
|---|---|---|
| `username` | Yes | |
| `password` | Yes | |
| `confirmPassword` | Yes | Client-side match validation |
| `registrationCode` | Yes | From manager's package |
| `qrToken` | Auto | Extracted from `?token=` URL param |
| `hotelSlug` | Auto | Extracted from `?hotel=` URL param |

### API Call
```
POST /staff/register/
Body: { username, password, registration_code, qr_token? }
```

### After Submission
1. On success, the response contains `{ token, username, user_id, hotel_slug, hotel_name, registration_code, message }`
2. This is stored in `localStorage` as `user` — **but critically, no `staff_id` or `is_active` yet**
3. Navigate to `/registration-success`

### Registration Success Page
`hotelmate-frontend/src/components/auth/RegistrationSuccess.jsx` displays:
- Welcome message with username
- Hotel name
- Registration code
- Status: **"Waiting for Manager to Create Profile"**
- Explanation that the manager must create their staff profile
- "Go to Login" button

### User Status After Registration
**The user is NOT immediately active.** They have a Django user account but NO staff profile. They cannot log in via `/staff/login/` until the manager creates the staff profile.

---

## 3. Staff Approval / Profile Creation Flow

### Where Admin Sees Pending Staff
`hotelmate-frontend/src/components/staff/StaffCreate.jsx` at route `/:hotelSlug/staff/create`

On mount, it fetches:
```
GET staff/{hotelSlug}/pending-registrations/
```
Returns `{ pending_users: [{ user_id, username, registration_code, registered_at }] }`

### Approval Process (it's actually "creation", not approval)
There is no approve/reject toggle. The admin **creates a staff profile** for the pending user by clicking on them, which opens a modal.

### Modal Fields
| Field | Required | Notes |
|---|---|---|
| Hotel | Read-only | From auth context |
| `first_name` | Yes | |
| `last_name` | Yes | |
| Department | Yes | Dropdown, fetched from `GET staff/departments/?page_size=100` |
| Role | Yes | Dropdown, fetched from `GET staff/roles/?page_size=100` |
| `email` | No | |
| Access Level | Yes | Dropdown: `regular_staff`, `staff_admin`, `super_staff_admin` |
| `is_active` | Checkbox | Default: `true` |
| Navigation Permissions | Multi-select | Checkbox grid of all available nav items |

### Navigation Permissions at Creation
Nav items are fetched from:
```
GET /staff/navigation-items/?hotel_slug={slug}
```
Falls back to `DEFAULT_NAV_ITEMS` from `hotelmate-frontend/src/hooks/useNavigation.js` if API fails.

Admin uses a checkbox grid with "Select All" / "Clear All" buttons. Selected slugs are sent as `allowed_navs: [...]`.

### API Call
```
POST staff/{hotelSlug}/create-staff/
Body: {
  user_id,           // from pending_users response
  first_name, last_name, email,
  department_id,     // numeric ID
  role_id,           // numeric ID
  access_level,      // "regular_staff" | "staff_admin" | "super_staff_admin"
  is_active,
  allowed_navs       // array of nav slugs
}
```

### After Staff Creation
- Alert shown: "Staff profile created successfully! Registration code has been marked as used."
- Navigate to `/staff/{newStaffId}` (staff details page)
- If no `staff_id` in response, page reloads to refresh the pending list

### Post-Creation Permission Management
Once a staff profile exists, the admin can manage navigation permissions from `hotelmate-frontend/src/components/staff/StaffDetails.jsx` which renders `hotelmate-frontend/src/components/staff/NavigationPermissionManager.jsx`.

This component:
- Fetches available nav items: `GET /staff/navigation-items/?hotel_slug={slug}`
- Fetches current permissions: `GET /staff/staff/{staffId}/navigation-permissions/`
- Saves changes: `PUT /staff/staff/{staffId}/navigation-permissions/` with `{ navigation_item_ids: [...] }`

---

## 4. Roles and Permissions in UI

### Two-Layer Route Protection
`hotelmate-frontend/src/components/auth/ProtectedRoute.jsx` implements:

**Layer 1 (always):** Is user authenticated? If not → redirect to `/login`.

**Layer 2 (mode="staff" only, gated by `ENABLE_ROUTE_PERMISSIONS` flag):**
Calls `canAccessStaffPath()` from `hotelmate-frontend/src/policy/staffAccessPolicy.js` with `{ pathname, user, requiredSlug }`.

The feature flag in `hotelmate-frontend/src/config/featureFlags.js`: `ENABLE_ROUTE_PERMISSIONS = true` (currently **enabled**).

### `canAccessStaffPath()` Logic
1. Not staff → deny → redirect to `/login`
2. **Superuser → allow all** (bypass)
3. Check `ADMIN_ONLY_ROUTES` — settings and permissions require `super_staff_admin` access level
4. Map pathname to a required nav slug via `PATH_TO_NAV_MAPPING` (or use explicit `requiredSlug` from route config)
5. **Unmapped routes → deny by default** (security-first)
6. Check `user.allowed_navs.includes(requiredNavSlug)` — deny if missing

### Where `allowed_navs` is Used
- **`usePermissions()` hook** (`hotelmate-frontend/src/hooks/usePermissions.js`): reads `user.allowed_navs` from `useAuth()` context. Exports `canAccessNav(slug)`, `canAccess(allowedRoles)`, `isSuperUser`.
- **`useNavigation()` hook** (`hotelmate-frontend/src/hooks/useNavigation.js`): uses `allowed_navs` to build the sidebar nav. Backend is authoritative — if `allowed_navs` is empty, staff sees nothing.
- **`ProtectedRoute`**: uses `canAccessStaffPath()` which checks `allowed_navs` array.

### What Happens on Unauthorized Access
- Console warns `[PERMISSION DENIED]` with path, slug, userId, reason
- Redirects to `/reception` (the default `unauthorizedRedirect`)

### Hidden Nav Items
The `useNavigation` hook has a hardcoded `HIDDEN_NAV_SLUGS = ['stock_tracker', 'stock_dashboard', 'housekeeping']` that hides certain items from the sidebar regardless of permissions.

---

## 5. Auth + Hotel Context

### How `hotelSlug` is Stored and Used
1. **Login response** includes `hotel_slug`, `hotel_id`, `hotel_name`
2. `hotelmate-frontend/src/hooks/useLogin.js` saves these into a `userToSave` object
3. `AuthContext.login()` stores to both React state and `localStorage` as JSON under key `"user"`
4. `setAuthUser()` in `hotelmate-frontend/src/lib/authStore.js` updates a module-level variable for non-React code

### How Staff User is Stored
`localStorage.setItem('user', JSON.stringify(userToSave))` — a single object containing:
```js
{ id, staff_id, token, username, hotel_id, hotel_name, hotel_slug,
  is_staff, is_superuser, access_level, isAdmin, department, role,
  allowed_navs, navigation_items, profile_image_url, hotel: { id, name, slug } }
```

### How API Calls Include Hotel Context
`hotelmate-frontend/src/services/api.js` request interceptor adds three headers on every request:
- `Authorization: Token {token}`
- `X-Hotel-ID: {hotel_id}`
- `X-Hotel-Slug: {hotel_slug}`

Additionally, many endpoints embed `hotelSlug` in the URL path (e.g., `staff/{hotelSlug}/...`).

### Fallback Logic
- `api.js` reads from `getAuthUser()` (authStore bridge) first, falls back to `localStorage.getItem('user')` for pre-AuthProvider-mount requests
- `NavigationPermissionManager` has a hardcoded fallback: `user?.hotel_slug || 'hotel-killarney'`

### `hotelSlug` Inconsistency
The route params use `:hotelSlug` in some routes and `:hotel_slug` or `:hotelIdentifier` in others (documented in `promo_docs/AUDIT_FIX_STATUS.md`).

---

## 6. UX Flow Chain

```
SUPERUSER
  └─ /super-user (SuperUser.jsx)
     └─ Fills hotel form → POST /hotel/hotels/
     └─ Auto-bootstrap: public page + 3 room types + 15 nav items
     └─ Stays on SuperUser panel (no redirect to new hotel)

ADMIN (first user at hotel)
  └─ Must be manually set up (Django admin or prior arrangement)
  └─ /login → Login.jsx → POST /staff/login/
  └─ Receives: token, hotel_slug, allowed_navs, navigation_items
  └─ Navigates to: /staff/{hotel_slug}/feed (Home page)

ADMIN generates registration package
  └─ /staff/{hotel_slug}/settings → SectionStaffRegistration
     └─ POST /staff/registration-package/ → { registration_code, qr_code_url }
  └─ Prints/downloads QR + code for new staff member

NEW STAFF registers
  └─ Scans QR → /register?token=xxx&hotel=slug
  └─ Register.jsx → enters username, password, registration_code
  └─ POST /staff/register/ → user account created (no staff profile yet)
  └─ Redirect → /registration-success → "Waiting for Manager to Create Profile"

ADMIN creates staff profile
  └─ /{hotel_slug}/staff/create → StaffCreate.jsx
  └─ Sees pending user in list → clicks → modal opens
  └─ Sets: name, department, role, access level, nav permissions
  └─ POST staff/{hotel_slug}/create-staff/
  └─ Staff is now active and can log in

STAFF logs in
  └─ /login → Login.jsx → POST /staff/login/
  └─ Receives allowed_navs, navigation_items, access_level
  └─ Navigates to: /staff/{hotel_slug}/feed
  └─ Sidebar shows ONLY nav items matching allowed_navs
  └─ Route guard blocks access to any page not in allowed_navs
```

---

## 7. Weak Spots / Confusion

### 7.1 No First-Admin Bootstrap
After hotel creation, there is **no mechanism to create the first admin user** from the frontend. The superuser creates the hotel but there's no "invite first admin" step. The first admin must be created via Django admin or has to somehow already exist. This is a critical gap in the onboarding flow.

### 7.2 SuperUser Route Mapping Bug
The `/super-user` route has `mode: 'staff'` but no `requiredSlug`. The policy auto-maps it: `/staff/...` matcher catches it? Actually no — `/super-user` doesn't start with `/staff/`. It would likely become **unmapped → denied by default**. The superuser bypass in `canAccessStaffPath()` saves it, but if a `staff_admin` tried to access `/super-user`, it would be denied for the wrong reason ("unmapped") rather than "not superuser". The component's own `is_superuser` check is the real guard.

### 7.3 Hardcoded Hotel Slug Fallback
In `NavigationPermissionManager`, the fallback `user?.hotel_slug || 'hotel-killarney'` is **a hardcoded hotel name**. This will cause incorrect API calls if `hotel_slug` is somehow missing from the auth context.

### 7.4 Duplicate QR Generation Components
`QRRegistrationManager.jsx` and `SectionStaffRegistration.jsx` **duplicate** the QR package generation logic. Both call the same API but are completely separate components with separate state. `SectionStaffRegistration` even imports `axios` directly instead of using the shared `api` service (though it uses `api.post` in the body — it imports `axios` at the top but the actual call uses the `api` import that's missing from the file's imports, which is likely a bug).

### 7.5 SectionStaffRegistration Uses Wrong Import
`SectionStaffRegistration.jsx` imports `axios` but references `api.post` in the `generatePackage` function — `api` is never imported in that file. This would cause a **runtime crash** when generating a package from the Settings page.

### 7.6 Post-Staff-Creation Navigation Bug
After creating a staff profile, `StaffCreate.jsx` navigates to `/staff/${newStaffId}` — but the actual route pattern is `/:hotelSlug/staff/:id`. The navigation will go to a wrong URL like `/staff/42` instead of `/hotel-killarney/staff/42`.

### 7.7 Registration Code Stored in localStorage After Register
After registration, the response data (including token) is stored in `localStorage.setItem('user', ...)`. This token exists alongside the "pending" status. If the user navigates to `/login` and tries to log in before the admin creates their profile, the stale localStorage data could cause confusion (the old token may still be there).

### 7.8 No Reject/Deny Mechanism
There's no way for an admin to **reject** a pending registration from the UI. Pending users can only be approved (converted to staff). To reject, an admin would need to use Django admin.

### 7.9 Missing Validation on Registration Code
The `Register.jsx` form does not validate the `registrationCode` field is non-empty before submission — it's just a text field. If the user forgets to enter it, the backend will return an error, but no client-side check prevents submission.

### 7.10 Default Room Types are Hardcoded with Static Prices
The 3 default room types created during hotel bootstrap have hardcoded prices ($75, $120, $160) and no currency configuration. These need manual adjustment for every hotel.

### 7.11 Nav Item Creation is Sequential, Not Batched
Both room types and navigation items are created one-by-one in loops. If the API is slow or one fails, the rest may still attempt but the user gets a confusing partial success message.

### 7.12 `HIDDEN_NAV_SLUGS` Hardcoded in `useNavigation`
Stock tracker and housekeeping are hardcoded as hidden via `HIDDEN_NAV_SLUGS`. This overrides backend permissions — even if a staff member is granted `stock_tracker` access, they won't see it in the sidebar. This is undocumented and confusing.

### 7.13 Two Different Permission Systems at StaffCreate vs StaffDetails
- **StaffCreate** sends `allowed_navs` (array of slug strings) during profile creation
- **NavigationPermissionManager** (in StaffDetails) uses `navigation_item_ids` (array of numeric IDs) for updates

These are **different data formats** for the same concept, which could cause mismatches between what was set at creation and what's displayed during editing.
