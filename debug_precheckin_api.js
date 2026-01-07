// Debug script for precheckin API issues
// Copy and paste this into browser console on the failing precheckin page

(function debugPrecheckinAPI() {
  console.log('=== PRECHECKIN API DEBUG ===');
  
  // Extract token and hotel slug from current URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const hotelSlug = window.location.pathname.match(/hotel\/([^\/]+)/)?.[1];
  
  console.log('Current URL:', window.location.href);
  console.log('Hotel Slug:', hotelSlug);
  console.log('Token:', token ? `${token.substring(0, 10)}...` : 'Not found');
  
  // Test the API endpoint
  async function testPrecheckinEndpoint() {
    try {
      const baseURL = window.location.origin;
      const apiURL = `/api/public/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`;
      const fullURL = `${baseURL}${apiURL}`;
      
      console.log('Testing API endpoint:');
      console.log('Full URL:', fullURL);
      
      // First, try a simple fetch to see the raw response
      console.log('Making fetch request...');
      const response = await fetch(fullURL);
      
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Response body (text):', responseText);
      
      if (response.ok) {
        try {
          const jsonData = JSON.parse(responseText);
          console.log('Response body (JSON):', jsonData);
        } catch (e) {
          console.log('Response is not valid JSON');
        }
      } else {
        console.error(`HTTP ${response.status}: ${response.statusText}`);
        console.error('Response body:', responseText);
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }
  
  // Test different potential endpoints
  async function testEndpointVariations() {
    const baseURL = window.location.origin;
    const endpoints = [
      `/api/public/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`,
      `/api/guest/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`,
      `/api/public/precheckin/${hotelSlug}/?token=${encodeURIComponent(token)}`,
      `/api/guest/precheckin/${hotelSlug}/?token=${encodeURIComponent(token)}`
    ];
    
    console.log('\n=== TESTING ENDPOINT VARIATIONS ===');
    
    for (const endpoint of endpoints) {
      console.log(`\nTesting: ${baseURL}${endpoint}`);
      try {
        const response = await fetch(`${baseURL}${endpoint}`);
        console.log(`Status: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          console.log('❌ Not Found');
        } else if (response.status === 401) {
          console.log('🔑 Unauthorized (token issue?)');
        } else if (response.status === 200) {
          console.log('✅ Success');
        } else {
          console.log(`⚠️  Status ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n1. Running primary endpoint test...');
  testPrecheckinEndpoint();
  
  setTimeout(() => {
    console.log('\n2. Running endpoint variation tests...');
    testEndpointVariations();
  }, 2000);
  
})();