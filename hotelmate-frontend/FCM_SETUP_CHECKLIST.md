# 🚀 FCM Setup Checklist

Use this checklist to complete your Firebase Cloud Messaging setup.

---

## ✅ Implementation Status

- [x] Firebase SDK installed (`npm install firebase`)
- [x] Core service files created
  - [x] `src/services/firebase.js`
  - [x] `src/services/FirebaseService.js`
  - [x] `public/firebase-messaging-sw.js`
- [x] App integration complete
  - [x] FCM initialized in `App.jsx`
  - [x] Foreground message listener
  - [x] Service worker message listener
- [x] UI component created
  - [x] `NotificationSettings.jsx` added to Settings page
- [x] Configuration templates created
  - [x] `.env.example`
  - [x] Documentation files

---

## 📋 Configuration Checklist

### Step 1: Firebase Console Setup

- [ ] **Access Firebase Console**
  - URL: https://console.firebase.google.com/
  - Project: `hotel-mate-d878f`

- [ ] **Get Web App Configuration**
  - [ ] Go to Project Settings (gear icon)
  - [ ] Scroll to "Your apps" section
  - [ ] If no web app exists: Click "Add app" → Web (</> icon)
  - [ ] Copy the configuration object

- [ ] **Generate VAPID Key**
  - [ ] In Project Settings, go to "Cloud Messaging" tab
  - [ ] Under "Web Push certificates"
  - [ ] Click "Generate key pair" (if none exists)
  - [ ] Copy the VAPID key

### Step 2: Environment Variables

- [ ] **Create `.env` file**
  ```bash
  cp .env.example .env
  ```

