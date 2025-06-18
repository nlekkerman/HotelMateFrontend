// src/utils/firebaseNotifications.js
import { messaging } from "@/firebase"; // or "./firebase" if in src
import { getToken, onMessage } from "firebase/messaging";
import api from "@/services/api"; 


export async function requestFirebaseNotificationPermission(vapidKey) {
  try {
    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
      console.log("FCM Token:", currentToken);

      // Use your shared api instance (handles baseURL, auth headers, etc.)
      await api.post("notifications/save-fcm-token/", { fcm_token: currentToken });
      return currentToken;
    } else {
      console.warn("No registration token available.");
    }
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
  }
}

// Listen for foreground push messages
export function listenForFirebaseMessages(callback) {
  return onMessage(messaging, callback);
}
