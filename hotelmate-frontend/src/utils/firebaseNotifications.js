// src/utils/firebaseNotifications.js
import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";
import api from "../services/api";

export async function requestFirebaseNotificationPermission() {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  
  try {
    // First, request notification permission
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('⚠️ Notification permission denied');
        return null;
      }
    }
    
    // Then get FCM token
    const currentToken = await getToken(messaging, { vapidKey });
    
    if (currentToken) {
      // Save FCM token to backend
      try {
        await api.post("staff/save-fcm-token/", { fcm_token: currentToken });
      } catch (backendError) {
        console.error("❌ Could not save FCM token to backend:", backendError.response?.data || backendError.message);
        // Don't throw - just log the error
      }
      
      return currentToken;
    } else {
      console.warn("⚠️ No registration token available.");
      return null;
    }
  } catch (err) {
    console.error("❌ Error retrieving FCM token:", err);
    // Don't throw - allow login to continue
    return null;
  }
}

// Listen for foreground push messages
export function listenForFirebaseMessages(callback) {
  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      callback(payload);
    });
    return unsubscribe;
  } catch (error) {
    console.error("❌ [FCM] Error setting up onMessage listener:", error);
    return () => {};
  }
}
