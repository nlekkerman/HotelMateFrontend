// src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

// Firebase configuration - these are public identifiers, not secrets
// Only the VAPID key needs to be in environment variables
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
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

export { app, messaging };
