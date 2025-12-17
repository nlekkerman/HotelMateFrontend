/**
 * Staff Access Policy - Phase 2 of Unified Layout System
 * 
 * This policy enforces staff route access based on backend-derived allowed_navs.
 * NO client-side permission grants - backend is the authoritative source.
 */

// Route prefix to required navigation slug mapping
// IMPORTANT: Slugs use underscores to match backend NavigationItem.slug format
const PATH_TO_NAV_MAPPING = [
  { 
    match: (pathname) => pathname === "/reception" || pathname.startsWith("/reception/"), 
    slug: "reception",
    description: "Reception desk operations"
  },
  { 
    match: (pathname) => pathname.startsWith("/rooms"), 
    slug: "rooms",
    description: "Room management and housekeeping"
  },
  { 
    match: (pathname) => pathname.startsWith("/bookings"), 
    slug: "bookings",
    description: "Restaurant and event bookings"
  },
  {
    match: (pathname) => pathname.includes("/room-bookings") || pathname.includes("/booking-management"),
    slug: "room-bookings",
    description: "Hotel room bookings and management"
  },
  { 
    match: (pathname) => pathname.startsWith("/maintenance"), 
    slug: "maintenance",
    description: "Maintenance and facilities management"
  },
  { 
    match: (pathname) => pathname.startsWith("/stock_tracker"), 
    slug: "stock_tracker", // Backend uses underscores
    description: "Inventory and stock management"
  },
  { 
    match: (pathname) => pathname.startsWith("/hotel_info"), 
    slug: "hotel_info", // Backend uses underscores
    description: "Hotel information management"
  },
  { 
    match: (pathname) => pathname.startsWith("/good_to_know_console"), 
    slug: "good_to_know", 
    description: "Guest information console"
  },
  { 
    match: (pathname) => pathname.startsWith("/games"), 
    slug: "games",
    description: "Entertainment and gaming systems"
  },
  { 
    match: (pathname) => pathname.startsWith("/staff/"), 
    slug: "home", // Staff dashboard/feed uses "home" slug
    description: "Staff dashboard and main feed"
  },
  {
    match: (pathname) => pathname.includes("/guests"),
    slug: "guests",
    description: "Guest management and services"
  },
  {
    match: (pathname) => pathname.includes("/restaurants"),
    slug: "restaurants", 
    description: "Restaurant management"
  },
  {
    match: (pathname) => pathname.includes("/room_services") && pathname.includes("/orders"),
    slug: "room_service", // Backend uses underscore
    description: "Room service orders management"
  },
  {
    match: (pathname) => pathname.includes("/breakfast"),
    slug: "breakfast",
    description: "Breakfast service management" 
  },
  {
    match: (pathname) => pathname.includes("/menus_management"),
    slug: "menus_management", // Backend uses underscore
    description: "Menu management system"
  },
  {
    match: (pathname) => pathname.includes("/attendance"),
    slug: "attendance",
    description: "Staff attendance tracking"
  },
  {
    match: (pathname) => pathname.includes("/department-roster"),
    slug: "department_roster", // Backend uses underscore
    description: "Department scheduling and roster"
  },
  {
    match: (pathname) => pathname.includes("/enhanced-attendance"),
    slug: "management_analytics", // Backend uses underscore
    description: "Management analytics and reports"
  },
  {
    match: (pathname) => pathname.includes("/room-bookings"),
    slug: "room_bookings", // Backend uses underscore
    description: "Room booking management"
  },
  {
    match: (pathname) => pathname.includes("/chat"),
    slug: "chat",
    description: "Staff and guest chat systems"
  },
];

// Admin-only route prefixes requiring super_staff_admin access level
const ADMIN_ONLY_ROUTES = [
  {
    match: (pathname) => pathname.includes("/settings") && pathname.includes("/staff/"),
    requiredLevel: "super_staff_admin",
    description: "Hotel settings and configuration"
  },
  {
    match: (pathname) => pathname.includes("/permissions"),
    requiredLevel: "super_staff_admin", 
    description: "Staff permission management"
  },
  // TODO: Add more admin routes as they are identified
];

