# Backend FCM Implementation Guide

## 🎯 Overview

The frontend is correctly saving FCM tokens and calling the right endpoints. **Pusher notifications are working**, but **FCM push notifications are NOT being sent** when orders are created or updated.

This document explains what the backend needs to implement.

---

## ✅ What's Already Working

1. **FCM tokens are being saved:**
   - Guests save FCM tokens via `POST /room_services/{hotel_slug}/room/{room_number}/save-fcm-token/`
   - Staff save FCM tokens via `POST /api/staff/save-fcm-token/`

2. **Pusher notifications are working:**
   - Staff receive Pusher events when orders are created
   - Guests receive Pusher events when order status changes

---

## ❌ What's Missing

**FCM push notifications are NOT being sent** in these scenarios:

### 1. When Guest Creates Order
- **Endpoint:** `POST /api/room_services/{hotel_slug}/orders/`
- **Currently:** Only sends Pusher notification
- **Should also:** Send FCM to all on-duty porters and kitchen staff

### 2. When Staff Updates Order Status
- **Endpoint:** `PATCH /api/room_services/{hotel_slug}/orders/{order_id}/`
- **Currently:** Only sends Pusher notification to guest
- **Should also:** Send FCM to the guest who placed the order

---

## 🔧 Required Backend Changes

### 1️⃣ Add FCM to Order Creation

**When:** Guest places order at `/room_services/hotel-killarney/room/101/menu/`

**Frontend calls:** `POST /api/room_services/{hotel_slug}/orders/`

**Frontend payload:**
```json
{
  "room_number": 101,
  "items": [
    { "item_id": 5, "quantity": 2 },
    { "item_id": 8, "quantity": 1 }
  ]
}
```

**File:** `room_services/views.py` (or wherever `POST /orders/` is handled)

**Current flow:**
```python
def create_order(request, hotel_slug):
    # 1. Create order in database
    order = Order.objects.create(...)
    
    # 2. Send Pusher notification to staff ✅
    send_pusher_to_staff(order)
    
    # 3. Return response
    return Response(order_data)
```

**Updated flow (ADD THIS):**
```python
def create_order(request, hotel_slug):
    # 1. Create order in database
    order = Order.objects.create(...)
    
    # 2. Send Pusher notification to staff ✅
    send_pusher_to_staff(order)
    
    # 3. Send FCM to on-duty staff ❌ ADD THIS
    send_fcm_to_staff(order)
    
    # 4. Return response
    return Response(order_data)
```

**Implementation:**
```python
from firebase_admin import messaging
from .models import StaffMember

def send_fcm_to_staff(order):
    """
    Send FCM push notification to all on-duty porters and kitchen staff
    """
    hotel = order.hotel
    
    # Get all on-duty staff (porters and kitchen staff)
    staff_members = StaffMember.objects.filter(
        hotel=hotel,
        is_on_duty=True,
        department__in=['Kitchen', 'Food and Beverage'],
    ).exclude(fcm_token__isnull=True).exclude(fcm_token='')
    
    # Also get porters
    porters = StaffMember.objects.filter(
        hotel=hotel,
        is_on_duty=True,
        role='Porter'
    ).exclude(fcm_token__isnull=True).exclude(fcm_token='')
    
    # Combine both querysets
    all_staff = staff_members | porters
    
    # Get FCM tokens
    fcm_tokens = [staff.fcm_token for staff in all_staff if staff.fcm_token]
    
    if not fcm_tokens:
        print('⚠️ No FCM tokens found for on-duty staff')
        return
    
    # Create FCM message
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title='🔔 New Room Service Order',
            body=f'Room {order.room_number} - €{order.total_price}'
        ),
        data={
            'type': 'room_service_order',
            'order_id': str(order.id),
            'room_number': str(order.room_number),
            'hotel_slug': hotel.slug,
        },
        tokens=fcm_tokens,
    )
    
    # Send FCM notification
    try:
        response = messaging.send_multicast(message)
        print(f'✅ FCM sent to {response.success_count} staff members')
        print(f'❌ FCM failed for {response.failure_count} staff members')
    except Exception as e:
        print(f'❌ Error sending FCM: {e}')
```

---

### 2️⃣ Add FCM to Order Status Update

**When:** Staff changes order status at `/room_services/:hotelIdentifier/orders-management`

**Frontend calls:** `PATCH /api/room_services/{hotel_slug}/orders/{order_id}/`

**Frontend payload:**
```json
{
  "status": "accepted"  // Can be: "pending", "accepted", "completed"
}
```

**File:** `room_services/views.py` (or wherever `PATCH /orders/{id}/` is handled)

**Current flow:**
```python
def update_order_status(request, hotel_slug, order_id):
    # 1. Update order status
    order.status = new_status
    order.save()
    
    # 2. Send Pusher to guest's room channel ✅
    send_pusher_to_guest(order)
    
    # 3. Return response
    return Response(order_data)
```

