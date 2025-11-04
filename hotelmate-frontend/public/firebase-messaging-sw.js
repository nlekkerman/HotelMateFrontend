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
  console.log('[SW] Notification data:', event.notification.data);
  event.notification.close();

  // Handle navigation based on notification type
  const notificationData = event.notification.data;
  let urlToOpen = '/';

  if (notificationData.type === 'new_chat_message') {
    // Chat message notification (both guest→staff and staff→guest)
    const hotelSlug = notificationData.hotel_slug;
    const conversationId = notificationData.conversation_id;
    const roomNumber = notificationData.room_number;
    const senderType = notificationData.sender_type;
    
    if (senderType === 'guest') {
      // Guest sent message → Staff receives notification
      // Navigate staff to: /chat/{hotel}/conversations/{id}/messages
      if (conversationId && hotelSlug) {
        urlToOpen = `/chat/${hotelSlug}/conversations/${conversationId}/messages`;
        console.log('[SW] Opening staff chat (guest sent message):', urlToOpen);
      }
    } else if (senderType === 'staff') {
      // Staff sent message → Guest receives notification
      // Navigate guest to: /chat/{hotel}/conversations/{id}/messages/send
      if (conversationId && hotelSlug && roomNumber) {
        urlToOpen = `/chat/${hotelSlug}/conversations/${conversationId}/messages/send`;
        console.log('[SW] Opening guest chat (staff sent message):', urlToOpen);
      }
    } else {
      console.warn('[SW] Unknown sender_type:', senderType);
    }
    
    if (!conversationId || !hotelSlug) {
      console.warn('[SW] Missing conversation data for chat notification:', notificationData);
    }
  } else if (notificationData.type === 'room_service' || notificationData.type === 'room_service_order') {
    urlToOpen = '/room-service';
  } else if (notificationData.type === 'breakfast') {
    urlToOpen = '/breakfast';
  } else if (notificationData.type === 'stock_movement') {
    urlToOpen = '/stock-tracker';
  } else {
    console.log('[SW] Unknown notification type:', notificationData.type);
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      console.log('[SW] Found', clientList.length, 'open windows');
      
      // Try to find an existing window with the target URL
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          console.log('[SW] Found matching window, focusing:', client.url);
          return client.focus();
        }
      }
      
      // If no matching window, try to focus any open window and navigate
      if (clientList.length > 0 && clientList[0].navigate) {
        console.log('[SW] Navigating existing window to:', urlToOpen);
        return clientList[0].navigate(urlToOpen).then(client => client.focus());
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        console.log('[SW] Opening new window:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('[SW] Firebase messaging service worker loaded');
