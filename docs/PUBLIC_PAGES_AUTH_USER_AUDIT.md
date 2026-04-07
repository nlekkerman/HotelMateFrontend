# Public Pages — Authenticated User Audit

> What authenticated (staff) users see on public pages vs unauthenticated visitors.

---

## Summary of Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HotelsLandingPage` | All Hotels directory |
| `/hotel/:slug` | `HotelPublicPage` | Dynamic section-based hotel page |
| `/hotel/:slug/sections` | `SectionBasedPublicPage` | Alternate section renderer |
| `/:hotelSlug` | `HotelPortalPage` | Legacy/catch-all hotel portal |
| `/:hotelSlug/book` | `GuestRoomBookingPage` | Guest booking form |
| `/booking/:hotelSlug` | `GuestRoomBookingPage` | Guest booking (variant route) |
| `/:hotelSlug/my-bookings` | My Bookings | Guest's localStorage bookings |
| `/booking/confirmation/:id` | `BookingConfirmation` | Post-booking confirmation |
| `/booking/payment/success` | `BookingPaymentSuccess` | Stripe success callback |
| `/booking/payment/cancel` | `BookingPaymentCancel` | Stripe cancel callback |

---

## 1. All Hotels Page (`/`) — `HotelsLandingPage`

**File**: `src/pages/hotels/HotelsLandingPage.jsx`

### Unauthenticated User
- Sees the full hotel directory with search bar and filters (city, country, hotel type, sort).
- Header shows **"Staff Login"** button (links to `/login`).
- Mobile hamburger menu contains the same "Staff Login" link.
- Can browse, filter, and click into any hotel's public page.

### Authenticated Staff User
- **Auto-redirected** to `/staff/{hotel_slug}/feed` on page load.
- Redirect is skipped ONLY if `?view=all` query param is present — then they see the full directory.
- When viewing with `?view=all`:
  - Header shows **"Welcome, {username}"** + **Logout** button (desktop).
  - Mobile menu shows username + Logout.
  - No "Staff Login" button shown.
- Hotel cards themselves render identically — no per-card staff indicators.

### Authenticated Non-Staff User
- Sees the same directory as unauthenticated users (no redirect).
- Header behavior same as unauthenticated (shows "Staff Login" link — should potentially show Logout instead).

### Key Redirect Logic
```jsx
if (user && isStaff && !viewAllHotels) {
  navigate(`/staff/${user.hotel_slug}/feed`, { replace: true });
}
```

---

## 2. Hotel Public Page (`/hotel/:slug`) — `HotelPublicPage`

**File**: `src/pages/hotels/HotelPublicPage.jsx`

### Unauthenticated User
- Sees rendered sections (hero, gallery, rooms, list, news, footer) sorted by position.
- Fixed "All Hotels" back button (bottom-left corner).
- If the page has **no sections**: sees a "Coming Soon" alert with a link back to hotels list.
- No editing controls visible.

### Authenticated Staff — **Own Hotel** (`user.hotel_slug === slug`)
- Sees all the same sections as unauthenticated users.
- **Additionally sees**:
  - **PresetSelector** component (top of page) — allows changing page style variant.
  - **Inline edit buttons** on each section (hero edit, gallery edit, list add, etc.) via CSS class `has-preset-selector`.
  - **"Edit Sections"** inline builder for adding/removing/reordering sections.
  - If page is **empty** (no sections): sees a "Start Building Your Page" prompt with edit instructions instead of "Coming Soon".
  - For `unknown` section types: sees a debug info card showing section ID, type, and element type.

### Authenticated Staff — **Different Hotel** (`user.hotel_slug !== slug`)
- Sees the **same read-only view** as unauthenticated users.
- No PresetSelector, no edit buttons, no inline builder.
- Empty page shows "Coming Soon" (same as unauthenticated).

### "Is This My Hotel?" Check
```jsx
{isStaff && user && (
  <PresetSelector ... />
)}
```
> **Note**: The PresetSelector and edit controls check `isStaff && user` but do NOT check `user.hotel_slug === slug`. This means any authenticated staff member can see edit UI on ANY hotel's public page. The backend should enforce permissions, but the **frontend shows edit controls to staff visiting other hotels' pages**.

### Key Conditional Rendering
| Element | Unauth | Staff (Own Hotel) | Staff (Other Hotel) |
|---------|--------|-------------------|---------------------|
| Sections content | ✅ | ✅ | ✅ |
| "All Hotels" back button | ✅ | ✅ | ✅ |
| PresetSelector (style toggle) | ❌ | ✅ | ⚠️ **Yes — potential issue** |
| Inline edit buttons | ❌ | ✅ | ⚠️ **Yes — potential issue** |
| "Start Building" (empty page) | ❌ ("Coming Soon") | ✅ | ❌ ("Coming Soon") |
| Unknown section debug card | ❌ | ✅ | ✅ |
| Footer (default if none exists) | ✅ | ✅ | ✅ |

---

## 3. Hotel Portal Page (`/:hotelSlug`) — `HotelPortalPage`

**File**: `src/pages/HotelPortalPage.jsx`

### Unauthenticated User
- Sees the full hotel portal: header with hotel name/location/logo, "All Hotels" back button, and `GuestHotelHome` component (rooms, amenities, booking CTA, gallery, welcome message).
- No staff-specific buttons.

