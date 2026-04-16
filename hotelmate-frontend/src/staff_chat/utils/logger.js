/**
 * Logger utility for staff chat
 * All debug/info/warn functions are no-ops to eliminate console noise.
 * Error functions are preserved for real failure reporting.
 */

// Pusher/FCM specific logger
export const pusherLogger = {
  connection: () => {},
  channel: () => {},
  event: () => {},
  error: (message, error = null) => {
    console.error(`[Pusher Error] ${message}`, error || '');
  }
};

export const fcmLogger = {
  init: () => {},
  token: () => {},
  notification: () => {},
  error: (message, error = null) => {
    console.error(`[FCM Error] ${message}`, error || '');
  }
};

// General chat logger
export const chatLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: (message, error = null) => {
    console.error(`[Chat Error] ${message}`, error || '');
  }
};

// Export default logger
export default {
  pusher: pusherLogger,
  fcm: fcmLogger,
  chat: chatLogger
};
