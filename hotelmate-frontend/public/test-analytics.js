// Quick Test Script for Analytics Dashboard
// Run this in the browser console (F12) on the Analytics page

console.log('🧪 Analytics Dashboard Test Script');
console.log('====================================\n');

// Test 1: Check if ChartPreferences Context is available
console.log('1️⃣ Testing ChartPreferences Context...');
const chartPrefs = localStorage.getItem('chart_preferences');
if (chartPrefs) {
  console.log('✅ Chart preferences found:', JSON.parse(chartPrefs));
} else {
  console.log('⚠️ No chart preferences set, using default (recharts)');
}

// Test 2: Check if user is authenticated
console.log('\n2️⃣ Testing Authentication...');
const user = localStorage.getItem('user');
if (user) {
  const userData = JSON.parse(user);
  console.log('✅ User authenticated:', {
    hotel_id: userData.hotel_id,
    hotel_slug: userData.hotel_slug,
    hotel_name: userData.hotel_name,
    token: userData.token ? '✅ Present' : '❌ Missing'
  });
} else {
  console.log('❌ User not authenticated. Please log in first.');
}

// Test 3: Test API connectivity
console.log('\n3️⃣ Testing API Connectivity...');

async function testAPI() {
  try {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || !userData.hotel_slug) {
      console.log('❌ Cannot test API: No hotel_slug found');
      return;
    }

    const hotelSlug = userData.hotel_slug;
    const baseURL = window.location.hostname === 'localhost' 
      ? 'http://localhost:8000/api/'
      : 'https://hotel-porter-d25ad83b12cf.herokuapp.com/api';

    console.log(`📡 Testing API at: ${baseURL}`);
    console.log(`🏨 Hotel Slug: ${hotelSlug}`);

    // Test periods endpoint
    console.log('\n   Testing: GET periods/');
    const periodsUrl = `${baseURL}stock_tracker/${hotelSlug}/periods/`;
    const response = await fetch(periodsUrl, {
      headers: {
        'Authorization': `Token ${userData.token}`,
        'X-Hotel-ID': userData.hotel_id,
        'X-Hotel-Slug': hotelSlug
      }
    });

    if (response.ok) {
      const data = await response.json();
      const periods = data.results || data;
      console.log(`✅ Periods endpoint working! Found ${periods.length} periods`);
      
      // Check for closed periods
      const closedPeriods = periods.filter(p => p.is_closed);
      console.log(`   - Closed periods: ${closedPeriods.length}`);
      console.log(`   - Open periods: ${periods.length - closedPeriods.length}`);
      
      if (closedPeriods.length >= 2) {
        console.log('✅ Sufficient closed periods for comparison analytics!');
      } else {
        console.log('⚠️ Need at least 2 closed periods for full analytics functionality');
      }
    } else {
      console.log(`❌ Periods endpoint failed: ${response.status} ${response.statusText}`);
    }

  } catch (error) {
    console.log('❌ API test failed:', error.message);
  }
}

testAPI();

// Test 4: Check for required dependencies
console.log('\n4️⃣ Checking Dependencies...');
const dependencies = [
  'recharts',
  'chart.js',
  'victory',
  'echarts',
  'react-bootstrap',
  'react-icons',
  'react-responsive'
];

console.log('Required packages:', dependencies.join(', '));
console.log('(Run `npm list <package>` to verify each package is installed)');

// Test 5: Check React components
console.log('\n5️⃣ Checking React Components...');
console.log('Looking for analytics components in the page...');

setTimeout(() => {
  const hasFilters = document.querySelector('[class*="AnalyticsFilters"]') !== null;
  const hasCharts = document.querySelectorAll('[class*="Card"]').length > 0;
  
  console.log(`   - Analytics Filters: ${hasFilters ? '✅ Found' : '❌ Not found'}`);
  console.log(`   - Chart Cards: ${hasCharts ? `✅ Found ${document.querySelectorAll('[class*="Card"]').length} cards` : '❌ Not found'}`);
}, 1000);

// Test 6: Monitor API calls
console.log('\n6️⃣ Monitoring API Calls...');
console.log('Watch the Network tab for these endpoints:');
console.log('   - stock_tracker/{slug}/compare/categories/');
console.log('   - stock_tracker/{slug}/compare/top-movers/');
console.log('   - stock_tracker/{slug}/compare/cost-analysis/');
console.log('   - stock_tracker/{slug}/compare/trend-analysis/');
console.log('   - stock_tracker/{slug}/compare/variance-heatmap/');
console.log('   - stock_tracker/{slug}/compare/performance-scorecard/');

// Test 7: Performance check
console.log('\n7️⃣ Performance Info...');
if (window.performance && window.performance.timing) {
  const timing = window.performance.timing;
  const loadTime = timing.loadEventEnd - timing.navigationStart;
  console.log(`   Page load time: ${loadTime}ms ${loadTime < 3000 ? '✅' : '⚠️ (>3s)'}`);
}

// Summary
console.log('\n====================================');
console.log('📊 Test Summary Complete!');
console.log('====================================');
console.log('\nNext Steps:');
console.log('1. Navigate to: /stock_tracker/{your-hotel-slug}/analytics');
console.log('2. Check for console errors (should be none)');
console.log('3. Verify all charts render with data');
console.log('4. Test filtering and interactivity');
console.log('\nFor detailed testing, see: docs/TESTING_GUIDE.md');
console.log('\n🚀 Happy Testing!');
