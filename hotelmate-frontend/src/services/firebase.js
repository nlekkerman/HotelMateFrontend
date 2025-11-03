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

// Log config to debug (remove in production)
console.log('🔥 Firebase Config Check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  hasStorageBucket: !!firebaseConfig.storageBucket,
  hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
  hasAppId: !!firebaseConfig.appId,
  projectId: firebaseConfig.projectId,
});

// Initialize Firebase
let app;
let messaging;

try {
  // Check if all required config values are present
  const missingValues = [];
  if (!firebaseConfig.apiKey) missingValues.push('apiKey');
  if (!firebaseConfig.authDomain) missingValues.push('authDomain');
  if (!firebaseConfig.projectId) missingValues.push('projectId');
  if (!firebaseConfig.storageBucket) missingValues.push('storageBucket');
  if (!firebaseConfig.messagingSenderId) missingValues.push('messagingSenderId');
  if (!firebaseConfig.appId) missingValues.push('appId');

  if (missingValues.length > 0) {
    throw new Error(`Missing Firebase config values: ${missingValues.join(', ')}`);
  }

  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');
  
  // Initialize Firebase Cloud Messaging
  // Check if messaging is supported in current browser
  if ('Notification' in window && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
    console.log('✅ Firebase messaging initialized');
  } else {
    console.warn('⚠️ Firebase messaging not supported in this browser');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
  console.error('Firebase config:', firebaseConfig);
}

export { app, messaging };
