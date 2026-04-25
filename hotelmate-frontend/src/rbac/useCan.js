import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { can, canAny, canAll } from './can';

/**
 * Hook variant of the RBAC consumer helpers. Pulls the authenticated user from
 * AuthContext and returns stable callbacks plus a convenience boolean for the
 * single-action case.
 *
 * Usage:
 *   const { can, canAny, canAll } = useCan();
 *   if (can('bookings', 'cancel')) { ... }
 *
 *   // Single-action shorthand:
 *   const { allowed } = useCan('bookings', 'cancel');
 *
 * Backend is the only source of truth — these helpers read
 * `user.rbac.<module>.actions.<action>` directly and fail closed.
 *
 * @param {string} [moduleName] Optional module key for the shorthand boolean.
 * @param {string} [action]     Optional action key for the shorthand boolean.
 */
export function useCan(moduleName, action) {
  const { user } = useAuth();

  return useMemo(() => {
    const boundCan = (m, a) => can(user, m, a);
    const boundCanAny = (m, actions) => canAny(user, m, actions);
    const boundCanAll = (m, actions) => canAll(user, m, actions);
    const allowed =
      moduleName && action ? can(user, moduleName, action) : false;

    return {
      user,
      allowed,
      can: boundCan,
      canAny: boundCanAny,
      canAll: boundCanAll,
    };
  }, [user, moduleName, action]);
}

export default useCan;
