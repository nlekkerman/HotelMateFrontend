# 🧪 FCM Testing Guide - Step by Step

This guide will help you test Firebase Cloud Messaging implementation.

---

## Prerequisites Checklist

Before testing, ensure you have:

- [ ] Firebase package installed (`npm install firebase` - ✅ Already done)
- [ ] Backend FCM implementation complete (✅ According to backend summary)
- [ ] Firebase Console access (Project: hotel-mate-d878f)
- [ ] .env file ready to create

---

## Step 1: Get Firebase Credentials

### 1.1 Access Firebase Console

1. Go to https://console.firebase.google.com/
2. Select project: **hotel-mate-d878f**
3. Click the **⚙️ gear icon** → **Project settings**

### 1.2 Get Web App Configuration

1. Scroll down to **"Your apps"** section
2. If you don't see a web app (</> icon):
   - Click **"Add app"**
   - Select **Web** (</> icon)
   - Give it a nickname (e.g., "HotelMate Web")
   - **Don't** check "Also set up Firebase Hosting"
   - Click **"Register app"**

3. You'll see a config object like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "hotel-mate-d878f.firebaseapp.com",
  projectId: "hotel-mate-d878f",
  storageBucket: "hotel-mate-d878f.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

4. **Copy these values** - you'll need them in Step 2

### 1.3 Get VAPID Key

1. Still in **Project Settings**
2. Click the **"Cloud Messaging"** tab
3. Scroll to **"Web Push certificates"**
4. If you see a key pair already: **Copy the key**
5. If not: Click **"Generate key pair"** → **Copy the key**

The VAPID key looks like: `BHdP5...` (starts with B, ~90 characters)

---

## Step 2: Configure Environment Variables

### 2.1 Create .env File

In the `hotelmate-frontend` folder:

```bash
# Windows PowerShell
cd hotelmate-frontend
Copy-Item .env.example .env
```

### 2.2 Fill in Firebase Values

Open `.env` and add your values from Step 1:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyC_YOUR_ACTUAL_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=hotel-mate-d878f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hotel-mate-d878f
VITE_FIREBASE_STORAGE_BUCKET=hotel-mate-d878f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
VITE_FIREBASE_VAPID_KEY=BHdP5_YOUR_VAPID_KEY_HERE

# API Base URL (use your backend URL)
VITE_API_BASE_URL=http://localhost:8000
```

**Important**: Replace the placeholder values with your actual Firebase credentials!

---

## Step 3: Update Service Worker

### 3.1 Edit firebase-messaging-sw.js

Open `public/firebase-messaging-sw.js` and update the config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC_YOUR_ACTUAL_KEY",  // ← Replace
  authDomain: "hotel-mate-d878f.firebaseapp.com",
  projectId: "hotel-mate-d878f",
  storageBucket: "hotel-mate-d878f.appspot.com",
  messagingSenderId: "123456789012",  // ← Replace
  appId: "1:123456789012:web:abc123def456"  // ← Replace
};
```

