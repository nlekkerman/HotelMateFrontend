// Test runner for layout and staff access policies
import { getLayoutMode } from './layoutPolicy.js';
import { canAccessStaffPath, validateUserPermissions } from './staffAccessPolicy.js';

// Mock users for testing
const mockUsers = {
  superuser: {
    is_staff: true,
    is_superuser: true,
    allowed_navs: [],
    access_level: "super_staff_admin"
  },
  staffAdmin: {
    is_staff: true,
    is_superuser: false,
    allowed_navs: ["home", "reception", "rooms", "stock_tracker"],
    access_level: "staff_admin"
  },
  regularStaff: {
    is_staff: true,
    is_superuser: false,
    allowed_navs: ["home", "reception"],
    access_level: "regular_staff"
  },
  noPermissions: {
    is_staff: true,
    is_superuser: false,
    allowed_navs: [],
    access_level: "regular_staff"
  },
  nonStaff: {
    is_staff: false,
    is_superuser: false,
    allowed_navs: [],
    access_level: null
  }
};

// Test cases for layout mode
const layoutTests = [
  // CRITICAL: Booking routes must be public
  ["/booking/hotel-killarney", "public", "CRITICAL booking route fix"],
  ["/booking/hotel-x", "public", "Booking with different hotel"],
  ["/booking/test-hotel-123", "public", "Booking with number in slug"],
  
  // Public routes
  ["/", "public", "Home page"],
  ["/hotel/hotel-killarney", "public", "Public hotel page"],
  ["/hotel-killarney", "public", "Hotel slug only"],
  ["/hotel-killarney/book", "public", "Hotel booking page"],
  ["/my-bookings", "public", "My bookings page"],
  ["/booking/confirmation/abc123", "public", "Booking confirmation"],
  ["/booking/payment/xyz789", "public", "Payment page"],
  
  // Auth routes
  ["/login", "auth", "Login page"],
  ["/register", "auth", "Registration"],
  ["/staff/login", "auth", "Staff login"],
  ["/forgot-password", "auth", "Password reset"],
  
  // Guest routes
  ["/room_services/hotel-x/room/101/menu", "guest", "Room service menu"],
  ["/chat/hotel-x/conversations/123/messages", "guest", "Guest chat"],
  ["/good_to_know/hotel-x/wifi-info", "guest", "Guest info"],
  ["/games/quiz", "guest", "Quiz game"],
  
  // Staff routes
  ["/reception", "staff", "Reception desk"],
  ["/rooms", "staff", "Rooms management"],
  ["/stock_tracker/inventory", "staff", "Stock tracker"],
  ["/staff/hotel-x/dashboard", "staff", "Staff dashboard"],
];

// Test cases for staff access
const accessTests = [
  // Superuser access
  {
    user: mockUsers.superuser,
    pathname: "/stock_tracker/inventory", 
    expected: true,
    description: "Superuser can access all routes"
  },
  
  // Staff admin with permissions
  {
    user: mockUsers.staffAdmin,
    pathname: "/reception",
    expected: true, 
    description: "Staff admin with reception permission"
  },
  {
    user: mockUsers.staffAdmin,
    pathname: "/stock_tracker/dashboard",
    expected: true,
    description: "Staff admin with stock_tracker permission"
  },
  
  // Staff admin without permissions
  {
    user: mockUsers.staffAdmin,
    pathname: "/maintenance/tasks",
    expected: false,
    description: "Staff admin without maintenance permission"
  },
  
  // Regular staff with limited permissions
  {
    user: mockUsers.regularStaff,
    pathname: "/reception",
    expected: true,
    description: "Regular staff with reception permission"
  },
  {
    user: mockUsers.regularStaff,
    pathname: "/stock_tracker/inventory", 
    expected: false,
    description: "Regular staff without stock_tracker permission"
  },
  
  // No permissions
  {
    user: mockUsers.noPermissions,
    pathname: "/reception",
    expected: false,
    description: "Staff with no permissions"
  },
  
  // Non-staff user
  {
    user: mockUsers.nonStaff,
    pathname: "/reception",
    expected: false,
    description: "Non-staff user should be denied"
  },
  
  // Unmapped route (deny by default)
  {
    user: mockUsers.staffAdmin,
    pathname: "/some/unknown/route",
    expected: false,
    description: "Unmapped route should be denied by default"
  }
];

