# 🚀 Quick Setup Guide - Pusher Notifications

## Step 1: Get Pusher Credentials

1. Go to https://pusher.com
2. Sign up or log in
3. Create a new app (or use existing)
4. Copy your **App Key** and **Cluster** from the dashboard

## Step 2: Configure Environment

1. Create `.env.local` in `hotelmate-frontend/` directory:
   ```bash
   cd hotelmate-frontend
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   VITE_PUSHER_KEY=your_actual_pusher_key
   VITE_PUSHER_CLUSTER=eu
   ```

## Step 3: Restart Dev Server

```bash
npm run dev
```

## Step 4: Test Notifications

### Option A: Clock In as Staff
1. Log in as staff member
2. Go to your profile (`/staff/me`)
3. Ensure `is_on_duty` is **true**
4. Open browser console (F12)
5. Look for Pusher connection logs:
   ```
   ✅ Pusher connected for room service notifications
   ✅ Pusher connected for chat
   ✅ Pusher connected for booking notifications
   ```

### Option B: Enable Browser Notifications
1. When prompted, click "Allow" for browser notifications
2. Or manually enable in browser settings:
   - Chrome: Settings → Privacy → Site Settings → Notifications
   - Firefox: Preferences → Privacy → Permissions → Notifications

### Option C: Test with Backend
1. Have backend team trigger a test event
2. Or use Pusher dashboard "Debug Console" to manually trigger events

## Step 5: Verify Channels

Check browser console for channel subscription messages:
```
Subscribing to department channel: hotel-killarney-staff-72-kitchen
Subscribing to role channel: hotel-killarney-staff-72-porter
```

The channels depend on your:
- **Department**: kitchen, food-and-beverage, front-office, etc.
- **Role**: porter, room_service_waiter, receptionist, etc.

## Troubleshooting

### No Pusher connection?
- Check `.env.local` file exists and has correct values
- Restart dev server after changing `.env.local`
- Check browser console for errors

### No notifications?
- Ensure `is_on_duty: true` in staff profile
- Check you're in the right department/role
- Verify backend is triggering Pusher events

### Console errors about environment variables?
```javascript
// Temporarily add to App.jsx to debug:
console.log('Pusher Config:', {
  key: import.meta.env.VITE_PUSHER_KEY,
  cluster: import.meta.env.VITE_PUSHER_CLUSTER
});
```

## What's Working Now? ✅

- **Room Service Orders** - Kitchen staff, porters, waiters get notified
- **Breakfast Orders** - Kitchen staff, porters, waiters get notified
- **Dinner Bookings** - F&B staff, receptionists, managers get notified
- **Chat Messages** - All staff get notified of guest messages
- **Auto-refresh** - Order lists update automatically
- **Browser Notifications** - Desktop notifications work
- **Toast Notifications** - In-app notifications work

## Need Help?

Check the full documentation: `PUSHER_IMPLEMENTATION.md`
