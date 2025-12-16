# UNIFIED LAYOUT + STAFF ROUTE ENFORCEMENT POLICY PLAN
## Truth Source Document

**Created:** December 16, 2025  
**Purpose:** Single authoritative policy system eliminating navigation leaks and permission gaps

---

## GOAL
Replace scattered navigation visibility and permission checks with ONE policy system controlling:
1. Layout chrome rendering (auth / guest / public / staff)
2. Staff route access enforcement (blocks manual URL entry) 
3. Navigation item visibility (derived from same access rules)

---

## TRUTH HIERARCHY

**Backend:** Security source of truth. All staff APIs must enforce authorization regardless of frontend routing.

**Frontend Policy:** UX/routing source of truth. Controls what pages/chrome render and which routes are reachable through the interface.

**Critical:** Frontend guards do not replace backend authorization. They prevent accidental access and improve UX, but backend endpoints remain the final security enforcement layer.

## PHASE 1: Layout Policy Foundation (Chrome Control)

### Create `src/policy/layoutPolicy.js`
```js
export function getLayoutMode(pathname) {
  // returns "auth" | "guest" | "public" | "staff"
}
```

**Implementation Rules:**
- Guest routes = current GUEST_ROUTE_PATTERNS from App.jsx
- Public routes = current isPublicLandingPage logic  
- Auth routes = login/register/staff-login patterns
- Everything else = "staff"

**CRITICAL FIX:** Treat `/booking/:hotelSlug` as PUBLIC (pattern: `^/booking/[a-z0-9-]+`)

### Update App.jsx
```js
const layoutMode = getLayoutMode(location.pathname);
const showStaffChrome = layoutMode === "staff";
```

App.jsx becomes the ONLY place deciding staff navbar/sidebar rendering.

### Create `src/policy/layoutPolicy.examples.js`
Test cases covering:
- `/booking/hotel-killarney` → `"public"`
- Guest routes → `"guest"`
- Auth routes → `"auth"` 
- Staff routes → `"staff"`

### Remove navbar visibility logic
Eliminate internal checks from BigScreenNavbar.jsx and MobileNavbar.jsx

---

## PHASE 2: Staff Access Control Policy (Block Manual URLs)

### Create `src/policy/staffAccessPolicy.js`
```js
export function canAccessStaffPath({ pathname, user }) {
  // returns { allowed, redirectTo?, reason? }
}
```

**Access Rules:**
1. No user or !user.is_staff → DENY
2. user.is_superuser → ALLOW ALL
3. Else: Map pathname to required allowed_navs slug
4. DENY if slug not in user.allowed_navs
5. DENY BY DEFAULT if no mapping exists

**Prefix-based mapping:**
- `/reception` → `"reception"`
- `/rooms` → `"rooms"`  
- `/staff/` → `"home"`
- `/bookings` → `"bookings"`
- `/maintenance` → `"maintenance"`
- `/stock_tracker` → `"stock_tracker"`
- etc.

### Access Level Gates (Admin-only routes)

**Superuser Bypass:** `user.is_superuser === true` bypasses all access level checks.

**Admin-only Routes:** Certain sensitive routes require `user.access_level === "super_staff_admin"`:
- `/staff/permissions` → Staff permission management (TODO: verify actual route)
- `/staff/admin` → Administrative functions (TODO: verify actual route)  
- `/staff/users` → User management (TODO: verify actual route)

**Enforcement:** Admin-level gates enforced in BOTH:
- Route guard (`canAccessStaffPath` function)
- Navigation visibility filtering

### Deny-by-Default Policy

**Unmapped Routes:** Staff routes without explicit mapping in prefix table are DENIED by default to prevent permission leaks.

**Migration Alternative:** Allow-with-logging is possible during gradual migration but carries security risk. Production systems should use deny-by-default.

---

## PHASE 3: Route Guard Implementation (Enforce Policy)

### Create `src/routing/StaffRouteGuard.jsx`
- Uses React Router Outlet pattern
- If layoutMode !== "staff" → allow through
- If staff: call canAccessStaffPath
- Deny → redirect to `/reception` with preserved state

### Apply to route tree
Wrap ALL staff routes in `<Route element={<StaffRouteGuard />}>`

### Preserve non-staff routes
Keep guest, public, auth routes outside guard

---

## PHASE 4: Navigation Policy Alignment (Single Source of Truth)

### Update useNavigation hook
Filter items using `canAccessStaffPath({pathname: item.path, user})`

### Remove legacy navbar logic
Eliminate regex-based visibility checks in navigation components

### Ensure navigation-route parity
Hidden nav items = blocked routes (no gaps)

---

## ACCEPTANCE CRITERIA

✅ `/booking/:hotelSlug` never shows staff chrome  
✅ Public and guest routes never render staff navbar  
✅ Manual URL entry to forbidden staff routes is blocked  
✅ Superusers can access everything  
✅ One policy system governs layout, routes, and nav visibility  

---

## IMPLEMENTATION ORDER

1. Phase 1: Layout classifier + App.jsx integration
2. Phase 2: Staff access policy creation
3. Phase 3: Route guard implementation + route tree updates
4. Phase 4: Navigation filtering alignment + cleanup

**Note:** Each phase must be completed and verified before proceeding to next phase.

---

## CURRENT ISSUES TO FIX

### Critical Bug
- `/booking/hotel-killarney` incorrectly shows staff navigation instead of public layout
- Root cause: Missing pattern in `isPublicLandingPage` logic

### Architecture Problems
- Layout mode determination scattered across App.jsx, BigScreenNavbar.jsx, MobileNavbar.jsx
- Navigation permissions don't enforce route access (users can manually type forbidden URLs)
- Duplicate route pattern matching across components
- No single source of truth for layout decisions

### Permission Gaps
- Navigation items can be hidden while routes remain accessible
- Staff routes lack access level enforcement beyond basic authentication
- Manual URL entry bypasses navigation-based permission checks

---

## AUDIT CHECKLIST

After implementation, verify:

**Layout Policy:**
- [ ] No pathname/regex hiding remains inside Navbar components (BigScreenNavbar.jsx, MobileNavbar.jsx)
- [ ] App.jsx is the only decider of staff chrome rendering using `layoutMode`
- [ ] `/booking/:hotelSlug` always classified as public (never shows staff navigation)

**Route Enforcement:**
- [ ] StaffRouteGuard wraps all staff routes in route tree
- [ ] `canAccessStaffPath` used for both route enforcement and navigation filtering
- [ ] Manual URL entry to forbidden staff routes properly blocked and redirected

**Security Integration:**
- [ ] Backend endpoints used by staff pages enforce permissions server-side
- [ ] Frontend policy complements (not replaces) backend authorization
- [ ] Admin-level routes gated by access level in addition to navigation permissions

**System Integrity:**
- [ ] Navigation visibility exactly matches route accessibility (no gaps)
- [ ] Deny-by-default policy prevents access to unmapped staff routes
- [ ] Single source of truth achieved (no scattered permission logic)