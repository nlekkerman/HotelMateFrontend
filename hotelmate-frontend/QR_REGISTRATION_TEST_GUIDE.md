# QR Code Registration System - Testing Guide

## ✅ Implementation Complete!

The QR Code Staff Registration System has been successfully implemented in your frontend. Here's what was added:

### 📁 Files Modified/Created

1. **Register.jsx** (Modified)
   - Added QR token extraction from URL parameters
   - Added hotel slug detection
   - Enhanced form to include QR token in registration payload
   - Added visual indicator when QR code is detected

2. **QRRegistrationManager.jsx** (New)
   - Component for generating registration packages
   - QR code display and download
   - Print functionality
   - Package history tracking

3. **Settings.jsx** (Modified)
   - Integrated QRRegistrationManager component
   - Enhanced layout for better organization

---

## 🧪 Testing Instructions

### Test 1: Generate Registration Package (Manager/HR)

1. **Login as manager/admin**
   - Navigate to Settings page
   - You should see "Staff Registration Packages" section

2. **Click "Generate New Registration Package"**
   - Button should show loading spinner
   - After ~2-3 seconds, package should appear below
   - You should see:
     - ✅ QR Code image
     - ✅ Registration code (e.g., "STAFF2024")
     - ✅ Hotel name
     - ✅ Status: "Available"

3. **Test Download QR Code**
   - Click "Download QR" button
   - PNG file should download with name: `registration-qr-STAFF2024.png`

4. **Test Copy Code**
   - Click copy button next to registration code
   - Alert should confirm "Registration code copied to clipboard!"
   - Paste somewhere to verify it copied correctly

