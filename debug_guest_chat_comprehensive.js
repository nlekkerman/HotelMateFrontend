// Complete Guest Chat Realtime Test Script
// This tests the actual implementation in useGuestChat.js and channelRegistry.js

console.log('🚀 GUEST CHAT REALTIME TEST SCRIPT LOADED');

window.testGuestChatRealtime = {
  
  // 1. Check if we're on the right page with guest token
  checkPageSetup: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const bookingId = window.location.pathname.match(/BK-\d{4}-\d{4}/)?.[0];
    
    console.log('🔍 PAGE SETUP CHECK:', {
      hasToken: !!token,
      token: token ? token.substring(0, 15) + '...' : 'MISSING',
      bookingId: bookingId || 'NOT FOUND',
      url: window.location.href,
      isBookingStatusPage: window.location.pathname.includes('booking-status')
    });
    
    if (!token) {
      console.error('❌ FATAL: No guest token in URL parameters');
      return false;
    }
    
    if (!bookingId) {
      console.error('❌ FATAL: No booking ID found in URL');
      return false;
    }
    
    return { token, bookingId };
  },
  
  // 2. Test guest chat API context endpoint
  testGuestChatContext: async function(hotelSlug = 'hotel-killarney') {
    const setup = this.checkPageSetup();
    if (!setup) return;
    
    const { token } = setup;
    
    console.log('🌐 TESTING GUEST CHAT CONTEXT API...');
    
    try {
      // Test the actual endpoint used by useGuestChat
      const contextUrl = `/api/guest/hotel/${hotelSlug}/chat/context?token=${token}`;
      console.log('📡 Making context request to:', contextUrl);
      
      const response = await fetch(contextUrl);
      console.log('📊 Context API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.ok) {
        const contextData = await response.json();
        console.log('✅ CONTEXT SUCCESS:', contextData);
        
        // Store context for other tests
        window.testGuestContext = contextData;
        
        // Check if context has pusher info
        if (contextData.pusher) {
          console.log('🔔 Pusher config found:', {
            channel: contextData.pusher.channel,
            event: contextData.pusher.event,
            hasChannel: !!contextData.pusher.channel
          });
          
          return contextData;
        } else {
          console.warn('⚠️ No pusher configuration in context');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Context API failed:', {
          status: response.status,
          error: errorText
        });
      }
    } catch (error) {
      console.error('❌ Context API request failed:', error);
    }
  },
  
  // 3. Test guest Pusher client creation
  testGuestPusherClient: async function() {
    const setup = this.checkPageSetup();
    if (!setup) return;
    
    const { token } = setup;
    
    console.log('🔌 TESTING GUEST PUSHER CLIENT...');
    
    // Check if getGuestRealtimeClient is available
    if (typeof getGuestRealtimeClient === 'undefined') {
      console.error('❌ getGuestRealtimeClient function not found');
      
      // Try to import it
      try {
        const module = await import('/src/realtime/guestRealtimeClient.js');
        window.getGuestRealtimeClient = module.getGuestRealtimeClient;
        console.log('✅ Successfully imported getGuestRealtimeClient');
      } catch (importError) {
        console.error('❌ Failed to import guestRealtimeClient:', importError);
        return false;
      }
    }
    
    try {
      // Create Pusher client with auth endpoint
      const authEndpoint = `/api/pusher/auth`;
      console.log('🔐 Creating Pusher client with auth endpoint:', authEndpoint);
      
      const pusherClient = await getGuestRealtimeClient(token, {
        authEndpoint
      });
      
      if (pusherClient) {
        console.log('✅ Guest Pusher client created:', {
          state: pusherClient.connection.state,
          socket_id: pusherClient.connection.socket_id
        });
        
        // Store for other tests
        window.testPusherClient = pusherClient;
        
        // Monitor connection events
        pusherClient.connection.bind('connected', () => {
          console.log('✅ Test Pusher CLIENT CONNECTED:', {
            socket_id: pusherClient.connection.socket_id
          });
        });
        
        pusherClient.connection.bind('error', (error) => {
          console.error('❌ Test Pusher CLIENT ERROR:', error);
        });
        
        return pusherClient;
      } else {
        console.error('❌ Failed to create Pusher client');
        return false;
      }
    } catch (error) {
      console.error('❌ Pusher client creation failed:', error);
      return false;
    }
  },
  
  // 4. Test the exact subscription from backend logs
  testExactSubscription: async function() {
    const setup = this.checkPageSetup();
    if (!setup) return;
    
    const { token, bookingId } = setup;
    
    console.log('🎯 TESTING EXACT SUBSCRIPTION FROM BACKEND LOGS...');
    
    // Use the exact channel from your logs
    const channelName = `private-hotel-hotel-killarney-guest-chat-booking-${bookingId}`;
    const eventName = 'realtime_event';
    
    console.log('📡 Testing subscription to:', {
      channel: channelName,
      event: eventName,
      bookingId
    });
    
    try {
      // Check if subscribeToGuestChatBooking is available
      if (typeof subscribeToGuestChatBooking === 'undefined') {
        console.log('📦 Importing subscribeToGuestChatBooking...');
        const module = await import('/src/realtime/channelRegistry.js');
        window.subscribeToGuestChatBooking = module.subscribeToGuestChatBooking;
      }
      
      // Attempt subscription
      const cleanup = subscribeToGuestChatBooking({
        hotelSlug: 'hotel-killarney',
        bookingId: bookingId,
        guestToken: token,
        eventName: eventName
      });
      
      console.log('✅ Subscription attempt completed:', {
        hasCleanup: typeof cleanup === 'function',
        channel: channelName
      });
      
      // Store cleanup for later
      window.testSubscriptionCleanup = cleanup;
      
      return true;
    } catch (error) {
      console.error('❌ Subscription test failed:', error);
      return false;
    }
  },
  
  // 5. Test auth endpoint directly
  testAuthEndpoint: async function() {
    const setup = this.checkPageSetup();
    if (!setup) return;
    
    const { token, bookingId } = setup;
    const channelName = `private-hotel-hotel-killarney-guest-chat-booking-${bookingId}`;
    
    console.log('🔐 TESTING AUTH ENDPOINT...');
    
    try {
      const authData = new URLSearchParams({
        socket_id: 'test-socket-123',
        channel_name: channelName,
        token: token
      });
      
      console.log('📡 Auth request data:', {
        endpoint: '/api/pusher/auth',
        channel: channelName,
        hasToken: !!token
      });
      
      const response = await fetch('/api/pusher/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: authData
      });
      
      console.log('📊 Auth response:', {
        status: response.status,
        statusText: response.statusText
      });
      
      if (response.ok) {
        const authResult = await response.text();
        try {
          const parsed = JSON.parse(authResult);
          console.log('✅ AUTH SUCCESS:', parsed);
          return true;
        } catch (e) {
          console.log('✅ AUTH SUCCESS (raw):', authResult);
          return true;
        }
      } else {
        const errorText = await response.text();
        console.error('❌ AUTH FAILED:', {
          status: response.status,
          error: errorText
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Auth endpoint test failed:', error);
      return false;
    }
  },
  
  // 6. Monitor for incoming events
  monitorEvents: function(duration = 30000) {
    console.log(`🔍 MONITORING EVENTS for ${duration/1000} seconds...`);
    
    const eventLog = [];
    
    // Hook into console to catch realtime events
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      if (message.includes('GuestChat') || message.includes('realtime_event') || message.includes('💬')) {
        eventLog.push({
          timestamp: new Date().toISOString(),
          message: message,
          args: args
        });
      }
      return originalLog.apply(console, args);
    };
    
    // Stop monitoring after duration
    setTimeout(() => {
      console.log = originalLog;
      
      console.log('📋 EVENT MONITORING COMPLETE:', {
        duration: `${duration/1000}s`,
        eventsDetected: eventLog.length,
        events: eventLog
      });
      
      if (eventLog.length === 0) {
        console.warn('⚠️ No guest chat events detected during monitoring period');
      }
    }, duration);
    
    console.log('👂 Event monitoring active... Try sending a chat message now');
  },
  
  // 7. Full integration test
  fullTest: async function() {
    console.log('🚀 RUNNING FULL GUEST CHAT REALTIME TEST...');
    
    // Step 1: Check page setup
    const setup = this.checkPageSetup();
    if (!setup) {
      console.error('❌ Page setup failed - aborting test');
      return false;
    }
    
    // Step 2: Test context API
    const context = await this.testGuestChatContext();
    if (!context) {
      console.error('❌ Context test failed - aborting test');
      return false;
    }
    
    // Step 3: Test auth endpoint
    const authSuccess = await this.testAuthEndpoint();
    if (!authSuccess) {
      console.warn('⚠️ Auth test failed - continuing but expect subscription issues');
    }
    
    // Step 4: Test Pusher client
    const pusherClient = await this.testGuestPusherClient();
    if (!pusherClient) {
      console.error('❌ Pusher client test failed - aborting test');
      return false;
    }
    
    // Step 5: Test subscription
    const subscriptionSuccess = await this.testExactSubscription();
    if (!subscriptionSuccess) {
      console.error('❌ Subscription test failed');
      return false;
    }
    
    // Step 6: Monitor for events
    this.monitorEvents(30000);
    
    console.log(`
✅ FULL TEST COMPLETED
🎯 Now try sending a chat message and watch for realtime events
📋 Expected in console: "💬 [GuestChat] Received unified event on private-hotel-hotel-killarney-guest-chat-booking-${setup.bookingId}"
    `);
    
    return true;
  },
  
  // 8. Cleanup function
  cleanup: function() {
    console.log('🧹 CLEANING UP TEST RESOURCES...');
    
    if (window.testSubscriptionCleanup) {
      try {
        window.testSubscriptionCleanup();
        console.log('✅ Subscription cleanup completed');
      } catch (e) {
        console.warn('⚠️ Subscription cleanup failed:', e);
      }
    }
    
    if (window.testPusherClient) {
      try {
        window.testPusherClient.disconnect();
        console.log('✅ Test Pusher client disconnected');
      } catch (e) {
        console.warn('⚠️ Pusher disconnect failed:', e);
      }
    }
    
    // Clean up global test variables
    delete window.testGuestContext;
    delete window.testPusherClient;
    delete window.testSubscriptionCleanup;
    
    console.log('✅ Cleanup completed');
  }
};

// Auto-run basic checks
const quickCheck = window.testGuestChatRealtime.checkPageSetup();
if (quickCheck) {
  console.log(`
🎯 GUEST CHAT REALTIME TESTING READY
📋 Available commands:

1. Quick page check: testGuestChatRealtime.checkPageSetup()
2. Test context API: testGuestChatRealtime.testGuestChatContext()
3. Test auth endpoint: testGuestChatRealtime.testAuthEndpoint()
4. Test Pusher client: testGuestChatRealtime.testGuestPusherClient()
5. Test subscription: testGuestChatRealtime.testExactSubscription()
6. Monitor events: testGuestChatRealtime.monitorEvents()
7. FULL TEST: testGuestChatRealtime.fullTest()
8. Cleanup: testGuestChatRealtime.cleanup()

🎯 Expected backend channel: private-hotel-hotel-killarney-guest-chat-booking-${quickCheck.bookingId}
💡 Recommendation: Run testGuestChatRealtime.fullTest() first
  `);
} else {
  console.error('❌ Guest chat testing not available on this page');
}