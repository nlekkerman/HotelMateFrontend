/**
 * Logger utility for staff chat
 * Only logs in development mode
 * Provides different log levels: debug, info, warn, error
 */

const isDevelopment = import.meta.env.DEV;

// Pusher/FCM specific logger
export const pusherLogger = {
  connection: (message, data = null) => {
    if (isDevelopment) {
      // console.log(`[Pusher Connection] ${message}`, data || '');
    }
  },
  channel: (message, data = null) => {
    if (isDevelopment) {
      // console.log(`[Pusher Channel] ${message}`, data || '');
    }
  },
  event: (message, data = null) => {
    if (isDevelopment) {
      // console.log(`[Pusher Event] ${message}`, data || '');
    }
  },
  error: (message, error = null) => {
    console.error(`[Pusher Error] ${message}`, error || '');
  }
};

export const fcmLogger = {
  init: (message, data = null) => {
    if (isDevelopment) {
      // console.log(`[FCM Init] ${message}`, data || '');
    }
  },
  token: (message, data = null) => {
    if (isDevelopment) {
      // console.log(`[FCM Token] ${message}`, data || '');
    }
  },
  notification: (message, data = null) => {
    if (isDevelopment) {
      // console.log(`[FCM Notification] ${message}`, data || '');
    }
  },
  error: (message, error = null) => {
    console.error(`[FCM Error] ${message}`, error || '');
  }
};

// General chat logger
export const chatLogger = {
  debug: (message, data = null) => {
    if (isDevelopment) {
      // console.log(`[Chat Debug] ${message}`, data || '');
    }
  },
  info: (message, data = null) => {
    if (isDevelopment) {
      // console.log(`[Chat] ${message}`, data || '');
    }
  },
  warn: (message, data = null) => {
    if (isDevelopment) {
      console.warn(`[Chat Warning] ${message}`, data || '');
    }
  },
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
