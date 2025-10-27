// CORS Test Function - Test if backend CORS is now working
async function testCORSConnection() {
    console.log("🔍 Testing CORS connection to backend...");
    
    const backendUrl = 'https://hotel-porter-d25ad83b12cf.herokuapp.com';
    const testEndpoints = [
        '/api/staff/login/',
        '/api/entertainment/tournaments/',
        '/api/health/' // If available
    ];
    
    for (const endpoint of testEndpoints) {
        const fullUrl = `${backendUrl}${endpoint}`;
        console.log(`\n📡 Testing: ${fullUrl}`);
        
        try {
            // Test preflight (OPTIONS request)
            const preflightResponse = await fetch(fullUrl, {
                method: 'OPTIONS',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin
                },
            });
            
            console.log(`✅ Preflight successful: ${preflightResponse.status}`);
            console.log('CORS Headers:', {
                'Access-Control-Allow-Origin': preflightResponse.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': preflightResponse.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': preflightResponse.headers.get('Access-Control-Allow-Headers')
            });
            
        } catch (error) {
            console.log(`❌ CORS still blocked for ${endpoint}:`, error.message);
        }
    }
    
    // Test actual API call
    console.log(`\n🧪 Testing actual API call...`);
    try {
        const response = await fetch(`${backendUrl}/api/entertainment/tournaments/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API call successful! Response:', data);
        } else {
            console.log(`⚠️ API responded with ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.log(`❌ API call failed:`, error.message);
    }
    
    return {
        origin: window.location.origin,
        backendUrl,
        timestamp: new Date().toISOString()
    };
}

// Auto-run test
console.log("🚀 Running CORS test...");
console.log("Frontend Origin:", window.location.origin);
testCORSConnection().then(result => {
    console.log("\n🏁 CORS test completed!", result);
}).catch(error => {
    console.error("💥 CORS test failed:", error);
});

// Export for manual testing
window.testCORS = testCORSConnection;