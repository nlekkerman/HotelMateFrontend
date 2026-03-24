import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { canAccessStaffPath } from '@/policy/staffAccessPolicy';
import { ENABLE_ROUTE_PERMISSIONS } from '@/config/featureFlags';

/**
 * ProtectedRoute — Two-layer route guard.
 *
 * Layer 1 (always): user must be authenticated.
 * Layer 2 (mode="staff"): user must also have the required permission
 *         (gated by ENABLE_ROUTE_PERMISSIONS feature flag).
 *
 * @param {Object} props
 * @param {"auth"|"staff"} props.mode  - "auth" = login only, "staff" = login + permission. Default: "auth"
 * @param {string}  [props.requiredSlug]         - nav slug checked when mode="staff"
 * @param {string}  [props.unauthorizedRedirect] - where to send denied users (default "/reception")
 * @param {React.ReactNode} props.children
 */
const ProtectedRoute = ({
  children,
  mode = 'auth',
  requiredSlug,
  unauthorizedRedirect = '/reception',
}) => {
  const { user } = useAuth();
  const location = useLocation();

  // --- Layer 1: Authentication ---
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --- Layer 2: Authorization (staff mode only) ---
  if (mode === 'staff' && ENABLE_ROUTE_PERMISSIONS) {
    const result = canAccessStaffPath({
      pathname: location.pathname,
      user,
      requiredSlug,
    });

    if (!result.allowed) {
      console.warn('[PERMISSION DENIED]', {
        path: location.pathname,
        requiredSlug: requiredSlug || '(auto-mapped)',
        userId: user?.id,
        reason: result.reason,
      });
      return <Navigate to={result.redirectTo || unauthorizedRedirect} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
