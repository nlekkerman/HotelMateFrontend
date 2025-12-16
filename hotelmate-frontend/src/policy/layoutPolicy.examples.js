import { getLayoutMode, getLayoutModeDescription } from './layoutPolicy.js';

/**
 * Test cases for layout mode classification
 * Use these to verify the layout policy works correctly
 */
export const LAYOUT_MODE_EXAMPLES = [
  // AUTH routes
  ["/login", "auth"],
  ["/logout", "auth"],
  ["/register", "auth"],
  ["/forgot-password", "auth"],
  ["/registration-success", "auth"],
  ["/reset-password/abc123", "auth"],
  ["/staff/login", "auth"],

  // GUEST routes (PIN-based)
  ["/hotel-killarney/room/101/validate-pin", "guest"],
  ["/chat/hotel-x/messages/room/101/validate-chat-pin", "guest"],
  ["/guest-booking/hotel-x/restaurant/main/room/101/validate-dinner-pin", "guest"],
  ["/room_services/hotel-x/room/101/menu", "guest"],
  ["/room_services/hotel-x/room/101/breakfast", "guest"],
  ["/chat/hotel-x/conversations/123/messages", "guest"],
  ["/guest-booking/hotel-x/restaurant/main/room/101", "guest"],
  ["/guest-booking/hotel-x/restaurant/main", "guest"],
  ["/good_to_know/hotel-x/wifi-info", "guest"],
  ["/games/quiz", "guest"],

  // PUBLIC routes (CRITICAL: booking flows must be public)
  ["/", "public"],
  ["/hotel/hotel-killarney", "public"],
  ["/hotel-killarney", "public"],
  ["/hotel-killarney/book", "public"],
  ["/hotel-killarney/my-bookings", "public"],
  ["/my-bookings", "public"],
  ["/booking/confirmation/abc123", "public"],
  ["/booking/payment/xyz789", "public"],
  // CRITICAL FIX: These must be public (not staff)
  ["/booking/hotel-killarney", "public"],
  ["/booking/hotel-x", "public"],
  ["/booking/test-hotel-123", "public"],

  // STAFF routes
  ["/reception", "staff"],
  ["/rooms", "staff"],
  ["/rooms/101", "staff"],
  ["/bookings", "staff"],
  ["/bookings/123", "staff"],
  ["/maintenance", "staff"],
  ["/maintenance/tasks", "staff"],
  ["/stock_tracker/inventory", "staff"],
  ["/games/memory-match", "staff"],
  ["/hotel_info/settings", "staff"],
  ["/good_to_know_console/manage", "staff"],
  ["/staff/hotel-x/dashboard", "staff"],
  ["/staff/hotel-x/feed", "staff"],
];

/**
 * Run all test cases and return results
 * @returns {Object} Test results with passed/failed counts and details
 */
export function runLayoutModeTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: LAYOUT_MODE_EXAMPLES.length,
    failures: [],
  };

  LAYOUT_MODE_EXAMPLES.forEach(([pathname, expected], index) => {
    const actual = getLayoutMode(pathname);
    if (actual === expected) {
      results.passed++;
    } else {
      results.failed++;
      results.failures.push({
        index: index + 1,
        pathname,
        expected,
        actual,
        description: `Expected ${getLayoutModeDescription(expected)}, got ${getLayoutModeDescription(actual)}`,
      });
    }
  });

  return results;
}

/**
 * Console-friendly test runner
 */
export function logLayoutModeTests() {
  console.log('\n🧪 Layout Mode Classification Tests');
  console.log('=====================================');
  
  const results = runLayoutModeTests();
  
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  
  if (results.failures.length > 0) {
    console.log('\n💥 Failures:');
    results.failures.forEach(failure => {
      console.log(`  ${failure.index}. ${failure.pathname}`);
      console.log(`     Expected: ${failure.expected} (${getLayoutModeDescription(failure.expected)})`);
      console.log(`     Actual:   ${failure.actual} (${getLayoutModeDescription(failure.actual)})`);
    });
  }
  
  console.log('\n' + '='.repeat(37));
  
  return results;
}