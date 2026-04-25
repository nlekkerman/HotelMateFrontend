import { useAuth } from '@/context/AuthContext';
import { can, canAny, canAll } from './can';

/**
 * Declarative JSX wrapper for backend-driven RBAC gating.
 *
 * Renders `children` only when the authenticated user has authority to
 * perform the requested action(s) for `module`.
 *
 * Props:
 *   - module:    Backend module key (required).
 *   - action:    Single action key.
 *   - anyOf:     Array of action keys; passes if ANY are allowed.
 *   - allOf:     Array of action keys; passes if ALL are allowed.
 *   - fallback:  Optional element rendered when access is denied.
 *
 * Exactly one of `action`, `anyOf`, or `allOf` should be provided. If none are
 * provided the wrapper fails closed and renders the fallback (or nothing).
 *
 * Example:
 *   <Can module="bookings" action="cancel">
 *     <button onClick={cancel}>Cancel booking</button>
 *   </Can>
 */
export function Can({
  module: moduleName,
  action,
  anyOf,
  allOf,
  fallback = null,
  children,
}) {
  const { user } = useAuth();

  let allowed = false;
  if (action) {
    allowed = can(user, moduleName, action);
  } else if (Array.isArray(anyOf) && anyOf.length > 0) {
    allowed = canAny(user, moduleName, anyOf);
  } else if (Array.isArray(allOf) && allOf.length > 0) {
    allowed = canAll(user, moduleName, allOf);
  }

  if (!allowed) return fallback;
  return typeof children === 'function' ? children() : children;
}

export default Can;
