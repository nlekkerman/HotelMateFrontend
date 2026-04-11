import { useAuth } from '@/context/AuthContext';

export function usePermissions() {
  const { user } = useAuth();

  const role = user?.role_slug?.toLowerCase() || user?.role?.toLowerCase();
  const isSuperUser = !!user?.is_superuser;
  const accessLevel = user?.tier || user?.access_level;
  const effectiveNavs = user?.effective_navs || [];

  // Identity booleans
  const isSuperStaffAdmin = accessLevel === 'super_staff_admin';
  const isStaffAdmin = accessLevel === 'staff_admin';
  const isAdmin = isSuperUser || isSuperStaffAdmin || isStaffAdmin;

  // Tier check — prefers user.tier, falls back to user.access_level
  const hasTier = (t) => {
    if (!user) return false;
    if (isSuperUser) return true;
    return accessLevel === t;
  };

  // Nav/module access check
  const hasNavAccess = (slug) => {
    if (!slug) return false;
    if (!user) return false;
    if (isSuperUser) return true;
    return effectiveNavs.includes(slug);
  };

  // Department-role check (for action gating within pages)
  const canAccess = (allowedRoles = []) => {
    if (!user) return false;
    if (isSuperUser) return true;
    const normalized = allowedRoles.map(r => r.toLowerCase());
    if (role && normalized.includes(role)) return true;
    if (accessLevel && normalized.includes(accessLevel.toLowerCase())) return true;
    return false;
  };

  return {
    // Canonical exports
    isSuperUser,
    isSuperStaffAdmin,
    isStaffAdmin,
    isAdmin,
    hasTier,
    hasNavAccess,
    effectiveNavs,
    canAccess,
  };
}
