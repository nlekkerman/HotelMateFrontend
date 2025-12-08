/**
 * Complete Pusher Debug Test Script
 * Run this in the browser console when the app is loaded to test all aspects of Pusher connection
 */

(async function() {
  console.log('🧪 Starting Complete Pusher Debug Test...');
  
  const results = {
    pusherClient: false,
    connectionState: null,
    authentication: false,
    channelSubscription: false,
    eventReceived: false,
    errors: []
  };
  
  try {
    // 1. Test Pusher Client Access
    console.log('1️⃣ Testing Pusher Client Access...');
    const { getPusherClient } = await import('/src/realtime/realtimeClient.js');
    const pusher = getPusherClient();
    results.pusherClient = !!pusher;
    results.connectionState = pusher.connection.state;
    console.log(`✅ Pusher client: ${results.pusherClient ? 'Available' : 'Not Available'}`);
    console.log(`📡 Connection state: ${results.connectionState}`);
    
    // 2. Test Authentication
    console.log('2️⃣ Testing Authentication...');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const hasToken = !!user.token;
    results.authentication = hasToken;
    console.log(`🔐 Auth token: ${hasToken ? 'Present' : 'Missing'}`);
    if (hasToken) {
      console.log(`🔑 Token preview: ${user.token.substring(0, 20)}...`);
    }
    
    // 3. Test Channel Subscription
    console.log('3️⃣ Testing Channel Subscription...');
    const testChannel = 'hotel-killarney.staff-chat.100';  // Use actual values from your setup
    console.log(`📺 Attempting to subscribe to: ${testChannel}`);
    
    const channel = pusher.subscribe(testChannel);
    results.channelSubscription = !!channel;
    
    // Wait for subscription success/failure
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('⏰ Subscription timeout (5s)');
        resolve();
      }, 5000);
      
      channel.bind('pusher:subscription_succeeded', () => {
        console.log('✅ Channel subscription: SUCCEEDED');
        results.channelSubscription = true;
        clearTimeout(timeout);
        resolve();
      });
      
      channel.bind('pusher:subscription_error', (error) => {
        console.error('❌ Channel subscription: FAILED', error);
        results.errors.push(`Subscription error: ${JSON.stringify(error)}`);
        clearTimeout(timeout);
        resolve();
      });
    });
    
    // 4. Test Event Reception
    console.log('4️⃣ Testing Event Reception...');
    console.log('📨 Listening for events on channel for 10 seconds...');
    console.log('🚨 Send a staff chat message now to test!');
    
    // Set up event listener
    const eventPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⏰ Event reception test timeout (10s)');
        resolve();
      }, 10000);
      
      channel.bind('realtime_staff_chat_message_created', (data) => {
        console.log('🎉 Message event received!', data);
        results.eventReceived = true;
        clearTimeout(timeout);
        resolve();
      });
      
      // Also listen for any event
      channel.bind_global((eventName, data) => {
        if (!eventName.startsWith('pusher:')) {
          console.log(`📡 Any event received: ${eventName}`, data);
        }
      });
    });
    
    await eventPromise;
    
    // 5. Test Manual Event Trigger
    console.log('5️⃣ Testing Manual Event Trigger...');
    try {
      const { handleIncomingRealtimeEvent } = await import('/src/realtime/eventBus.js');
      
      const testEvent = {
        source: 'debug',
        channel: testChannel,
        eventName: 'realtime_staff_chat_message_created',
        payload: {
          category: "staff_chat",
          type: "realtime_staff_chat_message_created",
          payload: {
            id: 99999,
            conversation_id: 100,
            message: "🧪 Debug test message from console",
            sender_id: 35,
            sender_name: "Debug Tester",
            timestamp: new Date().toISOString(),
            attachments: [],
            is_system_message: false
          },
          meta: {
            hotel_slug: "hotel-killarney",
            event_id: "debug-test-event",
            ts: new Date().toISOString()
          }
        }
      };
      
      console.log('🧪 Triggering manual test event...');
      handleIncomingRealtimeEvent(testEvent);
      console.log('✅ Manual event triggered successfully');
      
    } catch (error) {
      console.error('❌ Manual event trigger failed:', error);
      results.errors.push(`Manual event error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    results.errors.push(`Test error: ${error.message}`);
  }
  
  // 6. Final Report
  console.log('\n🏁 PUSHER DEBUG TEST RESULTS:');
  console.log('================================');
  console.log(`📱 Pusher Client: ${results.pusherClient ? '✅' : '❌'}`);
  console.log(`📡 Connection State: ${results.connectionState || '❌'}`);
  console.log(`🔐 Authentication: ${results.authentication ? '✅' : '❌'}`);
  console.log(`📺 Channel Subscription: ${results.channelSubscription ? '✅' : '❌'}`);
  console.log(`📨 Event Reception: ${results.eventReceived ? '✅' : '❌'}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
  
  console.log('\n🔧 TROUBLESHOOTING TIPS:');
  if (!results.pusherClient) {
    console.log('- Check if realtimeClient.js is properly configured');
  }
  if (results.connectionState !== 'connected') {
    console.log('- Check network connection and Pusher credentials');
  }
  if (!results.authentication) {
    console.log('- Check if user is logged in and token is present');
  }
  if (!results.channelSubscription) {
    console.log('- Check auth endpoint and backend Pusher configuration');
    console.log('- Verify channel name matches backend pattern');
  }
  if (!results.eventReceived) {
    console.log('- Send a test message during the 10-second window');
    console.log('- Check if backend is actually sending events');
  }
  
  console.log('\n💡 Next step: If subscription succeeds but no events are received,');
  console.log('   the issue is likely on the backend side (event not being sent).');
  
})().catch(console.error);