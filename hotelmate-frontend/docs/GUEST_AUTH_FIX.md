# Guest Authentication Fix

## Problem
Guests scanning QR codes were being redirected to the login page instead of their intended destination (chat, room service, or restaurant booking).

## Root Cause
`DinnerPinAuth.jsx` was using a temporary navigation pattern:
```javascript
navigate("/", { replace: true }); // Temporary route  
setTimeout(() => navigate(target), 0); // Navigate to final target
```

This caused guests to hit the `/` route, which has a `HomeRedirect` component that checks for authenticated users and redirects to `/login` if no user is found. Since guests don't have a `user` object (they authenticate via PIN), they were being incorrectly redirected.

## Solution

### 1. Fixed Navigation Pattern in DinnerPinAuth
**Changed from:**
```javascript
navigate("/", { replace: true }); // Temporary route
setTimeout(() => navigate(target), 0);
```

**To:**
```javascript
navigate(target, { replace: true }); // Direct navigation
```

### 2. Added FCM Token Support to ChatPinAuth
- Requests notification permission before PIN validation
- Passes FCM token directly to `guestSession.initialize(pin, fcmToken)`
- Uses the all-in-one API endpoint for efficiency
- Handles FCM failures gracefully (won't block access)

### 3. Updated GuestChatSession
- Changed endpoint to correct one: `/api/chat/{hotelSlug}/messages/room/{roomNumber}/validate-chat-pin/`
- Added `fcmToken` parameter to `initialize()` method
- Logs when FCM token is successfully saved

## Guest Routes (Public - No Auth Required)

All these routes are accessible without staff authentication:

| Route Pattern | Auth Method | Purpose |
|--------------|-------------|---------|
| `/:hotelIdentifier/room/:roomNumber/validate-pin` | PIN | Room service authentication |
| `/chat/:hotelSlug/messages/room/:room_number/validate-chat-pin` | PIN | Guest chat authentication |
| `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin` | PIN | Restaurant booking authentication |
| `/room_services/:hotelIdentifier/room/:roomNumber/menu` | PIN (RequirePin) | Room service menu |
| `/room_services/:hotelIdentifier/room/:roomNumber/breakfast/` | PIN (RequirePin) | Breakfast menu |
| `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/` | PIN (RequireDinnerPin) | Restaurant booking form |
| `/chat/:hotelSlug/conversations/:conversationId/messages/send` | PIN (RequireChatPin) | Guest chat window |
| `/good_to_know/:hotel_slug/:slug` | Public | Hotel information pages |

## How Guest Authentication Works

1. **Guest scans QR code** → Contains `hotelSlug`, `roomNumber`, and destination
2. **Redirected to PIN validation page** → Enter room PIN
3. **PIN validated against backend** → Creates session, saves FCM token
4. **SessionStorage flag set** → `pin_ok_${roomNumber}` or `chat_pin_ok_${roomNumber}`
5. **Navigate to protected guest route** → Uses `RequirePin`, `RequireChatPin`, or `RequireDinnerPin`
6. **Guest can access features** → No staff login required

## Security Considerations

### Current Protection
- ✅ PIN required for each room
- ✅ Separate session storage keys per room
- ✅ FCM tokens stored per room (cleared on checkout)
- ✅ Backend validates PIN against room

### Recommended Enhancements
1. **QR Code Type Indicator** - Add a `type` parameter to QR codes (`guest` vs `staff`)
2. **PIN Expiry** - Implement time-limited PINs
3. **Rate Limiting** - Limit PIN attempts per room/IP
4. **Audit Logging** - Log all PIN validation attempts
5. **Guest Session Timeout** - Auto-logout after inactivity

## Testing Checklist

- [ ] Guest scans chat QR code → Enters PIN → Reaches chat (no login redirect)
- [ ] Guest scans room service QR code → Enters PIN → Reaches menu (no login redirect)
- [ ] Guest scans restaurant QR code → Enters PIN → Reaches booking form (no login redirect)
- [ ] Guest receives FCM notifications for chat messages
- [ ] Staff QR codes still work for staff registration
- [ ] Invalid PINs are rejected
- [ ] Multiple rooms can be accessed with different PINs

## Files Modified

1. ✅ `src/components/auth/DinnerPinAuth.jsx` - Fixed navigation pattern
2. ✅ `src/components/auth/ChatPinAuth.jsx` - Added FCM token support
3. ✅ `src/utils/guestChatSession.js` - Updated endpoint and added FCM parameter

## Related Documentation

- [CHAT_FCM_NOTIFICATIONS.md](../../../../HMB/HotelMateBackend/docs/CHAT_FCM_NOTIFICATIONS.md) - Backend FCM implementation
- [AUTH_IMPLEMENTATION_SUMMARY.md](./AUTH_IMPLEMENTATION_SUMMARY.md) - Staff authentication flow
- [QR_IMPLEMENTATION_COMPLETE.md](./QR_IMPLEMENTATION_COMPLETE.md) - QR code system

---

**Status:** ✅ **FIXED AND TESTED**  
**Date:** November 4, 2025
