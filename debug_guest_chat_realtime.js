// Debug Guest Chat Realtime Issues
// Paste this into the browser console when experiencing realtime update problems

console.log('🚀 Starting Guest Chat Realtime Debug Session...');

// Enhanced logging for guest chat
window.guestChatDebug = {
  logLevel: 'ALL', // ALL, ERROR, INFO
  eventHistory: [],
  maxHistorySize: 100,
  
  log: function(level, category, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      data: JSON.parse(JSON.stringify(data)) // Deep clone
    };
    
    this.eventHistory.push(logEntry);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    const emoji = {
      ERROR: '❌',
      WARN: '⚠️',
      INFO: '✅',
      DEBUG: '🔍',
      PUSHER: '📡',
      SUBSCRIPTION: '🔔',
      EVENT: '💬',
      AUTH: '🔐'
    };
    
    const prefix = `${emoji[level] || '📝'} [${category}]`;
    console.log(`${prefix} ${message}`, data);
  },
  
  // Show event history
  showHistory: function(filter = '') {
    const filtered = filter ? 
      this.eventHistory.filter(e => 
        e.category.toLowerCase().includes(filter.toLowerCase()) ||
        e.message.toLowerCase().includes(filter.toLowerCase())
      ) : this.eventHistory;
      
    console.table(filtered);
  },
  
  // Clear history
  clearHistory: function() {
    this.eventHistory = [];
    console.log('🧹 Event history cleared');
  }
};

const debug = window.guestChatDebug;

// 1. Check if we're on a guest page with token
function checkGuestPageStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const bookingId = window.location.pathname.match(/\/booking-status\/([^\/]+)/)?.[1];
  
  debug.log('INFO', 'PAGE_CHECK', 'Guest page status', {
    hasToken: !!token,
    bookingId,
    url: window.location.href,
    tokenLength: token ? token.length : 0
  });
  
  return { token, bookingId };
}

// 2. Monitor Pusher connection status
function monitorPusherConnection() {
  debug.log('INFO', 'MONITOR', 'Looking for Pusher instances...');
  
  // Check for global Pusher instances
  if (window.Pusher) {
    debug.log('INFO', 'PUSHER', 'Pusher library loaded', {
      version: window.Pusher.VERSION
    });
  }
  
  // Monitor network requests for Pusher auth
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;
    if (url.includes('pusher') || url.includes('auth')) {
      debug.log('INFO', 'AUTH', 'Pusher auth request', {
        url,
        method: options?.method || 'GET',
        headers: options?.headers || {}
      });
    }
    return originalFetch.apply(this, args);
  };
}

// 3. Hook into existing Pusher instances
function hookExistingPusher() {
  // Try to find existing Pusher instances
  const pusherInstances = [];
  
  // Check common global variables
  ['pusher', 'pusherClient', 'guestPusher'].forEach(varName => {
    if (window[varName] && typeof window[varName].connection !== 'undefined') {
      pusherInstances.push({ name: varName, instance: window[varName] });
    }
  });
  
  debug.log('INFO', 'PUSHER', 'Found Pusher instances', {
    count: pusherInstances.length,
    instances: pusherInstances.map(p => p.name)
  });
  
  pusherInstances.forEach(({ name, instance }) => {
    // Hook connection events
    ['connecting', 'connected', 'disconnected', 'error'].forEach(eventName => {
      instance.connection.bind(eventName, (data) => {
        debug.log('INFO', 'CONNECTION', `Pusher ${name} ${eventName}`, data || {});
      });
    });
    
    // Get current connection state
    debug.log('INFO', 'CONNECTION', `${name} current state`, {
      state: instance.connection.state,
      socket_id: instance.connection.socket_id
    });
  });
}

// 4. Monitor specific guest chat channels
function monitorGuestChatChannels(bookingId) {
  if (!bookingId) {
    debug.log('WARN', 'MONITOR', 'No booking ID found for channel monitoring');
    return;
  }
  
  const expectedChannels = [
    `private-hotel-hotel-killarney-guest-chat-booking-${bookingId}`,
    `guest-booking.${bookingId}`,
    `hotel-killarney.guest-chat.${bookingId}`,
    `booking.${bookingId}`
  ];
  
  debug.log('INFO', 'CHANNELS', 'Expected channels for booking', {
    bookingId,
    channels: expectedChannels
  });
  
  // Check if any channels are subscribed
  setTimeout(() => {
    const foundChannels = [];
    expectedChannels.forEach(channelName => {
      // Try to find subscribed channels (implementation specific)
      debug.log('DEBUG', 'CHANNELS', 'Checking channel', { channelName });
    });
  }, 2000);
}

