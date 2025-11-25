# Issue: Implement Staff Bookings Dashboard - Phase 1

## Priority: HIGH 🔴

## Status: TODO ⏳

## Overview
Create a comprehensive staff bookings management dashboard that allows hotel staff to view, filter, and manage all bookings for their hotel.

## Related Backend API
- `GET /api/staff/hotels/{hotel_slug}/bookings/` - List bookings with filters
- `POST /api/staff/hotel/{hotel_slug}/bookings/{booking_id}/confirm/` - Confirm booking

## Requirements

### 1. Bookings List View
**Location:** `/staff/hotels/:hotel_slug/bookings` or `/staff/bookings`

**Features:**
- [ ] Display all bookings in table/card layout
- [ ] Show key booking information:
  - Booking ID / Confirmation Number
  - Guest name and email
  - Room type
  - Check-in / Check-out dates
  - Number of nights
  - Total amount and currency
  - Booking status (badge)
  - Created date
  - Payment status
- [ ] Responsive design (cards on mobile, table on desktop)

### 2. Filtering System
- [ ] Filter by status dropdown:
  - All Bookings
  - Pending Payment
  - Confirmed
  - Cancelled
  - Completed
  - No Show
- [ ] Date range filter:
  - Start date picker (check-in >= date)
  - End date picker (check-out <= date)
  - Quick filters: Today, This Week, This Month, Next Month
- [ ] Apply filters button
- [ ] Clear filters button
- [ ] Show active filter count

### 3. Loading & Error States
- [ ] Loading skeleton/spinner while fetching
- [ ] Empty state when no bookings found
- [ ] Error message on API failure
- [ ] Retry button on error

### 4. Sorting
- [ ] Sort by created date (newest first - default)
- [ ] Sort by check-in date
- [ ] Sort by guest name
- [ ] Sort by amount
- [ ] Toggle ascending/descending

### 5. Pagination (if needed)
- [ ] Show 20-50 bookings per page
- [ ] Page navigation
- [ ] "Load more" button (alternative)

## API Integration

```javascript
// Fetch bookings with filters
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

## UI Components to Create

1. **BookingsListPage.jsx** - Main container component
2. **BookingsTable.jsx** - Table view for desktop
3. **BookingCard.jsx** - Card view for mobile
4. **BookingsFilters.jsx** - Filter controls
5. **BookingStatusBadge.jsx** - Status indicator
6. **EmptyBookingsState.jsx** - No bookings message

## Design Guidelines

### Status Colors
- PENDING_PAYMENT: Yellow/Warning
- CONFIRMED: Green/Success
- CANCELLED: Red/Danger
- COMPLETED: Blue/Info
- NO_SHOW: Gray/Secondary

### Table Columns (Desktop)
| Column | Width | Sortable |
|--------|-------|----------|
| Confirmation # | 10% | No |
| Guest | 20% | Yes |
| Room | 15% | No |
| Check-in | 12% | Yes |
| Check-out | 12% | Yes |
| Nights | 8% | No |
| Amount | 10% | Yes |
| Status | 10% | Yes |
| Actions | 5% | No |

### Mobile Cards
```
┌─────────────────────────────────┐
│ ✓ Confirmed    #HOT-2025-1DAE   │
│                                  │
│ John Doe                         │
│ john@example.com                 │
│                                  │
│ Deluxe Suite                     │
│ Nov 24 → Nov 26 (2 nights)      │
│                                  │
│ €412.02                          │
│ [View Details] [Confirm]         │
└─────────────────────────────────┘
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
- [ ] Clicking a booking opens detail view (Issue #10)

## Technical Requirements

- Use React Query for data fetching
- Implement proper TypeScript types (if using TS)
- Use existing authentication context
- Integrate with `useHotelPublicEditPermission` or similar for access control
- Handle 401/403 errors appropriately
- Add loading skeletons for better UX
- Implement debouncing on filters

## Files to Create/Update

**New Files:**
- `src/pages/staff/BookingsListPage.jsx`
- `src/components/bookings/BookingsTable.jsx`
- `src/components/bookings/BookingCard.jsx`
- `src/components/bookings/BookingsFilters.jsx`
- `src/components/bookings/BookingStatusBadge.jsx`
- `src/components/bookings/EmptyBookingsState.jsx`

**Update:**
- `src/App.jsx` or routing file (add new route)
- `src/services/api.js` (add helper functions if needed)

## Dependencies

- Backend API must be available
- Staff authentication working
- Hotel slug available in context/route

## Related Issues

- Issue #10: Booking Detail View + Confirm Action
- Issue #11: Confirmation Experience & Feedback

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
- [ ] Clicking booking opens detail (when implemented)

## Estimated Effort

**Medium-Large**: 4-6 hours

- 2 hours: Component structure and API integration
- 2 hours: Filtering and sorting logic
- 1 hour: Responsive design and styling
- 1 hour: Testing and refinement

## Notes

- Consider caching bookings list to reduce API calls
- Implement real-time updates with WebSocket (future enhancement)
- Add export to CSV functionality (future enhancement)
- Add bulk actions (future enhancement)
- Consider adding search by guest name/email (future enhancement)
