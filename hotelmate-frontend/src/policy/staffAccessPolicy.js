/**
 * Staff Access Policy - Phase 2 of Unified Layout System
 * 
 * This policy enforces staff route access based on backend-derived effective_navs.
 * NO client-side permission grants - backend is the authoritative source.
 * NO super_staff_admin bypass - backend populates effective_navs for all tiers.
 */

// Route prefix to required RBAC module slug mapping.
// Slugs are the 13 canonical backend RBAC module slugs ONLY.
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

  // Admin Settings (must be before /staff/ catch-all)
  { match: (p) => p.includes("/settings") && p.includes("/staff/"), slug: "admin_settings" },
  { match: (p) => p.includes("/section-editor"), slug: "admin_settings" },
  { match: (p) => p.includes("/permissions"), slug: "admin_settings" },

  // Staff Home (catch-all for /staff/ prefix — MUST be last)
  { match: (p) => p.startsWith("/staff/"), slug: "home" },
];

/**
 * Determines if a user can access a staff route
 * @param {Object} params - Access check parameters
 * @param {string} params.pathname - The pathname to check
 * @param {Object} params.user - User object from localStorage
 * @param {string} [params.requiredSlug] - Explicit nav slug from route config (takes precedence over auto-mapping)
 * @returns {Object} Access result with allowed, redirectTo, and reason
 */
export function canAccessStaffPath({ pathname, user, requiredSlug }) {
  // Case A: NOT authenticated → redirect to login
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

  // Prefer explicit requiredSlug from route config over pathname auto-mapping
  const requiredNavSlug = requiredSlug || findRequiredNavSlug(pathname);
  
  if (!requiredNavSlug) {
    // Case B: Authenticated but unmapped route → redirect to staff entry point
    return {
      allowed: false,
      redirectTo: "/reception",
      reason: `Unmapped route: ${pathname} not found in staff route mapping (deny by default)`
    };
  }

  // Check if user has the required navigation permission
  const effectiveNavs = user.effective_navs || [];
  if (!Array.isArray(effectiveNavs)) {
    return {
      allowed: false,
      redirectTo: "/reception",
      reason: "Invalid permission data: effective_navs must be an array from backend"
    };
  }

  // Case B: Authenticated but lacks permission → redirect to staff entry point
  if (!effectiveNavs.includes(requiredNavSlug)) {
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
    
    if (!Array.isArray(user.effective_navs)) {
      issues.push("effective_navs should be array of strings");
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