**Use the same values from your .env file** (except don't use VITE_ prefix in service worker)

---

## Step 4: Start Development Server

```bash
# Make sure you're in hotelmate-frontend folder
cd hotelmate-frontend

# Start dev server
npm run dev
```

The app should start at `http://localhost:5173` (or similar)

---

## Step 5: Test Using Debug Panel

### 5.1 Login

1. Open browser to `http://localhost:5173`
2. Login as a staff member (ideally a Porter for real notifications)

### 5.2 Go to Settings

1. Navigate to **Settings** page (usually `/settings` in the menu)
2. You should see:
   - **Customize Hotel** section
   - **Notifications** section
   - **FCM Debug & Test Panel** (at the bottom)

### 5.3 Run Through Test Panel

In the **FCM Debug & Test Panel**:

#### Step 1: Check Config
1. Click **"Check Config"** button
2. Look at the logs (dark terminal area below buttons)
3. You should see **✅** for all environment variables
4. If you see **❌ MISSING**, go back to Step 2

#### Step 2: Request Permission
1. Click **"Request Permission"** button
2. Browser will show a notification permission prompt
3. Click **"Allow"**
4. Logs should show: ✅ Permission granted!

#### Step 3: Get FCM Token
1. Click **"Get FCM Token"** button
2. Logs should show:
   - Service worker registered
   - FCM token obtained
   - Token saved to backend
3. Check "Current Status" box - should show:
   - Permission: **granted**
   - FCM Token: **✅ Saved**
   - Service Worker: **✅ Active**

#### Step 4: Test Notification
1. Click **"Test Notification"** button
2. You should see a browser notification appear:
   - Title: "Test Notification"
   - Body: "FCM is working correctly!"

---

## Step 6: Test Real Notifications

### 6.1 Verify Backend Setup

Check that your backend is running and FCM token was saved:

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for: "FCM token saved to backend: ..." message
4. Or check in **Application** tab → **Local Storage** → look for `fcm_token`

### 6.2 Test with App Open (Foreground)

1. Keep the app open in your browser
2. From another browser/device, create a test order:
   - Create a room service order or breakfast order
3. You should see:
   - Browser notification popup
   - Console log: "Foreground message received: ..."

### 6.3 Test with App Closed (Background) ⭐

This is the main test!

1. **Close the browser tab completely** (or minimize browser)
2. From another device/browser, create a test order
3. You should see:
   - **Desktop notification** (lock screen / system tray)
   - Notification shows order details
   - Clicking notification should **open the app** and navigate to orders page

---

## Step 7: Verify in Backend

### Check Backend Logs

If you have access to backend, you can verify:

```bash
# In backend folder
cd HotelMateBackend

# Run the test script
python test_fcm_notifications.py
```

You should see:
```
✓ On-Duty Porters (1):
  - Your Name (ID: XX) - ✓ Has FCM token
```

---

## Troubleshooting

### Issue: "MISSING" environment variables

**Solution**:
1. Check `.env` file exists in `hotelmate-frontend/` folder
2. Verify no typos in variable names (must start with `VITE_`)
3. Restart dev server after changing `.env`

### Issue: "Service worker not registered"

**Solution**:
1. Check `firebase-messaging-sw.js` is in `public/` folder
2. Open DevTools → Application → Service Workers
3. Click "Unregister" on any old workers
4. Refresh page (Ctrl+F5)
5. Service worker requires HTTPS (or localhost)

### Issue: "Permission denied"

**Solution**:
1. Clear browser site data:
   - DevTools → Application → Clear storage → Clear site data
2. Refresh page
3. Try requesting permission again
4. Or try in incognito/private mode

### Issue: "No FCM token"

**Solution**:
1. Verify VAPID key is correct in `.env`
2. Check service worker is active (see above)
3. Check console for error messages
4. Try clicking "Get FCM Token" again
5. Verify `messaging` initialized in `firebase.js`

### Issue: "Token not saving to backend"

**Solution**:
1. Check you're logged in (verify in console: `localStorage.getItem('user')`)
2. Check network tab for POST to `/api/staff/save-fcm-token/`
3. Verify backend URL in `.env` (`VITE_API_BASE_URL`)
4. Check backend CORS settings allow your frontend origin
5. Look for error responses in network tab

### Issue: "No notifications received"

**Solution**:
1. Verify permission is granted (check debug panel)
2. Verify FCM token is saved (check debug panel)
3. Check backend logs - is it sending FCM notifications?
4. Verify user role is correct (Porter, on duty)
5. Test with "Test Notification" button first
6. Check browser notification settings (OS level)

### Issue: Browser notifications blocked

**Chrome/Edge**:
1. Click 🔒 icon in address bar
2. Find "Notifications"
3. Change to "Allow"

**Firefox**:
1. Click 🔒 icon in address bar
2. Find "Permissions" → "Notifications"
3. Remove block

---

## Expected Results

### ✅ Success Indicators:

1. **Debug Panel shows**:
   - Browser Support: ✅
   - Permission: granted
   - FCM Token: ✅ Saved
   - Service Worker: ✅ Active
   - User: ✅ [your username]

2. **Console logs show**:
   - "FCM initialized successfully"
   - "FCM Token obtained: ..."
   - "FCM token saved to backend: ..."
   - "Service Worker registered: ..."

3. **Test notification appears** when clicking "Test Notification"

4. **Real order notifications work**:
   - Foreground (app open): notification popup + console log
   - Background (app closed): desktop notification

5. **Backend confirms**:
   - Staff has FCM token in database
   - Test script shows "Has FCM token"

---

## Quick Test Commands

### Check if token is saved:
```javascript
// In browser console
localStorage.getItem('fcm_token')
```

### Check service worker:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service workers:', regs);
});
```

### Check notification permission:
```javascript
// In browser console
console.log('Permission:', Notification.permission);
```

### Manual test notification:
```javascript
// In browser console
new Notification('Manual Test', { body: 'Testing notifications' });
```

---

## Production Checklist

Before deploying to production:

- [ ] `.env` has production values
- [ ] `VITE_API_BASE_URL` points to production backend
- [ ] Service worker has production Firebase config
- [ ] All tests pass on localhost
- [ ] Testing on HTTPS domain (required for production)
- [ ] Backend CORS allows production domain
- [ ] Firebase Console → Authorized domains includes production domain

---

## Next Steps After Testing

Once everything works:

1. ✅ Remove or comment out `<FCMTest />` from Settings.jsx (production)
2. ✅ Test on production/staging environment
3. ✅ Train staff on granting notification permissions
4. ✅ Monitor backend logs for FCM send success/failures
5. ✅ Set up error tracking for notification failures

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs
3. Review `FCM_WEB_IMPLEMENTATION_GUIDE.md`
4. Check Firebase Console → Cloud Messaging for quota/errors

---

**Testing Date**: November 3, 2025  
**Ready to test!** Follow the steps above and report any issues. 🚀
