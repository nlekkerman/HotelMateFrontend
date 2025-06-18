// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCpulaN3zsh1Pxq76_jj69-Aok3We6nTX0",
  authDomain: "hotel-mate-d878f.firebaseapp.com",
  projectId: "hotel-mate-d878f",
  storageBucket: "hotel-mate-d878f.appspot.com",
  messagingSenderId: "1020698338972",
  appId: "1:1020698338972:web:8f73620e0b4073e128af59",
  measurementId: "G-TDLZZY65P4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/firebase-logo.png' // Optional: set your own icon
  });
});
