# Issue: Implement Booking Detail View & Confirmation Action

## Priority: HIGH 🔴

## Status: TODO ⏳ (Depends on Issue #9)

## Overview
Create a detailed view for individual bookings and implement the booking confirmation flow for staff members.

## Related Backend API
- Booking data comes from Issue #9 (list view)
- `POST /api/staff/hotel/{hotel_slug}/bookings/{booking_id}/confirm/` - Confirm booking

## Requirements

### 1. Booking Detail View
**Location:** Modal/Drawer or separate page

**Display Sections:**

#### Guest Information
- [ ] Full name
- [ ] Email address (with copy button)
- [ ] Phone number (with call link)
- [ ] Special requests/notes

#### Booking Details
- [ ] Booking ID / Reference
- [ ] Confirmation Number
- [ ] Booking Status (large badge)
- [ ] Created date/time
- [ ] Last updated date/time

#### Stay Information
- [ ] Hotel name
- [ ] Room type/name
- [ ] Check-in date & time
- [ ] Check-out date & time
- [ ] Number of nights (calculated)
- [ ] Number of adults
- [ ] Number of children
- [ ] Total guests

#### Pricing Breakdown
- [ ] Subtotal
- [ ] Taxes/fees
- [ ] Discounts (if any)
- [ ] Promo code used (if any)
- [ ] Total amount
- [ ] Currency
- [ ] Payment status
- [ ] Payment reference (if available)
- [ ] Payment provider (if available)
- [ ] Paid at date/time

#### Internal Notes (Staff Only)
- [ ] Internal notes field (editable)
- [ ] Confirmed by (staff name)
- [ ] Confirmed at (date/time)

### 2. Confirm Booking Action

**Visibility:**
- [ ] Show "Confirm Booking" button only if status is confirmable
- [ ] Hide if already CONFIRMED, CANCELLED, or COMPLETED
- [ ] Check staff permission before showing

**Confirmation Flow:**
1. [ ] User clicks "Confirm Booking" button
2. [ ] Show confirmation dialog:
   ```
   Are you sure you want to confirm this booking?
   
   This will:
   • Change booking status to CONFIRMED
   • Send confirmation email to guest
   • Update booking records
   
   Guest: John Doe (john@example.com)
   Booking: #BK-2025-ABC123
   
   [Cancel] [Confirm Booking]
   ```
3. [ ] On confirm:
   - Show loading state on button
   - Call API
   - Handle success/error
4. [ ] On success:
   - Close dialog
   - Update booking status in detail view
   - Update booking in list (Issue #9)
   - Show success toast
5. [ ] On error:
   - Show error message in dialog
   - Allow retry

**Success Message:**
```
✓ Booking confirmed successfully!
Confirmation email has been sent to john@example.com
```

**Error Handling:**
- [ ] Already confirmed → Show info message
- [ ] Booking cancelled → Show error, prevent confirmation
- [ ] Network error → Show retry button
- [ ] Permission denied → Show error message

### 3. Additional Actions (Future)
- [ ] Edit booking (placeholder button)
- [ ] Cancel booking (placeholder button)
- [ ] Resend confirmation email (placeholder button)
- [ ] Download booking PDF (placeholder button)
- [ ] Add internal notes (editable textarea)

## API Integration

```javascript
// Confirm booking
async function confirmBooking(hotelSlug, bookingId, authToken) {
  const response = await api.post(
    `/staff/hotel/${hotelSlug}/bookings/${bookingId}/confirm/`,
    {},
    {
      headers: {
        'Authorization': `Token ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}
