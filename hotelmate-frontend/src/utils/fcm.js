import { messaging } from '../firebase';
import { getToken } from 'firebase/messaging';

// VAPID key from environment variables
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Request FCM permission and get the device token
 * @returns {Promise<string|null>} FCM token or null if failed
 */
export const requestFCMPermission = async () => {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return null;
    }

    // Register service worker with correct path for dev/prod
    const swPath =
      window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.')
        ? '/firebase-messaging-sw.js'
        : 'https://hotelsmates.com/firebase-messaging-sw.js';
    const registration = await navigator.serviceWorker.register(swPath);
    console.log('✅ Service worker registered:', registration);

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.log('❌ No registration token available');
        return null;
      }
    } else {
      console.log('❌ Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM permission:', error);
    return null;
  }
};