### Authenticated Staff — **Own Hotel** (`user.hotel_slug === hotelSlug`)
- Sees everything unauthenticated users see.
- **Additionally sees**: **"Back to Staff Feed"** button in the header (desktop: full text, mobile: "Staff" label).
- `GuestHotelHome` receives `user` prop but renders in `editorMode="view"` with `canEdit={false}`.

### Authenticated Staff — **Different Hotel** (`user.hotel_slug !== hotelSlug`)
- Sees the same view as unauthenticated users.
- **No "Back to Staff Feed" button** — correctly gated by slug check.

### Authenticated Non-Staff User
- Sees the same view as unauthenticated users.

### Key Conditional Rendering
| Element | Unauth | Staff (Own Hotel) | Staff (Other Hotel) |
|---------|--------|-------------------|---------------------|
| Hotel header + info | ✅ | ✅ | ✅ |
| "All Hotels" back link | ✅ | ✅ | ✅ |
| Hotel logo | ✅ | ✅ | ✅ |
| "Back to Staff Feed" button | ❌ | ✅ | ❌ |
| GuestHotelHome (read-only) | ✅ | ✅ | ✅ |
| Real-time settings updates | ✅ | ✅ | ✅ |

### "Is This My Hotel?" Check — Correctly Implemented
```jsx
{isStaff && user?.hotel_slug === hotelSlug && (
  <Button onClick={() => navigate(`/staff/${hotelSlug}/feed`)}>
    Back to Staff Feed
  </Button>
)}
```

---

## 4. Booking Flow Pages

### Guest Booking (`/:hotelSlug/book`)
- No auth difference — fully public.
- Bookings stored in `localStorage` (no account needed).
- Auth token is NOT sent on booking API calls from this page.

### My Bookings (`/:hotelSlug/my-bookings`)
- No auth difference — reads from `localStorage`.
- Filters by `hotel_slug` from route params if present.

### Confirmation & Payment Pages
- No auth difference — fully public.
- Payment success auto-saves booking to `localStorage`.

---

## 5. Header/Navigation Differences

### On Public Pages (layout mode = "public")
- Staff sidebar navigation is **completely hidden**.
- No chat panel, no notifications, no clock-in button.
- The `layoutPolicy.getLayoutMode()` function returns `"public"` for all public routes.

### HotelsLandingPage Header
| Element | Unauth | Staff | Non-Staff Auth |
|---------|--------|-------|----------------|
| Logo (centered) | ✅ | ✅ | ✅ |
| "Staff Login" link | ✅ | ❌ | ✅ |
| "Welcome, {name}" | ❌ | ✅ | ❌ |
| Logout button | ❌ | ✅ | ❌ |
| Mobile hamburger | ✅ | ✅ | ✅ |

### HotelPortalPage Header
| Element | Unauth | Staff (Own) | Staff (Other) |
|---------|--------|-------------|---------------|
| "All Hotels" back link | ✅ | ✅ | ✅ |
| Hotel name + location | ✅ | ✅ | ✅ |
| Hotel logo | ✅ | ✅ | ✅ |
| "Back to Staff Feed" | ❌ | ✅ | ❌ |

### HotelPublicPage (Section-Based)
| Element | Unauth | Staff (Any) |
|---------|--------|-------------|
| "All Hotels" back button | ✅ | ✅ |
| PresetSelector toolbar | ❌ | ✅ |

---

## 6. Potential Issues Found

### Issue 1: PresetSelector shown to ALL staff on ANY hotel
**Location**: `HotelPublicPage.jsx` render block  
**Problem**: The PresetSelector and inline edit UI checks `isStaff && user` but does NOT verify `user.hotel_slug === slug`. Any logged-in staff member visiting another hotel's `/hotel/:slug` page will see editing controls.  
**Impact**: Staff from Hotel A can see (and attempt to use) page builder tools on Hotel B's public page. Backend may reject the API calls, but the UI is misleading.  
**Fix**: Add `user.hotel_slug === slug` check:
```jsx
{isStaff && user && user.hotel_slug === slug && (
  <PresetSelector ... />
)}
```

### Issue 2: Non-staff authenticated users see "Staff Login" on landing page
**Location**: `HotelsLandingPage.jsx` header  
**Problem**: The header only checks `isStaff && user` to decide what to show. An authenticated non-staff user (e.g., a guest with an account) sees the "Staff Login" link instead of a Logout option.  
**Impact**: Minor UX confusion — logged-in non-staff guests see a login link as if they're not logged in.

### Issue 3: `selectHotel()` called for all visitors on HotelPortalPage
**Location**: `HotelPortalPage.jsx`, line in `fetchHotelData`  
**Problem**: `selectHotel(response.data)` is called on every page load, including for unauthenticated users. This writes hotel data into auth context for all visitors.  
**Impact**: Could cause stale hotel context if a user browses multiple hotels. May also leak hotel data into auth state unintentionally.

---

## 7. Auth State Reference

**User object** (from `AuthContext`):
```
{
  id, staff_id, token, username,
  hotel_id, hotel_name, hotel_slug,  // ← used for "my hotel" checks
  is_staff, is_superuser, access_level,
  department, role, allowed_navs, navigation_items,
  profile_image_url
}
```

**`isStaff` derivation**:
```jsx
const isStaff = user?.is_staff || user?.is_superuser ||
                user?.access_level === 'staff_admin' ||
                user?.access_level === 'super_staff_admin' ||
                user?.staff_id;
```
