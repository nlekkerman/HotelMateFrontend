# Quick Actions Routes Audit

## Current Quick Actions Implementation Analysis

### 1. **ROOMS Section** (`/rooms`)
**Quick Actions:**
- ✅ Check Out - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ✅ Clean Rooms - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ✅ Assign Guest - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ✅ Maintenance - `navigate('/maintenance')` - **ROUTE EXISTS** ✓

**Route Status:**
- `/rooms` ✅ EXISTS - `<RoomList />`
- `/maintenance` ✅ EXISTS - `<Maintenance />`

---

### 2. **GUESTS Section** (`/guests`)
**Quick Actions:**
- ❌ Add Guest - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Check In - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Check Out - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ History - `action: () => {}` - **NOT IMPLEMENTED** (empty function)

**Route Status:**
- `/:hotelIdentifier/guests` ✅ EXISTS - `<GuestList />`
- `/:hotelIdentifier/guests/:guestId/edit` ✅ EXISTS - `<GuestEdit />`
- `/rooms/:roomNumber/add-guest` ✅ EXISTS - `<AssignGuestForm />`

**Issues:**
- Actions don't navigate to existing routes
- No direct "Add Guest" route (should open modal or navigate to form)

---

### 3. **STOCK TRACKER Section** (`/stock_tracker`)
**Quick Actions:**
- ⚠️ New Stocktake - `navigate('/stock_tracker/${hotelIdentifier}/stocktakes/new')` - **404 ERROR**
- ✅ Items - `navigate('/stock_tracker/${hotelIdentifier}/items')` - **ROUTE EXISTS** ✓
- ⚠️ Reports - `navigate('/stock_tracker/${hotelIdentifier}/reports')` - **404 ERROR**
- ✅ Periods - `navigate('/stock_tracker/${hotelIdentifier}/periods')` - **ROUTE EXISTS** ✓

**Route Status:**
- `/stock_tracker/:hotel_slug` ✅ EXISTS - `<StockDashboard />`
- `/stock_tracker/:hotel_slug/items` ✅ EXISTS - `<StockItemsResponsive />`
- `/stock_tracker/:hotel_slug/periods` ✅ EXISTS - `<PeriodSnapshots />`
- `/stock_tracker/:hotel_slug/stocktakes` ✅ EXISTS - `<StocktakesList />`
- `/stock_tracker/:hotel_slug/stocktakes/:id` ✅ EXISTS - `<StocktakeDetail />`
- `/stock_tracker/:hotel_slug/stocktakes/new` ❌ **DOES NOT EXIST**
- `/stock_tracker/:hotel_slug/reports` ❌ **DOES NOT EXIST**

**Issues:**
- "New Stocktake" route doesn't exist - should navigate to `/stock_tracker/:hotel_slug/stocktakes` with modal/form
- "Reports" route doesn't exist - should navigate to `/stock_tracker/:hotel_slug/analytics` or sales analysis

**Suggested Fixes:**
```javascript
{ icon: 'plus-circle', label: 'New Stocktake', action: () => navigate(`/stock_tracker/${hotelIdentifier}/stocktakes`) },
{ icon: 'graph-up', label: 'Reports', action: () => navigate(`/stock_tracker/${hotelIdentifier}/analytics`) },
```

---

### 4. **CHAT Section** (`/chat`)
**Quick Actions:**
- ❌ New Message - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Search - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Archive - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Mute - `action: () => {}` - **NOT IMPLEMENTED** (empty function)

**Route Status:**
- `/hotel/:hotelSlug/chat` ✅ EXISTS - `<ChatHomePage />`
- `/chat/:hotelSlug/conversations/:conversationId/messages` ✅ EXISTS - `<ChatWindow />`
- `/:hotelSlug/staff-chat` ✅ EXISTS - `<StaffChatPage />`

**Issues:**
- All quick actions are empty functions
- No navigation or modal triggers implemented

---

### 5. **BOOKINGS Section** (`/bookings`)
**Quick Actions:**
- ⚠️ New Booking - `navigate('/bookings/new')` - **404 ERROR**
- ❌ Today - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Pending - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ✅ Calendar - `navigate('/bookings')` - **ROUTE EXISTS** ✓

**Route Status:**
- `/bookings` ✅ EXISTS - `<Bookings />`
- `/bookings/new` ❌ **DOES NOT EXIST**

