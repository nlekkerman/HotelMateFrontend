// Debug script to test Pusher events in the browser console
// Paste this into the browser console when the app is running

console.log('🔧 Starting Pusher Debug Session...');

// Store original console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Create enhanced logging
function debugLog(prefix, ...args) {
  originalLog(`🔍 [${prefix}]`, ...args);
}

// Monitor all console messages for Pusher-related events
console.log = function(...args) {
  const message = args.join(' ');
  if (message.includes('pusher') || message.includes('Pusher') || 
      message.includes('staff-chat') || message.includes('realtime')) {
    debugLog('CONSOLE', ...args);
  }
  return originalLog.apply(console, args);
};

console.warn = function(...args) {
  const message = args.join(' ');
  if (message.includes('pusher') || message.includes('Pusher') || 
      message.includes('staff-chat') || message.includes('realtime')) {
    debugLog('WARNING', ...args);
  }
  return originalWarn.apply(console, args);
};

console.error = function(...args) {
  const message = args.join(' ');
  if (message.includes('pusher') || message.includes('Pusher') || 
      message.includes('staff-chat') || message.includes('realtime')) {
    debugLog('ERROR', ...args);
  }
  return originalError.apply(console, args);
};

// Test function to manually trigger a staff chat subscription
window.debugStaffChat = function(hotelSlug = 'hotel-killarney', conversationId = 100) {
  debugLog('DEBUG', 'Testing staff chat subscription:', { hotelSlug, conversationId });
  
  // Try to access the realtime system
  try {
    // Import the channelRegistry if available
    import('/src/realtime/channelRegistry.js').then(({ subscribeToStaffChatConversation }) => {
      debugLog('DEBUG', 'Attempting to subscribe to staff chat conversation...');
      const cleanup = subscribeToStaffChatConversation(hotelSlug, conversationId);
      
      setTimeout(() => {
        debugLog('DEBUG', 'Subscription active for 30 seconds. Send a message now!');
      }, 2000);
      
      // Cleanup after 30 seconds
      setTimeout(() => {
        debugLog('DEBUG', 'Cleaning up subscription...');
        cleanup();
      }, 30000);
    }).catch(error => {
      debugLog('ERROR', 'Failed to import channelRegistry:', error);
    });
  } catch (error) {
    debugLog('ERROR', 'Error in debugStaffChat:', error);
  }
};

// Test function to manually trigger an event
window.debugTriggerEvent = function() {
  debugLog('DEBUG', 'Triggering manual event...');
  
  try {
    import('/src/realtime/eventBus.js').then(({ handleIncomingRealtimeEvent }) => {
      const testEvent = {
        source: 'debug',
        channel: 'hotel-killarney.staff-chat.100',
        eventName: 'realtime_staff_chat_message_created',
        payload: {
          category: "staff_chat",
          type: "realtime_staff_chat_message_created",
          payload: {
            id: 999,
            conversation_id: 100,
            message: "Debug test message",
            sender_id: 35,
            sender_name: "Debug User",
            timestamp: new Date().toISOString(),
            attachments: [],
            is_system_message: false
          },
          meta: {
            hotel_slug: "hotel-killarney",
            event_id: "debug-event-123",
            ts: new Date().toISOString(),
            scope: { conversation_id: 100, sender_id: 35 }
          }
        }
      };
      
      debugLog('DEBUG', 'Manually triggering event:', testEvent);
      handleIncomingRealtimeEvent(testEvent);
    }).catch(error => {
      debugLog('ERROR', 'Failed to import eventBus:', error);
    });
  } catch (error) {
    debugLog('ERROR', 'Error in debugTriggerEvent:', error);
  }
};

// Check Pusher connection status
window.debugPusherStatus = function() {
  try {
    import('/src/realtime/realtimeClient.js').then(({ getPusherClient }) => {
      const pusher = getPusherClient();
      debugLog('DEBUG', 'Pusher connection state:', pusher.connection.state);
      debugLog('DEBUG', 'Pusher socket ID:', pusher.connection.socket_id);
      debugLog('DEBUG', 'All channels:', Object.keys(pusher.channels.channels));
    }).catch(error => {
      debugLog('ERROR', 'Failed to get Pusher client:', error);
    });
  } catch (error) {
    debugLog('ERROR', 'Error in debugPusherStatus:', error);
  }
};

debugLog('DEBUG', 'Debug functions available:');
debugLog('DEBUG', '- window.debugStaffChat() - Test staff chat subscription');
debugLog('DEBUG', '- window.debugTriggerEvent() - Manually trigger a message event');  
debugLog('DEBUG', '- window.debugPusherStatus() - Check Pusher connection');
debugLog('DEBUG', 'Enhanced logging active for Pusher/realtime events');