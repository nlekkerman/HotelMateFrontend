export function usePermissions() {
  // Parse user object from localStorage safely
  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem("user"));
  } catch {
    storedUser = null;
  }

  const role = storedUser?.role?.toLowerCase(); // Normalize role string
  const isSuperUser = storedUser?.is_superuser;
  const allowedNavs = storedUser?.allowed_navs || [];
  const accessLevel = storedUser?.access_level;

  // 🎯 BACKEND AUTHORITATIVE: No client-side permission fixes
  // If payload is missing, treat as denied and force re-auth/refresh
  if (storedUser && !Array.isArray(allowedNavs)) {
    console.warn('⚠️ Invalid allowed_navs from backend, treating as empty array');
    // Don't auto-fix, let backend handle permission grants
  }

  // 🧹 CLEANUP: Fix malformed navigation items in localStorage  
  if (storedUser?.navigation_items) {
    const cleanNavItems = storedUser.navigation_items.filter(item => item && item.slug);
    if (cleanNavItems.length !== storedUser.navigation_items.length) {
      console.log('🧹 Cleaning up malformed navigation items in localStorage');
      const cleanedUser = {
        ...storedUser,
        navigation_items: cleanNavItems
      };
      localStorage.setItem('user', JSON.stringify(cleanedUser));
    }
  }

  // ✅ NEW: Check if user can access navigation by slug
  const canAccessNav = (slug) => {
    // 🛡️ DEFENSIVE: Handle undefined/null slug gracefully
    if (!slug) {
      console.warn(`🚨 canAccessNav: Received undefined/null slug, returning false`);
      return false;
    }
    
    if (!storedUser) {
      console.log(`🚫 canAccessNav(${slug}): No stored user`);
      return false;
    }
    
    // ⭐ Django superuser sees EVERYTHING (bypass all checks)
    if (isSuperUser) {
      // 🔇 REDUCED LOGGING: Only log first time or for specific debugging
      return true;
    }
    
    // Regular staff: check allowed_navs array
    const hasAccess = allowedNavs.includes(slug);
    // 🔇 REDUCED LOGGING: Only log when access is denied or for debugging specific slugs
    if (!hasAccess) {
      console.log(`🔍 canAccessNav(${slug}): Regular user - DENIED (allowed: ${allowedNavs.join(', ')})`);
    }
    return hasAccess;
  };

  // ✅ KEEP: Check access level for feature flags and role-based permissions
  const canAccess = (allowedRoles = []) => {
    if (!storedUser || !role) {
      return false;
    }
    if (isSuperUser) {
      return true;
    }
    const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
    return normalizedAllowedRoles.includes(role);
  };

  return { 
    canAccessNav,  // NEW: For navigation filtering by slug
    canAccess,     // EXISTING: For feature/button permissions by role
    allowedNavs,   // Expose for debugging/direct access
    accessLevel,   // Expose for UI logic
    isSuperUser    // Expose superuser flag
  };
}
