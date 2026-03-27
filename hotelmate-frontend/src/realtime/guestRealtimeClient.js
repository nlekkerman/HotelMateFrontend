// src/realtime/guestRealtimeClient.js
// Guest-only Pusher client for session/grant-based authentication
// DO NOT use this for staff realtime - use realtimeClient.js instead

import Pusher from 'pusher-js';

// Configuration
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER;

if (!PUSHER_KEY) {
  console.error('⚠️ [GuestRealtime] VITE_PUSHER_KEY not found in environment');
}

if (!PUSHER_CLUSTER) {
  console.error('⚠️ [GuestRealtime] VITE_PUSHER_CLUSTER not found in environment');
}

// Memoization: one Pusher instance per chat session
const pusherInstances = new Map();

/**
 * Get or create a Pusher client instance for a specific guest chat session
 * @param {string} chatSession - Chat session/grant returned by getContext bootstrap
 * @param {Object} options - Additional options
 * @param {string} [options.authEndpoint] - Custom auth endpoint for private channels
 * @returns {Pusher} Pusher client instance
 */
export function getGuestPusherClient(chatSession, options = {}) {
  if (!chatSession) {
    console.warn('[GuestRealtime] No chat session provided for guest Pusher client');
    return null;
  }

  // Create cache key including auth endpoint to support different configurations
  const cacheKey = options.authEndpoint ? `${chatSession}:${options.authEndpoint}` : chatSession;

  // Return existing instance if already created for this session and auth config
  if (pusherInstances.has(cacheKey)) {
    return pusherInstances.get(cacheKey);
  }

  console.log('🔌 [GuestRealtime] Creating new Pusher instance for guest chat session', {
    hasAuthEndpoint: !!options.authEndpoint,
    authEndpoint: options.authEndpoint,
    sessionPreview: chatSession ? chatSession.substring(0, 10) + '...' : 'No session',
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
      headers: { 'X-Guest-Chat-Session': chatSession }
    };
    console.log('[GuestRealtime] Private channel auth configured:', {
      authEndpoint: options.authEndpoint,
      hasSession: !!chatSession,
      sessionLength: chatSession ? chatSession.length : 0
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
 * @param {string} chatSession - Chat session/grant from bootstrap
 * @param {Object} options - Configuration options
 * @param {string} [options.authEndpoint] - Auth endpoint for private channels
 * @returns {Promise<Pusher>} Configured Pusher client
 */
export async function getGuestRealtimeClient(chatSession, options = {}) {
  return getGuestPusherClient(chatSession, options);
}

/**
 * Cleanup a guest Pusher instance when no longer needed
 * @param {string} chatSession - Chat session used for cache key
 * @param {string} [authEndpoint] - Auth endpoint used for cache key
 */
export function disconnectGuestPusher(chatSession, authEndpoint) {
  const cacheKey = authEndpoint ? `${chatSession}:${authEndpoint}` : chatSession;
  
  if (pusherInstances.has(cacheKey)) {
    const pusher = pusherInstances.get(cacheKey);
    pusher.disconnect();
    pusherInstances.delete(cacheKey);
    console.log('🔌 [GuestRealtime] Guest Pusher instance cleaned up for session');
  }
}

/**
 * Cleanup all guest Pusher instances
 */
export function disconnectAllGuestPushers() {
  pusherInstances.forEach((pusher) => {
    pusher.disconnect();
  });
  pusherInstances.clear();
  console.log('🔌 [GuestRealtime] All guest Pusher instances cleaned up');
}