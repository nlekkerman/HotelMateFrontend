// Test script for fetching tournaments
async function testTournamentFetching() {
    console.log("Testing Tournament API...");
    
    // Test different API endpoints
    const endpoints = [
        '/api/entertainment/tournaments/active/?hotel=hotel-killarney',
        '/api/entertainment/tournaments/active_for_hotel/?hotel=hotel-killarney', 
        '/api/entertainment/tournaments/?hotel=hotel-killarney'
    ];
    
    for (const endpoint of endpoints) {
        console.log(`\nTesting: ${endpoint}`);
        
        try {
            const response = await fetch(endpoint);
            console.log(`Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log("Success! Response:", data);
                
                // Check for tournaments
                const tournaments = data.tournaments || data.results || data;
                if (Array.isArray(tournaments)) {
                    console.log(`Found ${tournaments.length} tournaments`);
                    tournaments.forEach((tournament, index) => {
                        console.log(`  ${index + 1}. ${tournament.name} (${tournament.status})`);
                    });
                } else {
                    console.log("Response is not an array of tournaments");
                }
            } else {
                console.log(`Failed: ${response.status}`);
                const errorText = await response.text();
                console.log("Error:", errorText);
            }
        } catch (error) {
            console.log(`Network Error:`, error.message);
        }
    }
    
    // Test mock data fallback
    console.log("\nTesting with mock data fallback...");
    const mockTournaments = [
        {
            id: 16,
            name: "Memory Match Daily - Monday",
            description: "Daily Memory Match for October 27, 2025. 3x4 grid (6 pairs) - Scan QR to play!",
            start_date: "2025-10-27T12:00:00Z",
            end_date: "2025-10-27T19:00:00Z",
            status: "active",
            participant_count: 0,
            first_prize: "Hotel Game Room Pass"
        }
    ];
    
    console.log("Mock tournaments:", mockTournaments);
    console.log("Active tournaments:", mockTournaments.filter(t => t.status === 'active'));
}

// Run the test
testTournamentFetching();