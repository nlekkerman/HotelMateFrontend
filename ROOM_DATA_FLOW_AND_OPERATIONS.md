# 🏨 Room Data Flow & Operations Documentation

## 🔄 **Data Flow Architecture**

### 📋 **Room Cards (RoomList.jsx)** Data Flow

**📡 Data Sources:**
1. **API Endpoint:** `turnover/rooms/` - Fetches all rooms categorized by status
2. **Realtime Store:** `roomsStore.jsx` - Receives live updates via Pusher/WebSocket

**🔄 Data Flow:**
```
API (turnover/rooms/) 
    ↓ (fetchRooms - NO search params)
React Query Cache 
    ↓ (onSuccess: ROOM_BULK_REPLACE)  
roomsStore (realtime state)
    ↓ (useRoomsState)
RoomList Component
    ↓ (filtering & sorting client-side)
    ↓ (room prop)
RoomCard Component
```

**🎯 Data Priority:** Realtime store data **first**, fallback to API data

**⚡ Search Implementation:**
- **Query Key:** `["rooms"]` (NO searchQuery - prevents refetch)
- **Search Logic:** Client-side filtering via `filteredRooms` memo
- **Result:** Typing searches instantly without API calls

---

### 🏨 **Room Details (RoomDetails.jsx)** Data Flow

**📡 Data Sources:**
1. **API Endpoint:** `room-management/{roomNumber}/` - Detailed room info
2. **Realtime Store:** `roomsState.byRoomNumber[roomNumber]` - Live updates

**🔄 Data Flow:**
```
API (room-management/{roomNumber}/) 
    ↓ (fetchRoomDetails - specific room)
Local State (room)
    ↓ (merge with realtime)
roomsStore.byRoomNumber[roomNumber]
    ↓ (currentRoom = realtimeRoom || room)
RoomDetails Component
```

**🎯 Data Priority:** **Merges** API room details with realtime updates

---

## 🛎️ **Checkout Operation Details**

### 🔧 **What Gets Updated on Checkout**

**Frontend Implementation (RoomDetails.jsx):**
```jsx
const handleCheckout = async () => {
  await updateHousekeepingRoomStatus(getHotelSlug(), room.id, {
    status: 'CHECKOUT_DIRTY',
    note: 'Guest checked out'
  });
};
```

**API Payload Structure:**
```json
{
  "to_status": "CHECKOUT_DIRTY",
  "note": "Guest checked out"
}
```

**📍 Endpoint:** `POST /api/staff/hotel/{hotel_slug}/housekeeping/rooms/{room_id}/status/`

### 🏠 **Room State Changes on Checkout**

**Before Checkout:**
```json
{
  "room_status": "OCCUPIED",
  "is_occupied": true,
  "room_status_display": "Occupied"
}
```

**After Checkout:**
```json
{
  "room_status": "CHECKOUT_DIRTY",
  "is_occupied": false,
  "room_status_display": "Checkout Dirty"
}
```

### 🔄 **Alternative Checkout Methods**

**Bulk Checkout (via roomOperations.js):**
```javascript
export const checkoutRoom = async (hotelSlug, roomNumber, opts = {}) => {
  const roomId = opts.roomId || opts.room?.id;
  const url = buildStaffURL(hotelSlug, 'rooms', '/checkout/');
  return api.post(url, { room_ids: [roomId] });
};
```

**Bulk Payload:**
```json
{
  "room_ids": [123]
}
```

---

## 🎯 **Key Differences Between Components**

| Component | Data Source | Update Method | Use Case |
|-----------|-------------|---------------|----------|
| **Room Cards** | All rooms from `turnover/rooms/` | Realtime store priority | List view, quick status overview |
| **Room Details** | Specific room from `room-management/{roomNumber}/` | API + Realtime merge | Detailed operations, status changes |

---

## 🚀 **Realtime Integration**

**Store Structure:**
```javascript
roomsState = {
  list: [101, 102, 103], // room numbers
  byRoomNumber: {
    "101": { /* room object */ },
    "102": { /* room object */ }
  },
  lastUpdatedAt: "2024-12-23T10:30:00Z"
}
```

**Update Flow:**
1. User performs action (checkout, clean, etc.)
2. API call initiated
3. Backend processes & sends Pusher event
4. Frontend receives realtime update
5. `roomsStore` updates automatically
6. UI reflects changes instantly

---

## 🔍 **Status Workflow**

**Room Status Progression:**
```
OCCUPIED 
    ↓ (checkout)
CHECKOUT_DIRTY 
    ↓ (start cleaning)
CLEANING_IN_PROGRESS 
    ↓ (mark cleaned)
CLEANED_UNINSPECTED 
    ↓ (inspection pass)
READY_FOR_GUEST
    ↓ (check-in)
OCCUPIED
```

**Status Colors:**
- `OCCUPIED` → Blue (primary)
- `CHECKOUT_DIRTY` → Yellow (warning)
- `CLEANING_IN_PROGRESS` → Light Blue (info)
- `CLEANED_UNINSPECTED` → Gray (secondary)
- `READY_FOR_GUEST` → Green (success)
- `MAINTENANCE_REQUIRED` → Red (danger)
- `OUT_OF_ORDER` → Red (danger)

---

## 🎛️ **Operation Endpoints Summary**

| Operation | Endpoint | Method | Payload |
|-----------|----------|--------|---------|
| **Checkout** | `/housekeeping/rooms/{room_id}/status/` | POST | `{to_status: "CHECKOUT_DIRTY", note: "Guest checked out"}` |
| **Start Clean** | `/rooms/{room_number}/start-cleaning/` | POST | `{}` |
| **Mark Cleaned** | `/housekeeping/rooms/{room_id}/status/` | POST | `{to_status: "CLEANED_UNINSPECTED", note: "Room cleaned"}` |
| **Inspect Pass** | `/housekeeping/rooms/{room_id}/status/` | POST | `{to_status: "READY_FOR_GUEST", note: "Inspection passed"}` |
| **Maintenance** | `/rooms/{room_number}/mark-maintenance/` | POST | `{}` |

---

## ✅ **Best Practices**

1. **No Optimistic Updates** - Wait for realtime confirmation
2. **Client-Side Search** - No API refetch on search input
3. **Realtime Priority** - Store data takes precedence over API cache
4. **Room Number Sorting** - Default numerical order for staff mental model
5. **Status Filtering** - Available for specific workflows (housekeeping)

---

*Last Updated: December 23, 2024*