**Updated flow (ADD THIS):**
```python
def update_order_status(request, hotel_slug, order_id):
    # 1. Update order status
    order.status = new_status
    order.save()
    
    # 2. Send Pusher to guest's room channel ✅
    send_pusher_to_guest(order)
    
    # 3. Send FCM to guest ❌ ADD THIS
    send_fcm_to_guest(order)
    
    # 4. Return response
    return Response(order_data)
```

**Implementation:**
```python
from firebase_admin import messaging
from .models import GuestFCMToken

def send_fcm_to_guest(order):
    """
    Send FCM push notification to guest about order status change
    """
    hotel = order.hotel
    room_number = order.room_number
    
    # Get guest's FCM token
    try:
        guest_token = GuestFCMToken.objects.get(
            hotel=hotel,
            room_number=room_number
        )
        
        if not guest_token.fcm_token:
            print(f'⚠️ No FCM token for room {room_number}')
            return
            
    except GuestFCMToken.DoesNotExist:
        print(f'⚠️ No FCM token record for room {room_number}')
        return
    
    # Status messages
    status_messages = {
        'accepted': '✅ Your order has been accepted!',
        'preparing': '👨‍🍳 Your order is being prepared!',
        'ready': '🎉 Your order is ready!',
        'delivered': '✅ Your order has been delivered!',
        'completed': '✅ Order completed!',
    }
    
    title = f'Order #{order.id} Update'
    body = status_messages.get(order.status, f'Order status: {order.status}')
    
    # Create FCM message
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body
        ),
        data={
            'type': 'order_status_update',
            'order_id': str(order.id),
            'status': order.status,
            'room_number': str(room_number),
        },
        token=guest_token.fcm_token,
    )
    
    # Send FCM notification
    try:
        response = messaging.send(message)
        print(f'✅ FCM sent to guest in room {room_number}: {response}')
    except Exception as e:
        print(f'❌ Error sending FCM to guest: {e}')
        # If token is invalid, remove it
        if 'registration-token-not-registered' in str(e):
            guest_token.delete()
            print(f'🗑️ Removed invalid FCM token for room {room_number}')
```

---

## 🗄️ Database Models

Ensure you have these models for storing FCM tokens:

### Staff FCM Token
```python
class StaffMember(models.Model):
    # ... existing fields ...
    fcm_token = models.TextField(null=True, blank=True)
```

### Guest FCM Token
```python
class GuestFCMToken(models.Model):
    hotel = models.ForeignKey('Hotel', on_delete=models.CASCADE)
    room_number = models.IntegerField()
    fcm_token = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('hotel', 'room_number')
```

---

## 📡 API Endpoints

### Save Staff FCM Token
```
POST /api/staff/save-fcm-token/

Headers:
  Authorization: Token {auth_token}

Body:
{
  "fcm_token": "fXYZ123..."
}

Response:
{
  "success": true,
  "message": "FCM token saved successfully"
}
```

### Save Guest FCM Token
```
POST /api/room_services/{hotel_slug}/room/{room_number}/save-fcm-token/

Body:
{
  "fcm_token": "fXYZ123..."
}

Response:
{
  "success": true,
  "message": "FCM token saved successfully"
}
```

---

## 🔥 Firebase Admin SDK Setup

Make sure Firebase Admin SDK is initialized in your Django project:

```python
# settings.py or firebase_config.py
import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate('path/to/serviceAccountKey.json')
firebase_admin.initialize_app(cred)
```

---

## 🧪 Testing

### Test 1: Order Creation FCM
1. Login as a porter/kitchen staff member
2. Ensure FCM token is saved (check database)
3. Have a guest create an order
4. **Expected:** Porter receives FCM push notification (even if app is closed)

### Test 2: Order Status Update FCM
1. Guest creates an order and saves FCM token
2. Staff updates order status to "accepted"
3. **Expected:** Guest receives FCM push notification (even if browser is closed)

---

## 📋 Checklist

- [ ] Firebase Admin SDK is initialized
- [ ] `StaffMember` model has `fcm_token` field
- [ ] `GuestFCMToken` model exists
- [ ] `POST /staff/save-fcm-token/` endpoint saves tokens
- [ ] `POST /room/{room}/save-fcm-token/` endpoint saves tokens
- [ ] `POST /orders/` sends FCM to staff
- [ ] `PATCH /orders/{id}/` sends FCM to guest
- [ ] Invalid FCM tokens are cleaned up
- [ ] Only on-duty staff receive notifications

---

## 🎉 Result

After implementing these changes:

1. ✅ **Pusher notifications** (already working)
2. ✅ **FCM to staff** when order is created
3. ✅ **FCM to guest** when order status changes
4. ✅ **Real-time updates** even when app is closed

---

## 📚 Additional Resources

- [Firebase Admin SDK for Python](https://firebase.google.com/docs/admin/setup)
- [Send FCM Messages](https://firebase.google.com/docs/cloud-messaging/send-message)
- [FCM Message Types](https://firebase.google.com/docs/cloud-messaging/concept-options)

---

**Questions?** Check the frontend implementation in:
- `src/utils/fcm.js`
- `src/components/auth/PinAuth.jsx`
- `src/services/FirebaseService.js`
