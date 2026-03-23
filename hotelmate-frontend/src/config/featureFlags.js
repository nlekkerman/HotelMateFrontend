/**
 * Feature flags — central kill-switches for incremental rollouts.
 *
 * Set any flag to `false` to instantly disable the feature in prod
 * without a code change beyond this file.
 */

/** When true, ProtectedRoute enforces Layer 2 (permission / nav-slug checks). */
export const ENABLE_ROUTE_PERMISSIONS = true;
