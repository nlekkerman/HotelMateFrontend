# Frontend Pusher Rooms Implementation

## 1. Pusher Subscribe Code for Rooms

### Channel Names
```javascript
// From channelRegistry.js - Base hotel channels
const roomsChannelName = `${hotelSlug}.rooms`;
const roomsChannel = pusher.subscribe(roomsChannelName);

// From HousekeepingRooms.jsx - Legacy format
const channelName = `hotel-${hotelSlug}`;
const channel = window.pusher.subscribe(channelName);
```

### Event Names
```javascript
// Primary room event
'room-status-changed'

// Event binding code
channel.bind('room-status-changed', handleRoomStatusChanged);
```

### Complete Subscribe Code
```javascript
// From channelRegistry.js
const roomsChannelName = `${hotelSlug}.rooms`;
const roomsChannel = pusher.subscribe(roomsChannelName);
channels.push(roomsChannel);

// Bind global event handlers
roomsChannel.bind_global((eventName, payload) => {
  handleIncomingRealtimeEvent({
    source: 'pusher',
    channel: roomsChannel.name,
    eventName,
    payload
  });
});
```

## 2. Sample Event Payload

```json
{
  "room_id": "12345",
  "room_number": "101", 
  "to_status": "CLEANED_UNINSPECTED",
  "from_status": "CLEANING_IN_PROGRESS",
  "new_status": "CLEANED_UNINSPECTED",
  "event_id": "room-status-67890",
  "timestamp": "2026-01-16T10:30:00Z",
  "note": "Room cleaned and ready for inspection"
}
```

## 3. Store Update Functions

### Rooms Store Update (roomsStore.jsx)
```javascript
case "room_status_changed":
  // Extract new_status from payload and update room
  const { new_status } = payload;
  if (new_status) {
    dispatchRef({
      type: ACTIONS.ROOM_UPSERT,
      payload: { 
        roomSnapshot: { room_status: new_status }, 
        roomNumber 
      },
    });
  }
  break;
```

### Housekeeping Store Update (housekeepingStore.jsx)  
```javascript
// Handle Pusher room-status-changed events
if (event.event === 'room-status-changed' && event.data) {
  const { room_id, to_status, ...otherFields } = event.data;
  
  if (room_id && to_status) {
    dispatch({
      type: ACTIONS.UPDATE_ROOM_STATUS,
      payload: {
        roomId: room_id,
        statusUpdate: {
          room_status: to_status,
          ...otherFields,
          last_status_change: new Date().toISOString()
        }
      }
    });
  }
}
```

## 4. Optimistic UI for Room Status Actions

**Answer: NO** - They explicitly avoid optimistic UI updates.

### Evidence:
```javascript
// From roomOperations.js
/**
 * Room Operations API Module
 * Following realtime-only architecture - no optimistic UI updates
 */

// From HousekeepingRoomDetails.jsx
toast.success(`Room ${roomNumber} status updated. Waiting for realtime update.`);
toast.success(`Cleaning started for Room ${roomNumber}. Waiting for realtime update.`);
toast.success(`Room ${roomNumber} marked as cleaned. Waiting for realtime update.`);
```

### Where Status Updates Happen:
- `src/pages/housekeeping/components/HousekeepingRoomDetails.jsx` - Individual room actions
- `src/pages/housekeeping/HousekeepingRooms.jsx` - Bulk operations
- `src/services/roomOperations.js` - API calls without optimistic updates

### Architecture:
- API call → Success toast → Wait for Pusher event → UI updates via store
- No immediate UI state changes
- All updates come through realtime events only