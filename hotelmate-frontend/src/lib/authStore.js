/**
 * authStore — Module-level auth bridge for non-React code.
 *
 * RULE: setAuthUser() is WRITE-ONLY inside AuthProvider.
 * Every other consumer must use getAuthUser() (read-only).
 *
 * This exists so that code outside the React tree (axios interceptors,
 * Pusher auth headers, etc.) can read the current user without hitting
 * localStorage at runtime.
 */

let _user = null;

/** Read-only — safe to call anywhere. */
export function getAuthUser() {
  return _user;
}

/**
 * Write-only — called EXCLUSIVELY inside AuthProvider.
 * Do NOT import this in any other file.
 */
export function setAuthUser(user) {
  _user = user;
}
