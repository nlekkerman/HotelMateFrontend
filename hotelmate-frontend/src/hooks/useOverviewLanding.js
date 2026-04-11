// src/hooks/useOverviewLanding.js
// Hook that checks overview signals and performs a one-time redirect to Overview
// when relevant unseen operational updates exist for the user's RBAC modules.
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOverviewSignalsState } from '@/realtime/stores/overviewSignalsStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';
import {
  shouldRedirectToOverview,
  markRedirectedThisSession,
  hasRedirectedThisSession as checkRedirected,
} from '@/utils/overviewLanding';

/**
 * Call this hook once in the feed/landing component.
 * It will navigate to `/staff/:hotelSlug/overview` at most once per session
 * when pending operational signals exist for the user's allowed modules.
 *
 * @param {{ enabled?: boolean }} opts
 */
export function useOverviewLanding({ enabled = true } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { effectiveNavs } = usePermissions();
  const overviewSignals = useOverviewSignalsState();
  const didCheck = useRef(false);

  useEffect(() => {
    if (!enabled || didCheck.current) return;

    // Wait until we have user data and signals provider is ready
    if (!user || !effectiveNavs || effectiveNavs.length === 0) return;

    const hotelSlug = user?.hotel_slug || user?.hotel?.slug;
    if (!hotelSlug) return;

    didCheck.current = true;

    const redirect = shouldRedirectToOverview({
      effectiveNavs,
      overviewSignals,
      hasRedirectedThisSession: checkRedirected(),
      currentPath: location.pathname,
    });

    if (redirect) {
      markRedirectedThisSession();
      navigate(`/staff/${hotelSlug}/overview`, { replace: true });
    }
  }, [enabled, user, effectiveNavs, overviewSignals, location.pathname, navigate]);
}
