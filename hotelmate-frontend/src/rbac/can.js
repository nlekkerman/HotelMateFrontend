/**
 * RBAC consumer helpers — Phase 1.
 *
 * Source of truth: backend emits `user.rbac.<module>.actions.<action_key>` as a
 * boolean. The frontend MUST NOT derive action authority from role strings,
 * tier flags, `isAdmin`, or navigation visibility.
 *
 * All helpers fail closed (return false) when the user, the module, the actions
 * map, or the specific action key is missing.
 */

/**
 * Check whether a user is allowed to perform a single action on a module.
 *
 * @param {object|null|undefined} user    The authenticated user object.
 * @param {string} moduleName             Backend module key (e.g. "bookings").
 * @param {string} action                 Backend action key (e.g. "checkin").
 * @returns {boolean}
 */
export function can(user, moduleName, action) {
  if (!user || !moduleName || !action) return false;
  const moduleEntry = user?.rbac?.[moduleName];
  if (!moduleEntry || typeof moduleEntry !== 'object') return false;
  const actions = moduleEntry.actions;
  if (!actions || typeof actions !== 'object') return false;
  return actions[action] === true;
}

/**
 * Check whether a user is allowed to perform ANY of the given actions on a
 * module. Useful for surfaces guarded by a group of related permissions.
 *
 * @param {object|null|undefined} user
 * @param {string} moduleName
 * @param {string[]} actions
 * @returns {boolean}
 */
export function canAny(user, moduleName, actions = []) {
  if (!Array.isArray(actions) || actions.length === 0) return false;
  return actions.some((a) => can(user, moduleName, a));
}

/**
 * Check whether a user is allowed to perform ALL of the given actions on a
 * module.
 *
 * @param {object|null|undefined} user
 * @param {string} moduleName
 * @param {string[]} actions
 * @returns {boolean}
 */
export function canAll(user, moduleName, actions = []) {
  if (!Array.isArray(actions) || actions.length === 0) return false;
  return actions.every((a) => can(user, moduleName, a));
}
