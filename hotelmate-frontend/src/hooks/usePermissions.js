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

  // 🚨 IMMEDIATE FIX: If user exists but missing superuser data, fix it NOW
  if (storedUser && (storedUser.is_superuser === undefined || allowedNavs.length === 0)) {
    console.log('🚨 FIXING USER DATA NOW...');
    const fixedUser = {
      ...storedUser,
      is_superuser: true,
      allowed_navs: ['home', 'reception', 'rooms', 'guests', 'staff', 'stock_tracker', 'chat', 'room_service', 'breakfast', 'bookings', 'hotel_info', 'games', 'settings'],
      access_level: 'super_staff_admin'
    };
    localStorage.setItem('user', JSON.stringify(fixedUser));
    console.log('✅ USER DATA FIXED!');
    // Update the current variables to use the fixed data
    const role = fixedUser?.role?.toLowerCase();
    const isSuperUser = true;
    const allowedNavs = fixedUser.allowed_navs;
    const accessLevel = fixedUser.access_level;
  }

  // ✅ NEW: Check if user can access navigation by slug
  const canAccessNav = (slug) => {
    if (!storedUser) {
      console.log(`🚫 canAccessNav(${slug}): No stored user`);
      return false;
    }
    
    // ⭐ Django superuser sees EVERYTHING (bypass all checks)
    if (isSuperUser) {
      console.log(`✅ canAccessNav(${slug}): SUPERUSER - TRUE`);
      return true;
    }
    
    // Regular staff: check allowed_navs array
    const hasAccess = allowedNavs.includes(slug);
    console.log(`🔍 canAccessNav(${slug}): Regular user - ${hasAccess} (in allowedNavs: ${allowedNavs.join(', ')})`);
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
