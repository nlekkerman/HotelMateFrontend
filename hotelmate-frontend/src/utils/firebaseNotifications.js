// src/utils/firebaseNotifications.js
import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";
import api from "../services/api";

export async function requestFirebaseNotificationPermission() {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  
  try {
    console.log('🔔 Requesting notification permission for staff...');
    
    // First, request notification permission
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      
      if (permission !== 'granted') {
        console.warn('⚠️ Notification permission denied');
        return null;
      }
    }
    
    // Then get FCM token
    console.log('🔔 Getting FCM token...');
    const currentToken = await getToken(messaging, { vapidKey });
    
    if (currentToken) {
      console.log("✅ FCM Token obtained:", currentToken.substring(0, 20) + '...');

      // Save FCM token to backend
      try {
        await api.post("staff/save-fcm-token/", { fcm_token: currentToken });
        console.log("✅ FCM token saved to backend for staff");
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
  console.log("🔥 [FCM] Setting up onMessage listener with messaging:", !!messaging);
  console.log("🔥 [FCM] Callback type:", typeof callback);
  
  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("🚨 [FCM] onMessage triggered! Raw payload:", payload);
      callback(payload);
    });
    console.log("✅ [FCM] onMessage listener set up successfully");
    return unsubscribe;
  } catch (error) {
    console.error("❌ [FCM] Error setting up onMessage listener:", error);
    return () => {};
  }
}