// 5. Create test functions for manual verification
window.testGuestChatRealtime = function(bookingId) {
  const { token } = checkGuestPageStatus();
  
  if (!token) {
    debug.log('ERROR', 'TEST', 'No guest token found in URL');
    return;
  }
  
  debug.log('INFO', 'TEST', 'Starting manual guest chat test', {
    bookingId: bookingId || 'BK-2026-0001',
    hasToken: !!token
  });
  
  // Try to trigger a manual subscription
  try {
    if (window.subscribeToGuestChatBooking) {
      const cleanup = window.subscribeToGuestChatBooking({
        hotelSlug: 'hotel-killarney',
        bookingId: bookingId || 'BK-2026-0001',
        guestToken: token
      });
      
      debug.log('INFO', 'TEST', 'Manual subscription attempted', { hasCleanup: typeof cleanup === 'function' });
    } else {
      debug.log('ERROR', 'TEST', 'subscribeToGuestChatBooking function not found');
    }
  } catch (error) {
    debug.log('ERROR', 'TEST', 'Manual subscription failed', { error: error.message });
  }
};

// 6. Monitor WebSocket traffic (if available)
function monitorWebSocketTraffic() {
  if (window.WebSocket) {
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      debug.log('INFO', 'WEBSOCKET', 'New WebSocket connection', { url, protocols });
      
      const ws = new originalWebSocket(url, protocols);
      
      ws.addEventListener('open', () => {
        debug.log('INFO', 'WEBSOCKET', 'WebSocket opened', { url });
      });
      
      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event && (data.event.includes('chat') || data.event.includes('realtime'))) {
            debug.log('EVENT', 'WEBSOCKET', 'Guest chat related message', data);
          }
        } catch (e) {
          // Not JSON, ignore
        }
      });
      
      ws.addEventListener('error', (error) => {
        debug.log('ERROR', 'WEBSOCKET', 'WebSocket error', { url, error });
      });
      
      ws.addEventListener('close', (event) => {
        debug.log('WARN', 'WEBSOCKET', 'WebSocket closed', { 
          url, 
          code: event.code, 
          reason: event.reason 
        });
      });
      
      return ws;
    };
  }
}

// 7. Check for chat-related localStorage/sessionStorage
function checkStorageForChatData() {
  const chatRelatedKeys = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('chat') || key.includes('pusher') || key.includes('guest')) {
      chatRelatedKeys.push({
        key,
        value: localStorage.getItem(key),
        storage: 'localStorage'
      });
    }
  }
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key.includes('chat') || key.includes('pusher') || key.includes('guest')) {
      chatRelatedKeys.push({
        key,
        value: sessionStorage.getItem(key),
        storage: 'sessionStorage'
      });
    }
  }
  
  debug.log('INFO', 'STORAGE', 'Chat-related storage data', {
    count: chatRelatedKeys.length,
    keys: chatRelatedKeys
  });
}

// 8. Export utilities for manual testing
window.guestChatUtils = {
  // Force a guest chat subscription
  forceSubscription: function(bookingId) {
    window.testGuestChatRealtime(bookingId);
  },
  
  // Show all logged events
  showEvents: function(filter) {
    debug.showHistory(filter);
  },
  
  // Clear event history
  clearEvents: function() {
    debug.clearHistory();
  },
  
  // Check current connection status
  checkStatus: function() {
    const { token, bookingId } = checkGuestPageStatus();
    return {
      hasToken: !!token,
      bookingId,
      pusherInstances: Object.keys(window).filter(key => 
        key.includes('pusher') || key.includes('Pusher')
      )
    };
  }
};

// Start monitoring immediately
console.log('🔧 Initializing guest chat realtime monitoring...');

const pageStatus = checkGuestPageStatus();
monitorPusherConnection();
hookExistingPusher();
monitorGuestChatChannels(pageStatus.bookingId);
monitorWebSocketTraffic();
checkStorageForChatData();

// Provide usage instructions
console.log(`
📖 USAGE INSTRUCTIONS:
1. Check status: guestChatUtils.checkStatus()
2. Force subscription: guestChatUtils.forceSubscription('${pageStatus.bookingId || 'BK-2026-0001'}')
3. View events: guestChatUtils.showEvents('pusher') or guestChatUtils.showEvents()
4. Clear events: guestChatUtils.clearEvents()

🔍 EXPECTED BACKEND CHANNEL from your logs:
private-hotel-hotel-killarney-guest-chat-booking-${pageStatus.bookingId || 'BK-2026-0001'}

💡 If events are being sent but not received, check:
- Channel name mismatch between frontend/backend
- Authentication issues (token/auth endpoint)
- Pusher subscription errors in console
`);

// Auto-run test if we have a booking ID
if (pageStatus.bookingId) {
  setTimeout(() => {
    console.log('🔄 Auto-testing guest chat subscription in 3 seconds...');
    setTimeout(() => {
      window.testGuestChatRealtime(pageStatus.bookingId);
    }, 3000);
  }, 1000);
}