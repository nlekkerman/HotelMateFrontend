// Enhanced precheckin token debug script
// Copy and paste this into browser console on the failing precheckin page

(function debugPrecheckinToken() {
  console.log('=== PRECHECKIN TOKEN DEBUG ===');
  
  // Extract token and hotel slug from current URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const hotelSlug = window.location.pathname.match(/hotel\/([^\/]+)/)?.[1];
  
  console.log('Current URL:', window.location.href);
  console.log('Hotel Slug:', hotelSlug);
  console.log('Raw Token:', token);
  console.log('Token Length:', token?.length);
  console.log('Encoded Token:', encodeURIComponent(token));
  console.log('Token matches expected format:', /^[A-Za-z0-9+/=_-]+$/.test(token));
  
  // Test different token encodings
  async function testTokenEncodings() {
    const baseURL = window.location.origin;
    const apiPath = `/api/public/hotel/${hotelSlug}/precheckin/`;
    
    const testCases = [
      { name: 'URL Encoded', token: encodeURIComponent(token) },
      { name: 'Raw Token', token: token },
      { name: 'Base64 Decoded then Encoded', token: (() => {
        try {
          return encodeURIComponent(atob(token));
        } catch(e) {
          return 'DECODE_ERROR';
        }
      })() }
    ];
    
    console.log('\n=== TESTING TOKEN ENCODINGS ===');
    
    for (const testCase of testCases) {
      if (testCase.token === 'DECODE_ERROR') {
        console.log(`${testCase.name}: Token is not base64`);
        continue;
      }
      
      const testURL = `${baseURL}${apiPath}?token=${testCase.token}`;
      console.log(`\nTesting ${testCase.name}:`);
      console.log(`URL: ${testURL}`);
      
      try {
        const response = await fetch(testURL);
        const responseText = await response.text();
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Response:`, responseText);
        
        if (response.status === 200) {
          console.log('✅ SUCCESS - This token encoding works!');
          return; // Stop on first success
        } else {
          try {
            const jsonResponse = JSON.parse(responseText);
            console.log(`❌ Error: ${jsonResponse.message || jsonResponse.error || 'Unknown error'}`);
          } catch(e) {
            console.log(`❌ Error: ${responseText}`);
          }
        }
      } catch (error) {
        console.log(`❌ Network Error: ${error.message}`);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Check if token has special characters that might cause encoding issues
  function analyzeToken() {
    console.log('\n=== TOKEN ANALYSIS ===');
    console.log('Token contains +:', token?.includes('+'));
    console.log('Token contains /:', token?.includes('/'));
    console.log('Token contains =:', token?.includes('='));
    console.log('Token contains space:', token?.includes(' '));
    console.log('Token contains %:', token?.includes('%'));
    
    // Check URL encoding differences
    const encoded = encodeURIComponent(token);
    if (token !== encoded) {
      console.log('Token encoding changes:');
      console.log('  Original:', token);
      console.log('  Encoded: ', encoded);
    } else {
      console.log('Token does not change when URL encoded');
    }
  }
  
  // Test the current frontend API call format
  async function testCurrentImplementation() {
    console.log('\n=== TESTING CURRENT IMPLEMENTATION ===');
    
    try {
      // Simulate the exact call the frontend is making
      const response = await fetch(`${window.location.origin}/api/public/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const responseText = await response.text();
      console.log('Frontend API call result:');
      console.log('Status:', response.status, response.statusText);
      console.log('Response:', responseText);
      
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const jsonData = JSON.parse(responseText);
          console.log('Parsed JSON:', jsonData);
        } catch(e) {
          console.log('Failed to parse JSON');
        }
      }
    } catch (error) {
      console.error('API call failed:', error);
    }
  }
  
  analyzeToken();
  setTimeout(() => testCurrentImplementation(), 1000);
  setTimeout(() => testTokenEncodings(), 2000);
  
})();