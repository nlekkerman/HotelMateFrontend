# Firebase Cloud Messaging (FCM) - Web Implementation Guide

## ✅ Implementation Complete

Firebase Cloud Messaging has been integrated into your React web application. This guide explains what was implemented and how to complete the setup.

---

## 📦 What Was Implemented

### 1. **Firebase Web SDK Installed**
- ✅ `firebase` package added to dependencies

### 2. **Core Files Created**

#### `src/services/firebase.js`
- Firebase app initialization
- Messaging instance configuration
- Reads config from environment variables

#### `src/services/FirebaseService.js`
- Complete FCM service wrapper
- Functions for:
  - Requesting notification permissions
  - Getting and saving FCM tokens
  - Listening to foreground messages
  - Handling notification clicks
  - Managing token lifecycle

#### `public/firebase-messaging-sw.js`
- Service worker for background notifications
- Handles messages when app is closed/background
- Shows lock-screen notifications
- Routes users when notifications are clicked

### 3. **App Integration**
- ✅ FCM initialized in `App.jsx` on app startup
- ✅ Auto-requests permissions for authenticated users
- ✅ Saves FCM token to backend
- ✅ Listens for foreground and background notifications

### 4. **Configuration**
- ✅ Vite config updated to handle service worker
- ✅ `.env.example` created with all required variables

---

## 🔧 Setup Instructions

### Step 1: Get Firebase Configuration

1. **Go to Firebase Console**:
   - URL: https://console.firebase.google.com/
   - Project: `hotel-mate-d878f`

2. **Get Web App Configuration**:
   - Go to **Project Settings** (gear icon)
   - Scroll to **Your apps** section
   - If no web app exists, click **Add app** → **Web** (</> icon)
   - Copy the configuration values

3. **Get VAPID Key**:
   - In Project Settings, go to **Cloud Messaging** tab
   - Under **Web Push certificates**, find **Key pair**
   - If none exists, click **Generate key pair**
   - Copy the VAPID key

### Step 2: Configure Environment Variables

1. **Create `.env` file** in `hotelmate-frontend/` folder:

```bash
# Copy from example
cp .env.example .env
```

2. **Fill in the values** in `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSyC...your_actual_key
VITE_FIREBASE_AUTH_DOMAIN=hotel-mate-d878f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hotel-mate-d878f
VITE_FIREBASE_STORAGE_BUCKET=hotel-mate-d878f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
VITE_FIREBASE_VAPID_KEY=BHdP5...your_vapid_key
VITE_API_BASE_URL=http://localhost:8000
```

### Step 3: Update Service Worker Config

1. **Edit `public/firebase-messaging-sw.js`**:
   - Replace placeholder values with actual Firebase config
   - Or use environment variables (requires build step)

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "hotel-mate-d878f.firebaseapp.com",
  projectId: "hotel-mate-d878f",
  storageBucket: "hotel-mate-d878f.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 4: Test the Implementation

1. **Start the development server**:
```bash
cd hotelmate-frontend
npm run dev
```

2. **Login as a staff member** (e.g., porter)

3. **Grant notification permission** when prompted

4. **Check browser console** for:
   - "FCM Token obtained: ..." 
   - "FCM token saved to backend: ..."

5. **Test notifications**:
   - Open DevTools → Application → Service Workers
   - Verify `firebase-messaging-sw.js` is registered
   - Create a test order from another browser/device
   - Should receive notification

---

## 🧪 Testing Checklist

### Browser Permissions
- [ ] Notification permission requested on login
- [ ] Permission status logged in console
- [ ] FCM token generated and logged

### Token Management
- [ ] Token saved to `localStorage`
- [ ] Token sent to backend (`/api/staff/save-fcm-token/`)
- [ ] Backend confirms token saved

### Service Worker
- [ ] Service worker registered successfully
- [ ] Visible in DevTools → Application → Service Workers
- [ ] Status: "activated and is running"

### Foreground Notifications (App Open)
- [ ] Notification received in console
- [ ] Browser notification shown
- [ ] Custom callback executed (if configured)

### Background Notifications (App Closed)
- [ ] Lock-screen notification appears
- [ ] Clicking notification opens app
- [ ] App navigates to correct page

### Navigation Routing
- [ ] Room service order → `/room-services`
- [ ] Breakfast order → `/room-services`
- [ ] Custom routes work as expected

---

