// src/utils/overviewLanding.js
// Pure-function landing decision — no React dependency.
import { OVERVIEW_MODULES } from '@/realtime/stores/overviewSignalsStore';

const SESSION_KEY = 'overview_redirected';

/**
 * Determine whether the user should be auto-redirected to Overview.
 *
 * @param {Object}   opts
 * @param {string[]} opts.effectiveNavs        - user's RBAC nav slugs
 * @param {Object}   opts.overviewSignals      - state from overviewSignalsStore
 * @param {boolean}  opts.hasRedirectedThisSession - from sessionStorage flag
 * @param {string}   opts.currentPath          - window.location.pathname
 * @param {string}   opts.hotelSlug            - current hotel slug (for building overview path)
 * @returns {boolean}
 */
export function shouldRedirectToOverview({
  effectiveNavs = [],
  overviewSignals = {},
  hasRedirectedThisSession = false,
  currentPath = '',
}) {
  // Already redirected this session — never again
  if (hasRedirectedThisSession) return false;

  // Already on overview or on a specific module page — skip
  if (currentPath.includes('/overview')) return false;

  // Must have at least one overview-eligible module in RBAC
  const allowedModules = OVERVIEW_MODULES.filter((m) => effectiveNavs.includes(m));
  if (allowedModules.length === 0) return false;

  // Check whether at least one allowed module has pending signals
  const hasPending = allowedModules.some((m) => {
    const sig = overviewSignals[m];
    return sig && sig.count > 0;
  });

  return hasPending;
}

/**
 * Mark that we've done the auto-redirect this session.
 */
export function markRedirectedThisSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch { /* private browsing */ }
}

/**
 * Check if we already auto-redirected this session.
 */
export function hasRedirectedThisSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}