- [ ] **Fill in Firebase values** in `.env`:
  - [ ] `VITE_FIREBASE_API_KEY` (from Firebase config)
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN` (from Firebase config)
  - [ ] `VITE_FIREBASE_PROJECT_ID` (from Firebase config)
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET` (from Firebase config)
  - [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` (from Firebase config)
  - [ ] `VITE_FIREBASE_APP_ID` (from Firebase config)
  - [ ] `VITE_FIREBASE_VAPID_KEY` (from Cloud Messaging settings)
  - [ ] `VITE_API_BASE_URL` (your backend URL)

### Step 3: Service Worker Configuration

- [ ] **Update `public/firebase-messaging-sw.js`**
  - [ ] Replace `YOUR_API_KEY` with actual API key
  - [ ] Replace `YOUR_MESSAGING_SENDER_ID` with actual sender ID
  - [ ] Replace `YOUR_APP_ID` with actual app ID
  - [ ] (Or configure to load from environment variables)

### Step 4: Backend Verification

- [ ] **Verify backend endpoint exists**
  - [ ] `POST /api/staff/save-fcm-token/` is available
  - [ ] Endpoint accepts `fcm_token` in request body
  - [ ] Endpoint requires authentication
  - [ ] Endpoint saves token to staff profile

- [ ] **Check CORS configuration**
  - [ ] Backend allows requests from frontend origin
  - [ ] `Access-Control-Allow-Origin` header set correctly

---

## 🧪 Testing Checklist

### Local Development Testing

- [ ] **Start development server**
  ```bash
  npm run dev
  ```

- [ ] **Browser Console Checks**
  - [ ] No Firebase initialization errors
  - [ ] Service worker registered successfully
  - [ ] FCM token generated
  - [ ] Token saved to backend (check console log)

- [ ] **Permission Request**
  - [ ] Permission prompt appears on login
  - [ ] OR Permission can be requested from Settings page
  - [ ] Granting permission shows success message

- [ ] **Service Worker Status**
  - [ ] Open DevTools → Application → Service Workers
  - [ ] `firebase-messaging-sw.js` listed
  - [ ] Status: "activated and is running"

- [ ] **Token Verification**
  - [ ] Check localStorage: `localStorage.getItem('fcm_token')`
  - [ ] Token is a long string
  - [ ] Token visible in Settings page (click "Show FCM Token")

### Notification Testing

- [ ] **Foreground Notification (App Open)**
  - [ ] Create test order from another browser/device
  - [ ] Notification appears while app is open
  - [ ] Console logs "Foreground message received"

- [ ] **Background Notification (App Closed)**
  - [ ] Close the app completely
  - [ ] Create test order
  - [ ] Lock-screen notification appears
  - [ ] Clicking notification opens app

- [ ] **Test Notification Button**
  - [ ] Go to Settings page
  - [ ] Click "Test Notification"
  - [ ] Browser notification appears

- [ ] **Notification Routing**
  - [ ] Click room service notification
  - [ ] App navigates to `/room-services`
  - [ ] Click breakfast notification
  - [ ] App navigates to `/room-services`

### Browser Compatibility

- [ ] **Chrome** - Fully supported
- [ ] **Firefox** - Fully supported
- [ ] **Edge** - Fully supported
- [ ] **Safari** - Limited support (macOS only)

### Mobile Testing (Optional)

- [ ] **Chrome Mobile (Android)**
  - [ ] Notifications work
  - [ ] Lock-screen alerts appear

- [ ] **Firefox Mobile (Android)**
  - [ ] Notifications work
  - [ ] Lock-screen alerts appear

- [ ] **Safari iOS**
  - [ ] Limited/no support expected

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] **Environment variables set in hosting platform**
  - [ ] Netlify: Site settings → Environment variables
  - [ ] Vercel: Project settings → Environment Variables
  - [ ] All `VITE_FIREBASE_*` variables added

- [ ] **Service worker config updated**
  - [ ] No placeholder values in `firebase-messaging-sw.js`
  - [ ] Firebase config matches production project

- [ ] **Build test**
  ```bash
  npm run build
  ```
  - [ ] No build errors
  - [ ] `dist/firebase-messaging-sw.js` exists

### Post-Deployment

- [ ] **HTTPS verification**
  - [ ] Production site uses HTTPS
  - [ ] Service worker loads correctly

- [ ] **Production testing**
  - [ ] Login on production site
  - [ ] Grant notification permission
  - [ ] FCM token saved to backend
  - [ ] Test notification received

- [ ] **Backend CORS**
  - [ ] Backend allows production domain
  - [ ] No CORS errors in browser console

- [ ] **Firebase Console**
  - [ ] Add production domain to authorized domains
  - [ ] Firebase Console → Authentication → Settings → Authorized domains

---

## 🔍 Troubleshooting Checklist

### Issue: No Permission Prompt

- [ ] Check `Notification.permission` in console
- [ ] Try Settings page → "Enable Notifications"
- [ ] Clear browser data and refresh
- [ ] Try incognito/private mode

### Issue: Service Worker Not Registering

- [ ] Verify HTTPS (or localhost)
- [ ] Check file path: `/firebase-messaging-sw.js` must exist
- [ ] Clear cache: DevTools → Application → Clear storage
- [ ] Unregister old workers: DevTools → Service Workers → Unregister

### Issue: No FCM Token

- [ ] Check VAPID key in `.env`
- [ ] Verify service worker is active
- [ ] Check browser console for errors
- [ ] Verify `messaging` is initialized in `firebase.js`

### Issue: Token Not Saving to Backend

- [ ] Verify auth token exists: `localStorage.getItem('authToken')`
- [ ] Check network tab for POST request
- [ ] Verify backend endpoint URL
- [ ] Check backend logs for errors
- [ ] Verify CORS headers

### Issue: No Notifications Received

- [ ] Verify backend is sending FCM notifications
- [ ] Check backend logs for FCM send success/failure
- [ ] Verify staff role is correct (Porter, etc.)
- [ ] Check `is_on_duty` flag in backend
- [ ] Test with manual notification from Firebase Console

---

## 📞 Support

If you encounter issues:

1. **Check documentation**: `FCM_WEB_IMPLEMENTATION_GUIDE.md`
2. **Check browser console** for error messages
3. **Check backend logs** for FCM send attempts
4. **Firebase Console**: https://console.firebase.google.com/
5. **MDN Documentation**: Service Workers & Notifications API

---

## ✅ Final Verification

Once all items are checked:

- [ ] Notifications work in development
- [ ] Notifications work in production
- [ ] Background notifications work (app closed)
- [ ] Foreground notifications work (app open)
- [ ] Notification routing works correctly
- [ ] Settings page shows correct status
- [ ] No console errors
- [ ] Backend receives and saves FCM tokens

---

## 🎉 Success!

When all checkboxes are complete, your Firebase Cloud Messaging implementation is ready for production! 🚀

**Key Features Working:**
✅ Pusher (real-time, app open)
✅ FCM (push notifications, app closed)
✅ Dual delivery system for maximum reliability
✅ Smart notification routing
✅ Token management and sync

---

**Implementation Date**: November 2, 2025  
**Version**: 1.0.0
