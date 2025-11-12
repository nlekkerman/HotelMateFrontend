/**
 * Staff Chat Configuration Checker
 * Validates that all required environment variables are present
 */

export const checkStaffChatConfig = () => {
  const config = {
    pusher: {
      key: import.meta.env.VITE_PUSHER_KEY,
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    },
    firebase: {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    },
    api: {
      url: import.meta.env.VITE_API_URL,
      baseUrl: import.meta.env.VITE_API_BASE_URL,
    }
  };

  const issues = [];

  // Check Pusher config
  if (!config.pusher.key) {
    issues.push('Missing VITE_PUSHER_KEY in environment variables');
  }
  if (!config.pusher.cluster) {
    issues.push('Missing VITE_PUSHER_CLUSTER in environment variables');
  }

  // Check Firebase config
  if (!config.firebase.vapidKey) {
    issues.push('Missing VITE_FIREBASE_VAPID_KEY in environment variables');
  }

  // Check API config
  if (!config.api.url) {
    issues.push('Missing VITE_API_URL in environment variables');
  }

  return {
    isValid: issues.length === 0,
    issues,
    config
  };
};

/**
 * Log configuration status (development only)
 */
export const logConfigStatus = () => {
  if (import.meta.env.DEV) {
    const { isValid, issues, config } = checkStaffChatConfig();
    
    if (isValid) {
      console.log('✅ Staff Chat Configuration Valid');
      console.log('Pusher:', config.pusher.key ? '✓' : '✗', config.pusher.cluster || 'N/A');
      console.log('Firebase:', config.firebase.vapidKey ? '✓' : '✗');
      console.log('API:', config.api.url ? '✓' : '✗');
    } else {
      console.error('❌ Staff Chat Configuration Issues:');
      issues.forEach(issue => console.error(`  - ${issue}`));
    }
  }
};

export default {
  check: checkStaffChatConfig,
  log: logConfigStatus
};