## 🔍 Debugging

### No Notifications Received

1. **Check FCM Token**:
```javascript
// In browser console
localStorage.getItem('fcm_token')
```

2. **Verify Service Worker**:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

3. **Check Notification Permission**:
```javascript
// In browser console
console.log('Permission:', Notification.permission);
```

4. **Test Notification Manually**:
```javascript
// In browser console
new Notification('Test', { body: 'This is a test notification' });
```

### Service Worker Not Registering

1. **Check HTTPS**: Service workers require HTTPS (except localhost)
2. **Check file path**: `firebase-messaging-sw.js` must be in `public/` folder
3. **Clear cache**: DevTools → Application → Clear storage
4. **Unregister old workers**: DevTools → Application → Service Workers → Unregister

### Token Not Saving to Backend

1. **Check auth token**: Verify `localStorage.getItem('authToken')` exists
2. **Check API URL**: Verify `VITE_API_BASE_URL` is correct
3. **Check backend logs**: Look for POST to `/api/staff/save-fcm-token/`
4. **Check CORS**: Ensure backend allows requests from frontend origin

---

## 🎯 Notification Flow

### When App is Open (Foreground)
1. Backend sends notification via FCM
2. `FirebaseService.setupForegroundMessageListener()` catches it
3. Browser shows notification
4. Custom callback can update UI/show toast

### When App is Closed (Background)
1. Backend sends notification via FCM
2. `firebase-messaging-sw.js` receives it
3. Service worker shows lock-screen notification
4. User clicks → app opens → navigates to route

---

## 📱 Notification Types from Backend

### Room Service Order
```json
{
  "notification": {
    "title": "🔔 New Room Service Order",
    "body": "Room 102 - €24.47"
  },
  "data": {
    "type": "room_service_order",
    "order_id": "465",
    "room_number": "102",
    "route": "/room-services"
  }
}
```

### Breakfast Order
```json
{
  "notification": {
    "title": "🍳 New Breakfast Order",
    "body": "Room 305 - Delivery: 08:00"
  },
  "data": {
    "type": "breakfast_order",
    "order_id": "123",
    "room_number": "305",
    "route": "/room-services"
  }
}
```

---

## 🚀 Deployment Notes

### Production Build

1. **Build the app**:
```bash
npm run build
```

2. **Verify service worker** is in `dist/`:
```bash
ls dist/firebase-messaging-sw.js
```

3. **Deploy to hosting** (Netlify, Vercel, etc.)

### Environment Variables

- Ensure all `VITE_FIREBASE_*` variables are set in production
- Netlify/Vercel: Add to Environment Variables in dashboard
- Backend: Set `CORS_ALLOWED_ORIGINS` to include production URL

### HTTPS Requirement

- Service workers require HTTPS in production
- Most hosting platforms (Netlify, Vercel) provide HTTPS by default
- If self-hosting, configure SSL certificate

---

## 🔐 Security Notes

1. **VAPID Key**: Keep private, don't commit to Git (use `.env`)
2. **Firebase Config**: Public values are OK (API key is not sensitive)
3. **Service Worker**: Ensure it's served from root domain
4. **Auth Tokens**: Always validate on backend before sending notifications

---

## 📚 Useful Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check for service worker registration
# In browser console:
navigator.serviceWorker.getRegistrations()

# Test notification permission
# In browser console:
Notification.requestPermission()
```

---

## 🆘 Support Resources

- **Firebase Documentation**: https://firebase.google.com/docs/cloud-messaging/js/client
- **Vite Documentation**: https://vitejs.dev/guide/
- **Service Worker API**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

---

## ✅ Next Steps

1. [ ] Get Firebase configuration from Firebase Console
2. [ ] Create `.env` file with actual values
3. [ ] Update service worker with real config
4. [ ] Test on localhost
5. [ ] Test foreground notifications
6. [ ] Test background notifications
7. [ ] Deploy to production
8. [ ] Test on production domain

---

## 🎉 Summary

Your React web app now supports:
- ✅ **Pusher**: Real-time updates when app is open
- ✅ **FCM**: Push notifications when app is closed/background
- ✅ **Dual delivery**: Maximum reliability for porter alerts
- ✅ **Smart routing**: Notifications navigate to relevant pages
- ✅ **Token management**: Automatic sync with backend

The implementation is complete. Just add your Firebase credentials and test! 🚀