**Issues:**
- "New Booking" route doesn't exist - should open modal in `/bookings` component
- "Today" and "Pending" filters not implemented

**Suggested Fixes:**
```javascript
{ icon: 'plus-circle-fill', label: 'New Booking', action: () => navigate('/bookings') }, // Should open modal
{ icon: 'calendar-check', label: 'Today', action: () => navigate('/bookings?filter=today') },
{ icon: 'hourglass-split', label: 'Pending', action: () => navigate('/bookings?filter=pending') },
```

---

### 6. **ROSTER Section** (`/roster`)
**Quick Actions:**
- ❌ Add Shift - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Swap Shift - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ✅ Schedule - `navigate('/roster/${hotelIdentifier}')` - **ROUTE EXISTS** ✓
- ❌ Availability - `action: () => {}` - **NOT IMPLEMENTED** (empty function)

**Route Status:**
- `/roster/:hotelSlug` ✅ EXISTS - `<RosterDashboard />`
- `/roster/:hotelSlug/department/:department` ✅ EXISTS - `<DepartmentRosterView />`

**Issues:**
- Most actions are empty functions
- No shift management routes

---

### 7. **STAFF Section** (`/staff`)
**Quick Actions:**
- ❌ Add Staff - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Attendance - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ✅ Clock In/Out - `navigate('/clock-in/${hotelIdentifier}')` - **ROUTE EXISTS** ✓
- ❌ Payroll - `action: () => {}` - **NOT IMPLEMENTED** (empty function)

**Route Status:**
- `/:hotelSlug/staff` ✅ EXISTS - `<Staff />`
- `/:hotelSlug/staff/create` ✅ EXISTS - `<StaffCreate />`
- `/clock-in/:hotel_slug` ✅ EXISTS - `<FaceClockInPage />`

**Issues:**
- "Add Staff" should navigate to `/:hotelSlug/staff/create`
- "Attendance" should navigate to roster/attendance page

**Suggested Fixes:**
```javascript
{ icon: 'person-plus', label: 'Add Staff', action: () => navigate(`/${hotelIdentifier}/staff/create`) },
{ icon: 'calendar2-check', label: 'Attendance', action: () => navigate(`/roster/${hotelIdentifier}`) },
```

---

### 8. **RESTAURANTS Section** (`/restaurants`)
**Quick Actions:**
- ⚠️ Tables - `navigate('/${hotelIdentifier}/restaurants/tables')` - **LIKELY 404**
- ⚠️ Orders - `navigate('/${hotelIdentifier}/restaurants/orders')` - **LIKELY 404**
- ❌ Menu - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Reservation - `action: () => {}` - **NOT IMPLEMENTED** (empty function)

**Route Status:**
- `/:hotelSlug/:restaurantSlug` ✅ EXISTS - `<RestaurantManagementDashboard />`
- `/hotels/:hotelSlug/restaurants/:restaurantSlug` ✅ EXISTS - `<Restaurant />`

**Issues:**
- Quick action routes don't match existing restaurant route patterns
- Need `restaurantSlug` parameter, not just `hotelIdentifier`

**Suggested Fixes:**
```javascript
// Need to determine current restaurant context
{ icon: 'table', label: 'Tables', action: () => navigate(`/${hotelIdentifier}/[restaurantSlug]`) },
{ icon: 'receipt', label: 'Orders', action: () => navigate(`/${hotelIdentifier}/[restaurantSlug]`) },
```

---

### 9. **ROOM SERVICE Section** (`/room_service` or `/room_services`)
**Quick Actions:**
- ❌ New Order - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Pending - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Delivered - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ✅ Breakfast - `navigate('/room_services/${hotelIdentifier}/breakfast-orders')` - **ROUTE EXISTS** ✓

**Route Status:**
- `/room_services/:hotelIdentifier/orders` ✅ EXISTS - `<RoomServiceOrders />`
- `/room_services/:hotelIdentifier/breakfast-orders` ✅ EXISTS - `<BreakfastRoomService />`
- `/room_services/:hotelIdentifier/orders-management` ✅ EXISTS - `<RoomServiceOrdersManagement />`

