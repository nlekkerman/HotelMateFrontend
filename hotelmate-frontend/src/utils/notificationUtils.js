/**
 * Cross-platform notification utility
 * Handles the difference between main thread and service worker notification APIs
 */

/**
 * Show a notification that works both in main thread and service worker context
 * @param {string} title - Notification title
 * @param {object} options - Notification options (icon defaults to /favicons/favicon.svg if not provided)
 * @returns {Promise<Notification|void>} - The notification instance or void for service worker
 */
export async function showNotification(title, options = {}) {
  // Set default icon if not provided
  if (!options.icon) {
    options.icon = '/favicons/favicon.svg';
  }
  // Check if notifications are supported and permitted
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.warn("Notifications not supported or not permitted");
    return;
  }

  try {
    // Check if we're in a service worker context
    if (typeof self !== 'undefined' && self.registration) {
      // Use service worker registration to show notification
      return await self.registration.showNotification(title, options);
    }
    
    // Check if service worker is available and registered
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.active) {
          // Use service worker to show notification (better for mobile)
          return await registration.showNotification(title, options);
        }
      } catch (swError) {
        console.warn("Service worker notification failed, falling back to main thread:", swError);
      }
    }
    
    // Fallback to main thread notification
    return new Notification(title, options);
    
  } catch (error) {
    console.error("Failed to show notification:", error);
    
    // Final fallback - try main thread notification
    try {
      return new Notification(title, options);
    } catch (fallbackError) {
      console.error("All notification methods failed:", fallbackError);
    }
  }
}

/**
 * Request notification permission if not already granted
 * @returns {Promise<string>} - Permission status
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return "denied";
  }
}

/**
 * Check if notifications are available and permitted
 * @returns {boolean}
 */
export function canShowNotifications() {
  return "Notification" in window && Notification.permission === "granted";
}