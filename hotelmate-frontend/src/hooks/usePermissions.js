import { useAuth } from '@/context/AuthContext';

export function usePermissions() {
  const { user } = useAuth();

  const role = user?.role?.toLowerCase();
  const isSuperUser = user?.is_superuser;
  const allowedNavs = user?.allowed_navs || [];
  const accessLevel = user?.access_level;

  // Backend authoritative — if payload is missing, treat as denied
  if (user && !Array.isArray(user?.allowed_navs)) {
    console.warn('⚠️ Invalid allowed_navs from backend, treating as empty array');
  }

  const canAccessNav = (slug) => {
    if (!slug) {
      console.warn('canAccessNav: Received undefined/null slug, returning false');
      return false;
    }
    if (!user) return false;
    if (isSuperUser) return true;

    const hasAccess = allowedNavs.includes(slug);
    if (!hasAccess) {
      console.log(`canAccessNav(${slug}): DENIED (allowed: ${allowedNavs.join(', ')})`);
    }
    return hasAccess;
  };

  const canAccess = (allowedRoles = []) => {
    if (!user || !role) return false;
    if (isSuperUser) return true;
    return allowedRoles.map(r => r.toLowerCase()).includes(role);
  };

  return {
    canAccessNav,
    canAccess,
    allowedNavs,
    accessLevel,
    isSuperUser,
  };
}
