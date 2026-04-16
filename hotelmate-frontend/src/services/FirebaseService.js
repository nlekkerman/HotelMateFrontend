import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase';
import api from './api';
import { showNotification, canShowNotifications } from '@/utils/notificationUtils';
import { getAuthUser } from '@/lib/authStore';


// VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

class FirebaseService {
  
  /**
   * Check if the browser supports notifications
   */
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator && messaging;
  }

  /**
   * Check current notification permission status
   */
  getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        return true;
      } else if (permission === 'denied') {
        return false;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM token and send to backend
   */
  async getFCMToken() {
    if (!this.isSupported()) {
      console.warn('FCM not supported');
      return null;
    }

    try {
      // Clear all Firebase IndexedDB data to force fresh initialization
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name?.includes('firebase')) {
          indexedDB.deleteDatabase(db.name);
        }
      }

      // Unregister old service workers and register fresh one
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of existingRegistrations) {
        if (registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
          await registration.unregister();
        }
      }

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      // Register service worker with updated configuration
      const registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
        { scope: '/', updateViaCache: 'none' }
      );
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get FCM token
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (currentToken) {
        // Save token to localStorage
        localStorage.setItem('fcm_token', currentToken);
        
        // Send token to backend
        await this.saveFCMTokenToBackend(currentToken);
        
        return currentToken;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      
      if (error.code === 'messaging/permission-blocked') {
        console.error('Notification permission is blocked. Please enable it in browser settings.');
      } else if (error.code === 'messaging/unsupported-browser') {
        console.error('This browser does not support push notifications.');
      }
      
      return null;
    }
  }

  /**
   * Save FCM token to backend
   */
  async saveFCMTokenToBackend(fcmToken) {
    try {
      // Get user object from authStore bridge (primary) with localStorage fallback
      // Fallback needed: saveFCMTokenToBackend can be called before React mounts
      const user = getAuthUser() || (() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
      })();
      if (!user) {
        console.error('❌ No user found. Cannot save FCM token to backend.');
        return;
      }

      const authToken = user.token;
      
      if (!authToken) {
        console.error('❌ No auth token found in user object. Cannot save FCM token to backend.');
        return;
      }

      const response = await api.post(
        '/staff/save-fcm-token/',
        { fcm_token: fcmToken }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error saving FCM token to backend:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  }

  /**
   * Set up foreground message listener (when app is open)
   */
  setupForegroundMessageListener(callback) {
    if (!this.isSupported()) {
      return () => {};
    }

    return onMessage(messaging, (payload) => {
      const notificationTitle = payload.notification?.title || 'New Notification';
      const notificationBody = payload.notification?.body || '';
      const notificationData = payload.data || {};

      // Show browser notification (even when app is in foreground)
      if (canShowNotifications()) {
        showNotification(notificationTitle, {
          body: notificationBody,
          icon: '/favicons/favicon.svg',
          data: notificationData,
          tag: notificationData.type || 'notification',
        }).then(notification => {
          if (notification && notification.onclick !== undefined) {
            notification.onclick = () => {
              window.focus();
              if (notification.close) notification.close();
              
              // Call custom callback if provided
              if (callback) {
                callback(payload);
              }
            };
          }
        }).catch(console.error);
      }

      // Also call callback for custom handling (e.g., update UI, show toast)
      if (callback) {
        callback(payload);
      }
    });
  }

  /**
   * Listen for messages from service worker (notification clicks)
   */
  setupServiceWorkerMessageListener(callback) {
    if (!('serviceWorker' in navigator)) {
      return () => {};
    }

    const handler = (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
        if (callback) {
          callback(event.data);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);

    // Return cleanup function
    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
    };
  }

  /**
   * Initialize FCM (request permission and get token)
   */
  async initialize() {
    if (!this.isSupported()) {
      console.warn('FCM not supported in this browser');
      return false;
    }

    // Check if permission is already granted
    const currentPermission = this.getPermissionStatus();
    
    if (currentPermission === 'granted') {
      // Permission already granted, get token
      await this.getFCMToken();
      this._startTokenRefreshCheck();
      return true;
    } else if (currentPermission === 'default') {
      // Permission not requested yet, request it
      const granted = await this.requestPermission();
      
      if (granted) {
        await this.getFCMToken();
        this._startTokenRefreshCheck();
        return true;
      }
    } else {
      // Permission denied
      console.warn('Notification permission is denied');
      return false;
    }

    return false;
  }

  /**
   * Periodically check if FCM token was rotated and re-save if changed.
   * Firebase v9 has no onTokenRefresh — getToken() returns the current
   * (possibly rotated) token, so we compare against the stored value.
   */
  _startTokenRefreshCheck() {
    // Check every 60 minutes
    if (this._tokenRefreshInterval) return;
    this._tokenRefreshInterval = setInterval(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const freshToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        const storedToken = localStorage.getItem('fcm_token');
        if (freshToken && freshToken !== storedToken) {
          localStorage.setItem('fcm_token', freshToken);
          await this.saveFCMTokenToBackend(freshToken);
        }
      } catch (err) {
        console.error('Token refresh check failed:', err);
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Delete FCM token (e.g., on logout)
   */
  async deleteFCMToken() {
    try {
      if (this._tokenRefreshInterval) {
        clearInterval(this._tokenRefreshInterval);
        this._tokenRefreshInterval = null;
      }
      localStorage.removeItem('fcm_token');
      
      // Optionally notify backend to remove token
      const user = getAuthUser() || (() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
      })();
      const authToken = user?.token;
      
      if (authToken) {
        await api.post(
          '/staff/save-fcm-token/',
          { fcm_token: null }
        );
      }
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  }

  /**
   * Show a test notification
   */
  async showTestNotification() {
    if (canShowNotifications()) {
      await showNotification('Test Notification', {
        body: 'FCM is working correctly!',
        icon: '/favicons/favicon.svg',
      });
    } else {
      console.warn('Cannot show test notification: permission not granted');
    }
  }
}

export default new FirebaseService();
