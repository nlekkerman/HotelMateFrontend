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

    pusherInstance = new Pusher(appKey, {
      cluster: cluster || 'mt1',
      encrypted: true,
      forceTLS: true,
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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