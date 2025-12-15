import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase';
import api from './api';
import { showNotification, canShowNotifications } from '@/utils/notificationUtils';


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
        console.log('Notification permission granted');
        return true;
      } else if (permission === 'denied') {
        console.log('Notification permission denied');
        return false;
      } else {
        console.log('Notification permission dismissed');
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
          console.log('🗑️ Deleting Firebase database:', db.name);
          indexedDB.deleteDatabase(db.name);
        }
      }

      // Unregister old service workers and register fresh one
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of existingRegistrations) {
        if (registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
          console.log('🔄 Unregistering old service worker...');
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
      
      console.log('✅ Service Worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get FCM token
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (currentToken) {
        console.log('FCM Token obtained:', currentToken);
        
        // Save token to localStorage
        localStorage.setItem('fcm_token', currentToken);
        
        // Send token to backend
        await this.saveFCMTokenToBackend(currentToken);
        
        return currentToken;
      } else {
        console.log('No FCM token available. Request permission first.');
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
      console.log('💾 Attempting to save FCM token to backend...');
      console.log('📝 Token:', fcmToken.substring(0, 50) + '...');
      
      // Get user object from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        console.error('❌ No user found in localStorage. Cannot save FCM token to backend.');
        return;
      }

      const user = JSON.parse(userStr);
      console.log('👤 User found:', user.username, 'ID:', user.staff_id);
      
      const authToken = user.token;
      
      if (!authToken) {
        console.error('❌ No auth token found in user object. Cannot save FCM token to backend.');
        return;
      }

      console.log('🔑 Auth token found:', authToken.substring(0, 20) + '...');
      console.log('🌐 Using centralized api service for FCM token');

      const response = await api.post(
        '/staff/save-fcm-token/',
        { fcm_token: fcmToken }
      );

      console.log('✅ FCM token saved to backend successfully!');
      console.log('📊 Response:', response.data);
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
      console.log('Foreground message received:', payload);
      
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
        console.log('Notification clicked, routing to:', event.data.route);
        
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
      return true;
    } else if (currentPermission === 'default') {
      // Permission not requested yet, request it
      const granted = await this.requestPermission();
      
      if (granted) {
        await this.getFCMToken();
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
   * Delete FCM token (e.g., on logout)
   */
  async deleteFCMToken() {
    try {
      localStorage.removeItem('fcm_token');
      console.log('FCM token removed from localStorage');
      
      // Optionally notify backend to remove token
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const authToken = user.token;
        
        if (authToken) {
          await api.post(
            '/staff/save-fcm-token/',
            { fcm_token: null }
          );
        }
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
