import { useAuth } from '@/context/AuthContext';

/**
 * usePermissions — visibility-only primitives.
 *
 * AUTHORITY MUST NOT BE DERIVED FROM THIS HOOK.
 * For any action / button / handler / mutation, use:
 *   const { can } = useCan();
 *   can('<module>', '<action>');
 *
 * The only legitimate consumers of this hook are *navigation visibility*
 * surfaces (rendering nav links, filtering launcher items). It must never
 * gate destructive or state-changing operations.
 *
 * Removed (do NOT reintroduce):
 *   - role / role_slug / accessLevel / tier
 *   - isAdmin / isStaffAdmin / isSuperStaffAdmin / hasTier
 *   - canAccess([...])
 */
export function usePermissions() {
  const { user } = useAuth();

  const isSuperUser = !!user?.is_superuser;
  const effectiveNavs = user?.effective_navs || [];

  const hasNavAccess = (slug) => {
    if (!slug) return false;
    if (!user) return false;
    if (isSuperUser) return true;
    return effectiveNavs.includes(slug);
  };

  return {
    isSuperUser,
    effectiveNavs,
    hasNavAccess,
  };
}
