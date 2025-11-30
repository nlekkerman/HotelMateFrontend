# Attendance System - Manual QA Checklist

This checklist is designed for hotel managers and non-technical staff to test the attendance system functionality step-by-step.

## Prerequisites
- You must be logged in as a manager or authorized staff member
- Your hotel should have staff, departments, and roster periods set up
- Test with Chrome, Firefox, or Safari browsers
- Test on both desktop and mobile devices

## ⚙️ Basic Navigation & Access

### ✅ 1. Access Attendance Dashboard
- [ ] Navigate to the attendance section from the main menu
- [ ] Verify you can see "Attendance Dashboard" heading
- [ ] Confirm your hotel name is displayed correctly
- [ ] Check that the page loads without errors

**Expected Result**: Dashboard loads showing your hotel's attendance data

---

## 📅 Date & Filter Controls

### ✅ 2. Test Date Filter
- [ ] Change the date using the date picker
- [ ] Verify data updates for the selected date
- [ ] Try selecting dates with no data
- [ ] Try selecting future dates

**Expected Result**: Data should update to match selected date. Empty states should show helpful messages.

### ✅ 3. Test Department Filter
- [ ] Select "All departments" (default)
- [ ] Change to a specific department
- [ ] Verify only staff from that department appear
- [ ] Switch between different departments

**Expected Result**: Staff list filters correctly by department

---

## 📊 Roster Period Management

### ✅ 4. Test Period Selector
- [ ] Click the period selector dropdown
- [ ] See list of available roster periods
- [ ] Select different periods
- [ ] Verify period information updates

**Expected Result**: Period selection changes the data context and shows period-specific stats

### ✅ 5. Test Period Summary
- [ ] Select a period with data
- [ ] Verify stats show correctly (total logs, open logs, unapproved logs, approved hours)
- [ ] Check if finalization is available/disabled appropriately

**Expected Result**: Stats accurately reflect the period's attendance data

### ✅ 6. Test Period Finalization
- [ ] Select an unfinalized period with all logs approved
- [ ] Click "Finalize Period"
- [ ] Confirm the action in any popup
- [ ] Verify period shows as "Finalized"
- [ ] Try to finalize a period with unresolved logs (should be blocked)

**Expected Result**: Only clean periods can be finalized. Finalized periods are read-only.

---

## 📋 Staff Attendance Table

### ✅ 7. Test Staff List Display
- [ ] Verify all expected staff appear for the date
- [ ] Check that staff names display correctly
- [ ] Verify planned shift times show properly
- [ ] Check actual clock times display correctly
- [ ] Confirm status badges show appropriate colors and text

**Expected Result**: All staff data displays clearly and accurately

### ✅ 8. Test Staff Search
- [ ] Type a staff member's name in the search box
- [ ] Verify results filter in real-time
- [ ] Try partial names
- [ ] Try names that don't exist
- [ ] Clear the search box

**Expected Result**: Search filters staff list accurately and responsively

### ✅ 9. Test Status Filter
- [ ] Use the status dropdown to filter by different statuses:
  - [ ] All statuses
  - [ ] On duty
  - [ ] Unrostered – pending
  - [ ] Completed
  - [ ] No clock log
  - [ ] Unrostered approved
  - [ ] Rejected

**Expected Result**: Each filter shows only staff matching that status

---

## ⚡ Real-time Updates & Alerts

### ✅ 10. Test Alert System
- [ ] Look for alert notifications at top of dashboard
- [ ] Check different alert types if available:
  - [ ] Unrostered requests
  - [ ] Break warnings
  - [ ] Overtime warnings  
  - [ ] Hard limit warnings
- [ ] Test dismissing alerts
- [ ] For hard limit alerts, test action buttons (stay/clock out)

**Expected Result**: Alerts appear promptly and actions work correctly

### ✅ 11. Test Real-time Updates
- [ ] Keep dashboard open while someone clocks in/out
- [ ] Verify data updates automatically
- [ ] Check that new logs appear without refresh
- [ ] Confirm alerts appear for new unrostered requests

**Expected Result**: Dashboard updates in real-time without manual refresh

---

## 👤 Staff Detail Modal

### ✅ 12. Test Staff Details
- [ ] Click on any staff row to open details
- [ ] Verify modal opens with correct staff name
- [ ] Check that all logs for the staff show correctly
- [ ] Verify time ranges, locations, and statuses display properly
- [ ] Test closing modal with X button
- [ ] Test closing modal by clicking outside
- [ ] Test keyboard ESC to close

