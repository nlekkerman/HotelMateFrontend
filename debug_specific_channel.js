// Specific Debug for the Exact Channel from Backend Logs
// Channel: private-hotel-hotel-killarney-guest-chat-booking-BK-2026-0001
// Event: realtime_event

console.log('🎯 TARGETED DEBUG: private-hotel-hotel-killarney-guest-chat-booking-BK-2026-0001');

window.debugSpecificChannel = function(bookingId = 'BK-2026-0001') {
  const channelName = `private-hotel-hotel-killarney-guest-chat-booking-${bookingId}`;
  const eventName = 'realtime_event';
  
  console.log('📡 Testing specific channel from backend logs:', {
    channel: channelName,
    event: eventName,
    bookingId
  });
  
  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) {
    console.error('❌ No guest token found in URL parameters');
    return;
  }
  
  console.log('🔐 Found guest token:', token.substring(0, 10) + '...');
  
  // Try to create a manual Pusher connection for testing
  try {
    // Import Pusher if not already available
    if (typeof window.Pusher === 'undefined') {
      console.error('❌ Pusher library not loaded');
      return;
    }
    
    // Create test Pusher instance
    const testPusher = new window.Pusher(import.meta?.env?.VITE_PUSHER_KEY || 'YOUR_PUSHER_KEY', {
      cluster: import.meta?.env?.VITE_PUSHER_CLUSTER || 'mt1',
      encrypted: true,
      forceTLS: true,
      authEndpoint: '/api/pusher/auth', // This might need to be the full URL
      auth: {
        params: { token } // Send token as query param
      }
    });
    
    console.log('✅ Test Pusher instance created');
    
    // Monitor connection
    testPusher.connection.bind('connected', () => {
      console.log('✅ Test Pusher connected, socket_id:', testPusher.connection.socket_id);
      
      // Now try to subscribe to the exact channel
      console.log('🔔 Attempting to subscribe to:', channelName);
      const channel = testPusher.subscribe(channelName);
      
      // Monitor subscription
      channel.bind('pusher:subscription_succeeded', () => {
        console.log('✅ Successfully subscribed to:', channelName);
        
        // Log all events on this channel
        channel.bind_global((eventName, data) => {
          console.log(`🚀 Event received on ${channelName}:`, {
            eventName,
            data,
            timestamp: new Date().toISOString()
          });
        });
        
        // Specifically listen for the realtime_event
        channel.bind(eventName, (data) => {
          console.log(`💬 REALTIME_EVENT received:`, {
            channel: channelName,
            event: eventName,
            data,
            timestamp: new Date().toISOString()
          });
        });
        
        console.log('🎯 Now listening for realtime_event on', channelName);
        console.log('📝 Try sending a chat message now and watch for events...');
      });
      
      channel.bind('pusher:subscription_error', (error) => {
        console.error('❌ Subscription failed for:', channelName, error);
        
        // Common reasons for subscription failure:
        console.log(`
🔍 TROUBLESHOOTING SUBSCRIPTION FAILURE:
1. Auth endpoint issue: Check if /api/pusher/auth is accessible
2. Token validation: Backend might not recognize the token
3. Channel permissions: User might not be authorized for this private channel
4. CORS issues: Auth endpoint might reject the request
        `);
      });
      
    });
    
    testPusher.connection.bind('error', (error) => {
      console.error('❌ Test Pusher connection error:', error);
    });
    
    testPusher.connection.bind('disconnected', () => {
      console.log('🔌 Test Pusher disconnected');
    });
    
    // Store for cleanup
    window.testPusherInstance = testPusher;
    
  } catch (error) {
    console.error('❌ Failed to create test Pusher instance:', error);
  }
};

// Also create a function to test the auth endpoint directly
window.testPusherAuth = function(bookingId = 'BK-2026-0001') {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) {
    console.error('❌ No guest token found');
    return;
  }
  
  const channelName = `private-hotel-hotel-killarney-guest-chat-booking-${bookingId}`;
  
  // Test the auth endpoint directly
  const authData = {
    socket_id: 'test-socket-id',
    channel_name: channelName
  };
  
  console.log('🔐 Testing Pusher auth endpoint:', {
    endpoint: '/api/pusher/auth',
    channel: channelName,
    token: token.substring(0, 10) + '...'
  });
  
  fetch('/api/pusher/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      socket_id: authData.socket_id,
      channel_name: authData.channel_name,
      token: token
    })
  })
  .then(response => {
    console.log('📡 Auth endpoint response status:', response.status);
    return response.text();
  })
  .then(data => {
    try {
      const jsonData = JSON.parse(data);
      console.log('✅ Auth endpoint success:', jsonData);
    } catch (e) {
      console.log('📝 Auth endpoint raw response:', data);
    }
  })
  .catch(error => {
    console.error('❌ Auth endpoint error:', error);
  });
};

// Function to cleanup test instances
window.cleanupTestPusher = function() {
  if (window.testPusherInstance) {
    window.testPusherInstance.disconnect();
    delete window.testPusherInstance;
    console.log('🧹 Test Pusher instance cleaned up');
  }
};

console.log(`
🎯 SPECIFIC CHANNEL DEBUG LOADED
Run these commands in console:

1. Test specific channel: debugSpecificChannel('BK-2026-0001')
2. Test auth endpoint: testPusherAuth('BK-2026-0001')  
3. Cleanup: cleanupTestPusher()

Expected from backend logs:
- Channel: private-hotel-hotel-killarney-guest-chat-booking-BK-2026-0001
- Event: realtime_event
- Should receive message ID 846 data
`);

// Auto-run if we detect the booking ID from URL
const currentBookingId = window.location.pathname.match(/BK-\d{4}-\d{4}/)?.[0];
if (currentBookingId) {
  console.log(`🔄 Auto-detected booking ID: ${currentBookingId}`);
  console.log('🚀 Run debugSpecificChannel() to test this booking');
}