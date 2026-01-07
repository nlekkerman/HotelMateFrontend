// src/realtime/guestRealtimeClient.js
// Guest-only Pusher client for token-based authentication
// DO NOT use this for staff realtime - use realtimeClient.js instead

import Pusher from 'pusher-js';

// Configuration
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hotel-porter-d25ad83b12cf.herokuapp.com/api';

if (!PUSHER_KEY) {
  console.error('⚠️ [GuestRealtime] VITE_PUSHER_KEY not found in environment');
}

if (!PUSHER_CLUSTER) {
  console.error('⚠️ [GuestRealtime] VITE_PUSHER_CLUSTER not found in environment');
}

// Memoization: one Pusher instance per token
const pusherInstances = new Map();

/**
 * Get or create a Pusher client instance for a specific guest token
 * @param {string} token - Guest authentication token from URL
 * @param {Object} options - Additional options
 * @param {string} [options.authEndpoint] - Custom auth endpoint for private channels
 * @returns {Pusher} Pusher client instance
 */
export function getGuestPusherClient(token, options = {}) {
  if (!token) {
    console.warn('[GuestRealtime] No token provided for guest Pusher client');
    return null;
  }

  // Create cache key including auth endpoint to support different configurations
  const cacheKey = options.authEndpoint ? `${token}:${options.authEndpoint}` : token;

  // Return existing instance if already created for this token and auth config
  if (pusherInstances.has(cacheKey)) {
    return pusherInstances.get(cacheKey);
  }

  console.log('🔌 [GuestRealtime] Creating new Pusher instance for guest token', {
    hasAuthEndpoint: !!options.authEndpoint,
    authEndpoint: options.authEndpoint,
    tokenPreview: token ? token.substring(0, 10) + '...' : 'No token',
    pusherKey: PUSHER_KEY ? 'Set' : 'Missing',
    pusherCluster: PUSHER_CLUSTER ? PUSHER_CLUSTER : 'Missing'
  });

  // Create Pusher configuration
  const pusherConfig = {
    cluster: PUSHER_CLUSTER,
    encrypted: true,
    forceTLS: true,
  };

  // Add auth configuration for private channels if authEndpoint provided
  if (options.authEndpoint) {
    pusherConfig.authEndpoint = options.authEndpoint;
    pusherConfig.auth = {
      params: { token } // Send token as query param for guest auth
    };
    console.log('[GuestRealtime] Private channel auth configured:', {
      authEndpoint: options.authEndpoint,
      hasToken: !!token,
      tokenLength: token ? token.length : 0
    });
  } else {
    console.warn('⚠️ [GuestRealtime] No auth endpoint provided - private channels will fail');
  }

  // Create new Pusher instance for guest
  const pusher = new Pusher(PUSHER_KEY, pusherConfig);

  // Error handling
  pusher.connection.bind('error', function(err) {
    console.error('❌ [GuestRealtime] Pusher connection error:', {
      error: err,
      errorType: err?.type,
      errorMessage: err?.error?.message,
      data: err?.data
    });
  });

  pusher.connection.bind('connected', function() {
    console.log('✅ [GuestRealtime] Guest Pusher connected successfully', {
      socketId: pusher.connection.socket_id,
      state: pusher.connection.state
    });
  });

  pusher.connection.bind('disconnected', function() {
    console.log('🔌 [GuestRealtime] Guest Pusher disconnected', {
      previousSocketId: pusher.connection.socket_id
    });
  });

  // Store instance for reuse with the cache key
  pusherInstances.set(cacheKey, pusher);

  return pusher;
}

/**
 * Get guest realtime client with support for private channels
 * Main function to be used by the guest chat hook
 * @param {string} token - Guest token
 * @param {Object} options - Configuration options
 * @param {string} [options.authEndpoint] - Auth endpoint for private channels
 * @returns {Promise<Pusher>} Configured Pusher client
 */
export async function getGuestRealtimeClient(token, options = {}) {
  return getGuestPusherClient(token, options);
}

/**
 * Cleanup a guest Pusher instance when no longer needed
 * @param {string} token - Guest token to cleanup
 * @param {string} [authEndpoint] - Auth endpoint used for cache key
 */
export function disconnectGuestPusher(token, authEndpoint) {
  const cacheKey = authEndpoint ? `${token}:${authEndpoint}` : token;
  
  if (pusherInstances.has(cacheKey)) {
    const pusher = pusherInstances.get(cacheKey);
    pusher.disconnect();
    pusherInstances.delete(cacheKey);
    console.log('🔌 [GuestRealtime] Guest Pusher instance cleaned up for token');
  }
}

/**
 * Cleanup all guest Pusher instances
 */
export function disconnectAllGuestPushers() {
  pusherInstances.forEach((pusher, token) => {
    pusher.disconnect();
  });
  pusherInstances.clear();
  console.log('🔌 [GuestRealtime] All guest Pusher instances cleaned up');
}