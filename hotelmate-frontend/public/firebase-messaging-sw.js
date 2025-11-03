// firebase-messaging-sw.js
// This service worker file must be in the public folder

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - same as in main app
const firebaseConfig = {
  apiKey: "AIzaSyCpulaN3zsh1Pxq76_jj69-Aok3We6nTX0",
  authDomain: "hotel-mate-d878f.firebaseapp.com",
  projectId: "hotel-mate-d878f",
  storageBucket: "hotel-mate-d878f.appspot.com",
  messagingSenderId: "1020698338972",
  appId: "1:1020698338972:web:8f73620e0b4073e128af59",
  measurementId: "G-TDLZZY65P4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
    tag: payload.data?.type || 'notification',
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  // Handle navigation based on notification type
  const notificationData = event.notification.data;
  let urlToOpen = '/';

  if (notificationData.type === 'room_service' || notificationData.type === 'room_service_order') {
    urlToOpen = '/room-service';
  } else if (notificationData.type === 'breakfast') {
    urlToOpen = '/breakfast';
  } else if (notificationData.type === 'stock_movement') {
    urlToOpen = '/stock-tracker';
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('[SW] Firebase messaging service worker loaded');
