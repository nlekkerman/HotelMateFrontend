## Priority: HIGH 🔴

## Overview
Create a comprehensive staff bookings management dashboard that allows hotel staff to view, filter, and manage all bookings for their hotel.

## Backend API
- `GET /api/staff/hotels/{hotel_slug}/bookings/` - List bookings with filters
- Supports filters: `status`, `start_date`, `end_date`

## Requirements

### 1. Bookings List View
**Location:** `/staff/hotels/:hotel_slug/bookings` or `/staff/bookings`

**Display Information:**
- [ ] Booking ID / Confirmation Number
- [ ] Guest name and email
- [ ] Room type
- [ ] Check-in / Check-out dates
- [ ] Number of nights
- [ ] Total amount and currency
- [ ] Booking status (badge with color coding)
- [ ] Created date
- [ ] Payment status

### 2. Filtering System
- [ ] Status filter dropdown (All, Pending Payment, Confirmed, Cancelled, Completed, No Show)
- [ ] Date range filters (start date, end date)
- [ ] Quick filters: Today, This Week, This Month, Next Month
- [ ] Apply/Clear filters buttons
- [ ] Active filter count indicator

### 3. Sorting
- [ ] Sort by created date (newest first - default)
- [ ] Sort by check-in date
- [ ] Sort by guest name
- [ ] Sort by amount
- [ ] Toggle ascending/descending

### 4. Responsive Design
- [ ] Table view for desktop (sortable columns)
- [ ] Card view for mobile/tablet
- [ ] Smooth transitions between layouts

### 5. Loading & Error States
- [ ] Loading skeleton/spinner
- [ ] Empty state with helpful message
- [ ] Error message with retry button
- [ ] Graceful degradation

## UI Components to Create

**New Files:**
- `src/pages/staff/BookingsListPage.jsx` - Main container
- `src/components/bookings/BookingsTable.jsx` - Desktop table view
- `src/components/bookings/BookingCard.jsx` - Mobile card view
- `src/components/bookings/BookingsFilters.jsx` - Filter controls
- `src/components/bookings/BookingStatusBadge.jsx` - Status indicator
- `src/components/bookings/EmptyBookingsState.jsx` - No bookings message

**Update:**
- `src/App.jsx` - Add new route

## Status Badge Colors
- `PENDING_PAYMENT`: Yellow/Warning (⏳)
- `CONFIRMED`: Green/Success (✓)
- `CANCELLED`: Red/Danger (✕)
- `COMPLETED`: Blue/Info (✓)
- `NO_SHOW`: Gray/Secondary (⊘)

## API Integration Example

```javascript
async function getHotelBookings(hotelSlug, filters, authToken) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  
  const response = await api.get(
    `/staff/hotels/${hotelSlug}/bookings/?${params.toString()}`
  );
  return response.data;
}
```

## Acceptance Criteria

- [ ] Staff can view all bookings for their hotel
- [ ] Filters work correctly (status, date range)
- [ ] Bookings display key information clearly
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Loading states are shown
- [ ] Errors are handled gracefully
- [ ] Permission check (only staff of hotel can access)
- [ ] Empty state shown when no bookings
- [ ] Clicking a booking opens detail view (Issue #38)
- [ ] Sort functionality works
- [ ] Mobile cards and desktop table both functional

## Technical Requirements

- Use React Query for data fetching
- Integrate with existing authentication context
- Use `useHotelPublicEditPermission` or similar for access control
- Handle 401/403 errors appropriately
- Add loading skeletons for better UX
- Implement debouncing on filters
- Proper TypeScript types (if using TS)

## Testing Checklist

- [ ] Bookings load on page mount
- [ ] Filters apply correctly
- [ ] Date range filtering works
- [ ] Status filtering works
- [ ] Sort functionality works
- [ ] Mobile responsive view works
- [ ] Permission check prevents unauthorized access
- [ ] Error states display correctly
- [ ] Empty state displays when no bookings
- [ ] Clicking booking opens detail (when #38 implemented)

## Estimated Effort
**4-6 hours**
- 2 hours: Component structure and API integration
- 2 hours: Filtering and sorting logic
- 1 hour: Responsive design and styling
- 1 hour: Testing and refinement

## Dependencies
- Backend API must be available
- Staff authentication working
- Hotel slug available in context/route

## Related Issues
- Requires #27 (permission check - completed)
- Leads to #38 (Booking Detail View)
- Leads to #39 (Confirmation Feedback)
- May close/update #32, #35, #36 (duplicate/related issues)

## Future Enhancements
- Real-time updates with WebSocket
- Export to CSV functionality
- Bulk actions (confirm multiple bookings)
- Search by guest name/email
- Pagination for large booking lists

## Reference
Detailed specification: `issues/09_staff_bookings_list.md`
