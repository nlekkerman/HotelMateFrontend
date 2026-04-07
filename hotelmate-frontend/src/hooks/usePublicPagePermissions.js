import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * usePublicPagePermissions — reuses the existing staff auth model
 * (useAuth + usePermissions) to determine if the current user can
 * see editing / management controls on a public hotel page.
 *
 * Business rules:
 *  1. User must be authenticated staff (same `isStaff` derivation as AuthContext).
 *  2. The page's hotel_slug must match `user.hotel_slug` (multi-tenant isolation).
 *  3. User must have an admin-level access_level (staff_admin / super_staff_admin)
 *     or be a superuser — same gate used by Settings and other staff-only management pages.
 *
 * @param {string} pageHotelSlug — slug of the hotel whose public page is being viewed
 */
export function usePublicPagePermissions(pageHotelSlug) {
  const { user, isStaff } = useAuth();
  const { canAccess, isSuperUser } = usePermissions();

  return useMemo(() => {
    const isOwnHotel = Boolean(
      user && pageHotelSlug && user.hotel_slug === pageHotelSlug,
    );

    // Mirrors the access gate used by staff settings / section-editor pages:
    // superuser OR access_level in [staff_admin, super_staff_admin].
    const hasEditAccess =
      isSuperUser || canAccess(['staff_admin', 'super_staff_admin']);

    const canEditPublicPage = Boolean(isStaff && isOwnHotel && hasEditAccess);

    return { isOwnHotel, hasEditAccess, canEditPublicPage };
  }, [user, pageHotelSlug, isStaff, isSuperUser, canAccess]);
}
