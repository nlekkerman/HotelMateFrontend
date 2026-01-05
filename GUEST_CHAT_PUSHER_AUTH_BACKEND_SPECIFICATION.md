# Guest Chat Pusher Authentication - Backend Implementation Guide

## Overview

The guest chat system requires a private Pusher authentication endpoint to enable secure real-time messaging between guests and staff. This endpoint validates guest tokens and ensures guests can only access channels for their own booking.

## 🚨 Critical Security Requirements

**Channel Name Format Security:**
- **ONLY** allow channel names matching: `private-hotel-{hotel_slug}-guest-chat-booking-{booking_id}`
- **NO** wildcards, pattern matching, or alternative formats
- **NO** access to other guests' bookings or staff channels

**Token Validation:**
- Guest token must be valid and not expired
- Token's booking_id must match the requested channel's booking_id
- Guest must be authenticated for the specific hotel

## 📋 Required Backend Endpoint

### POST `/api/guest/hotel/{hotel_slug}/chat/pusher/auth`

**URL Parameters:**
- `hotel_slug` (string, required) - Hotel identifier

**Query Parameters:**
- `token` (string, required) - Guest authentication token from URL

**Request Body (Standard Pusher Format):**
```json
{
  "socket_id": "123456.654321",
  "channel_name": "private-hotel-grand-hotel-guest-chat-booking-BK-2025-ABC123"
}
```

**Authentication:**
- Validates guest token from query parameter
- Extracts booking_id from validated token
- Confirms token belongs to the correct hotel

**Security Validation Logic:**
```python
def validate_channel_access(channel_name, guest_token, hotel_slug):
    # 1. Parse channel name
    expected_prefix = f"private-hotel-{hotel_slug}-guest-chat-booking-"
    
    if not channel_name.startswith(expected_prefix):
        raise PermissionDenied("Invalid channel format")
    
    # 2. Extract booking_id from channel name
    channel_booking_id = channel_name[len(expected_prefix):]
    
    # 3. Get booking_id from guest token
    token_booking_id = get_booking_id_from_token(guest_token)
    
    # 4. Booking IDs must match exactly
    if channel_booking_id != token_booking_id:
        raise PermissionDenied("Channel access denied - booking mismatch")
    
    # 5. Validate hotel access
    booking = get_booking_from_token(guest_token)
    if booking.hotel.slug != hotel_slug:
        raise PermissionDenied("Hotel access denied")
    
    return True
```

**Response (Success - 200 OK):**
```json
{
  "auth": "hotel-key:signature-hash-here",
  "channel_data": "{\"user_id\":\"guest_BK-2025-ABC123\",\"user_info\":{\"name\":\"Guest\",\"booking_id\":\"BK-2025-ABC123\"}}"
}
```

**Response (Error - 403 Forbidden):**
```json
{
  "error": "Forbidden",
  "message": "Channel access denied - booking mismatch"
}
```

## 🔧 Implementation Details

### Backend Implementation (Django/DRF Example)

```python
# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
import pusher
from .utils import validate_guest_token

class GuestChatPusherAuthView(APIView):
    """
    Pusher authentication for guest chat private channels
    """
    
    def post(self, request, hotel_slug):
        # Get parameters
        token = request.GET.get('token')
        socket_id = request.data.get('socket_id')
        channel_name = request.data.get('channel_name')
        
        if not all([token, socket_id, channel_name]):
            return Response({
                'error': 'Missing required parameters'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Validate guest token and get booking
            booking = validate_guest_token(token, hotel_slug)
            
            # Security check: channel name format
            expected_prefix = f"private-hotel-{hotel_slug}-guest-chat-booking-"
            if not channel_name.startswith(expected_prefix):
                raise PermissionDenied("Invalid channel format")
            
            # Extract booking_id from channel name
            channel_booking_id = channel_name[len(expected_prefix):]
            
            # Security check: booking_id must match
            if channel_booking_id != booking.booking_id:
                raise PermissionDenied("Channel access denied - booking mismatch")
            
            # Generate Pusher authentication
            pusher_client = pusher.Pusher(
                app_id=settings.PUSHER_APP_ID,
                key=settings.PUSHER_KEY,
                secret=settings.PUSHER_SECRET,
                cluster=settings.PUSHER_CLUSTER,
                ssl=True
            )
            
            # Create user data for channel
            user_data = {
                "user_id": f"guest_{booking.booking_id}",
                "user_info": {
                    "name": "Guest",
                    "booking_id": booking.booking_id,
                    "room_number": getattr(booking, 'room_number', 'TBD')
                }
            }
            
            # Authenticate the channel subscription
            auth_response = pusher_client.authenticate(
                channel=channel_name,
                socket_id=socket_id,
                custom_data=user_data
            )
            
            return Response(auth_response)
            
        except PermissionDenied as e:
            return Response({
                'error': 'Forbidden',
                'message': str(e)
            }, status=status.HTTP_403_FORBIDDEN)
        
        except Exception as e:
            return Response({
                'error': 'Authentication failed',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
```

### URL Configuration

```python
# urls.py
from django.urls import path
from .views import GuestChatPusherAuthView

urlpatterns = [
    # Guest chat Pusher authentication
    path(
        'guest/hotel/<slug:hotel_slug>/chat/pusher/auth/',
        GuestChatPusherAuthView.as_view(),
        name='guest_chat_pusher_auth'
    ),
]
```