**Suggested Fixes:**
```javascript
{ icon: 'plus-circle', label: 'New Order', action: () => navigate(`/room_services/${hotelIdentifier}/orders-management`) },
{ icon: 'hourglass-split', label: 'Pending', action: () => navigate(`/room_services/${hotelIdentifier}/orders?status=pending`) },
{ icon: 'check-circle', label: 'Delivered', action: () => navigate(`/room_services/${hotelIdentifier}/orders?status=delivered`) },
```

---

### 10. **MAINTENANCE Section** (`/maintenance`)
**Quick Actions:**
- ❌ New Task - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Urgent - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ In Progress - `action: () => {}` - **NOT IMPLEMENTED** (empty function)
- ❌ Completed - `action: () => {}` - **NOT IMPLEMENTED** (empty function)

**Route Status:**
- `/maintenance` ✅ EXISTS - `<Maintenance />`

**Issues:**
- All actions are empty functions
- Should filter/navigate within maintenance component

---

### 11. **GAMES Section** (`/games`)
**Quick Actions:**
- ⚠️ Leaderboard - `navigate('/games/?hotel=${hotelIdentifier}')` - **INCORRECT ROUTE**
- ⚠️ Memory Match - `navigate('/games/memory-match/?hotel=${hotelIdentifier}')` - **INCORRECT ROUTE**
- ⚠️ Whack-a-Mole - `navigate('/games/whack-a-mole/?hotel=${hotelIdentifier}')` - **INCORRECT ROUTE**
- ❌ Tournaments - `action: () => {}` - **NOT IMPLEMENTED** (empty function)

**Route Status:**
- `/games` ✅ EXISTS - `<GamesDashboard />`
- `/games/whack-a-mole` ✅ EXISTS - `<WhackAMolePage />`
- `/games/memory-match` ✅ EXISTS - `<MemoryMatchDashboard />`
- `/games/memory-match/leaderboard` ✅ EXISTS - `<Leaderboard />`
- `/games/memory-match/tournaments` ✅ EXISTS - `<TournamentDashboard />`

**Issues:**
- Using query parameters instead of React Router navigation
- Routes exist but navigation pattern is wrong

**Suggested Fixes:**
```javascript
{ icon: 'trophy-fill', label: 'Leaderboard', action: () => navigate('/games/memory-match/leaderboard') },
{ icon: 'controller', label: 'Memory Match', action: () => navigate('/games/memory-match') },
{ icon: 'joystick', label: 'Whack-a-Mole', action: () => navigate('/games/whack-a-mole') },
{ icon: 'award', label: 'Tournaments', action: () => navigate('/games/memory-match/tournaments') },
```

---

## Summary of Issues

### Critical 404 Errors:
1. ❌ `/stock_tracker/:hotel_slug/stocktakes/new` - New Stocktake
2. ❌ `/stock_tracker/:hotel_slug/reports` - Reports
3. ❌ `/bookings/new` - New Booking
4. ⚠️ `/:hotelIdentifier/restaurants/tables` - Restaurant Tables (wrong pattern)
5. ⚠️ `/:hotelIdentifier/restaurants/orders` - Restaurant Orders (wrong pattern)

### Empty Function Actions (32 actions):
- **ROOMS:** Check Out, Clean Rooms, Assign Guest
- **GUESTS:** Add Guest (4 actions - all empty)
- **CHAT:** All 4 actions empty
- **BOOKINGS:** Today, Pending
- **ROSTER:** Add Shift, Swap Shift, Availability
- **STAFF:** Add Staff, Attendance, Payroll
- **RESTAURANTS:** Menu, Reservation
- **ROOM SERVICE:** New Order, Pending, Delivered
- **MAINTENANCE:** All 4 actions empty
- **GAMES:** Tournaments

### Navigation Issues:
- Games using query params instead of proper routes
- Restaurant actions need restaurantSlug context
- Missing hotelIdentifier in some navigations

---

## Recommended Actions

### Phase 1: Fix Critical 404 Errors
1. Update Stock Tracker routes
2. Update Bookings routes
3. Fix Restaurant navigation pattern
4. Fix Games navigation

### Phase 2: Implement Empty Functions
1. Create modal/form handlers for empty actions
2. Add filter parameters to existing routes
3. Implement context-aware navigation

### Phase 3: Code Cleanup
1. Extract quick actions to separate configuration file
2. Add route validation helper
3. Implement error boundaries for missing routes
