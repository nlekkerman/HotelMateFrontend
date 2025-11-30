# Frontend Face Attendance QA Checklist

## Manual Testing Scenarios

### 1. Staff Profile Face Registration

**Test Case: Staff with No Face Data**
- [ ] Navigate to staff profile (own profile)
- [ ] Verify "Register Face Data" button is visible
- [ ] Click button → should navigate to `/face/{hotelSlug}/register?staffId={id}`
- [ ] Staff ID should be pre-filled and disabled
- [ ] Complete registration successfully
- [ ] Return to profile → button should be hidden
- [ ] Face status should show as registered

**Test Case: Staff with Existing Face Data**
- [ ] Navigate to staff profile with registered face
- [ ] Verify "Register Face Data" button is NOT visible
- [ ] Face status should indicate registration exists

**Test Case: Face Disabled for Staff**
- [ ] Configure face restrictions for staff department/role
- [ ] Navigate to staff profile
- [ ] Should show info message about face not being available
- [ ] No register button should be visible

### 2. Manager Face Control

**Test Case: Manager Views Staff Detail - No Face Data**
- [ ] Navigate to staff detail page as manager
- [ ] Verify "Face Registration: Missing" badge is shown
- [ ] Face Management section shows "Missing" alert
- [ ] "Register Face Data" button is available
- [ ] Click button → navigate to registration with pre-filled staff ID
- [ ] Complete registration → return to staff detail
- [ ] Face status should update to "Registered"

**Test Case: Manager Views Staff Detail - With Face Data**  
- [ ] Navigate to staff detail page for staff with face data
- [ ] Verify "Face Registration: Registered" badge is shown
- [ ] Face Management section shows "Registered" success alert
- [ ] "Revoke Face Data" button is available
- [ ] Click revoke → confirmation dialog appears
- [ ] Enter optional reason
- [ ] Confirm revoke → face status updates to "Missing"
- [ ] Registration options become available again

**Test Case: Face Configuration Restrictions**
- [ ] Set hotel face attendance to disabled
- [ ] Navigate to staff detail as manager
- [ ] Should show warning that face is not available for hotel
- [ ] No face management options should be available

### 3. Staff Directory Face Features

**Test Case: Face Registration Stats**
- [ ] Navigate to staff directory
- [ ] Verify stats card shows: Total Staff, With Face Data, Missing Face, Coverage %
- [ ] Numbers should be accurate based on actual staff face status

**Test Case: Face Status Filtering**
- [ ] Use "All Staff" filter → should show all staff
- [ ] Use "With Face Data" filter → should show only staff with registered faces
- [ ] Use "Missing Face Data" filter → should show only staff without faces
- [ ] Staff counts in filter buttons should match displayed results

**Test Case: Staff Card Face Indicators**
- [ ] Each staff card should show accurate face status badge
- [ ] "Face OK" (green) for registered staff
- [ ] "No Face" (yellow/orange) for unregistered staff
- [ ] Click staff card → navigate to staff detail for management

### 4. Face Clock-In Kiosk

**Test Case: Happy Path Clock-In**
- [ ] Navigate to `/face/{hotelSlug}/clock-in`
- [ ] Verify kiosk-style interface loads
- [ ] Select location from dropdown
- [ ] Capture face image successfully
- [ ] Confirm clock-in → should succeed
- [ ] Show success message with staff name
- [ ] Auto-reset after countdown (7 seconds)

**Test Case: Face Not Recognized**
- [ ] Attempt clock-in with unrecognized face
- [ ] Should show clear error message
- [ ] Error code should be displayed
- [ ] "Try Again" option should be available
- [ ] Auto-reset should occur

**Test Case: Not Rostered Warning**
- [ ] Clock-in when not on roster
- [ ] Should show "Not on Roster" error with specific messaging
- [ ] Should suggest contacting manager
- [ ] Should not create clock log

**Test Case: Session Warnings**
- [ ] Clock-in after 6+ hours → should show break warning
- [ ] Clock-in after 10+ hours → should show long session warning  
- [ ] Clock-in after 12+ hours → should show severe warning
- [ ] Warnings should be prominently displayed

**Test Case: Face Disabled Hotel**
- [ ] Set hotel face attendance to disabled
- [ ] Navigate to face clock-in page
- [ ] Should show disabled state immediately
- [ ] Clear message about face not being enabled
- [ ] No camera interface should be available

### 5. Face Registration Page

**Test Case: Staff ID Pre-filling**
- [ ] Navigate from staff profile → staff ID should be pre-filled
- [ ] Navigate from manager detail → staff ID should be pre-filled  
- [ ] Staff ID input should be disabled when pre-filled
- [ ] Direct navigation → staff ID should be empty and editable

**Test Case: Registration Flow**
- [ ] Enter/confirm staff ID → camera interface appears
- [ ] Capture clear face image
- [ ] Submit registration → should succeed
- [ ] Success message should include staff name
- [ ] Should navigate back to appropriate page (profile vs detail)

**Test Case: Registration Errors**
- [ ] Invalid staff ID → should show validation error
- [ ] Poor quality image → should show retry message
- [ ] Network error → should show error and allow retry

### 6. Configuration Respect

**Test Case: Hotel-Level Disabling**
- [ ] Disable face attendance at hotel level
- [ ] Staff profile should not show register button
- [ ] Staff detail should show info message about disabled feature
- [ ] Face clock-in page should show disabled state
- [ ] Staff directory should still show face status but no actions

**Test Case: Department Restrictions**
- [ ] Set face restrictions for specific departments
- [ ] Staff in restricted departments should see appropriate messages
- [ ] Staff in allowed departments should have normal functionality

**Test Case: Role Restrictions**
- [ ] Set face restrictions for specific roles
- [ ] Staff with restricted roles should see appropriate messages
- [ ] Staff with allowed roles should have normal functionality

### 7. Multi-Hotel Testing

**Test Case: Hotel Slug Context**
- [ ] Switch between different hotel slugs in URL
- [ ] All face-related features should respect current hotel context
- [ ] Face configuration should be loaded per hotel
- [ ] Staff lists and face data should be hotel-specific

### 8. Error Handling & Edge Cases

**Test Case: Network Connectivity**
- [ ] Test with poor network connection
- [ ] API timeouts should be handled gracefully
- [ ] User should see appropriate error messages
- [ ] Retry mechanisms should be available

**Test Case: Invalid Data**
- [ ] Staff with missing department/role data
- [ ] Corrupted face configuration
- [ ] Invalid hotel slugs
- [ ] Should fail gracefully with informative messages

## Performance Checks

- [ ] Face configuration loading is fast (<2s)
- [ ] Staff directory loads efficiently with face status
- [ ] Camera preview starts quickly
- [ ] Face registration completes in reasonable time
- [ ] Kiosk interface is responsive on touch devices

## Accessibility Checks

- [ ] All buttons have proper labels and tooltips
- [ ] Color-blind friendly status indicators
- [ ] High contrast mode support
- [ ] Keyboard navigation works throughout
- [ ] Screen reader compatibility

## Security Checks

- [ ] Face images are handled securely
- [ ] No face data exposed in client logs
- [ ] Proper permission checks on all admin actions
- [ ] Configuration data is validated

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Android Chrome)

## Notes

- Document any issues found during testing
- Include screenshots for UI/UX issues
- Note performance metrics for optimization
- Record any user feedback or suggestions