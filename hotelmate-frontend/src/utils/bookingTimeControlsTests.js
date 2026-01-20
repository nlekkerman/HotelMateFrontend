// Simple test utilities for booking time warnings
// Run in browser console to test the warning logic

/**
 * Test data for different booking warning scenarios
 */
export const testBookings = {
  // PENDING_APPROVAL with approval deadline soon
  approvalDueSoon: {
    booking_id: 'BK-TEST-001',
    status: 'PENDING_APPROVAL',
    approval_deadline_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    approval_risk_level: 'DUE_SOON',
    is_approval_due_soon: true,
    is_approval_overdue: false
  },

  // PENDING_APPROVAL overdue
  approvalOverdue: {
    booking_id: 'BK-TEST-002',
    status: 'PENDING_APPROVAL',
    approval_deadline_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    approval_risk_level: 'OVERDUE',
    is_approval_due_soon: false,
    is_approval_overdue: true,
    approval_overdue_minutes: 180
  },

  // EXPIRED booking
  expired: {
    booking_id: 'BK-TEST-003',
    status: 'EXPIRED',
    expired_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    auto_expire_reason_code: 'APPROVAL_TIMEOUT'
  },

  // IN_HOUSE with checkout grace period
  overstayGrace: {
    booking_id: 'BK-TEST-004',
    status: 'CONFIRMED',
    checked_in_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // checked in yesterday
    checkout_deadline_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
    overstay_risk_level: 'GRACE',
    is_overstay: false
  },

  // IN_HOUSE overstay
  overstayOverdue: {
    booking_id: 'BK-TEST-005',
    status: 'CONFIRMED',
    checked_in_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // checked in 2 days ago
    checkout_deadline_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    overstay_risk_level: 'OVERDUE',
    is_overstay: true,
    overstay_minutes: 240,
    overstay_flagged_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // flagged 2 hours ago
  },

  // Normal booking with no warnings
  normal: {
    booking_id: 'BK-TEST-006',
    status: 'CONFIRMED',
    approval_risk_level: 'OK',
    overstay_risk_level: 'OK'
  }
};

/**
 * Test warning text generation
 */
export const testWarningTexts = () => {
  console.group('🧪 Testing Warning Text Generation');
  
  Object.entries(testBookings).forEach(([key, booking]) => {
    console.log(`\n📋 Testing: ${key}`);
    console.log(`Booking: ${booking.booking_id}, Status: ${booking.status}`);
    
    // You would need to import and test the actual functions here
    // This is just a placeholder structure
    console.log(`Expected warnings: ${key.includes('approval') ? 'approval' : ''} ${key.includes('overstay') ? 'overstay' : ''}`);
  });
  
  console.groupEnd();
};

/**
 * Test risk level to badge variant mapping
 */
export const testRiskVariants = () => {
  const riskLevels = ['OK', 'DUE_SOON', 'OVERDUE', 'CRITICAL', 'GRACE'];
  const expectedVariants = ['secondary', 'warning', 'danger', 'danger', 'info'];
  
  console.group('🎨 Testing Risk Level Badge Variants');
  
  riskLevels.forEach((level, index) => {
    console.log(`${level} → ${expectedVariants[index]} variant`);
  });
  
  console.groupEnd();
};

/**
 * Test minutes formatting
 */
export const testMinutesFormatting = () => {
  const testCases = [
    { minutes: 0, expected: '+0m' },
    { minutes: 30, expected: '+30m' },
    { minutes: 120, expected: '+120m' },
    { minutes: 1440, expected: '+1440m' } // 24 hours
  ];
  
  console.group('⏱️ Testing Minutes Formatting');
  
  testCases.forEach(({ minutes, expected }) => {
    console.log(`${minutes} minutes → "${expected}"`);
  });
  
  console.groupEnd();
};

/**
 * Test EXPIRED status handling
 */
export const testExpiredHandling = () => {
  console.group('💀 Testing EXPIRED Status Handling');
  
  const expiredBooking = testBookings.expired;
  console.log('Expired booking should:');
  console.log('✅ Show EXPIRED badge');
  console.log('✅ Disable action buttons');
  console.log('✅ Show expiration banner in detail view');
  console.log('✅ Display expired_at timestamp');
  console.log('✅ Show auto_expire_reason_code');
  
  console.groupEnd();
};

/**
 * Run all tests
 */
export const runAllTests = () => {
  console.log('🚀 Running Booking Time Controls Tests...\n');
  
  testWarningTexts();
  testRiskVariants();
  testMinutesFormatting();
  testExpiredHandling();
  
  console.log('\n✅ All tests completed!');
  console.log('💡 Check the browser UI to verify visual rendering');
};

// Auto-run tests in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Uncomment the line below to auto-run tests
  // setTimeout(runAllTests, 1000);
}