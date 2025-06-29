// public/firebase-messaging-sw.js

// ─── Firebase v8 compat for importScripts ───
importScripts(
  "https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js",
  "https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js"
);

// ─── Init your app ───
firebase.initializeApp({
  apiKey:           "AIzaSyCpulaN3zsh1Pxq76_jj69-Aok3We6nTX0",
  authDomain:       "hotel-mate-d878f.firebaseapp.com",
  projectId:        "hotel-mate-d878f",
  storageBucket:    "hotel-mate-d878f.appspot.com",
  messagingSenderId:"1020698338972",
  appId:            "1:1020698338972:web:8f73620e0b4073e128af59",
  measurementId:    "G-TDLZZY65P4"
});

const messaging = firebase.messaging();

// ─── Always handle raw push events ───
self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
    console.log("[SW] Push payload received:", payload);
  } catch (err) {
    console.warn('[SW] Could not decode push payload', err);
    return;
  }

  if (
    payload.notification &&
    ['room_service', 'stock_movement'].includes(payload.data?.type)
  ) {
    const { title, body } = payload.notification;
    console.log(`[SW] Showing ${payload.data.type} notification:`, title, body);

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/firebase-logo.png'
      })
    );
  } else {
    console.log("[SW] Ignored unknown notification type:", payload.data?.type);
  }
});

