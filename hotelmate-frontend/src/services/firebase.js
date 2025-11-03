// Firebase configuration for web push notifications
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

// Your web app's Firebase configuration
// Get these values from Firebase Console -> Project Settings -> General -> Your apps -> Web app
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
let app;
let messaging;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Cloud Messaging
  // Check if messaging is supported in current browser
  if ('Notification' in window && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  } else {
    console.warn('Firebase messaging not supported in this browser');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export { app, messaging };