### Token Validation Utility

```python
# utils.py
def validate_guest_token(token, hotel_slug):
    """
    Validates guest token and returns associated booking
    """
    try:
        # Decode JWT or validate session token
        # This should match your existing guest token validation logic
        token_data = decode_guest_token(token)
        
        # Get booking from token
        booking = RoomBooking.objects.get(
            booking_id=token_data['booking_id'],
            hotel__slug=hotel_slug
        )
        
        # Additional validation (e.g., token expiry, guest status)
        if not is_guest_token_valid(token_data):
            raise PermissionDenied("Token expired or invalid")
        
        return booking
        
    except (RoomBooking.DoesNotExist, ValueError, KeyError):
        raise PermissionDenied("Invalid token or booking not found")
```

## ✅ Frontend Integration Status

The frontend guest chat system is **ALREADY FULLY IMPLEMENTED** and configured to use this endpoint:

### Current Frontend Configuration:

**File: `src/services/guestChatAPI.js`**
```javascript
export const getPusherAuthEndpoint = (hotelSlug, token) => {
  return `${API_BASE_URL}/api/guest/hotel/${hotelSlug}/chat/pusher/auth?token=${token}`;
};
```

**File: `src/hooks/useGuestChat.js`**
```javascript
// Automatically uses correct auth endpoint when connecting
const client = await getGuestRealtimeClient(token, {
  authEndpoint: guestChatAPI.getPusherAuthEndpoint(hotelSlug, token)
});
```

**File: `src/realtime/guestRealtimeClient.js`**
```javascript
// Private channel auth configuration
pusherConfig.authEndpoint = options.authEndpoint;
pusherConfig.auth = {
  params: { token } // Sends token as query param
};
```

### ✅ Frontend Components Ready:

- ✅ **GuestChatWidget.jsx** - Complete chat UI component
- ✅ **GuestChatPortal.jsx** - Portal page integration
- ✅ **useGuestChat.js** - React Query + optimistic updates + deduplication
- ✅ **guestChatAPI.js** - All API calls using canonical endpoints
- ✅ **guestRealtimeClient.js** - Private channel authentication support

**The frontend will work immediately once this backend endpoint is implemented.**

## ✅ Testing the Implementation

### 1. Valid Request Test

```bash
curl -X POST 'https://yourdomain.com/api/guest/hotel/grand-hotel/chat/pusher/auth?token=valid_guest_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "socket_id": "123456.654321",
    "channel_name": "private-hotel-grand-hotel-guest-chat-booking-BK-2025-ABC123"
  }'
```

**Expected Response:**
```json
{
  "auth": "your-pusher-key:generated-signature",
  "channel_data": "{\"user_id\":\"guest_BK-2025-ABC123\",\"user_info\":{\"name\":\"Guest\",\"booking_id\":\"BK-2025-ABC123\"}}"
}
```

### 2. Security Test (Wrong Booking)

```bash
curl -X POST 'https://yourdomain.com/api/guest/hotel/grand-hotel/chat/pusher/auth?token=valid_guest_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "socket_id": "123456.654321",
    "channel_name": "private-hotel-grand-hotel-guest-chat-booking-DIFFERENT-BOOKING"
  }'
```

**Expected Response:**
```json
{
  "error": "Forbidden",
  "message": "Channel access denied - booking mismatch"
}
```

### 3. Security Test (Invalid Format)

```bash
curl -X POST 'https://yourdomain.com/api/guest/hotel/grand-hotel/chat/pusher/auth?token=valid_guest_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "socket_id": "123456.654321",
    "channel_name": "private-some-other-format"
  }'
```

**Expected Response:**
```json
{
  "error": "Forbidden",
  "message": "Invalid channel format"
}
```

## 🚨 Security Checklist

Before deploying, ensure:

- [ ] Channel name validation is strict (exact format match)
- [ ] No wildcard or pattern matching in channel access
- [ ] Token validation matches existing guest auth system
- [ ] Booking ID from token must match channel booking ID
- [ ] Hotel slug validation prevents cross-hotel access
- [ ] Proper error messages don't leak sensitive information
- [ ] Pusher credentials are properly configured
- [ ] Rate limiting is applied to prevent abuse

## 🔧 Environment Variables Required

```bash
# Backend environment variables
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=eu
```

## 📝 Notes for Backend Team

1. **Token Format**: This implementation assumes you have existing guest token validation logic. Adapt the `validate_guest_token` function to match your current authentication system.

2. **Channel Naming**: The channel name format `private-hotel-{hotel_slug}-guest-chat-booking-{booking_id}` is used by the frontend. Do not change this format.

3. **Error Handling**: Return appropriate HTTP status codes (403 for forbidden access, 400 for bad requests) to help frontend error handling.

4. **Performance**: Consider caching guest token validation if you expect high traffic.

5. **Logging**: Add comprehensive logging for security auditing and debugging.

## 🎯 Priority: HIGH

This is the **single critical missing piece** for the guest chat system to work. Without this endpoint:
- Private Pusher channels cannot be authenticated
- Real-time messaging will fail
- The entire guest chat feature is non-functional

**Estimated Implementation Time**: 2-4 hours
**Dependencies**: Existing guest token validation system, Pusher configuration