// Run layout mode tests
export function runLayoutTests() {
  console.log('\n🧪 Layout Mode Tests');
  console.log('==================');
  
  let passed = 0;
  let failed = 0;
  
  layoutTests.forEach(([pathname, expected, description]) => {
    const result = getLayoutMode(pathname);
    const success = result === expected;
    
    if (success) {
      passed++;
      console.log(`✅ ${pathname} → ${result} (${description})`);
    } else {
      failed++;
      console.log(`❌ ${pathname} → ${result} (expected: ${expected}) - ${description}`);
    }
  });
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Run staff access tests
export function runAccessTests() {
  console.log('\n🔐 Staff Access Tests');
  console.log('====================');
  
  let passed = 0;
  let failed = 0;
  
  accessTests.forEach(({ user, pathname, expected, description }) => {
    const result = canAccessStaffPath({ pathname, user });
    const success = result.allowed === expected;
    
    if (success) {
      passed++;
      console.log(`✅ ${description}`);
      console.log(`   ${pathname} → ${result.allowed ? 'ALLOWED' : 'DENIED'}`);
      if (result.reason) console.log(`   Reason: ${result.reason}`);
    } else {
      failed++;
      console.log(`❌ ${description}`);
      console.log(`   ${pathname} → ${result.allowed ? 'ALLOWED' : 'DENIED'} (expected: ${expected ? 'ALLOWED' : 'DENIED'})`);
      console.log(`   Reason: ${result.reason}`);
    }
    console.log('');
  });
  
  console.log(`Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Test permission validation
export function runValidationTests() {
  console.log('\n🔍 Permission Validation Tests');
  console.log('=============================');
  
  const validationTests = [
    { user: mockUsers.superuser, expected: true, name: "Valid superuser" },
    { user: mockUsers.staffAdmin, expected: true, name: "Valid staff admin" },
    { user: { is_staff: "true", allowed_navs: "not-array" }, expected: false, name: "Invalid data types" },
    { user: null, expected: false, name: "Null user" },
    { user: { is_staff: true, allowed_navs: [], access_level: "invalid" }, expected: false, name: "Invalid access level" }
  ];
  
  let passed = 0;
  let failed = 0;
  
  validationTests.forEach(({ user, expected, name }) => {
    const result = validateUserPermissions(user);
    const success = result.valid === expected;
    
    if (success) {
      passed++;
      console.log(`✅ ${name}`);
    } else {
      failed++;
      console.log(`❌ ${name}`);
      console.log(`   Expected: ${expected ? 'valid' : 'invalid'}, Got: ${result.valid ? 'valid' : 'invalid'}`);
      if (result.issues.length > 0) {
        console.log(`   Issues: ${result.issues.join(', ')}`);
      }
    }
  });
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Run all tests
export function runAllTests() {
  console.log('🚀 Running Unified Layout Policy Tests\n');
  
  const layoutResults = runLayoutTests();
  const accessResults = runAccessTests(); 
  const validationResults = runValidationTests();
  
  const totalPassed = layoutResults.passed + accessResults.passed + validationResults.passed;
  const totalFailed = layoutResults.failed + accessResults.failed + validationResults.failed;
  const totalTests = totalPassed + totalFailed;
  
  console.log('\n📊 OVERALL RESULTS');
  console.log('==================');
  console.log(`✅ Passed: ${totalPassed}/${totalTests}`);
  console.log(`❌ Failed: ${totalFailed}/${totalTests}`);
  console.log(`Success Rate: ${totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0}%`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Policy implementation is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the issues above.');
  }
  
  return { totalPassed, totalFailed, totalTests };
}