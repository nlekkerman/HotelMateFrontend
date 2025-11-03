// src/utils/firebaseNotifications.js
import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";
import api from "../services/api";

export async function requestFirebaseNotificationPermission() {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  
  try {
    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
      console.log("FCM Token:", currentToken);

      // Try to save FCM token to backend (don't fail if endpoint doesn't exist)
      try {
        await api.post("staff/save-fcm-token/", { fcm_token: currentToken });
        console.log("✅ FCM token saved to backend");
      } catch (backendError) {
        console.warn("⚠️ Could not save FCM token to backend (endpoint may not exist):", backendError.response?.data || backendError.message);
        // Don't throw - just log the warning
      }
      
      return currentToken;
    } else {
      console.warn("No registration token available.");
    }
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
    // Don't throw - allow login to continue
  }
}

// Listen for foreground push messages
export function listenForFirebaseMessages(callback) {
  return onMessage(messaging, callback);
}
