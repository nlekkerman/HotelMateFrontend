# 🧪 FCM TESTING - DO THIS NOW

## Quick Test - 5 Steps

You need Firebase credentials first. Let me create a test page you can use.

### Step 1: Get Your Firebase Config (2 minutes)

1. Go to: https://console.firebase.google.com/
2. Select project: **hotel-mate-d878f**
3. Click ⚙️ Settings → Project settings
4. Under "Your apps" → Find web app OR click "Add app" → Web
5. Copy the config values

You need these 7 values:
- API Key
- Auth Domain
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID
- VAPID Key (from Cloud Messaging tab → Web Push certificates)

### Step 2: Create .env File

Create `.env` in `hotelmate-frontend/` folder with:

```env
VITE_FIREBASE_API_KEY=your_actual_key_here
VITE_FIREBASE_AUTH_DOMAIN=hotel-mate-d878f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hotel-mate-d878f
VITE_FIREBASE_STORAGE_BUCKET=hotel-mate-d878f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
VITE_API_BASE_URL=http://localhost:8000
```

### Step 3: Update Service Worker

Edit `public/firebase-messaging-sw.js` line 10-16:

```javascript
const firebaseConfig = {
  apiKey: "your_actual_api_key",
  authDomain: "hotel-mate-d878f.firebaseapp.com",
  projectId: "hotel-mate-d878f",
  storageBucket: "hotel-mate-d878f.appspot.com",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id"
};
```

### Step 4: Start Dev Server

```bash
npm run dev
```

### Step 5: Test!

1. Open browser to http://localhost:5173
2. Login as staff
3. Go to `/settings`
4. Scroll to **FCM Debug & Test Panel**
5. Follow the buttons in order:
   - ✅ Check Config
   - ✅ Request Permission (allow in browser)
   - ✅ Get FCM Token
   - ✅ Test Notification

---

## ⚡ Can't Get Firebase Credentials Right Now?

I'll create a mock test page that shows what WILL happen when you add them.

**For now**: Just start the dev server and go to Settings page to see the debug panel.