```

## UI Components to Create

1. **BookingDetailModal.jsx** - Main detail view component
2. **BookingDetailSection.jsx** - Reusable section component
3. **ConfirmBookingButton.jsx** - Confirmation action button
4. **ConfirmBookingDialog.jsx** - Confirmation dialog
5. **BookingTimeline.jsx** - Visual timeline of booking events (optional)

## Design Guidelines

### Layout
```
┌────────────────────────────────────────────┐
│  [X] Close                                  │
│                                              │
│  Booking Details                            │
│  ──────────────────────────────────────────│
│                                              │
│  ✓ CONFIRMED  #BK-2025-ABC123              │
│  Confirmation: HOT-2025-1DAE                │
│                                              │
│  Guest Information                          │
│  ┌──────────────────────────────────────┐  │
│  │ John Doe                              │  │
│  │ john@example.com    [Copy]            │  │
│  │ +353 87 123 4567    [Call]            │  │
│  │                                        │  │
│  │ Special Requests:                     │  │
│  │ Late check-in please                  │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  Stay Information                           │
│  ┌──────────────────────────────────────┐  │
│  │ Hotel Killarney                       │  │
│  │ Deluxe Suite                          │  │
│  │                                        │  │
│  │ Check-in:  Nov 24, 2025 (3:00 PM)    │  │
│  │ Check-out: Nov 26, 2025 (11:00 AM)   │  │
│  │ Nights: 2                              │  │
│  │                                        │  │
│  │ Guests: 2 Adults, 0 Children          │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  Pricing                                    │
│  ┌──────────────────────────────────────┐  │
│  │ Subtotal:     €378.00                 │  │
│  │ Taxes:        €34.02                  │  │
│  │ Discount:     -€0.00                  │  │
│  │ ─────────────────────                 │  │
│  │ Total:        €412.02                 │  │
│  │                                        │  │
│  │ ✓ Paid via Stripe                     │  │
│  │ Paid on: Nov 20, 2025 10:35 AM       │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  Internal Notes (Staff Only)                │
│  ┌──────────────────────────────────────┐  │
│  │ [Editable textarea for staff notes]   │  │
│  │                                        │  │
│  │ Confirmed by: Jane Smith              │  │
│  │ Confirmed at: Nov 24, 2025 2:00 PM   │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │ [Confirm Booking]  [Cancel Booking] │    │
│  └────────────────────────────────────┘    │
└────────────────────────────────────────────┘
```

### Confirmation Dialog
```
┌──────────────────────────────────────┐
│  Confirm Booking?                     │
│                                        │
│  This will:                           │
│  • Change status to CONFIRMED         │
│  • Send email to guest                │
│  • Update booking records             │
│                                        │
│  Guest: John Doe                      │
│  Email: john@example.com              │
│  Booking: #BK-2025-ABC123            │
│                                        │
│  [Cancel] [Confirm Booking]           │
└──────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Clicking a booking from list opens detail view
- [ ] All booking information is displayed correctly
- [ ] Confirm button only shows for confirmable bookings
- [ ] Confirm button hidden if already confirmed/cancelled
- [ ] Confirmation dialog shows before confirming
- [ ] Loading state shown during API call
- [ ] Success message shown after confirmation
- [ ] Booking status updates in UI immediately
- [ ] Email confirmation noted in success message
- [ ] Error messages handled gracefully
- [ ] Copy/call buttons work for contact info
- [ ] Internal notes can be edited (if implemented)
- [ ] Modal/drawer closes properly
- [ ] Booking list refreshes after confirmation

## Technical Requirements

- Use React Query mutation for confirm action
- Optimistic UI updates (update before API response)
- Rollback on error
- Integrate with toast notification system
- Handle all edge cases (already confirmed, cancelled, etc.)
- Add loading states
- Permission checking
- Proper error boundaries

## Files to Create/Update

**New Files:**
- `src/components/bookings/BookingDetailModal.jsx`
- `src/components/bookings/BookingDetailSection.jsx`
- `src/components/bookings/ConfirmBookingButton.jsx`
- `src/components/bookings/ConfirmBookingDialog.jsx`

**Update:**
- `src/pages/staff/BookingsListPage.jsx` (add modal trigger)
- `src/components/bookings/BookingsTable.jsx` (add click handler)
- `src/components/bookings/BookingCard.jsx` (add click handler)

## Dependencies

- Issue #9 must be completed (bookings list)
- Backend confirmation API must be available
- Toast notification system (react-toastify)

## Related Issues

- Issue #9: Staff Bookings List View
- Issue #11: Confirmation Experience & Feedback

## Testing Checklist

- [ ] Detail modal opens when clicking booking
- [ ] All booking data displays correctly
- [ ] Confirm button shows/hides based on status
- [ ] Confirmation dialog appears
- [ ] Confirm action calls API correctly
- [ ] Success state updates UI
- [ ] Success toast displays
- [ ] Error handling works
- [ ] Already confirmed bookings show appropriate message
- [ ] Cancelled bookings cannot be confirmed
- [ ] Loading states display during API call
- [ ] Modal closes properly
- [ ] Booking list refreshes after action
- [ ] Permission checks work

## Estimated Effort

**Medium**: 4-5 hours

- 2 hours: Detail view component and layout
- 1 hour: Confirmation flow and dialog
- 1 hour: API integration and state management
- 1 hour: Testing and edge cases

## Notes

- Consider adding a timeline view of booking events
- Future: Add ability to edit booking details
- Future: Add booking cancellation flow
- Future: Add PDF export functionality
- Future: Add email resend functionality
- Consider adding audit log for booking changes
