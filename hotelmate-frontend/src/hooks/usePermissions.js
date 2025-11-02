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

  // ✅ NEW: Check if user can access navigation by slug
  const canAccessNav = (slug) => {
    if (!storedUser) return false;
    
    // ⭐ Django superuser sees EVERYTHING (bypass all checks)
    if (isSuperUser) return true;
    
    // Regular staff: check allowed_navs array
    return allowedNavs.includes(slug);
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