/**
 * Determines if a user can access a staff route
 * @param {Object} params - Access check parameters
 * @param {string} params.pathname - The pathname to check
 * @param {Object} params.user - User object from localStorage
 * @returns {Object} Access result with allowed, redirectTo, and reason
 */
export function canAccessStaffPath({ pathname, user }) {
  // No user or not staff -> DENY
  if (!user || !user.is_staff) {
    return {
      allowed: false,
      redirectTo: "/login",
      reason: "Authentication required: Not logged in as staff member"
    };
  }

  // Superuser bypass -> ALLOW ALL
  if (user.is_superuser) {
    return {
      allowed: true,
      reason: "Superuser access granted"
    };
  }

  // Check admin-level gates first
  for (const adminRoute of ADMIN_ONLY_ROUTES) {
    if (adminRoute.match(pathname)) {
      if (user.access_level !== adminRoute.requiredLevel) {
        return {
          allowed: false,
          redirectTo: "/reception", 
          reason: `Admin access required: ${adminRoute.description} requires ${adminRoute.requiredLevel}`
        };
      }
    }
  }

  // Find required navigation slug for this pathname
  const requiredNavSlug = findRequiredNavSlug(pathname);
  
  if (!requiredNavSlug) {
    // DENY BY DEFAULT for unmapped routes (security-first approach)
    return {
      allowed: false,
      redirectTo: "/reception",
      reason: `Unmapped route: ${pathname} not found in staff route mapping (deny by default)`
    };
  }

  // Check if user has the required navigation permission
  const allowedNavs = user.allowed_navs || [];
  if (!Array.isArray(allowedNavs)) {
    return {
      allowed: false,
      redirectTo: "/login",
      reason: "Invalid permission data: allowed_navs must be an array from backend"
    };
  }

  if (!allowedNavs.includes(requiredNavSlug)) {
    return {
      allowed: false,
      redirectTo: "/reception",
      reason: `Access denied: User lacks '${requiredNavSlug}' permission for ${pathname}`
    };
  }

  // Access granted
  return {
    allowed: true,
    reason: `Access granted: User has '${requiredNavSlug}' permission`
  };
}

/**
 * Find the required navigation slug for a pathname
 * @param {string} pathname - The pathname to analyze
 * @returns {string|null} Required nav slug or null if not found
 */
function findRequiredNavSlug(pathname) {
  for (const mapping of PATH_TO_NAV_MAPPING) {
    if (mapping.match(pathname)) {
      return mapping.slug;
    }
  }
  return null;
}

/**
 * Get all route mappings (for debugging/documentation)
 * @returns {Array} Array of route mapping objects
 */
export function getRouteMappings() {
  return PATH_TO_NAV_MAPPING.map(mapping => ({
    slug: mapping.slug,
    description: mapping.description,
    // Don't expose the match function, just describe it
    pattern: mapping.slug
  }));
}

/**
 * Validate that user permission structure matches expected backend format
 * @param {Object} user - User object to validate
 * @returns {Object} Validation result
 */
export function validateUserPermissions(user) {
  const issues = [];
  
  if (!user) {
    issues.push("User object is null or undefined");
  } else {
    if (typeof user.is_staff !== "boolean") {
      issues.push("is_staff should be boolean");
    }
    
    if (typeof user.is_superuser !== "boolean") {
      issues.push("is_superuser should be boolean"); 
    }
    
    if (!Array.isArray(user.allowed_navs)) {
      issues.push("allowed_navs should be array of strings");
    }
    
    if (user.access_level && !["regular_staff", "staff_admin", "super_staff_admin"].includes(user.access_level)) {
      issues.push(`Invalid access_level: ${user.access_level}`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}