// Debug Message Sending Issues
// Run this in the browser console to diagnose message sending problems

console.log('🔍 DEBUG: Message Sending Diagnostics Started');

function debugMessageSending() {
  // 1. Check Authentication
  console.log('\n1️⃣ AUTHENTICATION CHECK');
  const storedUser = localStorage.getItem('user');
  if (!storedUser) {
    console.error('❌ No user data found in localStorage');
    return false;
  }

  let userData;
  try {
    userData = JSON.parse(storedUser);
    console.log('✅ User data found:', {
      username: userData.username,
      hotel_slug: userData.hotel_slug,
      hotel_id: userData.hotel_id,
      hasToken: !!userData.token,
      tokenLength: userData.token ? userData.token.length : 0
    });
  } catch (error) {
    console.error('❌ Invalid JSON in user data:', error);
    return false;
  }

  // 2. Check API Configuration
  console.log('\n2️⃣ API CONFIGURATION CHECK');
  const apiBaseUrl = import.meta?.env?.VITE_API_URL || 
                    (window.location.hostname === 'localhost' ? 'http://localhost:8000/api/' : 'https://hotel-porter-d25ad83b12cf.herokuapp.com/api');
  console.log('🌐 API Base URL:', apiBaseUrl);

  // 3. Test API Connection
  console.log('\n3️⃣ API CONNECTION TEST');
  testApiConnection(userData, apiBaseUrl);

  // 4. Check Staff Chat Context
  console.log('\n4️⃣ STAFF CHAT CONTEXT CHECK');
  // Check if React context is available
  if (window.React) {
    console.log('✅ React is available');
  } else {
    console.log('⚠️ React not found in window');
  }

  // 5. Check Pusher Connection
  console.log('\n5️⃣ PUSHER CONNECTION CHECK');
  checkPusherConnection();

  return true;
}

async function testApiConnection(userData, baseUrl) {
  try {
    console.log('📡 Testing API connection...');
    
    const testUrl = `${baseUrl}/staff/hotel/${userData.hotel_slug}/staff_chat/conversations/`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${userData.token}`,
        'X-Hotel-ID': userData.hotel_id?.toString() || '',
        'X-Hotel-Slug': userData.hotel_slug || '',
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API connection successful');
      console.log('📋 Conversations found:', data.results?.length || 0);
      return true;
    } else {
      console.error('❌ API connection failed:', response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return false;
  }
}

function checkPusherConnection() {
  // Check if Pusher is loaded
  if (typeof Pusher !== 'undefined') {
    console.log('✅ Pusher library loaded');
  } else {
    console.log('❌ Pusher library not found');
  }

  // Check for Pusher instances in window
  const pusherKeys = Object.keys(window).filter(key => key.toLowerCase().includes('pusher'));
  if (pusherKeys.length > 0) {
    console.log('🔗 Found Pusher-related objects:', pusherKeys);
  }

  // Check environment variables
  const pusherKey = import.meta?.env?.VITE_PUSHER_KEY;
  const pusherCluster = import.meta?.env?.VITE_PUSHER_CLUSTER;
  
  console.log('🔧 Pusher config:', {
    hasKey: !!pusherKey,
    keyLength: pusherKey ? pusherKey.length : 0,
    cluster: pusherCluster || 'not set'
  });
}

// Function to test message sending directly
async function testSendMessage(conversationId, messageText = 'Test message from debug script') {
  console.log('\n📤 TESTING MESSAGE SEND');
  
  const storedUser = localStorage.getItem('user');
  if (!storedUser) {
    console.error('❌ No user data for message send test');
    return;
  }

  const userData = JSON.parse(storedUser);
  const apiBaseUrl = import.meta?.env?.VITE_API_URL || 
                    (window.location.hostname === 'localhost' ? 'http://localhost:8000/api/' : 'https://hotel-porter-d25ad83b12cf.herokuapp.com/api');

  try {
    const sendUrl = `${apiBaseUrl}/staff/hotel/${userData.hotel_slug}/staff_chat/conversations/${conversationId}/send-message/`;
    
    console.log('📡 Sending to URL:', sendUrl);
    console.log('📝 Message:', messageText);
    
    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${userData.token}`,
        'X-Hotel-ID': userData.hotel_id?.toString() || '',
        'X-Hotel-Slug': userData.hotel_slug || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: messageText
      })
    });

    console.log('📊 Send Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Message sent successfully!');
      console.log('📨 Message data:', result);
      return result;
    } else {
      console.error('❌ Failed to send message');
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error sending message:', error);
    return null;
  }
}

// Function to check for JavaScript errors
function checkForErrors() {
  console.log('\n🐛 CHECKING FOR JAVASCRIPT ERRORS');
  
  // Override console.error to catch errors
  const originalError = console.error;
  let errorCount = 0;
  
  console.error = function(...args) {
    errorCount++;
    console.log(`🚨 Error #${errorCount}:`, ...args);
    return originalError.apply(console, args);
  };
  
  console.log('👂 Now listening for JavaScript errors...');
  console.log('💡 Try sending a message now and check for any new errors above');
}

// Main debug function
window.debugMessageSending = debugMessageSending;
window.testSendMessage = testSendMessage;
window.checkForErrors = checkForErrors;

// Auto-run diagnostics
debugMessageSending();
checkForErrors();

console.log(`
🔧 DEBUG FUNCTIONS AVAILABLE:
- debugMessageSending() - Run full diagnostics
- testSendMessage(conversationId, 'message') - Test direct API call
- checkForErrors() - Monitor for JavaScript errors

💡 USAGE EXAMPLES:
- testSendMessage(100, 'Hello test message')  
- debugMessageSending()

🎯 NEXT STEPS:
1. Check the console for any red error messages
2. Try running testSendMessage() with a real conversation ID
3. Open Network tab in DevTools and check for failed requests
4. Look for 401 (authentication) or 403 (permission) errors
`);