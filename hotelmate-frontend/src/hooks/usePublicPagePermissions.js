import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCan } from '@/rbac';

/**
 * usePublicPagePermissions — gates public-hotel-page edit controls via the
 * canonical RBAC contract. NO tier / access_level / isAdmin.
 *
 * Business rules:
 *  1. User must be authenticated staff (same `isStaff` derivation as AuthContext).
 *  2. The page's hotel_slug must match `user.hotel_slug` (multi-tenant isolation).
 *  3. User must hold the `public_page.edit` action key.
 *
 * TODO(backend-rbac): backend `MODULE_POLICY` does not yet expose a
 * `public_page` module / `edit` action. Until it does, edit access is
 * fail-closed. See RBAC_MISSING_BACKEND_POLICY_KEYS.md. Do NOT reintroduce
 * isAdmin / role / tier / access_level fallbacks.
 *
 * @param {string} pageHotelSlug — slug of the hotel whose public page is being viewed
 */
export function usePublicPagePermissions(pageHotelSlug) {
  const { user, isStaff } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const { can } = useCan();
  const hasEditAccess = false;

  return useMemo(() => {
    const isOwnHotel = Boolean(
      user && pageHotelSlug && user.hotel_slug === pageHotelSlug,
    );

    const canEditPublicPage = Boolean(isStaff && isOwnHotel && hasEditAccess);

    return { isOwnHotel, hasEditAccess, canEditPublicPage };
  }, [user, pageHotelSlug, isStaff, hasEditAccess]);
}
