## Description

Create a comprehensive staff bookings management dashboard that allows hotel staff to view, filter, and manage all bookings for their hotel.

## Backend API
- `GET /api/staff/hotels/{hotel_slug}/bookings/`
- Supports filters: `status`, `start_date`, `end_date`

## Requirements

**Features:**
- [ ] Display bookings in table (desktop) / cards (mobile)
- [ ] Filter by status (PENDING_PAYMENT, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW)
- [ ] Filter by date range (check-in/check-out dates)
- [ ] Sort by date, guest name, amount
- [ ] Show booking status badges
- [ ] Loading states and error handling
- [ ] Empty state when no bookings
- [ ] Responsive design

**Components to Create:**
- `BookingsListPage.jsx`
- `BookingsTable.jsx`
- `BookingCard.jsx`
- `BookingsFilters.jsx`
- `BookingStatusBadge.jsx`

## Acceptance Criteria
- Staff can view all bookings for their hotel
- Filters apply correctly
- Mobile responsive
- Permission check prevents unauthorized access
- Clicking booking opens detail view

## Estimated Effort
4-6 hours

## Related Issues
- Requires #27 (permission check)
- Related to #32, #35, #36

## Reference
See detailed spec: `issues/09_staff_bookings_list.md`
