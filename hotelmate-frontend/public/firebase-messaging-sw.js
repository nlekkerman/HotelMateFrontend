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

// ─── Firebase background-message handler ───
messaging.setBackgroundMessageHandler(payload => {
  console.log("[SW] background message", payload);

  const data  = payload.data    || {};
  const title = data.title      || "HotelMate";
  const body  = data.body       || "ALEEEEE notification";
  const type  = data.type;

  // only show whitelisted types:
  if (["room_service","stock_movement","breakfast"].includes(type)) {
    return self.registration.showNotification(title, {
      body,
      icon: "/notifications-icon.png",
      data
    });
  }
  // else ignore
  return null;
});
