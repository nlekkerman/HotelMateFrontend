# Real-Time Clock Status Update with Pusher

## Backend Requirements

### 1. Pusher Event Configuration

**Channel Name:** `hotel-{hotel_slug}`

**Event Name:** `clock-status-updated`

### 2. Backend Implementation

When a staff member clocks in or out, send a Pusher event:

```python
# In your clock in/out view (e.g., ClockInOutView)
from pusher import Pusher
import os

# Initialize Pusher client
pusher_client = Pusher(
    app_id=os.environ.get('PUSHER_APP_ID'),
    key=os.environ.get('PUSHER_KEY'),
    secret=os.environ.get('PUSHER_SECRET'),
    cluster=os.environ.get('PUSHER_CLUSTER'),
    ssl=True
)

# After successfully updating clock status in database
pusher_client.trigger(
    f'hotel-{hotel_slug}',  # Channel name
    'clock-status-updated',  # Event name
    {
        'user_id': user.id,
        'staff_id': staff.id,
        'is_on_duty': staff.is_on_duty,  # True if clocked in, False if clocked out
        'clock_time': timezone.now().isoformat(),
        'first_name': staff.first_name,
        'last_name': staff.last_name,
        'action': 'clock_in' if staff.is_on_duty else 'clock_out'
    }
)
```

### 3. Example Django View

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

class ClockInOutView(APIView):
    def post(self, request, hotel_slug):
        staff = request.user.staff_profile
        
        # Toggle clock status
        staff.is_on_duty = not staff.is_on_duty
        
        if staff.is_on_duty:
            staff.last_clock_in = timezone.now()
        else:
            staff.last_clock_out = timezone.now()
        
        staff.save()
        
        # Send Pusher event for real-time update
        pusher_client.trigger(
            f'hotel-{hotel_slug}',
            'clock-status-updated',
            {
                'user_id': request.user.id,
                'staff_id': staff.id,
                'is_on_duty': staff.is_on_duty,
                'clock_time': timezone.now().isoformat(),
                'first_name': staff.first_name,
                'last_name': staff.last_name,
                'action': 'clock_in' if staff.is_on_duty else 'clock_out'
            }
        )
        
        return Response({
            'success': True,
            'is_on_duty': staff.is_on_duty,
            'clock_time': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
```

## Frontend Implementation

### 4. Pusher Listener in BigScreenNavbar.jsx

The frontend already has Pusher initialized. Add this listener:

```javascript
// In BigScreenNavbar.jsx useEffect
useEffect(() => {
  if (!hotelIdentifier || !user) return;

  const pusher = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
    cluster: process.env.REACT_APP_PUSHER_CLUSTER,
  });

  const channel = pusher.subscribe(`hotel-${hotelIdentifier}`);

  // Listen for clock status updates
  channel.bind('clock-status-updated', (data) => {
    console.log('[Pusher] Clock status updated:', data);
    
    // Only update if it's for the current user
    if (data.user_id === user.id || data.staff_id === staffProfile?.id) {
      setIsOnDuty(data.is_on_duty);
      console.log(`[Pusher] Updated clock status: ${data.is_on_duty ? 'Clocked In' : 'Clocked Out'}`);
      
      // Optional: Show notification
      if (data.is_on_duty) {
        console.log(`✅ ${data.first_name} ${data.last_name} clocked in at ${data.clock_time}`);
      } else {
        console.log(`🔴 ${data.first_name} ${data.last_name} clocked out at ${data.clock_time}`);
      }
    }
  });

  return () => {
    channel.unbind('clock-status-updated');
    pusher.unsubscribe(`hotel-${hotelIdentifier}`);
  };
}, [hotelIdentifier, user, staffProfile]);
```

## Payload Structure

### Event Data Object

```json
{
  "user_id": 123,
  "staff_id": 456,
  "is_on_duty": true,
  "clock_time": "2025-11-22T14:30:00.000Z",
  "first_name": "John",
  "last_name": "Doe",
  "action": "clock_in"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | Integer | User account ID |
| `staff_id` | Integer | Staff profile ID |
| `is_on_duty` | Boolean | `true` = clocked in, `false` = clocked out |
| `clock_time` | ISO String | Timestamp of clock action |
| `first_name` | String | Staff first name |
| `last_name` | String | Staff last name |
| `action` | String | Either "clock_in" or "clock_out" |

## Testing

### 1. Backend Test
```bash
# Test that Pusher event is sent when clocking in/out
curl -X POST http://localhost:8000/api/staff/{hotel_slug}/clock/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### 2. Frontend Test
Open browser console and look for:
```
[Pusher] Clock status updated: {user_id: 123, is_on_duty: true, ...}
[Pusher] Updated clock status: Clocked In
```

### 3. Check Pusher Debug Console
- Go to Pusher dashboard
- Check Debug Console for events on channel `hotel-{hotel_slug}`
- Should see `clock-status-updated` events

## Benefits

✅ **Real-time updates** - Button changes immediately for all users
✅ **No polling** - Efficient real-time communication
✅ **Multi-device sync** - Works across all open sessions
✅ **Visual feedback** - Button color changes (green → red, red → green)
✅ **Status accuracy** - Always shows current clock status

## Current Frontend Behavior

The clock button now displays:
- **"Clock In"** (green button) when `isOnDuty = false`
- **"Clock Out"** (red button) when `isOnDuty = true`

With Pusher, this will update in real-time without page refresh!
