## Priority: HIGH 🔴

## Overview
Create a detailed view for individual bookings and implement the booking confirmation flow for staff members.

## Backend API
- Booking data from Issue #37 (list view)
- `POST /api/staff/hotel/{hotel_slug}/bookings/{booking_id}/confirm/` - Confirm booking

## Requirements

### 1. Booking Detail View
**Location:** Modal/Drawer (triggered from bookings list)

#### Display Sections:

**Guest Information:**
- [ ] Full name
- [ ] Email address (with copy button)
- [ ] Phone number (with call link)
- [ ] Special requests/notes

**Booking Details:**
- [ ] Booking ID / Reference
- [ ] Confirmation Number
- [ ] Booking Status (large badge)
- [ ] Created date/time
- [ ] Last updated date/time

**Stay Information:**
- [ ] Hotel name
- [ ] Room type/name
- [ ] Check-in date & time
- [ ] Check-out date & time
- [ ] Number of nights (calculated)
- [ ] Number of adults
- [ ] Number of children
- [ ] Total guests

**Pricing Breakdown:**
- [ ] Subtotal
- [ ] Taxes/fees
- [ ] Discounts (if any)
- [ ] Promo code used (if any)
- [ ] Total amount
- [ ] Currency
- [ ] Payment status
- [ ] Payment reference (if available)
- [ ] Paid at date/time

**Internal Notes (Staff Only):**
- [ ] Internal notes field (editable textarea)
- [ ] Confirmed by (staff name)
- [ ] Confirmed at (date/time)

### 2. Confirm Booking Action

**Button Visibility:**
- [ ] Show "Confirm Booking" only if status is confirmable
- [ ] Hide if already CONFIRMED, CANCELLED, or COMPLETED
- [ ] Check staff permission before showing

**Confirmation Flow:**
1. [ ] User clicks "Confirm Booking" button
2. [ ] Show confirmation dialog with booking summary
3. [ ] On confirm:
   - Show loading state
   - Call API
   - Handle success/error
4. [ ] On success:
   - Close dialog
   - Update booking status in UI
   - Update list view (Issue #37)
   - Show success toast
5. [ ] On error:
   - Show error message
   - Allow retry

**Confirmation Dialog:**
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

**Success Message:**
```
✓ Booking confirmed successfully!
Confirmation email has been sent to john@example.com
```

### 3. Error Handling
- [ ] Already confirmed → Info message
- [ ] Booking cancelled → Error, prevent confirmation
- [ ] Network error → Retry button
- [ ] Permission denied → Error message

## UI Components to Create

**New Files:**
- `src/components/bookings/BookingDetailModal.jsx` - Main detail view
- `src/components/bookings/BookingDetailSection.jsx` - Reusable section component
- `src/components/bookings/ConfirmBookingButton.jsx` - Confirmation button
- `src/components/bookings/ConfirmBookingDialog.jsx` - Confirmation dialog

**Update:**
- `src/pages/staff/BookingsListPage.jsx` - Add modal trigger
- `src/components/bookings/BookingsTable.jsx` - Add click handler
- `src/components/bookings/BookingCard.jsx` - Add click handler

## API Integration Example

```javascript
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

## Acceptance Criteria

- [ ] Detail modal opens when clicking booking from list
- [ ] All booking information displays correctly
- [ ] Confirm button shows/hides based on status
- [ ] Confirmation dialog appears before confirming
- [ ] Loading state shown during API call
- [ ] Success state updates UI immediately
- [ ] Success toast displays with email confirmation note
- [ ] Error handling works for all edge cases
- [ ] Already confirmed bookings show appropriate message
- [ ] Cancelled bookings cannot be confirmed
- [ ] Modal closes properly
- [ ] Booking list refreshes after confirmation
- [ ] Permission checks work
- [ ] Copy/call buttons work for contact info

## Technical Requirements

- Use React Query mutation for confirm action
- Optimistic UI updates (update before API response)
- Rollback on error
- Integrate with toast notification system (react-toastify)
- Handle all edge cases
- Add loading states
- Permission checking
- Proper error boundaries

## Testing Checklist

- [ ] Detail modal opens correctly
- [ ] All booking data displays
- [ ] Confirm button visibility logic works
- [ ] Confirmation dialog appears
- [ ] Confirm action calls API
- [ ] Success updates UI
- [ ] Success toast shows
- [ ] Error handling works
- [ ] Already confirmed message shows
- [ ] Cancelled bookings cannot be confirmed
- [ ] Loading states display
- [ ] Modal closes properly
- [ ] List refreshes after action
- [ ] Permission checks work

## Estimated Effort
**4-5 hours**
- 2 hours: Detail view component and layout
- 1 hour: Confirmation flow and dialog
- 1 hour: API integration and state management
- 1 hour: Testing and edge cases

## Dependencies
- **Requires Issue #37 to be completed first**
- Backend confirmation API must be available
- Toast notification system (react-toastify)

## Related Issues
- Depends on #37 (Staff Bookings List - required)
- Leads to #39 (Confirmation Experience)
- May close/update #32, #35, #36 (duplicate/related issues)

## Future Enhancements
- Edit booking details
- Cancel booking flow
- Resend confirmation email
- Download booking PDF
- Booking timeline/audit log
- Add/edit internal notes

## Reference
Detailed specification: `issues/10_booking_detail_confirm.md`
