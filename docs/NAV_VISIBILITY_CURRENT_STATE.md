# Navigation Visibility Current State Analysis

## Executive Summary
The HotelMate frontend has a complex, **multi-layered navigation visibility system** with **no single source of truth**. Navigation decisions are made by at least 4 different components using overlapping but inconsistent logic, leading to navigation leakage on public booking flows.

## 1) Inventory of Components Involved

### Primary Layout Controllers
| File | Purpose | Visibility Logic | Conditions Checked |
|------|---------|------------------|-------------------|
| [App.jsx](../hotelmate-frontend/src/App.jsx#L174-L225) | Top-level layout | `hideNavigation` computed from multiple conditions | `isAuthPage`, `isGuestPage`, `isPublicLandingPage` |
| [BigScreenNavbar.jsx](../hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx#L57-L65) | Desktop sidebar nav | Internal visibility check + early return | `location.pathname` patterns, `user` presence |
| [MobileNavbar.jsx](../hotelmate-frontend/src/components/layout/MobileNavbar.jsx#L1-L100) | Mobile nav bar | No internal visibility logic | Renders if App.jsx allows |
| [Navbar.jsx](../hotelmate-frontend/src/components/layout/Navbar.jsx#L56-L67) | Legacy navbar component | Internal pattern matching + early return | `hiddenNavPatterns`, anonymous user checks |

### Navigation Context & Permission Layers
| File | Purpose | What It Controls |
|------|---------|------------------|
| [useNavigation.js](../hotelmate-frontend/src/hooks/useNavigation.js#L35-L85) | Nav items filtering | Which nav items show (not whether nav renders) |
| [usePermissions.js](../hotelmate-frontend/src/hooks/usePermissions.js#L35-L60) | Role-based access | Individual nav item visibility |
| [AuthContext.jsx](../hotelmate-frontend/src/context/AuthContext.jsx#L20-L35) | User state & view mode | `isStaff`, `viewMode` properties |

## 2) Single Source of Truth — or Not

**❌ NO SINGLE SOURCE OF TRUTH**

**Competing Sources:**
1. **App.jsx `hideNavigation`** - Primary controller, but incomplete patterns
2. **BigScreenNavbar internal checks** - Secondary filtering with different patterns  
3. **Navbar.jsx `hiddenNavPatterns`** - Legacy component with its own rules
4. **Route-level components** - Some routes have their own nav hiding logic

**The Problem:** App.jsx allows nav to render, but individual nav components can still hide themselves, creating inconsistent behavior.

## 3) Decision Flow (Order of Operations)

### On Route Change:
1. **`AppLayout` component re-renders** (inside BrowserRouter)
2. **`useLocation()` provides new pathname** in AppLayout
3. **App.jsx computes visibility flags:**
   ```jsx
   const isAuthPage = location.pathname === "/login" || ...
   const isGuestPage = isGuestRoute(location.pathname)
   const isPublicLandingPage = !isStaffRoute && (patterns...)
   const hideNavigation = isAuthPage || isGuestPage || isPublicLandingPage
   ```
4. **App.jsx conditionally renders nav components:**
   - `{isMobile && !hideNavigation && <MobileNavbar />}`
   - `{!isMobile && !hideNavigation && <BigScreenNavbar />}`
5. **Individual nav components make secondary decisions:**
   - BigScreenNavbar checks anonymous user + tournament patterns
   - Navbar.jsx checks `hiddenNavPatterns` array
6. **Nav items filtered by:**
   - `usePermissions()` → role-based access
   - `useNavigation()` → allowed nav items from localStorage

## 4) Route Classification Logic (Exactly What Matches What)

### App.jsx Route Patterns

#### Guest Routes (`GUEST_ROUTE_PATTERNS`)
Located: [App.jsx#L151-L175](../hotelmate-frontend/src/App.jsx#L151-L175)
```javascript
[
  "/:hotelIdentifier/room/:roomNumber/validate-pin",
  "/chat/:hotelSlug/messages/room/:room_number/validate-chat-pin", 
  "/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin",
  "/room_services/:hotelIdentifier/room/:roomNumber/menu",
  "/room_services/:hotelIdentifier/room/:roomNumber/breakfast",
  "/chat/:hotelSlug/conversations/:conversationId/messages/send",
  "/chat/:hotelSlug/conversations/:conversationId/messages",
  "/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber",
  "/guest-booking/:hotelSlug/restaurant/:restaurantSlug",
  "/good_to_know/:hotel_slug/:slug",
  "/games/quiz"
]
```

#### Staff Routes (`isStaffRoute`)
Located: [App.jsx#L201-L210](../hotelmate-frontend/src/App.jsx#L201-L210)
```javascript
location.pathname.startsWith("/staff/") ||
location.pathname === "/reception" ||
location.pathname.startsWith("/rooms") ||
location.pathname.startsWith("/bookings") ||
location.pathname.startsWith("/maintenance") ||
location.pathname.startsWith("/stock_tracker/") ||
location.pathname.startsWith("/games") ||
location.pathname.startsWith("/hotel_info/") ||
location.pathname.startsWith("/good_to_know_console/")
```

#### Public Landing Pages (`isPublicLandingPage`)
Located: [App.jsx#L212-L224](../hotelmate-frontend/src/App.jsx#L212-L224)
```javascript
!isStaffRoute && (
  location.pathname === "/" ||
  /^\/hotel\/[a-z0-9-]+$/.test(location.pathname) ||      // Public hotel pages
  /^\/[a-z0-9-]+$/.test(location.pathname) ||             // Hotel slug only
  /^\/[a-z0-9-]+\/book/.test(location.pathname) ||        // Booking forms
  /^\/[a-z0-9-]+\/my-bookings/.test(location.pathname) || // My bookings
  /^\/my-bookings/.test(location.pathname) ||             // Legacy my bookings
  /^\/booking\/confirmation\//.test(location.pathname) ||  // Confirmations
  /^\/booking\/payment\//.test(location.pathname) ||      // Payment pages
  location.pathname === "/staff/login"
)
```

#### BigScreenNavbar Hidden Patterns
Located: [BigScreenNavbar.jsx#L57-L62](../hotelmate-frontend/src/components/layout/BigScreenNavbar.jsx#L57-L62)
```javascript
const isMemoryMatchTournamentExact =
  /^\/games\/memory-match\/tournaments\/?$/.test(location.pathname) &&
  searchParams.get("hotel") === "hotel-killarney";

// Returns null if !user AND isMemoryMatchTournamentExact
```

#### Navbar.jsx Hidden Patterns  
Located: [Navbar.jsx#L56-L60](../hotelmate-frontend/src/components/layout/Navbar.jsx#L56-L60)
```javascript
const hiddenNavPatterns = [
  /^\/room_services\/[^/]+\/room\/[^/]+\/breakfast\/?$/,
  /^\/room_services\/[^/]+\/room\/[^/]+\/menu\/?$/,
  /^\/hotel_info\/[^/]+(\/[^/]+)?\/?$/,
];
```

### **🚨 The Bug: Why `/booking/hotel-killarney` Shows Staff Nav**

**Analysis:**
1. Path: `/booking/hotel-killarney`
2. **isAuthPage**: ❌ False (not login/register)
3. **isGuestRoute**: ❌ False (not in GUEST_ROUTE_PATTERNS)
4. **isStaffRoute**: ❌ False (doesn't start with /staff/, /rooms, etc.)
5. **isPublicLandingPage**: ❌ **FALSE** - This is the bug!

**The pattern `/^\/[a-z0-9-]+\/book/` only matches `/hotel-killarney/book`, NOT `/booking/hotel-killarney`**

6. **hideNavigation**: ❌ False (all conditions failed)
7. **Result**: Staff navigation renders

**Missing Pattern:** `/^\/booking\/[a-z0-9-]+/` should be added to `isPublicLandingPage`

## 5) Truth Table (Concrete Examples)

| Path | App.jsx hideNavigation | BigScreenNavbar rendered? | MobileNavbar rendered? | Final visible chrome |
|------|----------------------|-------------------------|----------------------|-------------------|
| `/booking/hotel-killarney` | ❌ false | ✅ YES | ✅ YES | 🚨 **STAFF NAV** (BUG) |
| `/booking/hotel-killarney/payment/success` | ✅ true | ❌ NO | ❌ NO | ✅ **NONE** |
| `/booking/confirmation/abc123` | ✅ true | ❌ NO | ❌ NO | ✅ **NONE** |
| `/hotel/hotel-killarney` | ✅ true | ❌ NO | ❌ NO | ✅ **NONE** |
| `/hotel-killarney` | ✅ true | ❌ NO | ❌ NO | ✅ **NONE** |
| `/hotel-killarney/book` | ✅ true | ❌ NO | ❌ NO | ✅ **NONE** |
| `/my-bookings` | ✅ true | ❌ NO | ❌ NO | ✅ **NONE** |
| `/login` | ✅ true | ❌ NO | ❌ NO | ✅ **NONE** |
| `/room_services/hotel-killarney/room/101/menu` | ✅ true | ❌ NO | ❌ NO | ✅ **NONE** |
| `/guest-booking/hotel-killarney/restaurant/main` | ✅ true | ❌ NO | ❌ NO | ✅ **NONE** |
| `/reception` | ❌ false | ✅ YES | ✅ YES | ✅ **STAFF NAV** |
| `/rooms` | ❌ false | ✅ YES | ✅ YES | ✅ **STAFF NAV** |
| `/staff/hotel-killarney/feed` | ❌ false | ✅ YES | ✅ YES | ✅ **STAFF NAV** |
| `/games/memory-match/tournaments?hotel=hotel-killarney` | ❌ false | ❌ NO (anonymous user) | ✅ YES | 🔀 **MIXED** (mobile shows, desktop hidden) |

## 6) Identify All Bugs / Edge Cases

### 🚨 Critical Bugs
1. **Staff nav leaking on booking pages**
   - `/booking/hotel-killarney` shows staff navigation
   - **Root cause:** Missing `/booking/` pattern in `isPublicLandingPage`

2. **Desktop/Mobile navigation inconsistency**  
   - Anonymous users on `/games/memory-match/tournaments?hotel=hotel-killarney`
   - BigScreenNavbar hides (good), MobileNavbar shows (bad)
   - **Root cause:** Different logic in BigScreenNavbar vs App.jsx

### ⚠️ Edge Cases
3. **Auth flicker during page load**
   - Navigation briefly shows before user context loads
   - **Root cause:** No loading state in navigation visibility logic

4. **Legacy Navbar.jsx still in codebase**
   - Contains different patterns than BigScreenNavbar/MobileNavbar
   - **Risk:** Could be accidentally rendered causing conflicting behavior

5. **Pattern maintenance burden**
   - Same route types defined in multiple places with different regex
   - **Risk:** Easy to miss patterns when adding new routes

### 🔍 Potential Issues
6. **Hotel slug validation inconsistency**
   - Some patterns use `[a-z0-9-]+`, others don't validate format
   - **Risk:** Could match unintended routes

7. **Query parameter handling**
   - Only BigScreenNavbar checks query params for special cases
   - **Risk:** Inconsistent behavior between nav components

## 7) Minimal Change Suggestions (No Implementation Yet)

### Strategy 1: Central Layout Mode Function
Create single `getLayoutMode(pathname, user, searchParams)` function that returns:
- `'hidden'` - No navigation 
- `'staff'` - Staff navigation
- `'guest'` - Guest navigation (if needed)

**Pros:** Single source of truth, easier testing
**Cons:** Requires refactoring all nav components

### Strategy 2: Route-Based Layout System  
Use React Router's layout routes with `handle` metadata:
```jsx
// Route configuration with layout metadata
{ path: '/booking/:hotelSlug', element: <BookingPage />, handle: { layout: 'public' } }
{ path: '/staff/*', element: <StaffLayout />, handle: { layout: 'staff' } }
```

**Pros:** Declarative, follows React Router patterns
**Cons:** Major restructuring required

### Strategy 3: Enhanced Pattern Consolidation (Recommended)
1. **Fix immediate bug:** Add `/booking/` pattern to `isPublicLandingPage`
2. **Consolidate patterns:** Move all route patterns to single config file
3. **Unify nav components:** Make BigScreenNavbar and MobileNavbar use same logic
4. **Remove legacy:** Delete unused Navbar.jsx component

**Pros:** Minimal changes, preserves existing architecture
**Cons:** Still multi-layered approach

---

## Immediate Next Steps
1. **🔥 HOTFIX:** Add `/^\/booking\/[a-z0-9-]+/` to `isPublicLandingPage` patterns
2. **🧪 TEST:** Verify `/booking/hotel-killarney` no longer shows staff nav
3. **🔍 AUDIT:** Check other potential pattern gaps in booking flows
4. **📋 PLAN:** Choose long-term strategy for navigation architecture

*Generated on December 16, 2025*