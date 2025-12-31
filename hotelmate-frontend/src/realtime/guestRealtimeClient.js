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
 * @returns {Pusher} Pusher client instance
 */
export function getGuestPusherClient(token) {
  if (!token) {
    console.warn('[GuestRealtime] No token provided for guest Pusher client');
    return null;
  }

  // Return existing instance if already created for this token
  if (pusherInstances.has(token)) {
    return pusherInstances.get(token);
  }

  console.log('🔌 [GuestRealtime] Creating new Pusher instance for guest token');

  // Create new Pusher instance with guest auth endpoint
  const pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    encrypted: true,
    authEndpoint: `${API_BASE_URL}/pusher/guest-auth/?token=${token}`,
    auth: {
      headers: {
        // No Authorization header - token is in query params
      }
    }
  });

  // Error handling
  pusher.connection.bind('error', function(err) {
    console.error('❌ [GuestRealtime] Pusher connection error:', err);
  });

  pusher.connection.bind('connected', function() {
    console.log('✅ [GuestRealtime] Guest Pusher connected successfully');
  });

  pusher.connection.bind('disconnected', function() {
    console.log('🔌 [GuestRealtime] Guest Pusher disconnected');
  });

  // Store instance for reuse
  pusherInstances.set(token, pusher);

  return pusher;
}

/**
 * Cleanup a guest Pusher instance when no longer needed
 * @param {string} token - Guest token to cleanup
 */
export function disconnectGuestPusher(token) {
  if (pusherInstances.has(token)) {
    const pusher = pusherInstances.get(token);
    pusher.disconnect();
    pusherInstances.delete(token);
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