// src/realtime/realtimeClient.js
import Pusher from 'pusher-js';

let pusherInstance = null;

/**
 * Get the singleton Pusher client instance
 * Reuses existing configuration from the app
 * @returns {Pusher} Singleton Pusher instance
 */
export function getPusherClient() {
  if (!pusherInstance) {
    const appKey = import.meta.env.VITE_PUSHER_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;

    if (!appKey) {
      throw new Error('VITE_PUSHER_KEY environment variable is required');
    }

    // Get token from user object in localStorage
    const getAuthToken = () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.token || null;
      } catch {
        return null;
      }
    };

    const authToken = getAuthToken();
    console.log('🔧 [realtimeClient] Initializing Pusher with config:', {
      appKey,
      cluster: cluster || 'eu',
      authEndpoint: `${import.meta.env.VITE_API_BASE_URL}/pusher/auth`,
      hasToken: !!authToken
    });

    pusherInstance = new Pusher(appKey, {
      cluster: cluster || 'eu',
      encrypted: true,
      forceTLS: true,
      authEndpoint: `${import.meta.env.VITE_API_BASE_URL}/pusher/auth`,
      auth: {
        headers: {
          'Authorization': `Token ${authToken}`  // Use 'Token' prefix to match backend
        }
      }
    });

    // Global connection logging
    pusherInstance.connection.bind('connected', () => {
      console.log('🔗 Pusher connected via realtimeClient');
    });

    pusherInstance.connection.bind('disconnected', () => {
      console.log('🔌 Pusher disconnected via realtimeClient');
    });

    pusherInstance.connection.bind('error', (err) => {
      console.error('❌ Pusher connection error:', err);
    });
  }

  return pusherInstance;
}

/**
 * Get the current connection state
 * @returns {string} Connection state
 */
export function getConnectionState() {
  return pusherInstance ? pusherInstance.connection.state : 'unavailable';
}