**Expected Result**: Modal shows complete staff attendance history accurately

---

## ✅ Approve/Reject Actions

### ✅ 13. Test Unrostered Log Approval
- [ ] Find staff with "Unrostered – pending" status
- [ ] Click "Approve" button
- [ ] Verify button shows loading state
- [ ] Confirm log status updates to approved
- [ ] Check that staff status changes appropriately

**Expected Result**: Approval works smoothly with proper feedback

### ✅ 14. Test Unrostered Log Rejection
- [ ] Find staff with "Unrostered – pending" status
- [ ] Click "Reject" button
- [ ] Verify button shows loading state
- [ ] Confirm log status updates to rejected
- [ ] Check that staff status changes appropriately

**Expected Result**: Rejection works smoothly with proper feedback

---

## 📊 Export Functionality

### ✅ 15. Test CSV Export
- [ ] Select a roster period
- [ ] Click "Export CSV"
- [ ] Verify file downloads
- [ ] Open CSV file and check data accuracy
- [ ] Test with different periods

**Expected Result**: CSV downloads with correct attendance data

### ✅ 16. Test Excel Export
- [ ] Select a roster period  
- [ ] Click "Export Excel"
- [ ] Verify file downloads
- [ ] Open Excel file and check formatting
- [ ] Test with different periods

**Expected Result**: Excel downloads with properly formatted data

---

## 📱 Mobile Responsiveness

### ✅ 17. Test Mobile Layout
- [ ] Open attendance dashboard on mobile device
- [ ] Verify header and controls stack properly
- [ ] Check that table scrolls horizontally if needed
- [ ] Test all filters and controls work on mobile
- [ ] Verify modal opens and functions properly on mobile
- [ ] Test alerts don't overflow on small screens

**Expected Result**: All functionality works smoothly on mobile devices

---

## 🚨 Error Handling

### ✅ 18. Test Network Issues
- [ ] Temporarily disconnect internet
- [ ] Try to perform actions (should show appropriate errors)
- [ ] Reconnect and verify system recovers
- [ ] Check error messages are user-friendly

**Expected Result**: Graceful error handling with helpful messages

### ✅ 19. Test No Data Scenarios
- [ ] Select dates with no roster data
- [ ] Select departments with no staff
- [ ] Verify empty states show helpful messages
- [ ] Check "Clear Filters" button works when no results

**Expected Result**: Empty states provide clear guidance to users

### ✅ 20. Test Loading States
- [ ] Watch for loading indicators during data fetch
- [ ] Verify loading states don't last too long
- [ ] Check that loading doesn't block the interface

**Expected Result**: Loading states provide good user feedback

---

## 🔒 Security & Permissions

### ✅ 21. Test Hotel Data Isolation
- [ ] Verify you only see data from your hotel
- [ ] Confirm you cannot access other hotel data
- [ ] Check that all staff, periods, and logs belong to your hotel

**Expected Result**: Complete data isolation between hotels

---

## ✍️ Final Verification

### ✅ 22. Overall System Check
- [ ] All major features work as expected
- [ ] No JavaScript errors in browser console
- [ ] All buttons and actions provide feedback
- [ ] Data accuracy is maintained throughout
- [ ] Mobile experience is fully functional
- [ ] System handles edge cases gracefully

---

## 🐛 Bug Report Template

If you find issues, please report them with:

**Bug Title**: Brief description of the issue

**Steps to Reproduce**:
1. Step 1
2. Step 2  
3. Step 3

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happened

**Browser**: Chrome/Firefox/Safari version

**Device**: Desktop/Mobile/Tablet

**Screenshot**: If applicable

**Console Errors**: Check browser console (F12) for red error messages

---

## 🎯 Testing Tips

- **Test with real data**: Use actual staff schedules and clock logs
- **Test edge cases**: Try unusual times, overnight shifts, long names
- **Test multiple users**: Have different staff test simultaneously
- **Test different roles**: Verify permissions work correctly
- **Document issues**: Keep notes of any problems found

## ✅ Sign-off

**Tester Name**: _________________

**Date**: _________________

**Hotel**: _________________

**Overall Result**: ✅ PASS / ❌ FAIL

**Notes**:
_________________________________________________
_________________________________________________
_________________________________________________