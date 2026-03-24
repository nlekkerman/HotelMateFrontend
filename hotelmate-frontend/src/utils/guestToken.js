/**
 * Centralized Guest Token Utility
 *
 * Single source of truth for resolving, persisting, and requiring
 * guest authentication tokens across all guest flows.
 *
 * Token priority:
 *   1. URL query param (?token=...)
 *   2. localStorage fallback (persisted from a previous page load)
 *
 * Usage:
 *   import { getGuestToken, requireGuestToken, persistGuestToken } from '@/utils/guestToken';
 */

const STORAGE_KEY = 'guest_token';

/**
 * Resolve the current guest token.
 *
 * @returns {string|null} Token string or null if unavailable.
 */
export function getGuestToken() {
  // 1. URL query param – highest priority (fresh link click)
  try {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) return urlToken;
  } catch {
    // SSR / non-browser – fall through
  }

  // 2. localStorage – survives page reloads
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Require a guest token — returns the token or null with a console warning.
 * Use this at the boundary of guest flows to catch missing tokens early.
 *
 * @param {string} [context='unknown'] - Caller description for the log message.
 * @returns {string|null} Token, or null if missing.
 */
export function requireGuestToken(context = 'unknown') {
  const token = getGuestToken();
  if (!token) {
    console.warn(`[GuestToken] Token required but missing (context: ${context})`);
  }
  return token;
}

/**
 * Persist the guest token to localStorage so it survives page reloads.
 * Call this once when a page first captures the token from the URL.
 *
 * @param {string} token - The guest token to store.
 */
export function persistGuestToken(token) {
  if (!token) return;
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch (e) {
    console.warn('[GuestToken] Failed to persist token:', e);
  }
}

/**
 * Clear the persisted guest token (e.g. on explicit logout / session end).
 */
export function clearGuestToken() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
