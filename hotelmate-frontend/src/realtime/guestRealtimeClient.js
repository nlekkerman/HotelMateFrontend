// src/realtime/guestRealtimeClient.js
// Guest-only Pusher client — LOCKED BACKEND CONTRACT
//
// All config (key, cluster, authEndpoint) comes from the bootstrap response.
// DO NOT use env vars as source of truth for guest chat realtime.
// DO NOT use this for staff realtime — use realtimeClient.js instead.

import Pusher from 'pusher-js';

// Memoization: one Pusher instance per chat session
const pusherInstances = new Map();

/**
 * Create or retrieve a Pusher client using backend-provided config.
 *
 * @param {Object} config
 * @param {string} config.key          - Pusher app key from bootstrap pusher.key
 * @param {string} config.cluster      - Pusher cluster from bootstrap pusher.cluster
 * @param {string} config.authEndpoint - Full auth URL from bootstrap pusher.auth_endpoint
 * @param {string} config.chatSession  - chat_session from bootstrap (for X-Guest-Chat-Session header)
 * @returns {Pusher} Pusher client instance
 */
export function createGuestPusherClient({ key, cluster, authEndpoint, chatSession }) {
  if (!chatSession) {
    throw new Error('[GuestRealtime] Cannot create Pusher client: chatSession is missing');
  }
  if (!key) {
    throw new Error('[GuestRealtime] Cannot create Pusher client: pusher.key is missing');
  }
  if (!cluster) {
    throw new Error('[GuestRealtime] Cannot create Pusher client: pusher.cluster is missing');
  }
  if (!authEndpoint) {
    throw new Error('[GuestRealtime] Cannot create Pusher client: pusher.auth_endpoint is missing');
  }

  // Cache key: session + auth endpoint
  const cacheKey = `${chatSession}:${authEndpoint}`;

  if (pusherInstances.has(cacheKey)) {
    return pusherInstances.get(cacheKey);
  }

  console.log('[GuestRealtime] Creating Pusher instance from backend config', {
    cluster,
    authEndpoint,
    sessionPreview: chatSession.substring(0, 10) + '...',
  });

  const pusher = new Pusher(key, {
    cluster,
    encrypted: true,
    forceTLS: true,
    authEndpoint,
    auth: {
      headers: { 'X-Guest-Chat-Session': chatSession },
    },
  });

  pusher.connection.bind('error', (err) => {
    console.error('[GuestRealtime] Pusher connection error:', err);
  });

  pusher.connection.bind('connected', () => {
    console.log('[GuestRealtime] Pusher connected', {
      socketId: pusher.connection.socket_id,
    });
  });

  pusher.connection.bind('disconnected', () => {
    console.log('[GuestRealtime] Pusher disconnected');
  });

  pusherInstances.set(cacheKey, pusher);
  return pusher;
}

/**
 * Cleanup a guest Pusher instance when no longer needed.
 * @param {string} chatSession
 * @param {string} authEndpoint
 */
export function disconnectGuestPusher(chatSession, authEndpoint) {
  const cacheKey = `${chatSession}:${authEndpoint}`;

  if (pusherInstances.has(cacheKey)) {
    pusherInstances.get(cacheKey).disconnect();
    pusherInstances.delete(cacheKey);
    console.log('[GuestRealtime] Guest Pusher instance cleaned up');
  }
}

/**
 * Cleanup ALL guest Pusher instances.
 */
export function disconnectAllGuestPushers() {
  pusherInstances.forEach((pusher) => pusher.disconnect());
  pusherInstances.clear();
  console.log('[GuestRealtime] All guest Pusher instances cleaned up');
}