// Simple API endpoint test for precheckin
// Run this in browser console to find the correct endpoint

(function testPrecheckinEndpoints() {
  const token = 'tvVoukhwLFJ6dyb4HOTDIGteYOsMNdt0TFzxJ5obLMI';
  const hotelSlug = 'hotel-killarney';
  
  const endpointsToTest = [
    // Current implementation
    `/api/public/hotel/${hotelSlug}/precheckin/?token=${token}`,
    
    // Alternative paths
    `/api/hotel/${hotelSlug}/precheckin/?token=${token}`,
    `/hotel/${hotelSlug}/precheckin/?token=${token}`,
    `/api/guest/hotel/${hotelSlug}/precheckin/?token=${token}`,
    
    // Different token formats
    `/api/public/hotel/${hotelSlug}/precheckin?token=${token}`,
    `/api/hotel/${hotelSlug}/precheckin?token=${token}`,
    
    // Backend might expect different structure
    `/api/public/precheckin/?hotel=${hotelSlug}&token=${token}`,
    `/api/precheckin/?hotel=${hotelSlug}&token=${token}`,
  ];
  
  console.log('Testing precheckin endpoints...');
  
  endpointsToTest.forEach(async (endpoint, index) => {
    setTimeout(async () => {
      try {
        const response = await fetch(endpoint);
        const text = await response.text();
        
        console.log(`\n${index + 1}. ${endpoint}`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 200) {
          console.log('   ✅ SUCCESS!');
          try {
            const json = JSON.parse(text);
            console.log('   Data keys:', Object.keys(json));
          } catch(e) {
            console.log('   Response:', text.substring(0, 100));
          }
        } else if (response.status === 404) {
          console.log('   ❌ Not Found');
        } else if (response.status === 401) {
          console.log('   🔑 Unauthorized');
        } else {
          console.log('   ⚠️  Other error:', text.substring(0, 100));
        }
      } catch (error) {
        console.log(`\n${index + 1}. ${endpoint}`);
        console.log('   ❌ Network error:', error.message);
      }
    }, index * 300); // Stagger requests
  });
})();