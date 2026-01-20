# Guest Chat 404 "Invalid or expired token" Investigation Report

## Issue Analysis Summary
The guest chat is failing with 404 "Invalid or expired token" because:

1. **Token Source Mismatch**: The system tries `guestToken || token` with different hotel contexts
2. **No Token Persistence Scoping**: Tokens aren't stored per booking/hotel
3. **Hotel Slug vs Token Hotel Mismatch**: URL slug might not match token's hotel
4. **Token Refresh Not Implemented**: No mechanism to refresh tokens after check-in

## Evidence & Code References

### 1. Token Origin and Setting

**Where the token used in chat URL comes from:**
- **File**: [src/pages/bookings/BookingStatusPage.jsx:896](src/pages/bookings/BookingStatusPage.jsx#L896)
```jsx
onClick={() =>
  navigate(`/guest/chat?hotel_slug=${hotelSlug}&token=${guestToken || token}&room_number=${booking?.assigned_room_number || ''}`)
}
```

**Token is set from booking API response:**
- **File**: [src/pages/bookings/BookingStatusPage.jsx:370-376](src/pages/bookings/BookingStatusPage.jsx#L370-L376)
```jsx
if (data.guest_token) {
  setGuestToken(data.guest_token);
  console.log('🎫 [BookingStatusPage] ✅ Guest token SET successfully:', {
    token: data.guest_token?.substring(0, 20) + '...',
    length: data.guest_token?.length
  });
} else {
  console.log('❌ [BookingStatusPage] NO GUEST TOKEN FOUND in response');
}
```

**API endpoint that returns the token:**
- **Endpoint**: `GET /api/public/hotel/${hotelSlug}/room-bookings/${bookingId}/?token=${token}`
- **File**: [src/pages/bookings/BookingStatusPage.jsx:305](src/pages/bookings/BookingStatusPage.jsx#L305)
- **Token Source**: Backend includes `guest_token` field in booking response (only for checked-in guests)

### 2. Hotel Slug Source Analysis

**Hotel slug comes from URL route:**
- **Route**: `/hotel/:hotelSlug/booking/:bookingId/status`
- **File**: [src/pages/bookings/BookingStatusPage.jsx:22](src/pages/bookings/BookingStatusPage.jsx#L22)
```jsx
const { hotelSlug, bookingId } = useParams();
```

**Chat request uses URL-derived hotel slug:**
- **File**: [src/services/guestChatAPI.js:21](src/services/guestChatAPI.js#L21)
```js
export const getContext = async (hotelSlug, token) => {
  const response = await guestAPI.get(`/hotel/${hotelSlug}/chat/context`, {
    params: { token }
  });
```

### 3. No Token Storage Scoping

**Current token storage pattern:** 
- Tokens are stored in component state (`guestToken`) per booking page session
- **No localStorage persistence found** for guest tokens
- **No booking-scoped storage** like `guest_booking_token:${booking_id}`

**Evidence - No scoped storage found:**
```bash
# Search result shows only game/quiz tokens use localStorage
grep -r "localStorage.*token" src/
# Results: only tournament_player_token, quiz_player_token, fcm_token
# NO guest_booking_token or similar patterns found
```

### 4. Token/Hotel Mismatch Scenario

**Problem scenario:**
1. User visits Hotel A booking → gets Hotel A guest_token
2. User navigates to Hotel B booking (same browser) 
3. Hotel B booking might reference Hotel A token in memory/cache
4. Chat request: `hotel_slug=hotel-b` + `token=hotel-a-token` → 404 Invalid token

**Evidence from chat navigation code:**
- [src/pages/bookings/BookingStatusPage.jsx:896](src/pages/bookings/BookingStatusPage.jsx#L896)
- Uses `guestToken || token` fallback, where `guestToken` might be from different hotel context

### 5. Token Refresh After Check-in Not Implemented

**Backend behavior:** Creates fresh GuestBookingToken on check-in
**Frontend behavior:** Uses whatever token was in the original booking response

**No refresh mechanism found:**
- No code to re-fetch booking status after check-in to get new token
- No token update in realtime booking store integration

**Store integration exists but doesn't handle token updates:**
- **File**: [src/pages/bookings/BookingStatusPage.jsx:73-104](src/pages/bookings/BookingStatusPage.jsx#L73-L104)
```jsx
useEffect(() => {
  if (!bookingId || !roomBookingState?.byBookingId) return;
  const storeBooking = roomBookingState.byBookingId[bookingId];
  if (storeBooking && booking) {
    // Updates booking data but doesn't handle guest_token updates
    setBooking(prevBooking => ({ ...prevBooking, ...storeBooking }));
  }
}, [bookingId, roomBookingState?.byBookingId, booking?.checked_in_at, booking?.checked_out_at]);
```

## Network Trace Example

**Failing Request:**
```
GET /api/guest/hotel/hotel-b/chat/context?token=hotel-a-guest-token-xyz123
→ 404 { "error": "Invalid or expired token" }
```

**Expected vs Actual:**
- **hotelSlug**: From URL route params (could be Hotel B)  
- **token**: From `guestToken || token` (could be Hotel A token)
- **booking_id**: Hotel A booking ID embedded in token
- **Result**: Backend validates token against Hotel B → mismatch → 404

## Recommended Fixes

### Fix A: Store tokens per booking (RECOMMENDED)
```js
// Store tokens with booking scope
localStorage.setItem(`guest_booking_token:${booking_id}`, guest_token);

// Retrieve token for specific booking
const storedToken = localStorage.getItem(`guest_booking_token:${booking_id}`);
```

### Fix B: Derive hotel from token payload (ALTERNATIVE)
```js
// Extract hotel info from token/booking data, redirect if URL mismatch
if (bookingData.hotel.slug !== hotelSlug) {
  navigate(`/hotel/${bookingData.hotel.slug}/booking/${bookingId}/status?token=${token}`);
}
```

### Fix C: Token refresh on 404 (FALLBACK)
```js
// On chat context 404, re-fetch booking to get fresh token
if (error.response?.status === 404) {
  const refreshedBooking = await refetchBookingStatus();
  if (refreshedBooking.guest_token) {
    retryWithToken(refreshedBooking.guest_token);
  }
}
```

## Console Logs to Add for Debugging

**Add to booking status fetch:**
```js
console.log("[BookingStatus] Token set:", {
  booking_id: data.id,
  hotel_slug: data.hotel?.slug,
  guest_token_length: data.guest_token?.length,
  guest_token_preview: data.guest_token?.substring(0, 10),
  checked_in_at: data.checked_in_at
});
```

**Add to chat navigation:**
```js
console.log("[GuestChat] Chat navigation:", {
  hotelSlug: hotelSlug,
  tokenSource: guestToken ? 'booking_response' : 'url_param',
  token_preview: (guestToken || token)?.substring(0, 10),
  booking_id: booking?.id,
  room_number: booking?.assigned_room_number
});
```

**Add to guest chat API:**
```js
console.log("[GuestChatAPI] Context request:", {
  hotelSlug,
  token_preview: token?.substring(0, 10),
  url: `/hotel/${hotelSlug}/chat/context`,
  expected_hotel_from_token: "unknown" // TODO: decode token to verify
});
```

## Acceptance Test Requirements

1. **Cross-hotel booking test:**
   - Open booking for Hotel A → Chat loads ✓
   - Open booking for Hotel B (same browser) → Chat loads with Hotel B token ✓  
   - Verify no Hotel A token reuse for Hotel B

2. **Check-in token refresh test:**
   - Open booking pre-check-in → Note token
   - Trigger check-in → New token should be obtained
   - Chat should use new post-check-in token

3. **Storage isolation test:**
   - Multiple bookings in different tabs
   - Each should maintain its own token context
   - No token bleeding between bookings