# 🚀 Quick Start - FCM Testing

## You're Ready to Test!

All code is implemented. Now you just need Firebase credentials.

---

## ⚡ Quick Steps (5 minutes)

### 1. Get Firebase Credentials (2 min)

Go to: https://console.firebase.google.com/u/0/project/hotel-mate-d878f/settings/general

**Copy these 7 values**:
- API Key
- Auth Domain  
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID
- VAPID Key (from Cloud Messaging tab)

### 2. Create .env File (1 min)

```bash
cd hotelmate-frontend
cp .env.example .env
```

Paste your values into `.env`

### 3. Update Service Worker (1 min)

Edit `public/firebase-messaging-sw.js` lines 10-15 with same values

### 4. Start Testing (1 min)

```bash
npm run dev
```

Then:
1. Login
2. Go to Settings
3. Use FCM Debug Panel at bottom
4. Click "Check Config" → should show all ✅
5. Click "Request Permission" → allow
6. Click "Get FCM Token" → token saved
7. Click "Test Notification" → notification appears!

---

## 📋 What's Already Done

✅ Firebase package installed  
✅ All service files created  
✅ App integration complete  
✅ Service worker ready  
✅ Debug panel added to Settings  
✅ Backend ready to receive tokens  

**Only missing**: Your Firebase credentials in `.env`

---

## 🎯 Expected Timeline

- **Getting credentials**: 2-5 minutes
- **Configuration**: 1-2 minutes  
- **First test**: 1 minute
- **Full testing**: 5-10 minutes

**Total**: ~15 minutes to full working FCM

---

## 🔗 Quick Links

- **Firebase Console**: https://console.firebase.google.com/
- **Project**: hotel-mate-d878f
- **Detailed Testing Guide**: `FCM_TESTING_GUIDE.md`
- **Implementation Guide**: `FCM_WEB_IMPLEMENTATION_GUIDE.md`

---

## 🆘 If Something Goes Wrong

1. Check `FCM_TESTING_GUIDE.md` → Troubleshooting section
2. Use FCM Debug Panel in Settings page
3. Check browser console for errors
4. Verify .env values are correct

---

**Ready? Let's go! 🚀**

Start with Step 1: Get Firebase credentials from console.