5. **Test Print Package**
   - Click "Print Package" button
   - Print preview should open in new window
   - Should show:
     - ✅ Hotel name
     - ✅ QR code
     - ✅ Registration code (large, clear)
     - ✅ Instructions for employee
   - Close print preview (don't need to actually print)

---

### Test 2: QR Code Registration Flow (Employee)

#### Option A: Using Real Phone Camera (Recommended)

1. **Print or display the QR code on screen**
   - From the package generated in Test 1

2. **Scan with phone camera**
   - Point phone camera at QR code
   - Tap the notification that appears
   - Browser should open with URL like:
     ```
     https://yoursite.com/register?token=xJ8kL9mN...&hotel=grand-plaza
     ```

3. **Verify Registration Page**
   - Should see green alert: "QR Code Detected! Registration for [hotel-name]"
   - Form should be ready to fill

4. **Complete Registration**
   - Enter username: `test_employee_qr`
   - Enter password: `TestPass123!`
   - Confirm password: `TestPass123!`
   - **Copy the registration code** from the printed package
   - Enter registration code: `STAFF2024` (or whatever was generated)
   - Click "Register"

5. **Expected Result**
   - ✅ Registration successful
   - ✅ Redirected to registration success page
   - ✅ Message shows account created, pending approval

#### Option B: Manual Testing (Browser Only)

1. **Copy the QR code URL**
   - Right-click QR code image
   - Copy image address
   - Paste into a QR decoder website (e.g., https://zxing.org/w/decode.jspx)
   - Copy the decoded URL

2. **Open URL in browser**
   - Paste URL into address bar
   - Should redirect to register page with parameters

3. **Follow steps 3-5 from Option A**

---

### Test 3: Security Validations

#### Test 3.1: Registration Code Only (Should Fail)

1. Go to `/register` (no URL parameters)
2. Enter username, password
3. Enter the registration code from package
4. Submit
5. **Expected:** ❌ Error - "Invalid registration credentials" or similar
   - Because QR token is missing

#### Test 3.2: QR Token Only (Should Fail)

1. Go to `/register?token=xJ8kL9mN...&hotel=grand-plaza`
2. Enter username, password
3. Enter **WRONG** registration code (e.g., "FAKE123")
4. Submit
5. **Expected:** ❌ Error - "Invalid registration code"

#### Test 3.3: Both Correct (Should Pass)

1. Go to `/register?token=xJ8kL9mN...&hotel=grand-plaza`
2. Enter username, password
3. Enter **CORRECT** registration code
4. Submit
5. **Expected:** ✅ Success - Registration complete

#### Test 3.4: Reuse Same Code (Should Fail)

1. Complete Test 3.3 successfully
2. Try to register again with same code and token
3. **Expected:** ❌ Error - "Registration code already used"

---

## 🔍 What to Check in Browser Console

### On Registration Page Load

You should see:
```
🔐 QR Registration detected: { token: 'xJ8kL9mN...', hotel: 'grand-plaza' }
```

### On Form Submit

You should see:
```
🚀 Sending registration request: {
  endpoint: '/staff/register/',
  payload: {
    username: 'test_user',
    password: '[HIDDEN]',
    registration_code: 'STAFF2024',
    qr_token: '[PRESENT]'
  }
}
```

### On Success

You should see:
```
✅ Registration response: { ... }
💾 Storing user data: { ... }
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to generate package"

**Possible Causes:**
- Not logged in
- Not admin/manager
- Backend API endpoint not configured

**Solution:**
1. Check console for error details
2. Verify you're logged in as admin
3. Check backend is running
4. Verify API URL in `.env` file

---

### Issue 2: QR Code doesn't scan

**Possible Causes:**
- QR code image not loading
- Cloudinary URL blocked
- Image too small

**Solution:**
1. Right-click QR image → "Open in new tab"
2. Verify image loads
3. Try zooming in before scanning
4. Ensure good lighting when scanning

---

### Issue 3: "Invalid registration credentials"

**Possible Causes:**
- QR token missing from URL
- Registration code doesn't match token
- Code already used

**Solution:**
1. Check URL has both `token` and `hotel` parameters
2. Verify you copied the correct registration code
3. Try generating a new package

---

### Issue 4: CORS errors

**Possible Causes:**
- Backend CORS not configured for frontend domain
- API URL mismatch

**Solution:**
1. Check `.env` file has correct `VITE_API_URL`
2. Verify backend allows your frontend domain
3. Check browser console for exact CORS error

---

## 📊 Backend Verification

### Check in Django Admin

1. Login to Django admin: `http://localhost:8000/admin/`
2. Navigate to: **Staff > Registration Codes**
3. You should see your generated packages
4. After successful registration:
   - "Used by" field should show the username
   - "Used at" should show timestamp

---

## 🎯 Full End-to-End Test Checklist

- [ ] Manager can login
- [ ] Settings page loads
- [ ] QR Registration Manager component appears
- [ ] "Generate Package" button works
- [ ] QR code image displays
- [ ] Registration code displays
- [ ] Copy to clipboard works
- [ ] Download QR works
- [ ] Print preview works with correct formatting
- [ ] QR code scans with phone camera
- [ ] Register page detects QR parameters
- [ ] Green "QR Code Detected" alert shows
- [ ] Form submission includes QR token
- [ ] Registration succeeds with correct code + token
- [ ] Registration fails without QR token
- [ ] Registration fails with wrong code
- [ ] Registration fails when code already used
- [ ] Django admin shows used registration code
- [ ] Recent packages list updates

---

## 🚀 Production Deployment Checklist

Before deploying to production:

- [ ] Update `VITE_API_URL` in production `.env`
- [ ] Test QR scanning on production URL
- [ ] Verify Cloudinary images load on production
- [ ] Test from mobile device
- [ ] Test from different browsers
- [ ] Ensure HTTPS is enabled (required for camera access)
- [ ] Test print formatting on different browsers
- [ ] Verify error messages are user-friendly
- [ ] Test with real hotel slugs
- [ ] Confirm backend API is production-ready

---

## 📱 Mobile Testing

### iOS Safari
- [ ] QR code scans from camera app
- [ ] Registration page loads correctly
- [ ] Form is mobile-responsive
- [ ] Touch interactions work

### Android Chrome
- [ ] QR code scans from camera app
- [ ] Registration page loads correctly
- [ ] Form is mobile-responsive
- [ ] Touch interactions work

---

## 🎓 User Training Notes

**For HR/Managers:**
1. Go to Settings
2. Click "Generate New Registration Package"
3. Print the package (or download QR + write code on paper)
4. Give to new employee

**For New Employees:**
1. Receive package from HR
2. Scan QR code with phone camera
3. Fill in username and password
4. Enter the registration code from paper
5. Submit and wait for approval

---

## 📞 Support & Debugging

**Enable Debug Mode:**
```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

**Check Registration Data:**
```javascript
// In browser console
console.log(JSON.parse(localStorage.getItem('user')));
```

**Test API Endpoint Directly:**
```bash
# Generate package
curl -X POST https://your-backend.com/api/staff/registration-package/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hotel_slug": "grand-plaza"}'

# Register with QR
curl -X POST https://your-backend.com/api/staff/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "password": "TestPass123",
    "registration_code": "STAFF2024",
    "qr_token": "xJ8kL9mN..."
  }'
```

---

## ✅ Success Criteria

Your implementation is successful if:

1. ✅ Manager can generate packages
2. ✅ QR codes are scannable
3. ✅ Registration requires both code + token
4. ✅ Old codes still work (backward compatible)
5. ✅ Error handling is clear
6. ✅ Mobile experience is smooth
7. ✅ Print formatting is professional
8. ✅ Security validations work

---

**Implementation Status:** ✅ **COMPLETE**  
**Next Step:** Start testing with Test 1 above!

Good luck! 🚀
